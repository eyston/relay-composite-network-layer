TODO
====

- need to improve validation for merging (this is main user interface really)
  - what types can we / can't we merge
  - right now its 'first one wins' by default

- handle mutations
  - omg I actually don't know if this will work ... think can just treat them like queries?!??!
  - does Relay allow multiple root fields on a mutation?
    - if yes: we need to execute them serially which sounds terrible

- sanitize the dependencies -- they are shit

- roll a gem


FIXME
=====

- merging node interface `possibleTypes` makes duplicates but Relay works fine with it.
