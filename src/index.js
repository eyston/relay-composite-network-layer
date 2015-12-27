import {createCompositeRequest,createMutationRequest} from './split';
import {executeCompositeRequests,executeCompositeMutation} from './execute/network';

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
    const context = {...this.config};
    const compositeMutationRequest = createMutationRequest(mutationRequest, context);

    return executeCompositeMutation(compositeMutationRequest, context);
  }

  supports(...options) {
    return false;
  }

}
