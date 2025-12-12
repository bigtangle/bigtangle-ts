/**
 * Main entry point for the bigtangle-ts library
 *
 * This library previously had circular dependency issues that manifested at
 * runtime as "Cannot access 'Coin' before initialization" ReferenceErrors.
 * These issues have been resolved by moving static constants to the
 * CoinConstants class to avoid static initialization order problems.
 *
 * For safe usage of Coin constants, use CoinConstants instead of Coin static properties:
 * - Use CoinConstants.ZERO instead of Coin.ZERO (if it still exists)
 * - Use CoinConstants.COIN instead of Coin.COIN (if it still exists)
 * - etc.
 *
 * This approach uses lazy initialization to avoid circular dependencies
 * that occur during static module loading.
 */

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

// Coin and monetary types - constants are now in separate module
export { Coin } from './net/bigtangle/core/Coin';
export { CoinConstants } from './net/bigtangle/core/CoinConstants';
export { Monetary } from './net/bigtangle/core/Monetary';

// Other common types
export { UTXO } from './net/bigtangle/core/UTXO';
export { BloomFilter } from './net/bigtangle/core/BloomFilter';