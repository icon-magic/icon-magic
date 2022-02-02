const flavorProperties = {
  name: { type: 'string' },
  path: { type: 'string', minLength: 1 },
  types: { type: ['object', 'null'] },
  imageset: { type: ['string', 'null'] },
  colorScheme: { type: 'string',  enum: ['dark', 'light', 'mixed'] }
};

const pluginProperties = {
  name: { type: 'string' },
  iterants: {
    type: ['array'],
    items: {
      type: 'string'
    }
  },
  params: ['object'],
  writeToOutput: {
    type: 'boolean',
    default: false
  }
};

const buildConfigProperties = {
  outputPath: {
    type: ['string', 'null'],
    minLength: 1
  },
  plugins: {
    type: ['array', 'null'],
    items: {
      type: ['object'],
      required: ['name'],
      properties: pluginProperties,
      additionalProperties: true
    }
  }
};

const distributeConfigProperties = {
  variantsToFilter: {
    type: ['array', 'null'],
  },
  svg: {
    type: ['object', null],
    properties: {
      spriteNames: {
        type: ['array', 'null']
      },
      toSprite: {
        type: ['boolean', 'null']
      },
      variantsToFilter: {
        type: ['array', 'null']
      },
      outputAsHbs: {
        type: ['object', null],
        properties: {
          imageHrefHelper: {
            type: ['string', null]
          },
          pathToTheImageAsset: {
            type: ['string', null]
          }
        }
      }
    }
  },
  webp: {
    type: ['object', null],
    properties: {
      namePrefix: {
        type: ['string', 'null']
      }
    }
  }
};

const variantProperties = {
  name: { type: 'string' },
  path: { type: 'string', minLength: 1 },
  imageset: { type: 'string' },
  colorScheme: { type: 'string',  enum: ['dark', 'light'] }
};

const generateConfigProperties = {
  outputPath: {
    type: ['string', 'null'],
    minLength: 1
  },
  types: {
    type: ['array'],
    items: {
      type: ['object'],
      properties: {
        name: {
          type: 'string',
          enum: ['svg', 'raster', 'customElement']
        },
        plugins: {
          type: ['array', 'null'],
          items: {
            type: ['object'],
            required: ['name'],
            properties: pluginProperties,
            additionalProperties: true
          }
        }
      }
    }
  }
};

const topLevelConfigProperties = {
  iconPath: { type: 'string', minLength: 1 },
  iconName: { type: ['string', 'null'] },
  labels: {
    type: 'array',
    items: {
      type: 'string'
    }
  },
  category: {
    type: 'string'
  },
  variants: {
    type: 'array',
    minItems: 1,
    items: {
      type: 'object',
      properties: variantProperties,
      required: ['path'],
      additionalProperties: false
    }
  },
  sizes: {
    type: 'array',
    minItems: 1,
    items: {
      type: ['number', 'object'],
      properties: {
        width: { type: 'number' },
        height: { type: 'number' }
      },
      required: ['width', 'height'],
      additionalProperties: false
    }
  },
  resolutions: {
    type: 'array',
    minItems: 1,
    items: {
      type: 'number'
    }
  },
  flavors: {
    type: 'array',
    items: {
      type: ['object'],
      properties: flavorProperties
    }
  },
  outputPath: { type: ['string', 'null'] },
  sourceConfigFile: { type: ['string', 'null'] },
  build: {
    type: 'object',
    properties: buildConfigProperties,
    additionalProperties: false
  },
  generate: {
    type: 'object',
    properties: generateConfigProperties
  },
  distribute: {
    type: 'object',
    properties: distributeConfigProperties,
    additionalProperties: false
  },
  metadata: {
    type: 'object'
  },
  generatedMetadata: {
    type: 'object'
  },
};

export const configSchema = {
  type: 'object',
  properties: topLevelConfigProperties,
  required: ['iconPath', 'variants'],
  additionalProperties: false
};
