# bigtangle-ts

A TypeScript library for blockchain operations based on Bigtangle.

## Installation

```bash
npm install bigtangle-ts
```

Or with yarn:

```bash
yarn add bigtangle-ts
```

## Usage

```typescript
import { Transaction, Address, ECKey } from 'bigtangle-ts';

// Example usage
const key = new ECKey();
const address = new Address(key);
// ... more code
```

## Development

To build the library:

```bash
npm run build
```

To run tests:

```bash
npm test
```

To lint the code:

```bash
npm run lint
```

## License

This project is licensed under the terms specified in the LICENSE file.