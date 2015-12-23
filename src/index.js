// export default class RelayCompositeNetworkLayer {
//
//   constructor(defaultLayer) {
//     this.defaultLayer = defaultLayer;
//   }
//
//   sendMutation(mutationRequest) {
//     console.log('mutation request', mutationRequest);
//     return this.defaultLayer.sendMutation(mutationRequest);
//   }
//
//   sendQueries(queryRequests) {
//     console.log('query requests', queryRequests);
//     return this.defaultLayer.sendQueries(queryRequests);
//   }
//
//   supports(...options) {
//     console.log('options', ...options);
//     return this.defaultLayer.supports(...options);
//   }
// }

import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLUnionType,
  GraphQLInterfaceType,
  GraphQLString,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull
} from 'graphql';

import {parse} from 'graphql/language/parser';

let document = parse(`
extend type User {
  active: Boolean
}
`, { noLocation: true, noSource: true });

console.log(JSON.stringify(document, null, 2));

const ExtendedUserType = extendType('User', () => ({
  active: { type: GraphQLBoolean }
}));

const UserType = new GraphQLObjectType({
  name: 'User',
  fields: () => ({
    active: { type: GraphQLBoolean }
  })
});


const Query = new GraphQLOBjectType({

});


let query = `
query {
  viewer {
    messages {
      text
    }
    drafts {
      text
    }
  }
}
`;

let serverQuery = `
query {
  viewer {
    messages {
      text
    }
  }
}
`
let clientQuery = `
query {
  node(id: $viewerId) {
    drafts {
      text
    }
  }
}
`;

// schema: pass this to relay
// extensions: pass this to composite network layer
const {schema, extensions} = mergeSchemas(schemaJson, {
  client: clientJson
});

const extensions = [{
  type: 'User',
  field: 'active',
  schema: 'client'
}];

const enterField = (node, {extensions}) => {
  const extension = getExtension(extensions, node);
  if (extension) {

  } else {
    return node;
  }
}

const queryPlan = {
  query: RelayQuery,
  schema: 'default',
  children: [{
    path: ['viewer'],
    query: RelayQuery,
    schema: 'client',
    children: []
  }]
};

const sendChildren = (response, children) => {
  let data = response.data;
  return children.map(child => {
    let nodeId = getIn(data, child.path);
    let networkLayer = getNetworkLayer(child.schema);
    let request = buildRequest(child.query, { id: nodeId });
    return networkLayer.sendQueries([request]);
  });
}
