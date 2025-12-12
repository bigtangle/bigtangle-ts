/**
 * Type Definitions for Bigtangle-ts Library
 * 
 * This file provides type definitions to address TypeScript compilation
 * errors that occur when importing the bigtangle-ts library. The library previously
 * had circular dependency issues that manifested both at compile-time and
 * runtime, but these have been significantly reduced by moving static constants
 * to a separate CoinConstants class with lazy initialization.
 * 
 * Previously, runtime errors occurred as "Cannot access 'Coin' before initialization"
 * due to circular dependencies between modules like Coin, 
 * TransactionOutput, UtilGeneseBlock, and Token. This occurred because these 
 * modules had static initializers that reference each other during module 
 * loading, creating a race condition.
 * 
 * The circular dependency pattern was resolved by:
 * - Moving static constants (Coin.ZERO, Coin.COIN, etc.) to CoinConstants class
 * - Using lazy initialization that creates constants only when first accessed
 * - Breaking the static initialization chain that caused the circular dependency
 * 
 * For safe usage patterns, use the safe access patterns provided in safe-bigtangle.ts
 * which use dynamic imports as an additional safety measure.
 * 
 * For TypeScript compilation, this declaration file provides type information
 * for the refactored library.
 */

declare module 'bigtangle-ts' {
  // Basic interfaces first (non-circular)
  interface INetworkParameters {
    MaxTarget: bigint;
    BIGTANGLE_TOKENID_STRING: string;
    BIGTANGLE_TOKENNAME: string;
    BigTangleCoinTotal: string;
    BIGTANGLE_DECIMAL: number;
    getBIGTANGLE_TOKENID(): Buffer;
    getMaxTarget(): bigint;
  }

  interface ISha256Hash {
    getBytes(): Uint8Array;
    hashCode(): number;
    equals(other: ISha256Hash): boolean;
    toString(): string;
  }
  
  interface ICoin {
    value: bigint;
    tokenid: Buffer;
    getValue(): bigint;
    getTokenid(): Buffer;
    getTokenHex(): string;
    add(coin: ICoin): ICoin;
    subtract(coin: ICoin): ICoin;
    multiply(factor: bigint | number): ICoin;
    divide(divisor: bigint | number): ICoin;
    isPositive(): boolean;
    isNegative(): boolean;
    isZero(): boolean;
    signum(): number;
    compareTo(other: ICoin): number;
    toString(): string;
    toJSON(): { value: string; tokenid: string };
    
    // Static methods only (no static constants anymore)
    static valueOf(satoshis: bigint, tokenid?: Buffer): ICoin;
    static valueOfString(satoshis: bigint, tokenid?: string): ICoin;
    static fromJSON(json: any): ICoin;
  }

  interface ICoinConstants {
    // These are now properties of an instance rather than static on Coin
    readonly ZERO: ICoin;
    readonly COIN: ICoin;
    readonly SATOSHI: ICoin;
    readonly NEGATIVE_SATOSHI: ICoin;
    readonly FEE_DEFAULT: ICoin;
  }
  
  interface IScript {
    getProgram(): Uint8Array;
    isSentToAddress(): boolean;
    isPayToScriptHash(): boolean;
    getToAddress(params: INetworkParameters): any; // Would be Address type
    getPubKey(): Uint8Array;
    getPubKeyHash(): Uint8Array;
    isSentToRawPubKey(): boolean;
  }
  
  interface ITransaction {
    getHash(): ISha256Hash;
    getOutputs(): ITransactionOutput[];
    addOutput(output: ITransactionOutput): void;
    addInput(input: any): void; // Would be TransactionInput type
    setData(data: Uint8Array): void;
  }
  
  interface ITransactionOutput {
    getValue(): ICoin;
    setValue(coin: ICoin): void;
    getScriptBytes(): Uint8Array;
    getScriptPubKey(): IScript;
    getParentTransaction(): ITransaction;
    getParentTransactionHash(): ISha256Hash;
    getIndex(): number;
    markAsSpent(input: any): void; // Would be TransactionInput type
    isAvailableForSpending(): boolean;
    toString(): string;
    duplicateDetached(): ITransactionOutput;
  }
  
  interface IUtilGeneseBlock {
    createGenesis(params: INetworkParameters): any; // Would be Block type
    add(params: INetworkParameters, amount: bigint, account: string, coinbase: ITransaction): void;
  }
  
  interface IToken {
    getTokenid(): string | null;
    setTokenid(tokenid: string | null): void;
    getTokenname(): string | null;
    setTokenname(tokenname: string | null): void;
    getAmount(): bigint | null;
    setAmount(amount: bigint | null): void;
    getTokenFullname(): string;
    isTokenDomainname(): boolean;
    setTokentype(type: number): void;
    getTokentype(): number;
    toString(): string;
  }

  // Main exports
  export const NetworkParameters: INetworkParameters;
  export class Coin implements ICoin {}
  export const CoinConstants: ICoinConstants;
  export class Sha256Hash implements ISha256Hash {}
  export class TransactionOutput implements ITransactionOutput {}
  export class Transaction implements ITransaction {}
  export class Script implements IScript {}
  export class UtilGeneseBlock implements IUtilGeneseBlock {}
  export class Token implements IToken {}
  
  // Additional utility exports would go here...
}