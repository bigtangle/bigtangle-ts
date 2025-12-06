# @bigtangle/bigtangle-ts

A TypeScript library for blockchain operations, compatible with Node.js, React Native, and web browsers.

## Features

- Full TypeScript support
- React Native and web browser compatible (no Node.js built-ins dependency)
- Blockchain operations including key management, transactions, and block handling
- BIP32, BIP39, and other standard cryptocurrency functionality
- AES encryption for key protection

## Installation

```bash
npm install @bigtangle/bigtangle-ts
```

## Usage

```typescript
import { ECKey, Transaction } from '@bigtangle/bigtangle-ts';

// Create a new private key
const key = ECKey.createNewKey();

// Create and sign transactions
// See documentation for more examples
```

## Compatibility

This library is compatible with:
- Node.js
- React Native
- Modern web browsers
- Any environment with Web Crypto API support

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Lint the code
npm run lint
```

## License

MIT