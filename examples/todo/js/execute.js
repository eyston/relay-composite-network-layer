import Relay from 'react-relay';

import RelayQuery from 'react-relay/lib/RelayQuery';
import RelayQueryRequest from 'react-relay/lib/RelayQueryRequest';


export const executeSplitRequest = (splitRequest, context) => {
  const request = requestForSplitRequest(splitRequest, context);
  const networkLayer = context.layers[splitRequest.schema];

  return networkLayer.sendQueries([request]);
}

const requestForSplitRequest = (splitRequest, context) => {
  if (splitRequest.dependents.length > 0) {
    const request = new RelayQueryRequest(splitRequest.query);
    request.then(
      data => handleRootSuccess(splitRequest, data, context),
      err => handleRootFailure(splitRequest, err, context)
    );
    return request;
  } else {
    return splitRequest.request;
  }
}

const handleRootFailure = (splitRequest, err, context) => {
  splitRequest.request.reject(err);
}

const handleRootSuccess = async (splitRequest, data, context) => {
  try {
    const dependentsDatas = await Promise.all(splitRequest.dependents.map(async dep => {
      const pathIds = getIdsWithPath(data.response, dep.path);

      const datas = await Promise.all(pathIds.map(async ({id, path}) => {
        const data = await executeDependent(dep, id, context);
        return {
          path,
          data
        };
      }));

      return datas;
    }));

    const mergedData = dependentsDatas.reduce((data, dependentDatas) => {
      return mergeDependentDatas(data, dependentDatas);
    }, data);

    splitRequest.request.resolve(mergedData);
  } catch (err) {
    splitRequest.request.reject(err);
  }
}

const executeDependent = async (dep, id, context) => {
  const query = createQuery(dep.parent, id, [dep.node]);
  const request = new RelayQueryRequest(query);
  const networkLayer = context.layers[dep.schema];
  networkLayer.sendQueries([request]);

  const data = await request;

  const dependentsDatas = await Promise.all(dep.dependents.map(async dep => {
    const pathIds = getIdsWithPath(data.response.node, dep.path);

    const datas = await Promise.all(pathIds.map(async ({id, path}) => {
      const data = await executeDependent(dep, id, context);
      return {
        path: ['node'].concat(path),
        // path,
        data
      };
    }));

    return datas;
  }));

  const mergedData = dependentsDatas.reduce((data, dependentDatas) => {
    return mergeDependentDatas(data, dependentDatas);
  }, data);

  return mergedData;
}

const executeDependents = async (prefix, deps, context) => {
  const dependentsDatas = await Promise.all(deps.map(async dep => {
    const pathIds = getIdsWithPath(data.response.node, dep.path);

    const datas = await Promise.all(pathIds.map(async ({id, path}) => {
      const data = await executeDependent(dep, id, context);
      return {
        path: prefix.concat(path),
        data
      };
    }));

    return datas;
  }));

  return dependentsDatas
}

const createQuery = (type, id, children) => {
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

  return query.clone(query.getChildren().map(child => {
    if (child instanceof RelayQuery.Fragment) {
      return child.clone(children);
    } else {
      return child;
    }
  }));
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

// this might be correct who knows!
// can make this a reduce / non-recursive?
const updateIn = (obj, path, cb) => {
  if (path.length === 0) {
    return cb(obj)
  } else {
    const field = path[0];
    if (Array.isArray(obj)) {
      let copy = obj.slice();
      copy[field] = updateIn(obj[field], path.slice(1), cb);
      return copy;
    } else {
      return {
        ...obj,
        [field]: updateIn(obj[field] || {}, path.slice(1), cb)
      };
    }
  }
}

const mergeDependentData = (data, {path, data: dependentData}) => {
  return updateIn(data, path, obj => ({...obj, ...dependentData.response.node}));
}

const mergeDependentDatas = (data, dependentDatas) => ({
  response: dependentDatas.reduce(mergeDependentData, data.response)
});
