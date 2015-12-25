import Relay from 'react-relay';
import merge from 'lodash/object/merge';

import RelayQuery from 'react-relay/lib/RelayQuery';
import RelayQueryRequest from 'react-relay/lib/RelayQueryRequest';

import {flatten,setIn,updateIn} from '../utils';

export const executeCompositeRequests = async (compositeRequests, context) => {

  compositeRequests.forEach(async compositeRequest => {
    try {
      let responses = await Promise.all(compositeRequest.queries.map(query => {
        return executeQuery(query, context);
      }));

      compositeRequest.request.resolve(merge({}, ...responses));
    } catch (err) {
      compositeRequest.request.reject(err);
    }
  });

}

const executeQuery = async (query, context) => {
  const request = new RelayQueryRequest(query.query);
  const networkLayer = context.layers[query.schema];

  networkLayer.sendQueries([request]);

  return request.then(data => executeDependents(query, data, context));
}

const executeDependents = async (query, data, context) => {
  const datasWithPath = await Promise.all(query.dependents.map(async ({path,fragment}) => {
    const pathIds = getIdsWithPath(data.response, path);

    return Promise.all(pathIds.map(async ({id, path}) => {
      const query = createCompositeQuery(fragment, id);
      const data = await executeQuery(query, context);
      return { data, path };
    }));
  }));

  return flatten(datasWithPath).reduce((data, {path, data: depData}) => {
    return updateIn(data, ['response', ...path], node => merge({}, node, depData.response.node));
  }, data);
}

const createCompositeQuery = ({children, schema, type, dependents}, id) => {
  const query = Relay.createQuery({
    calls: [{
      kind: 'Call',
      metadata: {},
      name: 'id',
      value: {
        kind: 'CallVariable',
        callVariableName: 'id'
      }
    }],
    fieldName: 'node',
    kind: 'Query',
    metadata: {
      isAbstract: true,
      identifyingArgName: 'id'
    },
    name: 'App',
    type: 'Node',
    children: [{
      fieldName: 'id',
      kind: 'Field',
      metadata: {
        isGenerated: true,
        isRequisite: true
      },
      type: 'ID'
    }, {
      fieldName: '__typename',
      kind: 'Field',
      metadata: {
        isGenerated: true,
        isRequisite: true
      },
      type: 'String'
    }, {
      kind: 'Fragment',
      metadata: {},
      name: type,
      type: type,
      children: []
    }]
  }, { id });

  return {
    query: query.clone(query.getChildren().map(child => {
      if (child instanceof RelayQuery.Fragment) {
        return child.clone(children);
      } else {
        return child;
      }
    })),
    schema,
    dependents
  };
}

const getIdsWithPath = (data, path, backwardPath = []) => {
  if (path.length === 0) {
    const id = data.id;
    return id ? [{id, path: backwardPath}] : [];
  } else {
    const segment = path[0];
    const sub = data[path[0]];
    const remaining = path.slice(1);
    if (sub) {
      if (Array.isArray(sub)) {
        return sub.reduce((ids, item, index) => {
          return ids.concat(getIdsWithPath(item, remaining, backwardPath.concat([segment, index])));
        }, []);
      } else {
        return getIdsWithPath(sub, remaining, backwardPath.concat(segment));
      }
    } else {
      return [];
    }
  }
}

// // this might be correct who knows!
// // can make this a reduce / non-recursive?
// const updateIn = (obj, path, cb) => {
//   if (path.length === 0) {
//     return cb(obj)
//   } else {
//     const field = path[0];
//     if (Array.isArray(obj)) {
//       let copy = obj.slice();
//       copy[field] = updateIn(obj[field], path.slice(1), cb);
//       return copy;
//     } else {
//       return {
//         ...obj,
//         [field]: updateIn(obj[field] || {}, path.slice(1), cb)
//       };
//     }
//   }
// }
//
// const mergeDependentData = (data, {path, data: dependentData}) => {
//   return updateIn(data, path, obj => ({...obj, ...dependentData.response.node}));
// }
//
// const mergeDependentDatas = (data, dependentDatas) => ({
//   response: dependentDatas.reduce(mergeDependentData, data.response)
// });
