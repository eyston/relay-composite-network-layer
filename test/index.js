import 'babel-polyfill';

import expect from 'expect';

import Relay from 'react-relay';
import RelayLocalSchema from 'relay-local-schema';

import {schema as localSchema} from '../data/local/schema';
import {schema as serverSchema} from '../data/server/schema';

import RelayCompositeNetworkLayer from '../src';

import config from 'json!../data/config.json';

const DEBUG = false;

class RelayLoggingNetworkLayer {
  constructor(name, layer) {
    this.name = name;
    this.layer = layer;
  }

  sendQueries(queryRequests) {
    queryRequests.forEach(request => {
      if (DEBUG) { console.log(this.name, request.getID(), 'request', request.getQueryString()); }
      request.then(response => {
        if (DEBUG) { console.log(this.name, request.getID(), 'response', JSON.stringify(response, null, 2)); }
      });
    });

    return this.layer.sendQueries(queryRequests);
  }

  sendMutation(mutationRequest) {
    return this.layer.sendMutation(mutationRequest);
  }

  supports(...options) {
    return this.layer.supports(...options);
  }
}

// SUT
Relay.injectNetworkLayer(new RelayCompositeNetworkLayer({
  ...config,
  layers: {
    server: new RelayLoggingNetworkLayer('server', new RelayLocalSchema.NetworkLayer({schema: serverSchema})),
    local: new RelayLoggingNetworkLayer('local', new RelayLocalSchema.NetworkLayer({schema: localSchema}))
  }
}));

describe('RelayCompositeNetworkLayer', () => {

  it('it can query a single schemas', async () => {

    const node = Relay.QL`
      query {
        viewer {
          name
        }
      }
    `;

    const query = Relay.createQuery(node, {});

    const response = await getQuery(query);

    expect(removeDataIds(response)).toEqual({
      name: 'Huey'
    });

  });

  it('can query multiple schemas', async () => {

    const node = Relay.QL`
      query {
        viewer {
          name
          drafts(first: $first) {
            edges {
              node {
                text
              }
            }
          }
        }
      }
    `;

    const query = Relay.createQuery(node, {first: 10});

    const response = await getQuery(query);

    expect(removeDataIds(response)).toEqual({
      name: 'Huey',
      drafts: {
        edges: [{
          node: {
            text: 'This is a draft'
          }
        },{
          node: {
            text: 'This is another draft'
          }
        }]
      }
    });

  });

  it('can traverse between multiple schemas', async () => {

    const node = Relay.QL`
      query {
        viewer {
          name
          drafts(first: $first) {
            edges {
              node {
                text
                author {
                  name
                }
              }
            }
          }
        }
      }
    `;

    const query = Relay.createQuery(node, {first: 10});

    const response = await getQuery(query);

    expect(removeDataIds(response)).toEqual({
      name: 'Huey',
      drafts: {
        edges: [{
          node: {
            text: 'This is a draft',
            author: {
              name: 'Huey'
            }
          }
        },{
          node: {
            text: 'This is another draft',
            author: {
              name: 'Huey'
            }
          }
        }]
      }
    });

  });

  it('can query multiple schemas on a single node - xxx', async () => {

    const node = Relay.QL`
      query {
        node(id: $id) {
          ... on User {
            age
            gender
            draftCount
          }
        }
      }
    `;

    const query = Relay.createQuery(node, {id: 'VXNlcjox'});

    const response = await getQuery(query);

    expect(removeDataIds(response)).toEqual({
      age: 13,
      gender: 'male',
      draftCount: 2
    });

  });


});

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

const getQuery = query => {
  return new Promise((resolve, reject) => {
    Relay.Store.primeCache({ viewer: query }, state => {
      if (state.error) {
        reject(state.error);
      } else if (state.done) {
        resolve(Relay.Store.readQuery(query)[0]);
      }
    });
  });
}
