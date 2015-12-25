import {createCompositeRequest} from './split';
import {executeCompositeRequests} from './execute/network';

export default class RelayCompositeNetworkLayer {

  constructor(config) {
    this.config = config;
  }

  sendQueries(queryRequests) {
    const context = {...this.config};
    const compositeRequests = queryRequests.map(request => createCompositeRequest(request, context));

    return executeCompositeRequests(compositeRequests, context);
  }

  sendMutation(mutationRequest) {
    throw new Error('mutations not supported yet');
  }

  supports(...options) {
    return false;
  }

}
