RelayCompositeNetworkLayer
==========================

The `RelayCompositeNetworkLayer` is a [Relay Network Layer](https://facebook.github.io/relay/docs/guides-network-layer.html) which can be made of many different Network Layers each with their own schema.  This is accomplished by merging multiple schemas into a single schema.  Relay then generates appropriate queries using this schema while the `RelayCompositeNetworkLayer` splits and sends the queries by schema.

The main use case for this is allowing a *local* and *server* schema.

Installation
============

`npm install relay-composite-network-layer`

It has a peer dependency on `react-relay` (the version is pretty strict at the moment but probably could be loosened!).

Usage
=====

The first step is merging the schema.  You can add a build step or make it part of your `update-schema` script.

```js
const {schema,config} = createCompositeSchema({
  // name / value pairs of schemas
  server: serverSchema,
  local: localSchema
}, {
  // names for the query and mutation type of the output schema
  // these can be the same names as your input schemas
  queryType: 'Query',
  mutationType: 'Mutation'
});
```

The outputs of `schema` and `config` need to be saved to `json` files for consumption.  Configure the `babelRelayPlugin` to use the saved merged `schema`.  With the schemas merged and `Relay` configured you should be able to write / parse queries which hit multiple schemas.

A full script example is at the end of the README.

The next step is to create the `RelayCompositeNetworkLayer` on the client.

```js
const compositeNetworkLayer = new RelayCompositeNetworkLayer({
  // config is the output of the `createCompositeSchema` function
  ...config,
  // key / value pairs of schema
  // names need to match the call to `createCompositeSchema`
  layers: {
    server: new Relay.DefaultNetworkLayer('/graphql'),
    local: new RelayLocalSchema.NetworkLayer({schema: localSchema})
  }
});
```

Here we are creating a composite network layer which has two schemas.  The `server` schema uses the default network layer and makes network requests to the `/graphql` endpoint.  The `local` schema uses the [RelayLocalSchema](https://github.com/relay-tools/relay-local-schema) library to execute `graphql-js` on the client.

Finally inject the network layer into `Relay`.

```js
Relay.injectNetworkLayer(compositeNetworkLayer);
```

That should be it!

Limitations
===========

The main limitations are around merging.

You can only merge `node` interface objects.  This means if you define *User* in multiple schemas each schema *User* needs an `id` field and needs to be able to be fetched from the `node` root query field.  Other objects which appear in multiple schemas must be equivalent (same fields) or the merge will fail.

Enum's, Scalar's, and Input Object's also must be equivalent if they are found with the same name in multiple schemas.

Union's and Interface's, with the exception of the `node` interface, are not allowed to be in multiple schemas.

Fields on the Query, Mutation, and Subscription field are also merged.  These names must be unique.  For example most schemas have a `viewer` type but this field must only exist in one schema.  Other schemas navigate to the `viewer` by querying `node` with the `viewer` id.

Some of these restrictions could be lifted -- I just haven't thought around the use cases!

Example
=======

I'm going to use the example from the github issue for relay local data: https://github.com/facebook/relay/issues/114

We have the following query:

```
query {
  viewer {
    name,                     # server field
    drafts(first: 10) {       # client-only field
      edges { node { title } }
    }
  }
}
```

This means we have the following two schemas.

**Server**

```
type User : Node {
  id: ID!
  name: String
}

type Query {
  viewer: User
  node: Node
}
```

**Local**

```
type User : Node {
  id: ID!
  drafts: DraftConnection
}

type Draft : Node {
  id: ID!
  title: String
}

type DraftConnection {
  edges: DraftEdge
}

type DraftEdge {
  node: Draft
}

type Query {
  node: Node
}
```

The type `User` is defined in both schemas.  Both schemas also have a query root type named *Query* but the names do not have to match.  Only the server schema has the `viewer` field.

When merged we get a third schema.

**Composite**

```
type User : Node {
  id: ID!
  name: String
  drafts: DraftConnection
}

type Draft : Node {
  id: ID!
  title: String
}

type DraftConnection {
  edges: DraftEdge
}

type DraftEdge {
  node: Draft
}

type Query {
  viewer: User
  node: Node
}
```

This schema presents a unified view of the two schemas which Relay can use to generate queries.

Lets follow the execution of the query.

```
query {
  viewer {
    name,                     # server field
    drafts(first: 10) {       # client-only field
      edges { node { title } }
    }
  }
}
```

The composite network layer first splits the query by schema.  This results in multiple queries with some being dependent on the result of others.


**q1** *server*

```
query {
  viewer {
    id
    name
  }
}
```

This query is not dependent on anything.

**q2** *local*

```
query {
  node(id: $id) {
    id
    __typename
    ... on User {
      drafts(first: 10) {
        edges { node { title } }
      }
    }
  }
}
```

This query is dependent on the `viewer.id` result from **q1**.  It will be run sequentially following **q1**.

The queries are then executed.

**q1**

```
{
  data: {
    viewer: {
      id: 1
      name: 'Huey'
    }
  }
}
```

**q2**

```
{
  data: {
    node: {
      id: 1
      __typename: 'User',
      drafts: {
        edges: [{
          node: { title: 'Taste Javascript'},
          node: { title: 'Paint a self portrait'}
        }]
      }
    }
  }
}
```

Finally the results are merged and passed back to Relay.

```
{
  data: {
    viewer: {
      id: 1
      __typename: 'User',
      name: 'Huey'
      drafts: {
        edges: [{
          node: { title: 'Taste Javascript'},
          node: { title: 'Paint a self portrait'}
        }]
      }
    }
  }
}
```

Relay cares not that part of the query has been local and part of it has been remote.

Mutations
=========

Mutations are treated just like queries.  As far as I know Relay only allows a single field on a mutation so no extra work is needed at the network layer for coordination.  The mutation field schema is looked up and the mutation is sent to the proper schema network layer.  The mutation payload is then just like a query and can come from multiple schemas.

```
mutation {
  addDraft(input: $input) {   # client field
    author {
      name                    # server field
      draftCount
    }
    edge {
      node {
        title
      }
    }
    name,
    drafts(first: 10) {
      edges { node { title } }
    }
  }
}
```

Merge Script
------------

Here is the full script:

```js
import fs from 'fs';
import path from 'path';

import localSchema from '../data/local/schema.json';
import serverSchema from '../data/server/schema.json';

import {createCompositeSchema} from 'relay-composite-network-layer/lib/merge';

const {schema,config} = createCompositeSchema({
  server: serverSchema,
  local: localSchema
}, {
  queryType: 'Query',
  mutationType: 'Mutation'
});

fs.writeFileSync(
  path.join(__dirname, '../data/', 'schema.json'),
  JSON.stringify(schema, null, 2)
);

fs.writeFileSync(
  path.join(__dirname, '../data/', 'config.json'),
  JSON.stringify(config, null, 2)
);
```



TODO
====

- chained mutation
  - AddTodo / DeleteDraft

- remove graphql as a peer
