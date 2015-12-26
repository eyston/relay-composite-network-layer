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
    const schemaRootTypes = pick(schema, 'queryType', 'mutationType', 'subscriptionType');

    // we map queryType from source to destination name, e.g. ServerQuery -> Query
    const sourceToDestinationRootNames = into({}, pairs(schemaRootTypes)
      .map(([kind, {name:sourceName}]) => [sourceName, options[kind]])
    );

    return schema.types.reduce((compositeTypeMap, type) => {
      const typeName = sourceToDestinationRootNames[type.name] || type.name;
      return update(compositeTypeMap, typeName, ct => {
        if (!ct) {
          return createCompositeType(set(type, 'name', typeName), {...options, schema:name});
        } else {
          return mergeType(ct, type, {...options, schema:name});
        }
      });
    }, compositeTypeMap);
  }, {});

  const typeOptions = pick(options, 'queryType', 'mutationType', 'subscriptionType');

  const types = values(compositeTypeMap).map(ct => ct.type);

  const extensions = into({}, values(compositeTypeMap)
      .filter(ct => ct.extensions)
      .map(({type,extensions}) => [type.name, extensions])
  );

  return {
    schema: {
      data: {
        __schema: {
          ...into({}, pairs(typeOptions).map(([type,name]) => [type, {name}])),
          types
        }
      }
    },
    config: {
      ...typeOptions,
      extensions
    }
  };
}

const createCompositeType = (sourceType, options) => {
  const {schema} = options;
  return {
    type: sourceType,
    extensions: typeExtensions(sourceType, options),
    schemas: [schema]
  };
}

const mergeType = (compositeType, sourceType, options) => {
  const {type,schemas} = compositeType;
  const {schema} = options;

  // any other sanity checks we need here???
  if (type.kind !== sourceType.kind) {
    throw new Error(`Invalid Extension: type ${sourceType.name} with non-matching kinds from schemas ${[...schemas, schemaName].join(', ')}.`);
  }

  if (implementsNode(type)) {
    return mergeExpandableType(compositeType, sourceType, options);
  } else if (type.name === 'Node') {
    return mergeNodeType(compositeType, sourceType, options);
  } else if (type.name === options.queryType) {
    return mergeTypeFields(compositeType, sourceType, {...options, excludeFields: ['node']});
  } else if (type.name === options.mutationType) {
    return mergeTypeFields(compositeType, sourceType, options);
  } else if (type.name === options.subscriptionType) {
    return mergeTypeFields(compositeType, sourceType, options);
  } else if (type.name.startsWith('__')) {
    return {...compositeType, schemas: [...schemas, schema]};
  } else {
    //TODO: assertTypesEquivalent(type, sourceType);
    return {...compositeType, schemas: [...schemas, schema]};
  }

}

const mergeNodeType = ({type,schemas,...rest}, sourceType, {schema}) => ({
  ...rest,
  type: update(type, 'possibleTypes', pts => [...pts, ...sourceType.possibleTypes]),
  schemas: [...schemas, schema]
})

const mergeExpandableType = (compositeType, sourceType, options) => {
  return mergeTypeFields(compositeType, sourceType, {...options,excludeFields: ['id']});
}

const mergeTypeFields = (compositeType, sourceType, options) => {
  const {schema,excludeFields=[]} = options;
  const sourceFields = sourceType.fields.filter(field => !excludeFields.includes(field.name));
  const sourceExtensions = typeExtensions(sourceType, options);

  const {type,extensions,schemas,...rest} = compositeType;

  const fieldConflicts = intersect(type.fields.map(f => f.name),sourceFields.map(f => f.name));

  if (fieldConflicts.length > 0) {
    const fieldName = fieldConflicts[0];
    throw new Error(`Invalid Extension : type ${type.name} field ${fieldName} is defined by multiple schemas : ${[...schemas, schema].join(', ')}`);
  }

  return {
    ...rest,
    type: update(type, 'fields', fields => [...fields, ...sourceFields]),
    extensions: {...extensions, ...sourceExtensions},
    schemas: [...schemas, schema]
  };
}

const typeExtensions = (type, {schema,queryType,mutationType,subscriptionType}) => {
  if (implementsNode(type)) {
    return into({}, type.fields
      .filter(field => field.name !== 'id')
      .map(field => [field.name, schema])
    );
  } else if (type.name === queryType) {
    return into({}, type.fields
      .filter(field => field.name !== 'node')
      .map(field => [field.name, schema])
    );
  } else if (type.name === mutationType || type.name === subscriptionType) {
    return into({}, type.fields.map(field => [field.name, schema]));
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
