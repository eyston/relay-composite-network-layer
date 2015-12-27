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
  getDrafts,
  addDraft
} from './database';

const {nodeInterface, nodeField} = nodeDefinitions(
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

const DraftType = new GraphQLObjectType({
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

const {
  connectionType: DraftsConnection,
  edgeType: DraftEdge,
} = connectionDefinitions({
  name: 'Draft',
  nodeType: DraftType,
});


const UserType = new GraphQLObjectType({
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

const Root = new GraphQLObjectType({
  name: 'Root',
  fields: {
    node: nodeField
  }
});

const AddDraftMutation = mutationWithClientMutationId({
  name: 'AddDraft',
  inputFields: {
    text: { type: new GraphQLNonNull(GraphQLString) }
  },
  outputFields: {
    edge: {
      type: DraftEdge,
      resolve: draft => {
        return {
          cursor: cursorForObjectInConnection(getDrafts(), draft),
          node: draft
        };
      }
    },
    author: {
      type: UserType,
      resolve: ({authorId}) => getUser(authorId)
    }
  },
  mutateAndGetPayload: ({text}) => {
    const draftId = addDraft(text);
    return getDraft(draftId);
  }
});

const Mutation = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    addDraft: AddDraftMutation
  }
});

export var schema = new GraphQLSchema({
  query: Root,
  mutation: Mutation
});
