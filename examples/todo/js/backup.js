/**
 * This file provided by Facebook is for non-commercial testing and evaluation
 * purposes only.  Facebook reserves all rights not expressly granted.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * FACEBOOK BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
 * ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import 'babel-polyfill';
// import 'todomvc-common';
import {createHashHistory} from 'history';
import {IndexRoute, Route} from 'react-router';
import React from 'react';
import ReactDOM from 'react-dom';
import {RelayRouter} from 'react-router-relay';
import TodoApp from './components/TodoApp';
import TodoList from './components/TodoList';
import ViewerQueries from './queries/ViewerQueries';

import Relay from 'react-relay';
// import RelayCompositeNetworkLayer from 'relay-composite-network-layer';

import RelayQuery from 'react-relay/lib/RelayQuery';
import RelayQueryRequest from 'react-relay/lib/RelayQueryRequest';

const printQueryRequest = queryRequest => {
  console.log({
    kind: 'RelayQueryRequest',
    debugName: queryRequest.getDebugName()
  });
  printRelayQueryNode(queryRequest.getQuery());
}

const printRelayQueryNode = node => {
  if (node instanceof RelayQuery.Root) {
    console.log({
      kind: 'RelayQueryRoot',
      type: node.getType(),
      name: node.getName(),
      fieldName: node.getFieldName(),
      variables: JSON.stringify(node.getVariables())
    });
  } else if (node instanceof RelayQuery.Fragment) {
    console.log({
      kind: 'RelayQueryFragment',
      type: node.getType(),
      fragmentID: node.getFragmentID(),
      variables: JSON.stringify(node.getVariables())
    });
  } else if (node instanceof RelayQuery.Field) {
    console.log({
      kind: 'RelayQueryField',
      type: node.getType(),
      schemaName: node.getSchemaName(),
      variables: JSON.stringify(node.getVariables())
    });
  }

  node.getChildren().map(printRelayQueryNode);
}

const nameFragment = Relay.QL`
fragment on User {
  name
}
`;

const updateQueryRequest = request => {
  return new RelayQueryRequest(updateQuery(request.getQuery()));
}

const updateQuery = query => {
  let children = query.getChildren().map(updateQuery);
  if (query.getType() === 'User') {
    return query.clone(children.concat(query.createNode(nameFragment)));
  } else {
    return query.clone(children);
  }
}

let node1 = Relay.QL`
  query {
    viewer {
      id
      todos(status: $status, first: $first) {
        edges {
          node {
            id
            text
          }
        }
      }
      drafts(first: $first) {
        edges {
          node {
            id
            text
          }
        }
      }
    }
  }
`;

let query1 = Relay.createQuery(node1, {status: 'any', first: 10});

let node2 = Relay.QL`
  query {
    viewer {
      totalCount
    }
  }
`;

let query2 = Relay.createQuery(node2, {});

let node3 = Relay.QL`
  query {
    node(id: $id) {
      ... on User {
        totalCount
      }
    }
  }
`;

// console.log(JSON.stringify(node3, null, 2));

let query3 = Relay.createQuery(node3, {id: 'VXNlcjptZQ=='});

let count = 0;


const printRelayQueryRoot = node => {
  console.log({
    kind: 'RelayQueryRoot',
    type: node.getType(),
    name: node.getName(),
    fieldName: node.getFieldName(),
    variables: JSON.stringify(node.getVariables())
  });
}

const queryFields = {
  // viewer: 'local'
};

const extensions = {
  User: {
    drafts: 'local',
    todos: 'local'
  },
  Draft: {
    author: 'default'
  }
};

const generateQueryPlan = request => {
  const plan = splitQueryBySchema(request.getQuery(), {queryFields, defaultSchema: 'default', extensions});
  return {
    ...plan,
    request
  };
}

const splitQueryBySchema = (node, context) => {
  if (node instanceof RelayQuery.Root) {
    return splitRoot(node, context);
  } else if (node instanceof RelayQuery.Fragment) {
    return splitFragment(node, context);
  } else if (node instanceof RelayQuery.Field) {
    return splitField(node, context);
  } else {
    throw new Error('unhandled node type');
  }
}

const splitChildren = (children, context) => {
  const queries = children.map(child => splitQueryBySchema(child, context));
  // group them by

  console.log(queries);

  return queries;
}

const createNodeQuery = fields => {
  return Relay.createQuery({

  }, {id: 'me'});
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

const createChildren = (field, childrenBySchema, context) => {
  return Object.keys(childrenBySchema)
    .filter(schema => schema !== context.schema)
    .map(schema => ({
      query: createQuery(childrenBySchema[schema].map(c => c.query)),
      schema,
      path: [field],
      children: childrenBySchema[schema].reduce((children, child) => children.concat(child.children), [])
    }));
}

const fooRoot = (root, context) => {

}


const splitRoot = (root, context) => {
  // figure out what schema this root field belongs to ...
  const schema = context.queryFields[root.getFieldName()] || context.defaultSchema;
  const children = splitChildren(root.getChildren(), {...context, parent: root.getType() });
  const childrenBySchema = children.reduce((cbs, child) => {
    cbs[child.schema] = cbs[child.schema] || [];
    cbs[child.schema].push(child);
    return cbs;
  }, {});

  createChildren(root.getFieldName(), childrenBySchema, {...context, schema}).forEach(child => {
    console.log(new RelayQueryRequest(child.query).getQueryString());
  });

  return {
    query: root.clone(childrenBySchema[schema].map(c => c.query)),
    schema,
    children: createChildren(root.getFieldName(), childrenBySchema, {...context, schema})
  };
}

const splitField = (field, context) => {
  const {extensions,parent,defaultSchema} = context;
  // console.log('split field', field.getSchemaName(), field.getType(), parent);

  const schema = (extensions[parent] || {})[field.getSchemaName()] || defaultSchema;


  const children = splitChildren(field.getChildren(), {...context, parent: field.getType() });
  const childrenBySchema = children.reduce((cbs, child) => {
    cbs[child.schema] = cbs[child.schema] || [];
    cbs[child.schema].push(child);
    return cbs;
  }, {});

  console.log('children by schema', childrenBySchema);

  // createChildren(root.getFieldName(), childrenBySchema, {...context, schema}).forEach(child => {
  //   console.log(new RelayQueryRequest(child.query).getQueryString());
  // });

  return {
    query: field,
    schema,
    children: []
  };
  // return [context.parent, field.getType(), field.getSchemaName(), schema];
}

const splitFragment = (fragment, context) => {
  return 'fragment';
}

const groupQueryPlans = plans => {
  return plans.reduce((plansBySchema, plan) => {
    plansBySchema[plan.schema] = plansBySchema[plan.schema] || [];
    plansBySchema[plan.schema].push(plan);
    return plansBySchema;
  }, {});
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

const mergeChildData = (data, {path, data: childData}) => {
  return updateIn(data, path, obj => ({...obj, ...childData.response.node}));
}

const mergeChildDatas = (data, childDatas) => ({
  response: childDatas.reduce(mergeChildData, data.response)
});

const executeChild = async (networkLayer, id, child) => {
  // TODO: child.query needs to be supplied this id
  const request = new RelayQueryRequest(child.query);
  networkLayer.sendQueries([request]);

  const data = await request;
  const childDatas = await Promise.all(child.children.map(child => {
    // TODO: this needs to not be hard coded lulz
    const id = data.response.node.id;
    const data = executeChild(networkLayer, id, child);
    return {
      path: ['viewer'],
      data
    };
  }));

  // merge ...
  return childDatas.reduce(mergeChildData, data);
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

const getIds = (data, path) => {
  if (path.length === 0) {
    const id = data.id;
    return id ? [id] : [];
  } else {
    const sub = data[path[0]];
    const remaining = path.slice(1);
    if (sub) {
      if (Array.isArray(sub)) {
        return sub.reduce((ids, item) => {
          return ids.concat(getIds(item, remaining))
        }, []);
      } else {
        return getIds(sub, remaining);
      }
    } else {
      return [];
    }
  }
}

const executeDependent = async (networkLayer, id, dep) => {
  // TODO: child.query needs to be supplied this id
  const query = createQuery(dep.parent, id, [dep.node]);
  const request = new RelayQueryRequest(query);
  networkLayer.sendQueries([request]);

  const data = await request;

  const dependentsDatas = await Promise.all(dep.dependents.map(async dep => {
    const ids = getIds(data.response.node, dep.path);
    const pathIds = getIdsWithPath(data.response.node, dep.path);

    const datas = await Promise.all(pathIds.map(async ({id, path}) => {
      const data = await executeDependent(networkLayer, id, dep);
      return {
        path: ['node'].concat(path),
        data
      };
    }));

    return datas;
  }));

  console.log('dependents data', dependentsDatas);

  const mergedData = dependentsDatas.reduce((data, dependentsData) => {
    return mergeChildDatas(data, dependentsData);
  }, data);

  return mergedData;
}

const getIn = (obj, path) => {
  if (path.length === 0) {
    return obj;
  } else {
    return getIn(obj[path[0]], path.slice(1));
  }
}

const handleRootSuccess = async (networkLayer, plan, data) => {
  try {
    const dependentsData = await Promise.all(plan.dependents.map(async dep => {
      // TODO: this needs to not be hard coded lulz
      const id = getIn(data.response, dep.path.concat('id'));
      // const depData = await executeChild(networkLayer, id, dep);
      const depData = await executeDependent(networkLayer, id, dep);
      return {
        path: dep.path,
        data: depData
      };
    }));

    // merge ...
    const mergedData = mergeChildDatas(data, dependentsData);

    plan.request.resolve(mergedData);
  } catch (err) {
    plan.request.reject(err);
  }
}

const handleRootFailure = (plan, err) => {
  plan.request.reject(err);
}


const executeQueryPlanNetwork = networkLayer => {
  return plans => {

    const requests = plans.map(plan => {
      if (plan.dependents.length > 0) {
        const request = new RelayQueryRequest(plan.query);
        request.then(
          data => handleRootSuccess(networkLayer, plan, data),
          err => handleRootFailure(plan, err)
        );
        return request;
      } else {
        // aint gotta do shit
        return plan.request;
      }
    });

    return networkLayer.sendQueries(requests);

    // executablePlans.forEach(async plan => {
    //   const parentResponse = await plan.updatedRequest;
    //   // execute children
    //   const requests = plan.children.map(child => {
    //     const request = new RelayQueryRequest(child.query);
    //
    //     request.then(response => {
    //       console.log(response);
    //       parentResponse.response.viewer = {
    //         ...parentResponse.response.viewer,
    //         ...response.response.node
    //       };
    //       console.log(parentResponse);
    //       plan.request.resolve(parentResponse);
    //
    //     });
    //
    //     return request;
    //   });
    //   networkLayer.sendQueries(requests);
    //
    //   // merge results
    //   // resolve original
    // });


  }
}

const createFieldSubQuery = (field, context) => {
  const {schema,parent,extensions} = context;

  const fieldSchema = (extensions[parent] || {})[field.getSchemaName()] || schema;
  // const {children,dependents} = collectChildren(field.getSchemaName(), field.getChildren(), {
  const {children,dependents} = collectChildren(field.getSerializationKey(), field.getChildren(), {
    ...context,
    parent: field.getType(),
    schema: fieldSchema
  });

  return {
    node: field.clone(children),
    parent,
    schema: fieldSchema,
    path: [],
    dependents
  };
}

const createSubQuery = (node, context) => {
  if (node instanceof RelayQuery.Field) {
    return createFieldSubQuery(node, context);
  } else {
    throw new Error('unsupported node type for createSubQuery');
  }
}

const createQueryPlan = (request, context) => {
  const root = request.getQuery();
  const schema = context.queryFields[root.getFieldName()] || context.defaultSchema;
  const {children,dependents} = collectChildren(root.getFieldName(), root.getChildren(), {
    ...context,
    parent: root.getType(),
    schema
  });

  return {
    request,
    query: root.clone(children),
    schema,
    dependents
  };
}

const collectChildren = (name, children, context) => {
  const schema = context.schema;
  const subQueriesBySchema = children
    .map(child => createSubQuery(child, context))
    .reduce((grouped, sub) => ({
      ...grouped,
      [sub.schema]: (grouped[sub.schema] || []).concat(sub)
    }), {});

  const schemaChildren = (subQueriesBySchema[schema] || []).map(sub => sub.node);

  const childrenDependents = (subQueriesBySchema[schema] || []).reduce((dependents, child) => {
    return dependents.concat(child.dependents);
  }, []);

  const dependents = Object.keys(subQueriesBySchema)
    .filter(s => s !== schema)
    .reduce((dependents, schema) => dependents.concat(subQueriesBySchema[schema]), childrenDependents)

  return {
    children: schemaChildren,
    dependents: dependents.map(d => updateIn(d, ['path'], path => [name].concat(path)))
  };
}

const groupBy = (items, field) => {
  return items.reduce((grouped, item) => ({
    ...grouped,
    [item[field]]: (grouped[item[field]] || []).concat(item)
  }), {});
}

// return plans.reduce((plansBySchema, plan) => {
//   plansBySchema[plan.schema] = plansBySchema[plan.schema] || [];
//   plansBySchema[plan.schema].push(plan);
//   return plansBySchema;
// }, {});

const queryFields = {
  // viewer: 'local'
};

const extensions = {
  User: {
    drafts: 'local',
    todos: 'local'
  },
  Draft: {
    author: 'default'
  }
};


class RelayCompositeNetworkLayer {

  constructor(defaultLayer) {
    this.defaultLayer = defaultLayer;
    this.executeQueryPlan = executeQueryPlanNetwork(this.defaultLayer);
  }

  sendQueries(queryRequests) {
    const queryPlans = queryRequests.map(request => createQueryPlan(request, {
      queryFields,
      defaultSchema: 'default',
      extensions
    }));

    queryPlans.forEach(plan => {
      console.log(plan);
      plan.dependents.forEach(d => console.log(d.path));
      console.log(new RelayQueryRequest(plan.query).getQueryString());
    });

    const groupedPlans = groupBy(queryPlans, 'schema');

    Object.keys(groupedPlans).forEach(schema =>
      this.executeQueryPlan(groupedPlans[schema])
    );

    // const queryPlans = queryRequests.map(generateQueryPlan);
    // const groupedPlans = groupQueryPlans(queryPlans);

    // console.log(groupedPlans);
    //
    // Object.keys(groupedPlans).forEach(schema =>
    //   this.executeQueryPlan(groupedPlans[schema])
    // );

    // console.log('send queries');
    // if (count === 0) {
    //   count += 1;
    //
    //   let originalRequest = queryRequests[0];
    //   printQueryRequest(originalRequest);
    //   let originalQuery = originalRequest.getQuery();
    //   let children = originalQuery.getChildren();
    //   originalQuery.__children__ = query1.getChildren();
    //
    //   let updatedRequest = new RelayQueryRequest(query1);
    //
    //   updatedRequest.then(
    //     data => {
    //       console.log('query 1', data);
    //       // Relay.Store.primeCache({viewer: query2}, state => {
    //       Relay.Store.primeCache({viewer: query3}, state => {
    //         console.log('query 2', state);
    //         if (state.done) {
    //           originalQuery.__children__ = children;
    //           originalRequest.resolve(data);
    //         }
    //       });
    //     }
    //   );
    //
    //   return this.defaultLayer.sendQueries([updatedRequest]);
    //
    //   // let subRequest1 = new RelayQueryRequest(query1);
    //   // let subRequest2 = new RelayQueryRequest(query2);
    //
    //   // Promise.all([subRequest1, subRequest2]).then(
    //   //   datas => {
    //   //     datas.forEach(data => console.log(JSON.stringify(data, null, 2)))
    //   //     originalRequest.resolve({response: {viewer: { ...datas[0].response.viewer, ...datas[1].response.viewer }}})
    //   //   },
    //   //   err => originalRequest.reject(err)
    //   // );
    //   //
    //   // Relay.Store.primeCache({
    //   //   sub1: query1,
    //   //   sub2: query2
    //   // }, state => {
    //   //   console.log('network layer state', state);
    //   // });
    //
    //   // updatedRequest.then(
    //   //   data => originalRequest.resolve(data),
    //   //   err => originalRequest.reject(err)
    //   // );
    //
    //
    //   // printRelayQueryRoot(node);
    //   // printRelayQueryRoot(query1);
    //   // printRelayQueryRoot(query2);
    // } else {
    //   return this.defaultLayer.sendQueries(queryRequests);
    // }
    //
    // // return this.defaultLayer.sendQueries(queryRequests);
    //
    // // queryRequests.forEach(request => {
    // //
    // // });
    //
    //
    // // console.log('received requests', queryRequests.length);
    // // if (count === 0) {
    // //   count += 1;
    // //   let query = queryRequests[0].getQuery();
    // //   Relay.Store.primeCache({foo: query}, state => {
    // //     console.log('from the network layer', state);
    // //     if (state.done) {
    // //       console.log('network layer result');
    // //       console.log(JSON.stringify(Relay.Store.readQuery(query), null, 2));
    // //     }
    // //   });
    // // }
    //
    // // return this.defaultLayer.sendQueries(queryRequests);
    // // console.log(Relay.createQuery);
    // //
    // // console.log(JSON.stringify(Relay.QL`query { node(id: $id) }`, null, 2));
    // // console.log(JSON.stringify(Relay.QL`query ($id: ID!) { node(id: $id) }`, null, 2));
    // // console.log(JSON.stringify(Relay.QL`fragment on User { id }`, null, 2));
    // // this.defaultLayer.sendQueries(queryRequests.map(queryRequest => {
    // //   let updatedQueryRequest = updateQueryRequest(queryRequest)
    // //   printQueryRequest(updatedQueryRequest);
    // //   console.log(updatedQueryRequest.getQueryString());
    // //   console.log(updatedQueryRequest.getVariables());
    // //   updatedQueryRequest.then(
    // //     data => queryRequest.resolve(data),
    // //     err => queryRequest.reject(err)
    // //   );
    // //   return updatedQueryRequest;
    // // }));
  }

  sendMutation(mutationRequest) {
    return this.defaultLayer.sendMutation(mutationRequest);
  }

  supports(...options) {
    return this.defaultLayer.supports(...options);
  }

}

import MessageApp from './components/MessageApp';


Relay.injectNetworkLayer(new RelayCompositeNetworkLayer(new Relay.DefaultNetworkLayer('/graphql')));


let node = Relay.QL`
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
      self {
        totalCount
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

let query = Relay.createQuery(node, {status: 'any', first: 10});

// let query2 = Relay.createQuery(Relay.QL`query { node(id: $id) { ... on Todo { text } } }`, {id: 'VG9kbzox' })

// console.log(query);

Relay.Store.primeCache({ viewer: query }, state => {
  console.log(state, JSON.stringify(Relay.Store.readQuery(query), null, 2));
  console.log(state, JSON.stringify(Relay.Store.readQuery(query2), null, 2));
});



// ReactDOM.render(
//   <RelayRouter history={createHashHistory({queryKey: false})}>
//     <Route
//       path="/" component={TodoApp}
//       queries={ViewerQueries}>
//       <IndexRoute
//         component={TodoList}
//         queries={ViewerQueries}
//         prepareParams={() => ({status: 'any'})}
//       />
//       <Route
//         path=":status" component={TodoList}
//         queries={ViewerQueries}
//       />
//     </Route>
//   </RelayRouter>,
//   document.getElementById('root')
// );

// ReactDOM.render(
//   <RelayRouter history={createHashHistory({queryKey: false})}>
//     <Route
//       path="/" component={MessageApp}>
//     </Route>
//   </RelayRouter>,
//   document.getElementById('root')
// );
