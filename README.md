# relay-store-types-generator

_EXPERIMENTAL, USE AT OWN RISK_

Generate types for the Relay store from your GraphQL schema.

_Currently only generates Flow types, TypeScript mode coming soon_.

## The idea

Relay lets you manually interact with its store through `updaters` after mutations, `commitLocalUpdate` and so on.

When you write queries, mutations and fragments, Relay generates types for you that you can use to use the data Relay gives
you in a type-safe way. But, when interacting with the store you're left with a generalized API with general types.

This package generates types for Relay's store tailored to your specific GraphQL schema, so that your interaction with the store can be
fully type safe, just like interacting with the data Relay gives you.

### Example

Imagine the following schema:

```graphql
schema {
  query: Query
}

type Query {
  bestFriend: User
}

type User {
  firstName: String!
  age: Int!
}
```

Instead of doing this:

```javascript
commitLocalUpdate(environment, store => {
  const root = store.getRoot(); // Gets you a RecordProxy
  const bestFriend = root.getLinkedRecord('bestFriend'); // Also gets you a RecordProxy, but nullable
  if (bestFriend) {
    const age = bestFriend.getValue('agee'); // Relay allows this even though it's mis-spelled
    bestFriend.setValue(123, 'firstName'); // Relay allows this too, even though firstName is supposed to be a string
  }
});
```

...cast your store to `Store$RecordSourceSelectorProxy` like this:

```javascript
import type { Store$RecordSourceSelectorProxy } from '../path/to/generated/relay-store-types.js.flow';

commitLocalUpdate(environment, (store: Store$RecordSourceSelectorProxy) => {
  // Cast to typed version of the store from the generated type file
  const root = store.getRoot(); // Gets you a RecordProxy$Query with a shape corresponding to your root query
  const bestFriend = root.getLinkedRecord('bestFriend'); // Also gets you a ?RecordProxy$User since this is actually a user
  if (bestFriend) {
    const age = bestFriend.getValue('agee'); // This will not be allowed since there's no getValue method for "agee" on RecordProxy$User
    bestFriend.setValue(123, 'firstName'); // This won't be allowed either, because the method that accepts 'firstName' as key expects the value to be ?string
  }
});
```

## Usage

```
yarn add --dev relay-store-types-generator

# package.json
...
"scripts": {
    "generate:relay-store-types": "relay-store-types-generator --flow --schema ./path/to/schema.graphql --out-dir ./path/to/output/dir --custom-scalars-path ./path/to/file/exporting/custom/scalars"
...

# Run like
yarn generate:relay-store-types
```

```
Options:
  --schema [path]               Path to schema.graphql
  --custom-scalars-path [path]  Path to file exporting custom scalars.
  --out-dir [path]              Path to directory to output type file.
  --flow                        Output Flow types.
  --typescript                  Output TypeScript types.
  -h, --help                    output usage information
```

Preferably set this up to run after whatever you use to persist the introspection of your GraphQL schema so you always have a fresh version.

## TODO

[ ] TypeScript mode
[ ] Type `args` for every field
[ ] Type `filters` for connections
[ ] Handle subscriptions (?)
[ ] Parse extensions from schema
