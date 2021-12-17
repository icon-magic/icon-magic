import * as fs from 'fs-extra';
import * as path from 'path';

import { run } from './browserPool';

export interface SVGToPNGOptions {
  width: number;
  height: number;
  rtlFlip?: boolean;
  headless?: boolean;
}

export async function convertFile(
  fileName: string,
  options: SVGToPNGOptions
): Promise<Buffer> {
  if (!path.isAbsolute(fileName)) {
    throw new Error('svg-to-png expects an absolute filepath');
  }
  const contents = await fs.readFile(fileName);
  return await convert(contents.toString(), options);
}

export async function convert(
  contents: string,
  options: SVGToPNGOptions
): Promise<Buffer> {
  if (!contents) {
    throw new Error('No contents discovered.');
  }
  return await run(async (page) => {
    // Page should be bigger than the svg it's taking a screenshot of
    await page.setViewport({
      width: Math.round(options.width) + 100,
      height: Math.round(options.height) + 100,
      deviceScaleFactor: 1,
    });
    await page.setContent(contents.toString().replace('<svg', `<svg style="width: ${options.width}px; height: ${options.height}px; position: fixed; top:0; left: 0; ${options.rtlFlip ? 'transform: scaleX(-1);' : ''}" `));
    return await page.screenshot({
      encoding: 'binary',
      omitBackground: true,
      type: 'png',
      clip: {
        x: 0,
        y: 0,
        width: options.width,
        height: options.height
      }
    }) as Buffer; // Buffer is returned when encoding is set to 'binary'
  });
}
