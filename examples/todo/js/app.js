import 'babel-polyfill';

import React from 'react';
import ReactDOM from 'react-dom';

import Relay from 'react-relay';

import RelayLocalSchema from 'relay-local-schema';
import {schema} from '../data/local/schema';

import {splitRequestBySchema} from './split';
import {executeSplitRequest} from './execute';

import config from 'json!../data/config.json';

class RelayCompositeNetworkLayer {

  constructor(config) {
    this.config = config;
  }

  sendQueries(queryRequests) {
    const context = {...this.config};
    const splitRequests = queryRequests.map(request => splitRequestBySchema(request, context));

    splitRequests.forEach(request => executeSplitRequest(request, context));
  }

  sendMutation(mutationRequest) {
    throw new Error('mutations not supported yet');
  }

  supports(...options) {
    return false;
  }

}

Relay.injectNetworkLayer(new RelayCompositeNetworkLayer({
  ...config,
  layers: {
    server: new Relay.DefaultNetworkLayer('/graphql'),
    local: new RelayLocalSchema.NetworkLayer({schema})
  }
}));

const node = Relay.QL`
  query {
    viewer {
      totalCount
      todos(status: $status, first: $first) {
        edges {
          node {
            id
            text
          }
        }
      }
      ...on User {
        drafts(first: $first) {
          edges {
            node {
              id
              text
              author {
                name
              }
            }
          }
        }
      }
    }
  }
`;

// drafts(first: $first) {
//   edges {
//     node {
//       id
//       text
//       author {
//         id
//         name
//         drafts(first: $first) {
//           edges {
//             node {
//               id
//               text
//             }
//           }
//         }
//       }
//     }
//   }
// }


const query = Relay.createQuery(node, {status: 'any', first: 10});

Relay.Store.primeCache({ viewer: query }, state => {
  console.log(state, JSON.stringify(Relay.Store.readQuery(query), null, 2));
});
