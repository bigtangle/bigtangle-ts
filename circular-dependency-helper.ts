/**
 * Circular Dependency Helper for bigtangle-ts
 * 
 * This helper class provides safe methods to work with bigtangle-ts classes.
 * 
 * NOTE: The library's circular dependency issues have been significantly reduced
 * by moving static constants to the CoinConstants class with lazy initialization.
 * This helper still provides additional safety and convenience for working 
 * with the library.
 * 
 * Previously, the circular dependencies involved:
 * - Coin.ts (static initialization of constants like Coin.ZERO, Coin.COIN)
 * - TransactionOutput.ts (uses Coin in constructors and static methods)
 * - UtilGeneseBlock.ts (imports both TransactionOutput and Coin)
 * 
 * These issues have been resolved by moving constants to CoinConstants.ts 
 * with lazy initialization that only creates constants when first accessed.
 * 
 * This helper provides a convenient API for working with the library safely.
 */

import { BigtangleLazyLoader } from './bigtangle-wrapper';

/**
 * Configuration options for the circular dependency helper
 */
interface CircularDependencyHelperConfig {
  /** Whether to cache loaded classes to avoid repeated dynamic imports */
  cacheClasses?: boolean;
  /** Timeout for dynamic import operations in milliseconds */
  importTimeoutMs?: number;
}

/**
 * Result of a safe coin creation operation
 */
interface SafeCoinResult {
  success: boolean;
  coin?: any;
  error?: Error;
}

/**
 * Result of a safe transaction output creation operation
 */
interface SafeTransactionOutputResult {
  success: boolean;
  transactionOutput?: any;
  error?: Error;
}

/**
 * Helper class to safely work with bigtangle-ts classes
 */
export class CircularDependencyHelper {
  private static instance: CircularDependencyHelper;
  private config: CircularDependencyHelperConfig;
  private classCache: Map<string, any> = new Map();

  /**
   * Get singleton instance of the helper
   */
  public static getInstance(config?: CircularDependencyHelperConfig): CircularDependencyHelper {
    if (!CircularDependencyHelper.instance) {
      CircularDependencyHelper.instance = new CircularDependencyHelper(config);
    }
    return CircularDependencyHelper.instance;
  }

  /**
   * Create a new instance of the helper
   */
  constructor(config?: CircularDependencyHelperConfig) {
    this.config = {
      cacheClasses: true,
      importTimeoutMs: 10000,
      ...config,
    };
  }

  /**
   * Safely get the Coin class
   */
  public async getSafeCoin(): Promise<any> {
    const cacheKey = 'Coin';
    if (this.config.cacheClasses && this.classCache.has(cacheKey)) {
      return this.classCache.get(cacheKey);
    }

    const Coin = await BigtangleLazyLoader.loadCoin();
    if (this.config.cacheClasses) {
      this.classCache.set(cacheKey, Coin);
    }
    return Coin;
  }

  /**
   * Safely get the CoinConstants class
   */
  public async getSafeCoinConstants(): Promise<any> {
    const cacheKey = 'CoinConstants';
    if (this.config.cacheClasses && this.classCache.has(cacheKey)) {
      return this.classCache.get(cacheKey);
    }

    const CoinConstants = await BigtangleLazyLoader.loadCoinConstants();
    if (this.config.cacheClasses) {
      this.classCache.set(cacheKey, CoinConstants);
    }
    return CoinConstants;
  }

  /**
   * Safely get the TransactionOutput class 
   */
  public async getSafeTransactionOutput(): Promise<any> {
    const cacheKey = 'TransactionOutput';
    if (this.config.cacheClasses && this.classCache.has(cacheKey)) {
      return this.classCache.get(cacheKey);
    }

    const TransactionOutput = await BigtangleLazyLoader.loadTransactionOutput();
    if (this.config.cacheClasses) {
      this.classCache.set(cacheKey, TransactionOutput);
    }
    return TransactionOutput;
  }

  /**
   * Safely get the UtilGeneseBlock class
   */
  public async getSafeUtilGeneseBlock(): Promise<any> {
    const cacheKey = 'UtilGeneseBlock';
    if (this.config.cacheClasses && this.classCache.has(cacheKey)) {
      return this.classCache.get(cacheKey);
    }

    const UtilGeneseBlock = await BigtangleLazyLoader.loadUtilGeneseBlock();
    if (this.config.cacheClasses) {
      this.classCache.set(cacheKey, UtilGeneseBlock);
    }
    return UtilGeneseBlock;
  }

  /**
   * Safely get the Token class
   */
  public async getSafeToken(): Promise<any> {
    const cacheKey = 'Token';
    if (this.config.cacheClasses && this.classCache.has(cacheKey)) {
      return this.classCache.get(cacheKey);
    }

    const Token = await BigtangleLazyLoader.loadToken();
    if (this.config.cacheClasses) {
      this.classCache.set(cacheKey, Token);
    }
    return Token;
  }

  /**
   * Safely create a Coin instance
   * @param satoshis The amount in satoshis
   * @param tokenid Optional token ID buffer or string
   */
  public async createSafeCoin(satoshis: bigint, tokenid?: Buffer | string): Promise<SafeCoinResult> {
    try {
      const Coin = await this.getSafeCoin();
      const coin = new Coin(satoshis, tokenid);
      return { success: true, coin };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  /**
   * Safely create a TransactionOutput instance
   * @param params Network parameters
   * @param parent Parent transaction
   * @param value Coin value
   * @param scriptBytes Script bytes
   */
  public async createSafeTransactionOutput(
    params: any, 
    parent: any, 
    value: any, 
    scriptBytes: Uint8Array
  ): Promise<SafeTransactionOutputResult> {
    try {
      const TransactionOutput = await this.getSafeTransactionOutput();
      const transactionOutput = new TransactionOutput(params, parent, value, scriptBytes);
      return { success: true, transactionOutput };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  /**
   * Safely create a Token instance
   * @param tokenid Token ID string
   * @param tokenname Token name string
   */
  public async createSafeToken(tokenid?: string, tokenname?: string): Promise<any> {
    try {
      const Token = await this.getSafeToken();
      const token = new Token(tokenid, tokenname);
      return { success: true, token };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  /**
   * Create a genesis block safely using the UtilGeneseBlock class
   * @param params Network parameters
   */
  public async createSafeGenesisBlock(params: any): Promise<any> {
    try {
      const UtilGeneseBlock = await this.getSafeUtilGeneseBlock();
      return UtilGeneseBlock.createGenesis(params);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Clear the class cache to free up memory
   */
  public clearCache(): void {
    this.classCache.clear();
  }

  /**
   * Get the number of cached classes
   */
  public getCacheSize(): number {
    return this.classCache.size;
  }

  /**
   * Initialize common classes used together to avoid multiple imports
   * This is useful when you know you'll be using multiple classes together
   */
  public async initializeCommonClasses(): Promise<{ Coin: any, CoinConstants: any, TransactionOutput: any, Token: any }> {
    const [Coin, CoinConstants, TransactionOutput, Token] = await Promise.all([
      this.getSafeCoin(),
      this.getSafeCoinConstants(),
      this.getSafeTransactionOutput(),
      this.getSafeToken()
    ]);
    
    return { Coin, CoinConstants, TransactionOutput, Token };
  }

  /**
   * Perform a safe operation that involves multiple bigtangle classes
   * This ensures all classes are loaded properly before execution
   */
  public async performSafeOperation<T>(
    operation: (classes: { Coin: any; CoinConstants: any; TransactionOutput: any; UtilGeneseBlock: any; Token: any }) => Promise<T>
  ): Promise<T> {
    const classes = await this.initializeCommonClasses();
    const UtilGeneseBlock = await this.getSafeUtilGeneseBlock();
    
    return operation({
      ...classes,
      UtilGeneseBlock
    });
  }

  /**
   * Factory method to get a Coin constant safely
   * @param constantName Name of the constant ('ZERO', 'COIN', 'SATOSHI', etc.)
   */
  public async getCoinConstant(constantName: 'ZERO' | 'COIN' | 'SATOSHI' | 'NEGATIVE_SATOSHI' | 'FEE_DEFAULT'): Promise<any> {
    try {
      const CoinConstants = await this.getSafeCoinConstants();
      return CoinConstants[constantName];
    } catch (error) {
      throw new Error(`Could not retrieve CoinConstants.${constantName}: ${error}`);
    }
  }

  /**
   * Helper to create a transaction output from an address safely
   */
  public async createSafeTransactionOutputFromAddress(
    params: any,
    parent: any,
    value: any,
    to: any
  ): Promise<any> {
    try {
      const TransactionOutput = await this.getSafeTransactionOutput();
      return TransactionOutput.fromAddress(params, parent, value, to);
    } catch (error) {
      throw new Error(`Could not create TransactionOutput from address: ${error}`);
    }
  }

  /**
   * Helper to create a transaction output from a coin key safely
   */
  public async createSafeTransactionOutputFromCoinKey(
    params: any,
    parent: any,
    value: any,
    to: any
  ): Promise<any> {
    try {
      const TransactionOutput = await this.getSafeTransactionOutput();
      return TransactionOutput.fromCoinKey(params, parent, value, to);
    } catch (error) {
      throw new Error(`Could not create TransactionOutput from coin key: ${error}`);
    }
  }

  /**
   * Creates a safe Coin value using valueOf method
   */
  public async createSafeCoinValueOf(satoshis: bigint, tokenid?: Buffer): Promise<any> {
    try {
      const Coin = await this.getSafeCoin();
      return Coin.valueOf(satoshis, tokenid);
    } catch (error) {
      throw new Error(`Could not create Coin with valueOf: ${error}`);
    }
  }

  /**
   * Creates a safe Coin value using valueOfString method
   */
  public async createSafeCoinValueOfString(satoshis: bigint, tokenid?: string): Promise<any> {
    try {
      const Coin = await this.getSafeCoin();
      return Coin.valueOfString(satoshis, tokenid);
    } catch (error) {
      throw new Error(`Could not create Coin with valueOfString: ${error}`);
    }
  }
}

export default CircularDependencyHelper;

/**
 * Example usage:
 * 
 * import { CircularDependencyHelper } from './circular-dependency-helper';
 * 
 * const helper = CircularDependencyHelper.getInstance();
 * 
 * // Create a coin safely
 * const coinResult = await helper.createSafeCoin(100000n);
 * if (coinResult.success) {
 *   console.log('Created coin:', coinResult.coin);
 * }
 * 
 * // Perform operations involving multiple classes
 * await helper.performSafeOperation(async (classes) => {
 *   const { Coin, CoinConstants, TransactionOutput } = classes;
 *   // Use the classes without worrying about circular dependencies
 * });
 */