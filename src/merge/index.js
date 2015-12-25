import {difference,getIn,intersect,into,pairs,pick,set,update,values} from '../utils';

// CompositeType = {
//   type: GraphQLType,
//   extensions: { [fieldName]: schemaName },
//   schemas: [schemaName]
// }

export const createCompositeSchema = (schemaMap, options) => {
  assertOptionsValid(options);

  const compositeTypeMap = Object.keys(schemaMap).reduce((compositeTypeMap, name) => {
    const schema = schemaMap[name].data.__schema;
    const queryType = getIn(schema, ['queryType', 'name']);

    return schema.types.reduce((compositeTypeMap, type) => {
      if (type.name === queryType) {
        return update(compositeTypeMap, options.queryType,
          ct => mergeQueryType(ct, name, set(type, 'name', options.queryType))
        );
      } else {
        return update(compositeTypeMap, type.name, ct => mergeType(ct, name, type));
      }
    }, compositeTypeMap);
  }, {});

  return {
    schema: {
      data: {
        __schema: {
          ...into({}, pairs(pick(options, 'queryType')).map(([type,name]) => [type, {name}])),
          types: values(compositeTypeMap).map(ct => ct.type)
        }
      }
    },
    config: {
      ...pick(options, 'queryType'),
      extensions: into({}, values(compositeTypeMap).filter(ct => ct.extensions).map(({type,extensions}) => [type.name, extensions]))
    }
  };
}

const mergeType = (compositeType, schemaName, sourceType) => {

  if (compositeType && (compositeType.type.kind !== sourceType.kind)) {
    const {schemas} = compositeType;
    throw new Error(`Invalid Extension: type ${sourceType.name} with non-matching kinds from schemas ${[...schemas, schemaName].join(', ')}.`);
  }

  if (implementsNode(sourceType)) {
    return mergeTypeFields(compositeType, schemaName, sourceType, ['id']);
  } else if (!compositeType) {
    return {type: sourceType, schemas: [schemaName]};
  } else {
    //TODO: assertTypesMatch(compositeType.type, sourceType);
    return {
      ...compositeType,
      schemas: [...compositeType.schemas, schemaName]
    };
  }

}

const mergeQueryType = (compositeType, schemaName, sourceType) => {
  return mergeTypeFields(compositeType, schemaName, sourceType, ['node']);
}

const mergeTypeFields = (compositeType, schemaName, sourceType, excludeFields=[]) => {
  const sourceFields = sourceType.fields.filter(field => !excludeFields.includes(field.name));
  const sourceExtensions = into({}, sourceFields.map(field => [field.name, schemaName]));

  if (compositeType) {
    const {type,extensions,schemas} = compositeType;

    const multipleExtensions = intersect(Object.keys(sourceExtensions), Object.keys(extensions));
    if (multipleExtensions.length > 0) {
      const fieldName = multipleExtensions[0];
      throw new Error(`Invalid Extension: type ${type.name} with field ${fieldName} in multiple schemas -- ${[...schemas, schemaName].join(', ')}`);
    }

    return {
      type: update(type, 'fields', fields => [...fields, ...sourceFields]),
      extensions: {...extensions, ...sourceExtensions},
      schemas: [...schemas, schemaName]
    };
  } else {
    return {
      type: sourceType,
      extensions: sourceExtensions,
      schemas: [schemaName]
    };
  }
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
