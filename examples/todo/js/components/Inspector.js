import React from 'react';
import Relay from 'react-relay';

import {Map, List, Set, is} from 'immutable';

import history from '../history';

var JSONV = ({value, previous, config}) => {
  if (List.isList(value)) {
    var children = !value.isEmpty() ? (
      <div style={{paddingLeft: 20}}>
        {value.map((value, i) => <div key={i}><JSONV value={value} previous={previous !== undefined ? previous.get(i) : previous } config={config} /></div>)}
      </div>
    ) : ' ';
    return (
      <span>
        {'['}
        {children}
        {']'}
      </span>
    );
  } else if (Map.isMap(value)) {
    var keys = value.keySeq();
    var children = !keys.isEmpty() ? (
      <div style={{paddingLeft: 20}}>
        {keys.map(key => <JSONKV key={key} name={key} value={value.get(key)} previous={previous !== undefined ? previous.get(key) : previous} config={config} />)}
      </div>
    ) : ' ';
    return (
      <span>
        {'{'}
        {children}
        {'}'}
      </span>
    );
  } else {
    return (<span>{JSON.stringify(value)}</span>)
  }
}

var diffStyles = {
  updated: {
    color: 'orange'
  },
  created: {
    color: 'green'
  },
  deleted: {
    color: 'red'
  }
};

var equal = (a, b) => {
  if (a instanceof Map || a instanceof List) {
    return is(a, b);
  } else {
    return a === b;
  }
}

var JSONKV = ({name, value, previous, config}) => {
  var diff = null;

  if (value !== undefined && previous === undefined) {
    diff = 'created';
  } else if (value === undefined && previous !== undefined) {
    diff = 'deleted';
  } else if (!equal(value, previous)) {
    diff = 'updated';
  }

  if (!config.onlyDiffs || (config.onlyDiffs && diff)) {
    return (
      <div><span style={diffStyles[diff]}>{JSON.stringify(name)}</span> : <JSONV value={value} previous={previous} config={config} /></div>
    );
  } else {
    return (<div></div>);
  }
}

JSONKV.defaultProps = { config: Map() };

var JSONViewer = ({data, previous, config}) => {
  var children = data.keySeq().map(key => <JSONKV key={key} name={key} value={data.get(key)} previous={previous.get(key)} config={config} />);
  return (
    <div style={{
      fontFamily: 'monospace'
    }}>{children}</div>
  );
}

var dateToTime = (date) => {
  var pad = (d, n) => ('000' + n).slice(-d);
  return `${pad(2, date.getHours())}:${pad(2, date.getMinutes())}:${pad(2, date.getSeconds())}.${pad(3, date.getMilliseconds())}`;
}

var ChangeListItem = ({change,selectChange,active}) => {
  var type = change.get('type');
  var title;
  if (type === 'INITIAL_STORE') {
    title = 'Initial';
  } else if (type === 'HANDLE_QUERY_PAYLOAD') {
    title = 'Query';
  } else if (type === 'HANDLE_UPDATE_PAYLOAD') {
    title = 'Mutation';
  } else {
    title = 'Unknown';
  }

  var styles = ChangeListItem.styles;

  return (
    <a href="#" onClick={() => selectChange(change.get('id'))} style={Object.assign({}, styles.link, active ? styles.active : {})}>
      <div style={styles.title}>{title}</div>
      <div style={styles.date}>{dateToTime(change.get('date'))}</div>
    </a>
  );
}

var palette = {
  active: '#4078c0',
  border: '#ddd'
}

ChangeListItem.styles = {
  link: {
    textDecoration: 'none',
    color: 'blue',
    fontFamily: 'Helvetica, Arial, sans-serif',
    fontSize: 12,
    padding: 10,
    display: 'block',
    border: `1px solid ${palette.border}`,
    // borderLeft: `1px solid ${palette.border}`,
    // borderBottom: `1px solid ${palette.border}`,
    // borderRight: `1px solid ${palette.border}`,
  },
  active: {
    color: 'black',
    // borderRight: 'none',
    backgroundColor: '#f8f8f8'
  },
  title: {
    color: '#4078c0',
    textTransform: 'uppercase',
  },
  date: {
    color: '#767676',
    fontStyle: 'italic'
  }
}

var inspectorStyles = {
  container: {
    display: 'flex',
    flexDirection: 'row',
  },
  list: {
    width: 150,
    flexShrink: 0,
  },
  detail: {
    marginLeft: 10,
  }
}

var inspectorDetailStyles = {
  container: {
    display: 'flex'
  },
  linkGroup: {
    // marginLeft: 10,
    // marginRight: 10
  },
  link: {
    display: 'inline-block',
    padding: 5,
    textDecoration: 'none',
    color: '#4078c0',
    textTransform: 'uppercase',
    fontSize: 12,
    fontFamily: 'Helvetica, Arial, sans-serif',
    border: `1px solid ${palette.border}`,
    borderRight: 'none'
  },
  linkFirst: {
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
  },
  linkLast: {
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
    borderRight: `1px solid ${palette.border}`,
  },
  linkSelected: {
    backgroundColor: '#f8f8f8',
  }
}

var m = (...styles) => {
  return Object.assign.apply(null, [{}, ...styles]);
};

var LinkGroup = (props) => {
  var styles = inspectorDetailStyles;
  return (
    <div style={styles.linkGroup, props.style}>
      {props.children}
    </div>
  );
}

var LinkItem = (props) => {
  var styles = inspectorDetailStyles;
  return (
    <a href='#' style={m(styles.link,
                         props.first && styles.linkFirst,
                         props.last && styles.linkLast,
                         props.selected && styles.linkSelected,
                         props.style)}
                onClick={props.select}>
      {props.children}
    </a>
  );
}

var Toggle = (props) => {
  var styles = inspectorDetailStyles;
  return (
    <a href='#' style={m(styles.link, styles.linkLast, styles.linkFirst, props.checked && styles.linkSelected)}
      onClick={props.toggle}>{props.children}</a>
  );
}

var InspectorHeader = (props) => {
  var styles = inspectorDetailStyles;
  return (
    <div style={m(styles.container, props.style)}>
      <LinkGroup style={{marginRight: 10}}>
        <LinkItem first={true} selected={props.view === 'query'} select={() => props.selectView('query')}>Query</LinkItem>
        <LinkItem first={true} selected={props.view === 'records'} select={() => props.selectView('records')}>Records</LinkItem>
        <LinkItem last={true} selected={props.view === 'raw'} select={() => props.selectView('raw')}>Raw</LinkItem>
      </LinkGroup>
      <Toggle checked={props.onlyDiffs} toggle={props.toggleDiffs}>Only Diffs</Toggle>
    </div>
  );
}

var QueryViewer = (props) => {
  return (
    <div style={{fontFamily: 'monospace'}}>{props.query && props.query.text}</div>
  );
}

var RecordKeyValue = ({name,value}) => {
  if (Map.isMap(value) && value.has('__dataID__')) {
    return <span>ref#{value.get('__dataID__')}</span>
  } else if (name === '__range__') {
    var ids = Set.fromKeys(value.getIn(['_orderedSegments', 0, '_idToIndicesMap']));
    return <span>{JSON.stringify(ids)}</span>
  } else if (Map.isMap(value)) {
    return <span>MAP</span>
  } else {
    return <span>{JSON.stringify(value)}</span>
  }
}

var RecordKeyItem = ({name, value}) => {
  return (
    <div>{name}: <RecordKeyValue name={name} value={value} /></div>
  )
}

var RecordKeyList = ({record}) => {
  var fields = (record && Set.fromKeys(record)) || Set();
  fields = fields.subtract(Set.of('__dataID__', '__path__', '__forceIndex__'));
  return (
    <div style={{marginLeft: 10}}>
      {fields.map(k => <RecordKeyItem key={k} name={k} value={record.get(k)} />)}
    </div>
  );
}

var RecordViewer = ({name,record,queued,cached}) => {
  return (
    <div>
      <div>{name}</div>
      <div>
        <div style={{marginLeft: 5}}>Queued</div>
        <RecordKeyList record={queued} />
        <div style={{marginLeft: 5}}>Record</div>
        <RecordKeyList record={record} />
        <div style={{marginLeft: 5}}>Cached</div>
        <RecordKeyList record={cached} />
      </div>
    </div>
  );
}

var RecordsViewer = ({store}) => {
  var records = store.get('_records');
  var queuedRecords = store.get('_queuedRecords');
  var cachedRecords = store.get('_cachedRecords');

  var keys = Set.fromKeys(records)
    .union(Set.fromKeys(queuedRecords))
    .union(Set.fromKeys(cachedRecords));

  return (
    <div style={{fontFamily: 'monospace'}}>
      {keys.map(k => (
        <RecordViewer key={k} name={k} record={records.get(k)} queued={queuedRecords.get(k)} cached={cachedRecords.get(k)} />
      ))}
    </div>
  );
}

class InspectorDetail extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      view: 'records',
      onlyDiffs: false
    }
  }

  render() {
    var styles = inspectorDetailStyles;
    var view = this.state.view;

    var detail;
    if (view === 'query') {
      detail = (<QueryViewer query={this.props.change.get('query')} />);
    } else if (view === 'records') {
      detail = (<RecordsViewer store={this.props.change.get('store')} />);
    } else if (view === 'raw') {
      detail = (<JSONViewer data={this.props.change.get('store')} previous={this.props.previous.get('store')} config={this.state} />);
    }

    return (
      <div style={m(this.props.style)}>
        <InspectorHeader {...this.state} selectView={this.selectView.bind(this)} toggleDiffs={this.toggleDiffs.bind(this)} style={{marginBottom: 10}} />
        {detail}
      </div>
    );
  }

  selectView(view) {
    this.setState({
      view: view
    });
  }

  toggleDiffs() {
    this.setState({
      onlyDiffs: !this.state.onlyDiffs
    });
  }
}

class Inspector extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      change: Map(),
      previous: Map(),
      changes: List()
    };
  }

  render() {
    return (
      <div style={m(inspectorStyles.container)}>
        <div style={inspectorStyles.list}>
          {this.state.changes.reverse().map((change) => (
            <ChangeListItem key={change.get('id')} change={change} selectChange={this.selectChange.bind(this)} active={this.state.change.equals(change)} />
          ))}
        </div>
        <div style={inspectorStyles.detail}>
          <InspectorDetail {...this.state} style={{marginBottom: 10}} />
        </div>
      </div>
    );
  }

  componentWillMount() {
    history.subscribe('inspector', (change, previous, changes) => {
      this.setState({
        change: change,
        previous: previous,
        changes: changes
      });
    });

    this.setState({
      change: history.current(),
      previous: history.previous(),
      changes: history.getChanges()
    });
  }

  componentWillUnmount() {
    this.data.unsubscribeQuery('inspector');
  }

  selectChange(id) {
    this.setState({
      change: history.getChanges().find(c => c.get('id') === id),
      previous: history.getChanges().takeWhile(c => c.get('id') !== id).last() || history.getChanges().first()
    })
  }

  toggleDiffOnly() {
    this.setState({
      config: this.state.config.update('diffOnly', (diff) => !diff)
    });
  }
}

export default Inspector
