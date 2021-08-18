
import { Asset } from '@icon-magic/icon-models';
import { transform } from 'ember-template-recast';
import * as fs from 'fs-extra';
import * as path from 'path';
import { DOMParser, XMLSerializer } from 'xmldom';

const serializeToString = new XMLSerializer().serializeToString;

/**
 * Saves svg assets as handlebars files
 * @param assets SVG assets to convert
 * @param outputPath path to write to
 * @param doNotRemoveSuffix boolean, when true will keep the "-mixed" suffix in file name when distributing to hbs.
 */
export async function createHbs(
  assets: Asset[],
  outputPath: string,
  doNotRemoveSuffix: boolean
): Promise<void> {
  for (const asset of assets) {
    const doc = new DOMParser();
    // Get contents of the asset, since it's an SVG the content will be in XML format
    // Content Buffer | string
    const contents = await asset.getContents();
    // Parse XML from a string into a DOM Document.
    const xml = doc.parseFromString(contents as string, 'image/svg+xml');
    const el = xml.documentElement;
    const id = el.getAttributeNode('id');
    let iconName = id ? id.value : '';
    // Strip id
    el.removeAttribute('id');

    const template = serializeToString(xml);
    const { code } = transform({
      template,
      plugin(env) {
        const { builders: b } = env.syntax;

        return {
          ElementNode(node) {
            if (node.tag === 'svg' && node.attributes.find(attr => attr.name === 'xmlns')) {
              // add splattributes to the hbs file
              node.attributes.unshift(b.attr('...attributes', b.text('')));

              // aria-hidden should be the only attribute before ...attributes
              const ariaHiddenAttr = node.attributes.find(attr => attr.name === 'aria-hidden');
              const roleAttr = node.attributes.find(attr => attr.name === 'role');
              node.attributes = node.attributes.filter(a => a !== ariaHiddenAttr && a !== roleAttr);

              if (roleAttr) {
                node.attributes.unshift(roleAttr);
              }

              if (ariaHiddenAttr) {
                node.attributes.unshift(ariaHiddenAttr);
              }
            }
          },
        };
      }
    });

    // Remove the "-mixed" suffix from the name. File will have same name as light version.
    if (!doNotRemoveSuffix && asset.colorScheme === 'mixed') {
      iconName = iconName.replace(/-mixed$/, '');
    }


    // xmldom and other dom substitutions (like jsdom) add ...attributes="" and
    // the string replace below is an ugly hack to remove the empty string
    fs.writeFileSync(path.join(outputPath, `${iconName}.hbs`), code);
  }
}

