import {fromJS,List,Map,Record,Set} from 'immutable';

const CompositeType = Record({
  type: undefined,
  schemas: Set(),
  extensions: Map()
});

export const createCompositeSchema = (schemaMap, options) => {
  const compositeTypeMap = fromJS(schemaMap).entrySeq().reduce((composite, [name, schema]) => {
    return mergeSchema(composite, name, schema, options);
  }, Map());

  return {
    schema: typeMapToSchema(compositeTypeMap, options),
    config: typeMapToConfig(compositeTypeMap, options)
  };
}

const typeMapToSchema = (typeMap, options) => {
  return {
    data: {
      __schema: {
        queryType: { name: options.queryType },
        mutationType: null,
        subscriptionType: null,
        types: typeMap.valueSeq().map(t => t.type).toJS()
      }
    }
  };
}

const typeMapToConfig = (typeMap, options) => {
  return {
    queryType: options.queryType,
    extensions: Map(typeMap.valueSeq()
      // .filter(t => filterType(t, options))
      .filter(t => !t.extensions.isEmpty())
      .map(t => [t.type.get('name'), t.extensions])
    ).toJS()
  };
}

// ... only deliver the minimumally required extensions
const filterType = (type, options) => {
  if (options.verbse || type.type.get('name') === options.queryType) {
    return true
  } else {
    return type.schemas.size > 1
      || (type.schemas.size === 1 && type.schemas.has(options.queryType));
  }
}

const mergeSchema = (composite, schemaName, schema, options) => {
  // TODO: create mutation type

  const queryTypeName = schema.getIn(['data', '__schema', 'queryType', 'name']);

  return schema.getIn(['data', '__schema', 'types'])
    .reduce((composite, type) => {
      if (type.get('name') === 'Node') {
        return composite.update(type.get('name'),
          compositeType => mergeNodeType(compositeType, schemaName, type)
        );
      } else if (type.get('name') === queryTypeName) {
        return composite.update(options.queryType,
          createCompositeType(options.queryType, type, ['node']),
          compositeType => mergeQueryType(compositeType, schemaName, type)
        );
      } else {
        return composite.update(type.get('name'),
          compositeType => mergeType(compositeType, schemaName, type)
        );
      }
    }, composite);
}

const mergeNodeType = (composite, schemaName, type) => {
  if (composite) {
    return composite
      .updateIn(['type', 'possibleTypes'], pt => pt.add(...type.get('possibleTypes')))
      .update('schemas', schemas => schemas.add(schemaName));
  } else {
    return CompositeType({type})
      .updateIn(['type', 'possibleTypes'], pt => Set(pt))
      .update('schemas', schemas => schemas.add(schemaName));
  }
}

const mergeQueryType = (composite, schemaName, type) => {
  return type
    .get('fields')
    .filter(field => field.get('name') !== 'node')
    .reduce((composite, field) => mergeField(composite, schemaName, field), composite)
    .update('schemas', schemas => schemas.add(schemaName));
}

// meh
const createCompositeType = (name, typeTemplate, keepFields) => {
  return CompositeType({
    type: typeTemplate
      .set('name', name)
      .update('fields', fields => fields.filter(field => keepFields.includes(field.get('name'))))
  });
}

const mergeType = (composite, schemaName, type) => {
  if (composite && composite.getIn(['type', 'kind']) !== type.get('kind')) {
    throw new Error('Invalid Extension: non-matching types with the same name');
  }

  if (type.get('kind') === 'SCALAR' || type.get('name').startsWith('__')) {
    return composite || CompositeType({type});
  } else if (implementsNodeInterface(type)) {
    const compositeType = composite || createCompositeType(type.get('name'), type, ['id']);
    return type
      .get('fields')
      .filter(field => field.get('name') !== 'id')
      .reduce((composite, field) => mergeField(composite, schemaName, field), compositeType)
      .update('schemas', schemas => schemas.add(schemaName));
  } else if (composite) {
    if (!composite.get('type').equals(type)) {
      throw new Error(`Invalid Extension: multiple schemas with type ${type.get('name')} but different definitions.`);
    }

    return composite;
  } else {
    return CompositeType({type});
  }
}

const mergeField = (composite, schemaName, field) => {
  if (composite.extensions.has(field.get('name'))) {
    throw new Error(`Invalid Extension: multiple schemas with field ${field.get('name')} on ${composite.type.get('name')}`);
  }

  return composite
    .updateIn(['type', 'fields'], fields => fields.push(field))
    .setIn(['extensions', field.get('name')], schemaName);
}

const implementsNodeInterface = type => {
  const interfaces = type.get('interfaces');
  return interfaces && interfaces.some(i => i.get('name') === 'Node');
}
