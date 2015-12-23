import React from 'react';
import Relay from 'react-relay';

export default class MessageApp extends React.Component {

  render() {
    return (
      <div>
        <div className="header">
          <div>Messages</div>
          <div>Drafts</div>
        </div>
      </div>
    );
  }
}

// export default Relay.createContainer(MessageApp, {
//   fragments: {
//     viewer: () => Relay.QL`
//       fragment on User {
//
//       }
//     `,
//     local: () => Relay.QL`
//       fragment on Local {
//
//       }
//     `
//   },
// });
