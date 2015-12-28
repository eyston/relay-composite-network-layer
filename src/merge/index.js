import {difference,intersect,into,pairs,pick,set,setIn,update,union,values} from '../utils';

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
  } else {
    const destination = destinationSchema.types[typeName];

    assertEquivalent(destination, source);

    return {type: source};
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
  // TODO: merge the possible types
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
  const duplicateFields = intersect(type.fields.map(f => f.name), fields.map(f => f.name));
  if (duplicateFields.length > 0) {
    throw new Error(`Invalid Merge : type ${type.name} has definitions with duplicate fields: ${duplicateFields.join(', ')}`);
  }

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

/// HIDEOUS BUT UNDERSTANDABLE ///

const assertEquivalent = (destination, source) => {
  if (!destination) {
    return;
  }

  if (source.kind !== destination.kind) {
    throw new Error(`Merge Exception : type ${typeName} has definitions of different kinds : ${destination.kind}, ${source.kind}`);
  }

  const kind = destination.kind;

  switch(kind) {
    case 'UNION':
      throw new Error(`Merge Exception : merging UNION types is not supported : ${destination.name}`);
    case 'INTERFACE':
      throw new Error(`Merge Exception : merging INTERFACE types is not supported : ${destination.name}`);
    case 'OBJECT':
      assertObjectsEquivalent(destination, source);
      break;
    case 'INPUT_OBJECT':
      assertInputObjectsEquivalent(destination, source);
      break;
    case 'ENUM':
      assertEnumsEquivalent(destination, source);
      break;
    case 'SCALAR':
      // nothing to assert for scalars
      break;
    default:
      throw new Error(`Merge Exception : unsupported type kind ${kind} : file issue please, thanks friend!`);
  }
}


// OBJECT
// kind
// name
// description
// fields
// inputFields
// interfaces
// enumValues
// possibleTypes

const assertObjectsEquivalent = (objectA, objectB) => {
  const unmatchedFields = symmetricDifference(objectA.fields, objectB.fields, 'name');

  if (unmatchedFields.length > 0) {
    throw new Error(`Invalid Merge : OBJECT type ${objectA.name} has duplicate definitions with different fields : ${unmatchedFields.join(', ')}.`);
  }

  const fieldError = objectA.fields.reduce((error, fieldA) => {
    if (error) {
      return error;
    } else {
      const fieldB = objectB.fields.find(f => f.name === fieldA.name);
      return validateFieldsEquivalent(fieldA, fieldB);
    }
  }, null);

  if (fieldError) {
    throw new Error(`Invalid Merge : OBJECT type ${objectA.name} has non-equivalent fields : ${fieldError}`);
  }

}

const assertInputObjectsEquivalent = (objectA, objectB) => {
  const unmatchedFields = symmetricDifference(objectA.inputFields, objectB.inputFields, 'name');

  if (unmatchedFields.length > 0) {
    throw new Error(`Invalid Merge : INPUT_OBJECT type ${objectA.name} has duplicate definitions with different fields : ${unmatchedFields.join(', ')}.`);
  }

  const fieldError = objectA.inputFields.reduce((error, fieldA) => {
    if (error) {
      return error;
    } else {
      const fieldB = objectB.inputFields.find(f => f.name === fieldA.name);
      return validateFieldsEquivalent(fieldA, fieldB);
    }
  }, null);

  if (fieldError) {
    throw new Error(`Invalid Merge : INPUT_OBJECT type ${objectA.name} has non-equivalent fields : ${fieldError}`);
  }

}

const assertEnumsEquivalent = (enumA, enumB) => {
  const unmatchedValues = symmetricDifference(enumA.enumValues, enumB.enumValues, 'name');

  if (unmatchedValues.length > 0) {
    throw new Error(`Invalid Merge : ENUM type ${enumA.name} has duplicate definitions with different values : ${unmatchedValues.join(', ')}.`);
  }

}


// FIELD
// name
// description
// args
// type
// isDeprecated
// deprecationReason

const validateFieldsEquivalent = (fieldA, fieldB) => {
  // make sure args equivalent
  const unmatchedArgs = symmetricDifference(fieldA.args, fieldB.args, 'name');

  if (unmatchedArgs.length > 0) {
    return `field ${fieldA.name} has duplicate definitions with different args : ${unmatchedArgs.join(', ')}.`;
  }

  const argError = fieldA.args.reduce((error, argA) => {
    if (error) {
      return error;
    } else {
      const argB = fieldB.args.find(a => a.name === argA.name);
      return validateArgsEquivalent(argA, argB);
    }
  }, null);

  if (argError) {
    return `field ${fieldA.name} non-equivalent args : ${argError}`;
  }

  // make sure type equivalent
  const typeError = validateTypesEquivalent(fieldA.type, fieldB.type);
  if (typeError) {
    return `field ${fieldA.name} non-equivalent types : ${typeError}`;
  }

}


// ARG
// name
// description
// type
// defaultValue

const validateArgsEquivalent = (argA, argB) => {

  if (argA.defaultValue !== argB.defaultValue) {
    return `args have different default values : ${argA.defaultValue}, ${argB.defaultValue}`;
  }

  const typeError = validateTypesEquivalent(argA.type, argB.type);
  if (typeError) {
    return `args non-equivalent types : ${typeError}`;
  }
}


// TYPE
// kind
// name
// ofType

const validateTypesEquivalent = (typeA, typeB) => {
  if (!typeA && !typeB) {
    return null;
  }

  if (!typeA || !typeB) {
    return `types do not match : ${typeA}, ${typeB}`;
  }

  if (typeA.kind !== typeB.kind) {
    return `type kinds do not match : ${typeA.kind}, ${typeB.kind}`;
  }

  if (typeA.name !== typeB.name) {
    return `type names do not match : ${typeA.name}, ${typeB.name}`;
  }

  const typeOfError = validateTypesEquivalent(typeA.ofType, typeB.ofType);
  if (typeOfError) {
    return `type typeOf do not match : ${typeOfError}`;
  }
}


const symmetricDifference = (thingsA, thingsB, idProp) => {
  const idsA = thingsA.map(t => t[idProp]);
  const idsB = thingsB.map(t => t[idProp]);

  return union(
    difference(idsA, idsB),
    difference(idsB, idsA)
  );
}
