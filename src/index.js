export default class RelayCompositeNetworkLayer {

  constructor(defaultLayer) {
    this.defaultLayer = defaultLayer;
  }

  sendMutation(mutationRequest) {
    console.log('mutation request', mutationRequest);
    return this.defaultLayer.sendMutation(mutationRequest);
  }

  sendQueries(queryRequests) {
    console.log('query requests', queryRequests);
    return this.defaultLayer.sendQueries(queryRequests);
  }

  supports(...options) {
    console.log('options', ...options);
    return this.defaultLayer.supports(...options);
  }
}
