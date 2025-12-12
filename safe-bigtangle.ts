/**
 * Safe Bigtangle Access Module
 * 
 * This module provides safe access patterns to work with bigtangle-ts classes
 * while avoiding potential issues.
 * 
 * NOTE: The library's circular dependency issues have been significantly reduced
 * by moving static constants to the CoinConstants class with lazy initialization.
 * This module provides additional safety for complex operations.
 */

import { BigtangleLazyLoader } from './bigtangle-wrapper';

/**
 * Safely gets the Coin class
 */
export const getSafeCoin = async () => {
  return await BigtangleLazyLoader.loadCoin();
};

/**
 * Safely gets the CoinConstants class
 */
export const getSafeCoinConstants = async () => {
  return await BigtangleLazyLoader.loadCoinConstants();
};

/**
 * Safely gets the TransactionOutput class 
 */
export const getSafeTransactionOutput = async () => {
  return await BigtangleLazyLoader.loadTransactionOutput();
};

/**
 * Safely gets the UtilGeneseBlock class
 */
export const getSafeUtilGeneseBlock = async () => {
  return await BigtangleLazyLoader.loadUtilGeneseBlock();
};

/**
 * Safely gets the Token class
 */
export const getSafeToken = async () => {
  return await BigtangleLazyLoader.loadToken();
};

/**
 * Safely gets the Transaction class
 */
export const getSafeTransaction = async () => {
  return await BigtangleLazyLoader.loadTransaction();
};

/**
 * Safely gets the Address class
 */
export const getSafeAddress = async () => {
  return await BigtangleLazyLoader.loadAddress();
};

/**
 * Safely gets the Sha256Hash class
 */
export const getSafeSha256Hash = async () => {
  return await BigtangleLazyLoader.loadSha256Hash();
};

/**
 * Safely gets the ECKey class
 */
export const getSafeECKey = async () => {
  return await BigtangleLazyLoader.loadECKey();
};

/**
 * Safely gets the NetworkParameters class
 */
export const getSafeNetworkParameters = async () => {
  return await BigtangleLazyLoader.loadNetworkParameters();
};

/**
 * Utility function to create a Coin instance safely using dynamic import
 * @param satoshis The amount in satoshis
 * @param tokenid Optional token ID buffer or string
 */
export const createSafeCoin = async (satoshis, tokenid) => {
  const Coin = await getSafeCoin();
  return new Coin(satoshis, tokenid);
};

/**
 * Utility function to create a TransactionOutput instance safely using dynamic import
 * @param params Network parameters
 * @param parent Parent transaction
 * @param value Coin value
 * @param scriptBytes Script bytes
 */
export const createSafeTransactionOutput = async (params, parent, value, scriptBytes) => {
  const TransactionOutput = await getSafeTransactionOutput();
  return new TransactionOutput(params, parent, value, scriptBytes);
};

/**
 * Utility function to create a Token instance safely using dynamic import
 * @param tokenid Token ID string
 * @param tokenname Token name string
 */
export const createSafeToken = async (tokenid, tokenname) => {
  const Token = await getSafeToken();
  return new Token(tokenid, tokenname);
};

/**
 * Collection of safe accessors and creators for bigtangle-ts classes
 */
export const SafeBigtangleAccess = {
  getSafeCoin,
  getSafeCoinConstants,
  getSafeTransactionOutput,
  getSafeUtilGeneseBlock,
  getSafeToken,
  getSafeTransaction,
  getSafeAddress,
  getSafeSha256Hash,
  getSafeECKey,
  getSafeNetworkParameters,
  createSafeCoin,
  createSafeTransactionOutput,
  createSafeToken,
};

/**
 * The refactoring of bigtangle-ts has significantly reduced circular dependency issues
 * by moving static constants from Coin class to CoinConstants class with lazy initialization.
 * 
 * Previously, the circular dependency occurred because:
 * - Coin.ts had static initialization of constants like  CoinConstants.ZERO = Coin.valueOfString(...)
 * - TransactionOutput.ts used Coin in its static methods
 * - UtilGeneseBlock.ts imported both TransactionOutput and Coin
 * 
 * The solution was to eliminate the static initialization in Coin.ts and move constants
 * to CoinConstants.ts where they are lazily initialized only when accessed.
 * 
 * This approach:
 * - Eliminates "Cannot access 'Coin' before initialization" runtime errors
 * - Maintains API compatibility 
 * - Uses lazy initialization to break the circular dependency chain
 */