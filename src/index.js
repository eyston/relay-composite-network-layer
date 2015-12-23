import {splitRequestBySchema} from './split';
import {executeSplitRequest} from './execute/network';

export default class RelayCompositeNetworkLayer {

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
