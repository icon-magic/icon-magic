import {
  GeneratePlugin,
  Icon,
  IconConfig,
  saveContentToFile
} from '@icon-magic/icon-models';
import {applyPluginOnAssets} from '@icon-magic/icon-models';
import { Logger } from '@icon-magic/logger';
import { existsSync } from 'fs-extra';
import * as workerpool from 'workerpool';

import { svgGenerate } from './plugins/svg-generate';
import { svgToRaster } from './plugins/svg-to-raster';

const LOGGER = new Logger('icon-magic:generate:index');

/**
 * generateSingleIcon transorms the set of .svg flavors of an icon to their
 * types by running a set of plugins based on the type in which we want the
 * output. For example, we can have a different set of plugins to obtain the
 * optimized svg and a different set to get a .png "type".
 *
 * After generate has applied all the plugins based on type, we now get flavors
 * with types that contain paths to the newly created .type asset. Generate also
 * updates the icon config with the newly generated types.
 *
 * If no plugins are passed for the type, then by default, svgToRaster is and
 * svgGenerate are applied on svg types
 * @param iconConfig mapping of the iconPath to the Icon class
 */
async function generateSingleIcon(
  iconConfig: IconConfig,
  hashing?: boolean
): Promise<void> {
  // TODO: this function should take in an instance of Icon but due to an issue
  // in workerpool, I'm using a workaround where we're having to create this
  // instance by taking an iconConfig instead.
  // Update when it is fixed. Refer to generate/index for more details
  const icon = new Icon(iconConfig, true);

  // if the icon does not contain a /build folder, prompt the user to to run
  // icon-magic build
  if (!existsSync(icon.getBuildOutputPath())) {
    LOGGER.error(
      `${icon.iconPath}: Run "icon-magic build" on the icon before running "generate"`
    );
  }
  const generateConfig = icon.generate;
  if (generateConfig) {
    for (const generateType of generateConfig && generateConfig.types) {
      switch (generateType.name) {
        case 'svg': {
          await applyGeneratePluginsOnFlavors(
            icon,
            generateType.plugins && generateType.plugins.length
              ? await getPlugins(generateType.plugins)
              : new Array(svgGenerate),
            new RegExp('svg'),
            hashing
          );
          break;
        }
        case 'raster': {
          await applyGeneratePluginsOnFlavors(
            icon,
            generateType.plugins && generateType.plugins.length
              ? await getPlugins(generateType.plugins)
              : new Array(svgToRaster),
            new RegExp('png|webp'),
            hashing
          );
          break;
        }
        default: {
          // do nothing
          break;
        }
      }
    }
  }

  // write the icon config to disk
  LOGGER.debug(`Writing ${icon.iconName}'s iconrc.json to disk`);
  try {
    await saveContentToFile(
      icon.getIconOutputPath(),
      'iconrc',
      JSON.stringify(icon.getConfig(), null, 2),
      'json'
    );
  } catch (e) {
    LOGGER.error(`${e}`);
  }
}

/**
//  * Iterates through the flavors of the icon and applies the plugins passed into
//  * this function on all the flavors of the icon
//  * @param icon the icon on whose flavors the plugins have to be applied
//  * @param plugins Set of plugins to be be applied on all flavors of the icon
//  */
// async function applyGeneratePluginsOnFlavors(
//   icon: Icon,
//   plugins: GeneratePlugin[],
//   type: RegExp,
//   hashing?: boolean
// ): Promise<Flavor[]> {
//   let promises: Flavor[] = [];
//   if (icon.flavors) {
//     for (const iconFlavor of icon.flavors.values()) {
//       LOGGER.debug(`Applying plugins on ${icon.iconName}'s ${iconFlavor.name}`);
//       // Check if generate has been run on this flavor already, if it has, it will be saved
//       // in the iconrc in the output path
//       if (hashing) {
//         // Check if generate has been run on this flavor already
//         const flavorName: string = path.basename(iconFlavor.name);
//         // Create the output directory
//         const outputPath = icon.getIconOutputPath();
//         // Find the flavors in the config from the initial run that match the flavorName
//         const savedFlavorConfigs = await hasAssetBeenProcessed(
//           icon,
//           outputPath,
//           flavorName,
//           iconFlavor,
//           type
//         );
//         if (savedFlavorConfigs && savedFlavorConfigs.length) {
//           // Make flavors from the already written config
//           savedFlavorConfigs.forEach(
//             async (savedFlavorConfig: FlavorConfig) => {
//               // Create new Flavor from the config we retrieved, so it's copied over
//               // when the iconrc is written
//               const savedFlavor: Flavor = new Flavor(
//                 outputPath,
//                 savedFlavorConfig
//               );
//               promises = promises.concat(savedFlavor);
//             }
//           );
//           LOGGER.info(
//             `${icon.iconName}'s ${flavorName} has been generated. Skipping that step. Turn hashing off if you don't want this.`
//           );
//           continue;
//         }
//       }
//       promises = promises.concat(
//         // TODO: fork off a separate node process for each variant here
//         await applyPluginsOnAsset(iconFlavor, icon, plugins)
//       );
//     }
//   }
//   promises.forEach(flavor => icon.flavors.set(flavor.name, flavor));
//   return Promise.all(promises);
// }

async function applyGeneratePluginsOnFlavors(
  icon: Icon,
  plugins: GeneratePlugin[],
  type: RegExp,
  hashing?: boolean
): Promise<boolean> {
  if (plugins.length) {
    for (const plugin of plugins) {
      LOGGER.debug(`Applying ${plugin.name} on ${icon.iconName}'s flavors`);
      // TODO: fork off a separate node process for each variant here
      await applyPluginOnAssets(icon, plugin, type, hashing || false);
    }
  }
  return Promise.resolve(true);
}

/**
 * Returns an instance of plugins all with the fn property
 * If the passed in plugin does not have fn defined on it, we attempt to find
 * the plugin within generate/plugins folder by matching the name
 * @param plugins Array of plugins to sanitize
 */
async function getPlugins(
  plugins: GeneratePlugin[]
): Promise<GeneratePlugin[]> {
  return await Promise.all(
    plugins.map(async plugin => {
      // if the plugin has a function, return the plugin
      if (typeof plugin.fn === 'function') return plugin;
      // import the plugin from ./plugins
      else {
        let pluginFromFile: GeneratePlugin;
        try {
          pluginFromFile = await import(`./plugins/${plugin.name}`);
          // override the plugin's data with the missing fn
          plugin.fn = pluginFromFile[`${kebabToCamel(plugin.name)}`].fn;
          return plugin;
        } catch (e) {
          throw e;
        }
      }
    })
  );
}

/**
 * Convert a string from kebab-case to camelCase
 * @param s string to convert to camel case
 */
function kebabToCamel(s: string): string {
  return s.replace(/(\-\w)/g, m => {
    return m[1].toUpperCase();
  });
}

workerpool.worker({ generateSingleIcon });
