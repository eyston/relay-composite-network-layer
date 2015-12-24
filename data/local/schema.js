import {
  GraphQLBoolean,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  GraphQLInterfaceType,
} from 'graphql';

import {
  connectionArgs,
  connectionDefinitions,
  connectionFromArray,
  cursorForObjectInConnection,
  fromGlobalId,
  globalIdField,
  mutationWithClientMutationId,
  nodeDefinitions,
  toGlobalId,
} from 'graphql-relay';

import {
  User,
  getUser,
  Draft,
  getDraft,
  getDrafts
} from './database';

var {nodeInterface, nodeField} = nodeDefinitions(
  (globalId) => {
    var {type, id} = fromGlobalId(globalId);
    if (type === 'User') {
      return getUser(id);
    } else if (type === 'Draft') {
      return getDraft(id);
    }
    return null;
  },
  (obj) => {
    if (obj instanceof User) {
      return UserType;
    } else if (obj instanceof Draft) {
      return DraftType;
    }
    return null;
  }
);

var DraftType = new GraphQLObjectType({
  name: 'Draft',
  fields: () => ({
    id: globalIdField('Draft'),
    text: { type: GraphQLString },
    author: {
      type: UserType,
      resolve: ({authorId}) => getUser(authorId)
    }
  }),
  interfaces: [nodeInterface]
});

var {
  connectionType: DraftsConnection,
  edgeType: GraphQLDraftEdge,
} = connectionDefinitions({
  name: 'Draft',
  nodeType: DraftType,
});


var UserType = new GraphQLObjectType({
  name: 'User',
  fields: () => ({
    id: globalIdField('User'),
    drafts: {
      type: DraftsConnection,
      args: connectionArgs,
      resolve: (obj, args) => connectionFromArray(getDrafts(), args)
    },
    draftCount: {
      type: GraphQLInt,
      resolve: () => getDrafts().length
    }
  }),
  interfaces: [nodeInterface]
});

var Root = new GraphQLObjectType({
  name: 'Root',
  fields: {
    node: nodeField
  }
});

export var schema = new GraphQLSchema({
  query: Root
});
