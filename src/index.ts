// Main entry point for the bigtangle-ts library
// Export core classes and types that users would typically need

// Core blockchain types
export { Address } from './net/bigtangle/core/Address';
export { Block } from './net/bigtangle/core/Block';
export { Transaction } from './net/bigtangle/core/Transaction';
export { TransactionInput } from './net/bigtangle/core/TransactionInput';
export { TransactionOutput } from './net/bigtangle/core/TransactionOutput';
export { TransactionOutPoint } from './net/bigtangle/core/TransactionOutPoint';

// Cryptographic types
export { ECKey } from './net/bigtangle/core/ECKey';
export { ECPoint } from './net/bigtangle/core/ECPoint';
export { ECDSASignature } from './net/bigtangle/core/ECDSASignature';
export { Sha256Hash } from './net/bigtangle/core/Sha256Hash';

// Utilities
export { Utils } from './net/bigtangle/core/Utils';
export { BigIntegerConverter } from './net/bigtangle/core/BigIntegerConverter';
export { VarInt } from './net/bigtangle/core/VarInt';

// Network parameters
export { NetworkParameters } from './net/bigtangle/params/NetworkParameters';

// Coin and monetary types
export { Coin } from './net/bigtangle/core/Coin';
export { Monetary } from './net/bigtangle/core/Monetary';

// Other common types
export { UTXO } from './net/bigtangle/core/UTXO';
export { BloomFilter } from './net/bigtangle/core/BloomFilter';