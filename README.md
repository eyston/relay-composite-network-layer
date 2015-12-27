TODO
====

- need to improve validation for merging (this is main user interface really)
  - currently allows anything with a *last one wins* strategy
  - what types can we / can't we merge
    - allow duplicate `SCALARS` and `__RESERVED` definitions
    - allow merging of `Node` interface
    - allow merging of `Node` implementors without duplicate non-id field definitions
    - allow merging of `OBJECT` types if they are *equivalent*
      - check fields are the same (name / type)
    - throw on duplicates of `UNION` and `INTERFACE`
      - think about if it would ever be required to allow these?
    - check out how enums work ... probably initially disallow
      - should be able to check if they are identical or something tho

- mutations
  - test examples
  - chained mutation
    - AddTodo / DeleteDraft
  - single mutation with backends talking
    - PublishDraft (calls AddTodo in resolve)

- sanitize the dependencies -- they are shit

- roll a gem

- figure out if we can reset the `Relay.Store` between tests



FIXME
=====

- merging node interface `possibleTypes` makes duplicates but Relay works fine with it.
  - verify if Relay cares about interfaces -- that rule might not be checked by `Relay.QL`
