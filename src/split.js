import RelayQuery from 'react-relay/lib/RelayQuery';

import {getIn,update} from './utils';

const ANY_SCHEMA = '__ANY__';

// CompositeRequest = {
//   queries: [CompositeQuery],
//   request
// }

export const createCompositeRequest = (request, context) => {
  const query = request.getQuery();
  const queries = splitBySchema(query, context);

  return {
    queries,
    request
  };
}

export const createMutationRequest = (request, context) => {
  const mutation = request.getMutation();

  return {
    mutation: splitBySchema(mutation, context),
    request
  };
}

const splitBySchema = (query, context) => {
  if (query instanceof RelayQuery.Root) {
    return createCompositeQuery(query, context);
  } else if (query instanceof RelayQuery.Field) {
    return createCompositeFieldField(query, context);
  } else if (query instanceof RelayQuery.Fragment) {
    return createCompositeFragmentField(query, context);
  } else if (query instanceof RelayQuery.Mutation) {
    return createCompositeMutation(query, context);
  } else {
    // how do I print out wtf the type is lulz
    throw new Error('unhandled RelayQuery type');
  }
}

// CompositeQuery = {
//   query: RelayQuery
//   schema,
//   dependents
// }

const createCompositeQuery = (root, context) => {

  const {extensions,queryType} = context;
  const field = root.getFieldName();
  const schema = extensions[queryType][field] || ANY_SCHEMA;

  const fragments = createFragments(root.getChildren(), {
    ...context,
    parent: root.getType(),
    schema
  });

  // query { node }
  if (schema === ANY_SCHEMA) {
    const {children,dependents} = collectFragments([field], schema, fragments);
    const oldFragment = children.find(c => c instanceof RelayQuery.Fragment);

    // pop dependencies of ANY_SCHEMA up into root queries
    return dependents.map(dep => {
      // inline ANY_SCHEMA fragments into each schema fragment
      const newFragment = oldFragment.clone([...oldFragment.getChildren(), ...dep.fragment.children]);
      return {
        query: root.clone(children.map(child => child === oldFragment ? newFragment : child)),
        schema: dep.fragment.schema,
        dependents: dep.fragment.dependents
      };
    });
  } else {
    const {children,dependents} = collectFragments([field], schema, fragments);

    return [{
      query: root.clone(children),
      schema,
      dependents
    }];
  }
}

// CompositeMutation = {
//   mutation: RelayMutation
//   schema,
//   dependents
// }

const createCompositeMutation = (mutation, context) => {

  const {extensions,mutationType} = context;
  const call = mutation.getCall();
  const field = call.name;
  const schema = extensions[mutationType][field];

  // TODO: invariant schema !== null

  const fragments = createFragments(mutation.getChildren(), {
    ...context,
    parent: mutation.getType(),
    schema
  });

  const {children,dependents} = collectFragments([field], schema, fragments);

  return {
    mutation: mutation.clone(children),
    schema,
    dependents
  };

}

// CompositeFragment = {
//   children,
//   type,
//   schema,
//   dependents
// }

const createFragments = (children, context) => {
  const {parent,schema} = context;

  return children
    .map(child => splitBySchema(child, context))
    .reduce((fragments, field) => {
      const {schema} = field;
      return update(fragments, schema, emptyFragment(parent, schema), fragment => addField(fragment, field))
    }, {});
}

const collectFragments = (path, schema, fragments) => {
  const children = getIn(fragments, [schema, 'children'], []);
  const dependents = Object.keys(fragments)
    .map(schema => fragments[schema])
    .reduce((deps, fragment) => {
      if (fragment.schema === schema) {
        return [...deps, ...fragment.dependents.map(d => increaseDepth(d, path))];
      } else {
        return [...deps, createDependentQuery(fragment, path)];
      }
    }, []);

  return {children,dependents,schema};
}

const emptyFragment = (type, schema) => ({
  type,
  schema,
  children: [],
  dependents: []
})

const addField = (fragment, field) => {
  return {
    ...fragment,
    children: [...fragment.children, field.node],
    dependents: [...fragment.dependents, ...field.dependents]
  };
}

// CompositeField = {
//   node,
//   schema,
//   dependents
// }

const createCompositeFieldField = (field, context) => {
  const {schema,parent,extensions} = context;

  const fieldSchema = getIn(extensions, [parent, field.getSchemaName()], schema);

  const fragments = createFragments(field.getChildren(), {
    ...context,
    parent: field.getType(),
    schema: fieldSchema
  });

  const key = field.getSerializationKey();
  const {children,dependents} = collectFragments([key], fieldSchema, fragments);

  return {
    node: field.clone(children),
    schema: fieldSchema,
    dependents
  };

}

const createCompositeFragmentField = (fragment, context) => {
  const {schema} = context;

  const fragments = createFragments(fragment.getChildren(), {
    ...context,
    parent: fragment.getType()
  });

  const {children,dependents} = collectFragments([], schema, fragments);

  return {
    node: fragment.clone(children),
    schema,
    dependents
  };
}

// CompositeDependentQuery = {
//   fragment,
//   path
// }

const createDependentQuery = (fragment, path) => {
  return {
    path,
    // sorta unsure if this covers it all ...
    fragment: update(fragment, 'dependents', deps => deps.map(d => increaseDepth(d, ['node'])))
  };
}

const increaseDepth = (dep, path) => {
  return {
    ...dep,
    path: [...path, ...dep.path]
  };
}
