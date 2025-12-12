/**
 * Bigtangle Wrapper Module
 * 
 * This module provides dynamic imports to work around circular dependency issues
 * in the bigtangle-ts library that manifest at runtime. 
 * 
 * NOTE: As of this refactoring, circular dependencies have been significantly
 * reduced by moving static constants to CoinConstants class with lazy initialization.
 * The dynamic imports are still provided for compatibility and safety.
 */

/**
 * Dynamically imports the Coin class to avoid circular dependency issues
 */
export const loadCoin = async () => {
  const { Coin } = await import('./src/net/bigtangle/core/Coin');
  return Coin;
};

/**
 * Dynamically imports the CoinConstants class to avoid circular dependency issues
 */
export const loadCoinConstants = async () => {
  const { CoinConstants } = await import('./src/net/bigtangle/core/CoinConstants');
  return CoinConstants;
};

/**
 * Dynamically imports the TransactionOutput class to avoid circular dependency issues
 */
export const loadTransactionOutput = async () => {
  const { TransactionOutput } = await import('./src/net/bigtangle/core/TransactionOutput');
  return TransactionOutput;
};

/**
 * Dynamically imports the UtilGeneseBlock class to avoid circular dependency issues
 */
export const loadUtilGeneseBlock = async () => {
  const { UtilGeneseBlock } = await import('./src/net/bigtangle/core/UtilGeneseBlock');
  return UtilGeneseBlock;
};

/**
 * Dynamically imports the Token class to avoid circular dependency issues
 */
export const loadToken = async () => {
  const { Token } = await import('./src/net/bigtangle/core/Token');
  return Token;
};

/**
 * Dynamically imports the Transaction class to avoid circular dependency issues
 */
export const loadTransaction = async () => {
  const { Transaction } = await import('./src/net/bigtangle/core/Transaction');
  return Transaction;
};

/**
 * Dynamically imports the Address class to avoid circular dependency issues
 */
export const loadAddress = async () => {
  const { Address } = await import('./src/net/bigtangle/core/Address');
  return Address;
};

/**
 * Dynamically imports the Sha256Hash class to avoid circular dependency issues
 */
export const loadSha256Hash = async () => {
  const { Sha256Hash } = await import('./src/net/bigtangle/core/Sha256Hash');
  return Sha256Hash;
};

/**
 * Dynamically imports the ECKey class to avoid circular dependency issues
 */
export const loadECKey = async () => {
  const { ECKey } = await import('./src/net/bigtangle/core/ECKey');
  return ECKey;
};

/**
 * Dynamically imports the NetworkParameters class to avoid circular dependency issues
 */
export const loadNetworkParameters = async () => {
  const { NetworkParameters } = await import('./src/net/bigtangle/params/NetworkParameters');
  return NetworkParameters;
};

/**
 * A collection of lazy-loaded bigtangle classes to avoid circular dependencies
 */
export const BigtangleLazyLoader = {
  loadCoin,
  loadCoinConstants,
  loadTransactionOutput,
  loadUtilGeneseBlock,
  loadToken,
  loadTransaction,
  loadAddress,
  loadSha256Hash,
  loadECKey,
  loadNetworkParameters,
};