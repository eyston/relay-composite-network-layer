Classes
=======

Not comprehensive by any means -- both classes and members.  Only noting things which may be useful.

RelayQueryRequest
-----------------

extends

`Deferred<QueryResult, Error>`

members

- getDebugName() : string
- getID() : string
- getType() : string
- getVariables() : Variables
- getQueryString() : string
- getQuery() : RelayQuery.Root

RelayQueryNode
--------------

statics

- create(...)

members

- getChildren() : Array<RelayQueryNode> :: this grabs the concrete node's children and wraps them in `RelayQueryNode`
- getField(field: RelayQueryField) : ?RelayQueryField :: this is a map of storage key -> child if child is a `RelayQueryField`
- getType() : string
- getVariables() : Variables
- getConcreteQueryNode(onCacheMiss: () => any) : any

RelayQueryRoot
--------------

extends

`RelayQueryNode`

statics

- build(...)
- create(...)

members

- getName() : string
- getID() : string
- getCallsWithValues() : Array<Call>
- getFieldName() : string
- getIdentifyingArg() ?Call
- getStorageKey() : string

RelayQueryFragment
------------------

extends

`RelayQueryNode`

statics

- build(...)
- create(...)

members

- getDebugName() : string
- getConcreteFragmentID() : string
- getFragmentID() : string

RelayQueryField
---------------

extends

`RelayQueryNode`

statics

- build(...)
- create(...)

members

- getDebugName() : string
- getSchemaName() : string
- getSerializationKey() : string
- getStorageKey() : string
- getApplicationName() : string
- getCallsWithValues() : Array<Call>
- getCallType(callName: string) : ?string
