import 'babel-polyfill';

import expect from 'expect';

import Relay from 'react-relay';
import RelayLocalSchema from 'relay-local-schema';

import {schema as localSchema} from '../data/local/schema';
import {schema as serverSchema} from '../data/server/schema';

import RelayCompositeNetworkLayer from '../src';

import config from 'json!../data/config.json';

Relay.injectNetworkLayer(new RelayCompositeNetworkLayer({
  ...config,
  layers: {
    server: new RelayLocalSchema.NetworkLayer({schema: serverSchema}),
    local: new RelayLocalSchema.NetworkLayer({schema: localSchema})
  }
}));

const isObject = obj => {
  return typeof obj === 'object' && obj !== null;
}

const removeDataIds = obj => {
  if (isObject(obj)) {
    delete obj.__dataID__;
    Object.keys(obj).forEach(key => obj[key] = removeDataIds(obj[key]));
    return obj;
  } else if (Array.isArray(obj)) {
    obj.forEach(item => removeDataIds(item));
    return obj;
  } else {
    return obj;
  }
}


describe('RelayCompositeNetworkLayer', () => {

  it('kitchen sink', async () => {

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

    const query = Relay.createQuery(node, {status: 'any', first: 10});

    const request = new Promise((resolve, reject) => {
      Relay.Store.primeCache({ viewer: query }, state => {
        if (state.error) {
          reject(state.error);
        } else if (state.done) {
          resolve(Relay.Store.readQuery(query)[0]);
        }
      });
    });

    const response = await request;

    expect(removeDataIds(response)).toEqual({
      totalCount: 2,
      todos: {
        edges: [
          {
            node: {
              id: "VG9kbzow",
              text: "Taste JavaScript"
            }
          },
          {
            node: {
              id: "VG9kbzox",
              text: "Buy a unicorn"
            }
          }
        ]
      },
      drafts: {
        edges: [
          {
            node: {
              id: "RHJhZnQ6MA==",
              text: "This is a draft",
              author: {
                name: "Huey"
              }
            }
          },
          {
            node: {
              id: "RHJhZnQ6MQ==",
              text: "This is another draft",
              author: {
                name: "Huey"
              }
            }
          }
        ]
      }
    });

  })

})
