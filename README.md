# BigTangle-ts Library

A TypeScript library for blockchain operations.

## Features
- Blockchain transaction handling
- Cryptographic operations
- Wallet functionality
- Smart contract interactions

## Installation

```bash
npm install @bigtangle/bigtangle-ts
```

## Usage

```typescript
import { Address, Transaction, ECKey } from '@bigtangle/bigtangle-ts';

// Example usage
const key = new ECKey();
const address = new Address(key);

// Create and sign transactions
const tx = new Transaction();
// ...
```