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
import 'todomvc-common';
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
      fieldName: node.getFieldName()
    });
  } else if (node instanceof RelayQuery.Fragment) {
    console.log({
      kind: 'RelayQueryFragment',
      type: node.getType(),
      fragmentID: node.getFragmentID()
    });
  } else if (node instanceof RelayQuery.Field) {
    console.log({
      kind: 'RelayQueryField',
      type: node.getType(),
      schemaName: node.getSchemaName()
    });
  }

  node.getChildren().map(printRelayQueryNode);
}

class RelayCompositeNetworkLayer {

  constructor(defaultLayer) {
    this.defaultLayer = defaultLayer;
  }

  sendMutation(mutationRequest) {
    console.log('mutation request', mutationRequest);
    return this.defaultLayer.sendMutation(mutationRequest);
  }

  sendQueries(queryRequests) {
    console.log('query requests', queryRequests);
    queryRequests.slice(0,1).forEach(queryRequest => {
      printQueryRequest(queryRequest);
      // console.log({
      //   debugName: queryRequest.getDebugName(),
      //   id: queryRequest.getID(),
      //   variables: queryRequest.getVariables(),
      //   query: queryRequest.getQuery()
      // });
    });
    return this.defaultLayer.sendQueries(queryRequests);
  }

  supports(...options) {
    console.log('options', ...options);
    return this.defaultLayer.supports(...options);
  }

}


Relay.injectNetworkLayer(new RelayCompositeNetworkLayer(new Relay.DefaultNetworkLayer('/graphql')));

ReactDOM.render(
  <RelayRouter history={createHashHistory({queryKey: false})}>
    <Route
      path="/" component={TodoApp}
      queries={ViewerQueries}>
      <IndexRoute
        component={TodoList}
        queries={ViewerQueries}
        prepareParams={() => ({status: 'any'})}
      />
      <Route
        path=":status" component={TodoList}
        queries={ViewerQueries}
      />
    </Route>
  </RelayRouter>,
  document.getElementById('root')
);
