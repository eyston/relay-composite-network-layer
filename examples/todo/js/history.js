import RelayStoreData from 'react-relay/lib/RelayStoreData';
import RelayQueryPath from 'react-relay/lib/RelayQueryPath';
import printRelayQuery from 'react-relay/lib/printRelayQuery';

import {List,Map} from 'immutable';

var REMOVE_KEYS = [
  '_storage'
];

var getId = (() => {
  var id = 1;
  return () => {
    return id++;
  }
})()

var copyStore = (value) => {
  if (Array.isArray(value)) {
    return List(value.map(v => copyStore(v)));
  } else if (value instanceof RelayQueryPath) {
    return Map({
      // TODO: serialize the path into something
    });
  } else if (value !== null && typeof(value) === 'object') {
    return Map(Object.keys(value)
      .filter(key => REMOVE_KEYS.indexOf(key) === -1)
      .map(key => [key, copyStore(value[key])])
    );
  } else {
    return value;
  }
}

class History {
  constructor() {
    this.subscribers = Map();
    this.changes = List();
  }

  watch(store) {
    // monkey patch store to send us change events ...
    // this is shitty / wrong / etc
    var handleQueryPayload = store.handleQueryPayload;
    store.handleQueryPayload = (query, response, forceIndex) => {
      handleQueryPayload.call(store, query, response, forceIndex);
      this.publish(store, 'HANDLE_QUERY_PAYLOAD', {query, response, forceIndex});
    }

    var handleUpdatePayload = store.handleUpdatePayload;
    store.handleUpdatePayload = (query, response, _ref) => {
      handleUpdatePayload.call(store, query, response, _ref);
      this.publish(store, 'HANDLE_UPDATE_PAYLOAD', {query, response, _ref});
    }

    // get initial store
    this.publish(store, 'INITIAL_STORE', {});
  }

  current() {
    return this.changes.last();
  }

  previous() {
    return this.changes.takeLast(2).first();
  }

  getChanges() {
    return this.changes;
  }

  publish(store, type, {query,response}) {
    var change = Map({
      id: getId(),
      store: copyStore(store.getQueuedStore()),
      type: type,
      date: new Date(),
      query: query ? printRelayQuery(query) : undefined,
      response: response
    });

    this.changes = this.changes.push(change);

    this.subscribers.forEach(cb => {
      cb(change, this.previous(), this.changes);
    });
  }

  subscribe(name, cb) {
    this.subscribers = this.subscribers.set(name, cb);
  }

  unsubscribe(name) {
    this.subscribers = this.subscribers.delete(name);
  }
}

var history = new History();
history.watch(RelayStoreData.getDefaultInstance());

export default history;
