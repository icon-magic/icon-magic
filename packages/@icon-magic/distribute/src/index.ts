import { Logger, logger } from '@icon-magic/logger';
import * as fs from 'fs-extra';
import * as path from 'path';

import {
  Asset,
  FlavorType,
  Icon,
  IconConfigHash,
  IconSet
} from '@icon-magic/icon-models';

const LOGGER: Logger = logger('icon-magic:distribute/index');

interface ContentImage {
  idiom: string;
  scale: string;
  filename: string;
}

type ICON_TYPES = 'svg' | 'png' | 'webp' | 'all';

/**
 * Distributes a set of icons to the output folder based on type
 * @param iconSet set of icons to be moved to the output folder
 * @param type svg, png, webp
 * @param outputPath output directory path to copy the assets to
 */
export async function distributeByType(
  iconConfig: IconConfigHash,
  outputPath: string,
  type: ICON_TYPES = 'all',
  groupByCategory = true
): Promise<void> {
  LOGGER.debug(`entering distribute with ${type}`);
  const iconSet = new IconSet(iconConfig, true);

  if (type !== 'svg' && type !== 'all') {
    createSprite(iconSet, outputPath, groupByCategory);
  }
  for (const icon of iconSet.hash.values()) {
    switch (type) {
      case 'png': {
        await createImageSet(icon, outputPath);
      }
      case 'webp': {
        await distributeByResolution(icon, outputPath);
      }
      default: {
        await distributeSvg(icon, outputPath);
      }
    }
  }
}

async function createImageSet(icon: Icon, outputPath: string) {
  LOGGER.debug(`Creating imageSet for ${icon.iconName}`);
  const assets = getIconFlavorsByType(icon, 'png');
  const promises = [];
  const ASSET_CATALOG = 'Contents.json'; // as defined for iOS
  for (const asset of assets) {
    const assetNameForCatalog = `${icon.iconName}_${path.basename(asset.getPath())}`;

    // strip the resolution from the asset name to get the name of the imageset
    const outputIconDir = path.join(
      outputPath,
      `${assetNameForCatalog.split('@')[0]}.imageset`
    );

    await fs.mkdirp(outputIconDir);

    const assetCatalogPath = path.join(outputIconDir, ASSET_CATALOG);
    let images: ContentImage[];
    if (fs.existsSync(assetCatalogPath)) {
      const assetCatalogContents = await loadJSONFile(assetCatalogPath);
      images = assetCatalogContents.images;
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
        filename: assetNameForCatalog
      });
      await writeJSONfile(assetCatalogPath, { images });
    }
  }
  return Promise.all(promises);
}

async function distributeByResolution(icon: Icon, outputPath: string) {
  LOGGER.debug(`distributeByResolution for ${icon.iconName}`);
  const assets = getIconFlavorsByType(icon, 'webp');
  let outputIconDir;
  // copy all assets to the output icon directory
  const promises = [];
  for (const asset of assets) {
    // the output folder is the folder by resolution
    outputIconDir = path.join(outputPath, getAssetResolutionFromName(asset));
    await fs.mkdirp(outputIconDir);

    // append the icon name to the asset since all icons go into a single
    // directory
    // TODO: have icons have a category field in their config and prepend the
    // category to the asset name. Eg: nav_iconName_assetName
    promises.push(
      fs.copy(
        asset.getPath(),

        path.join(
          outputIconDir,
          `${icon.iconName}_${path.basename(asset.getPath())}`
        )
      )
    );
  }
  return Promise.all(promises);
}

const createSVGDoc = () => {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const doc = document.createElementNS(SVG_NS, 'svg');
  doc.setAttribute('width', '24px');
  doc.setAttribute('height', '390px');
  doc.setAttribute('id', 'svg-source');
  doc.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  doc.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  doc.setAttribute('version', '1.1');
  return doc;
};


const writeSVGToDisk = (doc: SVGElement, filePath: string, spriteName: string) => {
  fs.writeFileSync(path.resolve(filePath, spriteName, '.svg'), doc);
};


function createDefs(category: string) {
  const defs = document.createElement('defs');
  defs.setAttribute('id', category);
  return defs;
};

async function appendIcon(parent: Element, asset: Asset) {
  var doc = new DOMParser();
  let contents = await asset.getContents();
  var xml = doc.parseFromString(contents as string, "image/svg+xml");
  parent.appendChild(xml.documentElement);
  return parent;
};


function appendToSvgDoc (asset: Asset, doc: SVGSVGElement, category: string) {
  if (category) {
    let def = doc.getElementById(category);
    if (def) {
      return appendIcon(def, asset);
    }
    else {
      def = createDefs(category);
      doc.appendChild(def);
      return appendIcon(def, asset)
    }
  }
  else {
    return appendIcon(doc, asset);
  }
}

async function createSprite(iconSet: IconSet, outputPath: string, groupByCategory: boolean) {
  // Assuming that it will be one doc ?
  const doc = createSVGDoc();
  let spriteName = 'icons';
  for (const icon of iconSet.hash.values()) {
    if (icon.distribute && icon.distribute.svg && icon.distribute.svg.noSprite) {
      spriteName = icon.distribute.svg.spriteName;
      const spriteAssets = getIconFlavorsByType(icon, 'svg');
      for (const asset of spriteAssets) {
        appendToSvgDoc(asset, doc, groupByCategory ? icon.category : '');
      }
    }
  }
  // Do we assume the sprite name will be the same
  writeSVGToDisk(doc, outputPath, spriteName);
}

async function distributeSvg(icon: Icon, outputPath: string) {
  LOGGER.debug(`distributeSvg for ${icon.iconName}`);
  const assets = getIconFlavorsByType(icon, 'svg');
  const outputIconDir = path.join(outputPath, icon.iconName);
  await fs.mkdirp(outputIconDir);
  // copy all assets to the output icon directory
  const promises = [];
  for (const asset of assets) {
    promises.push(
      fs.copy(asset.getPath(), path.join(outputIconDir, path.basename(asset.getPath())))
    );
  }
  return Promise.all(promises);
}

/**
 * Returns a list of Flavors
 * @param icon Icon whose flavors are to be returned
 * @param type The type to which to filter the icon's flavors by
 */
function getIconFlavorsByType(icon: Icon, type: FlavorType): Asset[] {
  return Array.from(icon.flavors.values())
    .filter(flavor => {
      return flavor.types.has(type);
    })
    .map(flavor => flavor.types.get(type) as Asset); // type casting here as we have checked for whether the flavor has the type above
}

function getAssetResolutionFromName(
  asset: Asset,
  getAsScale?: Boolean
): string {
  let resolution;
  let scale;
  switch (true) {
    case /@1.5/.test(asset.name): {
      resolution = 'drawable-mdpi';
      scale = '1.5x';
      break;
    }
    case /@1/.test(asset.name): {
      resolution = 'drawable-hdpi';
      scale = '1x';
      break;
    }
    case /@2/.test(asset.name): {
      resolution = 'drawable-xhdpi';
      scale = '2x';
      break;
    }
    case /@3/.test(asset.name): {
      resolution = 'drawable-xxhdpi';
      scale = '3x';
      break;
    }
    default: {
      resolution = 'drawable-xxxhdpi';
      scale = '4x';
      break;
    }
  }
  return getAsScale ? scale : resolution;
}

/**
 * Loads a JSON from a file.
 * @param filePath The filename to load.
 * @returns The JSON contents as an object
 */
async function loadJSONFile(filePath: string): Promise<object> {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJSONfile(filePath: string, data: object) {
  return fs.writeFile(`${path.join(filePath)}`, JSON.stringify(data, null, 2));
}

