import RelayQuery from 'react-relay/lib/RelayQuery';

export const splitRequestBySchema = (request, context) => {
  const query = request.getQuery();

  if (query instanceof RelayQuery.Root) {
    // const splitQuery = splitRootBySchema(query, context);
    const splitQueries = splitRootBySchema(query, context);

    return {
      queries: splitQueries,
      request
    };
  } else {
    throw new Error('unhandled query');
  }
}

const collectChildren = (children, context) => {
  const schema = context.schema;
  const subQueries = subQueriesBySchema(children, context);

  const schemaChildren = (subQueries[schema] || []).map(sub => sub.node);

  const childrenDependents = (subQueries[schema] || []).reduce((dependents, child) => {
    return dependents.concat(child.dependents);
  }, []);

  const dependents = Object.keys(subQueries)
    .filter(s => s !== schema)
    .reduce((dependents, schema) => dependents.concat(subQueries[schema]), childrenDependents)

  return {
    children: schemaChildren,
    dependents
  };
}

const subQueriesBySchema = (children, context) => {
  return children
    .map(child => splitNodeBySchema(child, context))
    .reduce((grouped, sub) => ({
      ...grouped,
      [sub.schema]: (grouped[sub.schema] || []).concat(sub)
    }), {});
}

const splitRootBySchema = (root, context) => {
  if (root.getFieldName() === 'node') {
    // hack incoming
    const fragment = root.getChildren().find(c => c instanceof RelayQuery.Fragment);
    const subQueries = subQueriesBySchema(fragment.getChildren(), {
      ...context,
      parent: fragment.getType()
    });

    const key = root.getFieldName();


    return Object.keys(subQueries)
      .filter(schema => schema !== 'undefined') // meh ...
      .map(schema => {
        const queries = subQueries[schema];
        return {
          query: root.clone(root.getChildren().map(c => {
            if (c instanceof RelayQuery.Fragment) {
              return fragment.clone(queries.map(query => query.node));
            } else {
              return c;
            }
          })),
          schema,
          dependents: queries
            .reduce((dependents, query) => dependents.concat(query.dependents), [])
            .map(d => ({...d, path: [key].concat(d.path)}))
        };
      });
      // end hack
  } else {
    const schema = context.extensions[context.queryType][root.getFieldName()];
    // TODO: invariant on schema not being null
    const {children,dependents} = collectChildren(root.getChildren(), {
      ...context,
      parent: root.getType(),
      schema
    });

    const key = root.getFieldName();

    return [{
      query: root.clone(children),
      schema,
      dependents: dependents.map(d => ({...d, path: [key].concat(d.path)}))
    }];
  }
}

const splitNodeBySchema = (node, context) => {
  if (node instanceof RelayQuery.Field) {
    return splitFieldBySchema(node, context);
  } else if (node instanceof RelayQuery.Fragment) {
    return splitFragmentBySchema(node, context);
  } else {
    throw new Error(`unhandled node type ${typeof node}`);
  }
}

const splitFieldBySchema = (field, context) => {
  const {schema,parent,extensions} = context;

  const fieldSchema = (extensions[parent] || {})[field.getSchemaName()] || schema;
  const {children,dependents} = collectChildren(field.getChildren(), {
    ...context,
    parent: field.getType(),
    schema: fieldSchema
  });

  const key = field.getSerializationKey();

  return {
    node: field.clone(children),
    parent,
    schema: fieldSchema,
    path: [],
    dependents: dependents.map(d => ({...d, path: [key].concat(d.path)}))
  };
}

const splitFragmentBySchema = (fragment, context) => {
  const {schema,parent,extensions} = context;

  const {children,dependents} = collectChildren(fragment.getChildren(), {
    ...context,
    parent: fragment.getType()
  });

  return {
    node: fragment.clone(children),
    parent,
    schema,
    path: [],
    dependents
  }
}
