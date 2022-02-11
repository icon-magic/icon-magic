# icon-magic

This package is just a pass through to the [Icon Magic CLI](https://www.npmjs.com/package/@icon-magic/cli)

## Install

Using npm:

```sh
npm install --save-dev icon-magic
```

or using yarn:

```sh
yarn add icon-magic --dev
```

## Usage

```
Usage:
  icon-magic [command] <directories ...> [options]

Commands:
  build               Construct flavors that an icon from its variants, after applying the build plugins. No options available.
  generate            Generates the flavors of the icon in the extension types that it can be consumed.
  distribute          Moves an icon from the source to the destination, applying plugins if specified.

Options:
  -h, --help              Display usage
  -v, --version           Display version
```

## Commands

If no command is specified after `icon-magic`, the CLI runs `build` and
`generate` on the directories specified.

```
icon-magic .
```

```
icon-magic icons/
```

`build` and `generate` automatically write to the `out` folder in whatever directory they're run in.

### Build

```
icon-magic build .
```

```
icon-magic build icons/
```

Given a set of input directories, finds the closest [config file](../config-reader/README.md) (iconrc.json/iconrc.js/icon) and "builds" the icons from it. Refer to
[@icon-magic/build](../@icon-magic/build/README.md) for more details.

### Generate

```
icon-magic generate .
```

```
icon-magic generate icons/
```

Given a directory of icons (each icon containing it's own config file consisting
of all the flavors from the build step), the generate step is responsible for
going through the config file to determine the platforms on which the icon needs
to be supported. Refer [@icon-magic/generate](../@icon-magic/generate/README.md) for more details.

### Distribute

Organizes and structures the files from the generate step how they need to be consumed, creates the necessary files for platform consumption and moves the icons from an input folder to the output folder. **The input folder for the `distribute` command should be the output folder of `build` and `generate`**

The distribute command is the only command for now that **requires** an output path (as an option -o or --outputPath). As well as the only command with options. Run `icon-magic distribute --h` for options.

```
icon-magic distribute inputPath --outputPath
```

Options:
- -o, --outputPath Path to the output directory where the generated assets are to be written to
- -t, --type type of icons format to handle, accepted types are svg|png|webp
- -g, --groupBy [currently the only supported use is for web sprite creation] if to how to group the icons by category
- -hbs, --outputAsTemplate [for web] whether to output the svg as handlebars template
- -ce, --outputAsCustomElement [for web] whether to output the svg as HTML custom element
- -d, --debug Default is false. When true, will log debugging info to the command-line
- -c, --colorScheme <colorScheme...> With no flag, `light` and `dark` colorSchemes are distributed. Other colorSchemes can be specified with flag
- -i, --withEmbeddedImage [for web] Filters only those assets with embedded images with them
- -s, --doNotRemoveSuffix When used with --outputAsTemplate, will NOT trim the `-mixed` suffix on the file name

Refer [@icon-magic/distribute](../@icon-magic/distribute/README.md) for more details.
