import { Asset, IconSet } from '@icon-magic/icon-models';
import { Logger } from '@icon-magic/logger';
import * as fs from 'fs-extra';
import * as path from 'path';

import { getAssetResolutionFromName, getIconFlavorsByType } from './utils';

const LOGGER = new Logger('icon-magic:distribute:create-image-set');
const IOS_SUPPORTED_RESOLUTIONS = [1, 2, 3];

interface ContentImage {
  idiom: string;
  scale: string;
  filename: string;
  "language-direction"?: string;
}

// TODO: populate this interface as needed
// from https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/ImageSetType.html
interface AssetCatalog {
  images?: ContentImage[];
}

/**
 * Creates an imageSet which is needed for iOS
 * This consists of the assets in different resolutions and a corresponding
 * Content.json file
 * @param icon the icon for which the imageSet needs to be created
 * @param outputPath output directory path to copy the assets to
 */
export async function createImageSet(iconSet: IconSet, outputPath: string) {
  for (const icon of iconSet.hash.values()) {
    const rtlFlip = icon.metadata && icon.metadata.rtlFlip;
    LOGGER.debug(`Creating imageSet for ${icon.iconName}, rtl: ${rtlFlip || false}`);
    const rtlAssets = getIconFlavorsByType(icon, 'pngFlip');
    const regularAssets = getIconFlavorsByType(icon, 'png');
    const assets = [...rtlAssets, ...regularAssets];
    const promises = [];
    const ASSET_CATALOG = 'Contents.json'; // as defined for iOS
    let iconOutputPath = outputPath;

    // prepend the outputPath with the category so output icons are categorized
    // by category name
    if (icon.category) {
      iconOutputPath = path.join(iconOutputPath, icon.category);
    }

    for (const asset of assets) {
      // if the asset is not a supported ios resolution, then do nothing
      if (!isSupportedResolution(asset)) {
        continue;
      }

      // Example .x/y/23/filled-24x12@2.png -> filled-24x12@2.png
      const assetPathBasename = path.basename(asset.getPath());

      // This will be the name the file is saved as
      let assetNameForCatalog = `${icon.iconName}_${assetPathBasename}`.replace(/-/g, '_');

      /* This will be the folder the files are saved in
       * Usually for ios every variant gets its own folder
       * But we want dark and light assets (which are technically separate variants)
       * to be in the same folder so we use `imageset` if available
       * `imageset` is a name grouping that's shared across light and dark assets
      */
      let assetImagesetForCatalog = asset.imageset ?
        `${icon.iconName}_${asset.imageset}`.replace(/-/g, '_') : `${assetNameForCatalog.split('@')[0]}`;

      // if the category is present, prepend it to the name
      if (icon.category) {
        assetNameForCatalog = `${icon.category}_${assetNameForCatalog}`;
        assetImagesetForCatalog = `${icon.category}_${assetImagesetForCatalog}`;
      }

      const outputIconDir = path.join(
        iconOutputPath,
        `${assetImagesetForCatalog}.imageset`
      );

      await fs.mkdirp(outputIconDir);

      const assetCatalogPath = path.join(outputIconDir, ASSET_CATALOG);
      let images: ContentImage[];
      if (fs.existsSync(assetCatalogPath)) {
        const assetCatalogContents: AssetCatalog = await loadJSONFile(
          assetCatalogPath
        );
        images = assetCatalogContents.images || [];
      } else {
        images = [];
      }

      promises.push(
        fs.copy(asset.getPath(), path.join(outputIconDir, assetNameForCatalog))
      );

      // update the assetCatalog if it doesn't contain the asset already
      const doesImageExist = images.find(
        img => img.filename === assetNameForCatalog
      );
      if (!doesImageExist) {
        images.push({
          idiom: 'universal',
          scale: getAssetResolutionFromName(asset, true),
          filename: assetNameForCatalog,
          ...(rtlFlip && regularAssets.includes(asset) && { "language-direction": "left-to-right" }),
          ...(rtlFlip && rtlAssets.includes(asset) && { "language-direction": "right-to-left" }),
          ...(asset.colorScheme === 'dark' && {
            appearances: [
              {
                appearance: 'luminosity',
                value: 'dark'
              }
            ]
          }),
        });
        await writeJSONfile(assetCatalogPath, { images });
      }
    }
    await Promise.all(promises);
  }
}

/**
 * Loads a JSON from a file.
 * @param filePath The filename to load.
 * @returns The JSON contents as an object
 */
async function loadJSONFile(filePath: string): Promise<object> {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

/**
 * Writes JSON to file
 * @param filePath The filePath to write to
 * @returns Promise to the writeFile operation
 */
async function writeJSONfile(filePath: string, data: object): Promise<void> {
  return fs.writeFile(`${path.join(filePath)}`, JSON.stringify(data, null, 2));
}

/**
 * Checks if the asset is among the supported resolutions by looking at the name
 * of the asset
 * @param asset the asset to check if it's in a supported resolution
 */
function isSupportedResolution(asset: Asset) {
  // Pops the end of the asset name (after the "@"). Examples: "2" or "2-rtl".
  let assetNameEnd = asset.name.split('@').pop();

  // removes the "-rtl" suffix if it exists. Leaving only the number as a string.
  if (assetNameEnd) {
    assetNameEnd = assetNameEnd.replace(/-rtl$/, '');
  }
  const assetResolution = Number(assetNameEnd);
  return assetResolution
    ? IOS_SUPPORTED_RESOLUTIONS.includes(Number(assetResolution))
    : true;
}
