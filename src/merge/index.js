import {difference,into,pairs,pick,set,setIn,update,values} from '../utils';

// Schema = {
//   name: string,
//   queryType: string,
//   mutationType: string,
//   subscriptionType: string,
//   types: {[string]: GraphQLIntrospectionType}
// }

// Config = {
//   queryType: string,
//   mutationType: string,
//   subscriptionType: string,
//   extensions: {[typeName]: {[fieldName]: schemaName}}
// }

const ROOT_TYPES = ['queryType', 'mutationType', 'subscriptionType'];

export const mergeSchemas = (schemaMap, options) => {

  assertOptionsValid(options);

  const {schema,extensions} = Object.keys(schemaMap).reduce(({schema,extensions}, key) => {
    const source = jsonToSchema(key, schemaMap[key]);
    return Object.keys(source.types).reduce(({schema, extensions}, typeName) => {
      const {type,extensions:typeExtensions} = mergeType(schema, source, typeName);
      return {
        schema: setIn(schema, ['types', type.name], type),
        extensions: update(extensions, type.name, exs => mergeExtensions(exs, typeExtensions))
      };
    }, {schema,extensions});
  }, {schema: emptySchema(options), extensions: { }});

  return {
    schema: {
      data: {
        __schema: {
          ...into({}, pairs(pick(schema, ...ROOT_TYPES)).map(([type,name]) => [type, {name}])),
          types: values(schema.types)
        }
      }
    },
    config: {
      ...pick(schema, ...ROOT_TYPES),
      extensions
    }
  };

}

export const createCompositeSchema = (schemaMap, options) => mergeSchemas(schemaMap, options)

// empty object => undefined
const mergeExtensions = (exsA, exsB) => {
  const exs = {...exsA, ...exsB};
  if (Object.keys(exs).length > 0) {
    return exs;
  }
}

const mergeType = (destinationSchema, sourceSchema, typeName) => {
  const source = sourceSchema.types[typeName];

  if (implementsNode(source)) {
    return mergeExtendableType(destinationSchema, sourceSchema, typeName);
  } else if (source.name === sourceSchema.queryType) {
    return mergeQueryType(destinationSchema, sourceSchema, typeName);
  } else if (source.name === sourceSchema.mutationType) {
    return mergeMutationType(destinationSchema, sourceSchema, typeName);
  } else if (source.name === sourceSchema.subscriptionType) {
    return mergeSubscriptionType(destinationSchema, sourceSchema, typeName);
  } else if (source.name === 'Node') {
    return mergeNodeType(destinationSchema, sourceSchema, typeName);
  } else if (source.name.startsWith('__')) {
    return { type: source }
  } else if (source.kind === 'SCALAR') {
    return { type: source }
  } else {
    return { type: source }
  }

}

const mergeExtendableType = (destinationSchema, sourceSchema, typeName) => {
  const destination = destinationSchema.types[typeName];
  const source = sourceSchema.types[typeName];

  const fields = source.fields.filter(f => f.name !== 'id');
  const extensions = into({}, fields.map(f => [f.name, sourceSchema.name]));

  if (destination) {
    return {
      type: mergeFields(destination, fields),
      extensions
    }
  } else {
    return {
      type: source,
      extensions: into({}, fields.map(f => [f.name, sourceSchema.name]))
    }
  }
}

const mergeNodeType = (destinationSchema, sourceSchema, typeName) => {
  const destination = destinationSchema.types[typeName];
  const source = sourceSchema.types[typeName];

  if (destination) {
    return {type:destination}
  } else {
    return {type:source}
  }

}

const mergeQueryType = (destinationSchema, sourceSchema, sourceTypeName) => {
  return extendType(destinationSchema, destinationSchema.queryType, sourceSchema, sourceTypeName, ['node']);
}

const mergeMutationType = (destinationSchema, sourceSchema, sourceTypeName) => {
  return extendType(destinationSchema, destinationSchema.mutationType, sourceSchema, sourceTypeName);
}

const mergeSubscriptionType = (destinationSchema, sourceSchema, sourceTypeName) => {
  return extendType(destinationSchema, destinationSchema.subscriptionType, sourceSchema, sourceTypeName);
}


const extendType = (destinationSchema, destinationTypeName, sourceSchema, sourceTypeName, exclude = []) => {

  const destination = destinationSchema.types[destinationTypeName];
  const source = sourceSchema.types[sourceTypeName];

  const fields = source.fields.filter(f => !exclude.includes(f.name));
  const extensions = into({}, fields.map(f => [f.name, sourceSchema.name]));

  if (destination) {
    return {
      type: mergeFields(destination, fields),
      extensions
    };
  } else {
    return {
      type: set(source, 'name', destinationTypeName),
      extensions
    };
  }

}

const mergeFields = (type, fields) => {
  return update(type, 'fields', fs => [...fs, ...fields]);
}

export const jsonToSchema = (name, schemaJson) => {
  const schema = schemaJson.data.__schema;

  // annoying but can't object.map so wutevs
  const rootTypes = into({},
    pairs(pick(schema, ...ROOT_TYPES))
    .map(([k,v]) => [k, v.name])
  );

  const typeMap = into({}, schema.types.map(type => [type.name, type]));

  return {
    name,
    ...rootTypes,
    types: typeMap
  };

}

export const emptySchema = options => {
  const rootTypes = pick(options, ...ROOT_TYPES);
  return {
    ...rootTypes,
    types: { }
  };
}

const implementsNode = type => {
  const interfaces = type.interfaces || [];
  return interfaces.some(i => i.name === 'Node');
}

const OPTION_KEYS = ['queryType', 'mutationType'];
const REQUIRED_OPTIONS = ['queryType'];

const assertOptionsValid = options => {
  const invalidOptionKeys = difference(Object.keys(options), OPTION_KEYS);

  if (invalidOptionKeys.length > 0) {
    throw new Error(`Invalid Options : unknown option(s) : ${invalidOptionKeys.join(', ')}`);
  }

  const missingRequiredKeys = difference(REQUIRED_OPTIONS, Object.keys(options));

  if (missingRequiredKeys.length > 0) {
    throw new Error(`Invalid Options : missing required option(s) : ${missingRequiredKeys.join(', ')}`);
  }

}
