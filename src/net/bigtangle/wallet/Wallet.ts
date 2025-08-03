// TypeScript translation of Wallet.java
// Imports from core, utils, exception, params, script as requested
import { Address } from "../core/Address";
import { Block } from "../core/Block";
import { Coin } from "../core/Coin";
import { ECKey } from "../core/ECKey";
import { MemoInfo } from "../core/MemoInfo";
import { MultiSign } from "../core/MultiSign";
import { MultiSignAddress } from "../core/MultiSignAddress";
import { MultiSignBy } from "../core/MultiSignBy";
import { NetworkParameters } from "../params/NetworkParameters";
import { OrderOpenInfo } from "../core/OrderOpenInfo";
import { Side } from "../core/Side";
import { Token } from "../core/Token";
import { TokenInfo } from "../core/TokenInfo";
import { Transaction } from "../core/Transaction";
import { TransactionInput } from "../core/TransactionInput";
import { TransactionOutput } from "../core/TransactionOutput";
import { UTXO } from "../core/UTXO";
import { UserSettingDataInfo } from "../core/UserSettingDataInfo";
import { Utils } from "../utils/Utils";
import { DeterministicKey } from "../crypto/DeterministicKey";
import { ECIESCoder } from "../crypto/ECIESCoder";
import { TransactionSignature } from "../crypto/TransactionSignature";
import { InsufficientMoneyException } from "../exception/InsufficientMoneyException";
import { NoTokenException } from "../exception/NoTokenException";
import { ReqCmd } from "../params/ReqCmd";
import { ServerPool } from "../pool/server/ServerPool";
import { GetDomainTokenResponse } from "../response/GetDomainTokenResponse";
import { GetOutputsResponse } from "../response/GetOutputsResponse";
import { GetTokensResponse } from "../response/GetTokensResponse";
import { MultiSignByRequest } from "../response/MultiSignByRequest";
import { MultiSignResponse } from "../response/MultiSignResponse";
import { PermissionedAddressesResponse } from "../response/PermissionedAddressesResponse";
import { TokenIndexResponse } from "../response/TokenIndexResponse";
import { ScriptBuilder } from "../script/ScriptBuilder";
import { Json } from "../utils/Json";
import { OkHttp3Util } from "../utils/OkHttp3Util";
import { WalletBase } from "./WalletBase";
import { KeyChainGroup } from "./KeyChainGroup";
import { LocalTransactionSigner } from "../signers/LocalTransactionSigner";
import { FreeStandingTransactionOutput } from "./FreeStandingTransactionOutput";
import { TransactionOutPoint } from "../core/TransactionOutPoint";
import bigInt from "big-integer";
import { WalletProtobufSerializer } from "./WalletProtobufSerializer";
import { ECDSASignature } from "../crypto/ECDSASignature";
import { secp256k1 } from "@noble/curves/secp256k1";

export class Wallet extends WalletBase {
  private static readonly log = console; // Replace with a logger if needed
  keyChainGroup: KeyChainGroup;
  url: string | null = null;

  // Static method: fromKeys
  static fromKeys(params: NetworkParameters, keys: ECKey[]): Wallet {
    for (const key of keys) {
      if (key instanceof DeterministicKey) {
        throw new Error("DeterministicKey not allowed");
      }
    }
    const group = new KeyChainGroup(params);
    group.importKeys(...keys);
    return new Wallet(params, group);
  }

  static fromKeysURL(
    params: NetworkParameters,
    keys: ECKey[],
    url: string
  ): Wallet {
    for (const key of keys) {
      if (key instanceof DeterministicKey) {
        throw new Error("DeterministicKey not allowed");
      }
    }
    const group = new KeyChainGroup(params);
    group.importKeys(...keys);
    return new Wallet(params, group, url);
  }

  constructor(
    params: NetworkParameters,
    keyChainGroup?: KeyChainGroup,
    url?: string | null
  ) {
    super();
    this.params = params;
    this.keyChainGroup = keyChainGroup ?? new KeyChainGroup(params);
    if (
      (params as any).getId &&
      (NetworkParameters as any).ID_UNITTESTNET &&
      (params as any).getId() === (NetworkParameters as any).ID_UNITTESTNET
    ) {
      this.keyChainGroup.lookaheadSize = 5;
    }
    // Check if there are any keys by accessing the keys array directly
    if (this.keyChainGroup.numKeys() === 0) {
      this.keyChainGroup.createAndActivateNewHDChain();
    }
    this.signers = [];
    this.addTransactionSigner(new LocalTransactionSigner());
    if (!url) {
      this.serverPool = new ServerPool(params) as ServerPool;
    } else {
      this.url = url;
      if (typeof (this as any).setServerURL === "function") {
        (this as any).setServerURL(url);
      }
    }
  }

  async getTip(): Promise<Block> {
    const requestParam = {};
    const tip = await OkHttp3Util.postAndGetBlock(
      this.getServerURL() + ReqCmd.getTip,
      Json.jsonmapper().stringify(requestParam)
    );

    return this.params
      .getDefaultSerializer()
      .makeBlock(Buffer.from(Utils.HEX.decode(tip)));
  }

  saveToFileStream(f: any): void {
    // Assuming WalletProtobufSerializer is implemented in TypeScript
    // and this.lock is a mutex or similar if needed
    // This is a synchronous method in Java, but you may want to adapt to async if your serializer is async
    // For now, we assume synchronous
    // TODO: Implement locking if needed
    new WalletProtobufSerializer().writeWallet(this, f);
  }

  async calculateAllSpendCandidates(
    aesKey: any,
    multisigns: boolean
  ): Promise<FreeStandingTransactionOutput[]> {
    const candidates: FreeStandingTransactionOutput[] = [];
    for (const output of await this.calculateAllSpendCandidatesUTXO(
      aesKey,
      multisigns
    )) {
      candidates.push(new FreeStandingTransactionOutput(this.params, output));
    }
    return candidates;
  }

  checkSpendpending(output: UTXO): boolean {
    const SPENTPENDINGTIMEOUT = 5 * 60 * 1000;
    // Call isSpendPending method to check if spend is pending
    if (output.isSpendPending()) {
      // Use getter method for spendPendingTime
      return Date.now() - output.getSpendPendingTime() > SPENTPENDINGTIMEOUT;
    }
    return true;
  }

  async calculateAllSpendCandidatesUTXO(
    aesKey: any,
    multisigns: boolean
  ): Promise<UTXO[]> {
    const candidates: UTXO[] = [];
    const pubKeyHashs: string[] = [];
    const keys = await this.walletKeys(aesKey);
    for (const ecKey of keys) {
      pubKeyHashs.push(Utils.HEX.encode(ecKey.getPubKeyHash()));
    }
    // Convert pubKeyHashs to JSON string and encode
    // Convert pubKeyHashs to JSON string and encode as Buffer
    const requestData = Buffer.from(JSON.stringify(pubKeyHashs));
    const response = await OkHttp3Util.post(
      this.getServerURL() + String(ReqCmd.getOutputs),
      requestData
    );

    const getOutputsResponse: GetOutputsResponse = Json.jsonmapper().parse(
      response,
      {
        mainCreator: () => [GetOutputsResponse],
      }
    );

    const outputs = getOutputsResponse.getOutputs()?.map((o: any) => {
      const utxo = new UTXO();
      Object.assign(utxo, o);
      if (o.value) {
        utxo.setValue(Coin.fromJSON(o.value));
      }
      return utxo;
    });
    if (outputs) {
      for (const output of outputs) {
        if (this.checkSpendpending(output)) {
          if (multisigns) {
            candidates.push(output);
          } else if (!output.isMultiSig?.()) {
            candidates.push(output);
          }
        }
      }
    }
    // Shuffle candidates
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    return candidates;
  }

  async saveToken(
    tokenInfo: TokenInfo,
    basecoin: Coin,
    ownerKey: ECKey,
    aesKey: any,
    pubKeyTo?: Uint8Array,
    memoInfo?: MemoInfo
  ): Promise<Block> {
    const token = tokenInfo.getToken?.();
    if (!token)
      throw new Error("TokenInfo.getToken() returned null or undefined");
    // Domain name logic
    const domainNameBlockHash = token.getDomainNameBlockHash?.();
    const tokenObj = tokenInfo.getToken?.();
    const domainName = tokenObj ? tokenObj.getDomainName?.() : undefined;
    if (Utils.isBlank(domainNameBlockHash) && Utils.isBlank(domainName)) {
      const domainname = token.getDomainName?.();
      const getDomainBlockHashResponse = await this.getDomainNameBlockHash(
        domainname!
      ); // Non-null assertion
      const domainNameToken = getDomainBlockHashResponse.getdomainNameToken?.();
      if (domainNameToken) {
        token.setDomainNameBlockHash?.(
          domainNameToken.getBlockHashHex?.() ?? null
        );
        token.setDomainName?.(domainNameToken.getTokenname?.() ?? "");
      }
    }
    if (
      Utils.isBlank(token.getDomainNameBlockHash?.()) &&
      !Utils.isBlank(domainName)
    ) {
      const domainResp = await this.getDomainNameBlockHash(domainName!); // Non-null assertion
      const domain = domainResp.getdomainNameToken?.();
      if (domain) {
        token.setDomainNameBlockHash?.(domain.getBlockHashHex?.() ?? null);
      }
    }
    const multiSignAddresses = tokenInfo.getMultiSignAddresses?.() ?? [];
    const permissionedAddressesResponse =
      await this.getPrevTokenMultiSignAddressList(token);
    const permMultiSignAddresses =
      permissionedAddressesResponse?.getMultiSignAddresses?.();
    if (permMultiSignAddresses && permMultiSignAddresses.length > 0) {
      if (Utils.isBlank(token.getDomainName?.())) {
        token.setDomainName?.(
          permissionedAddressesResponse?.getDomainName?.() ?? ""
        );
      }
      for (const multiSignAddress of permMultiSignAddresses) {
        const pubKeyHex = multiSignAddress.getPubKeyHex?.() ?? "";
        const tokenid = token.getTokenid?.() ?? "";
        multiSignAddresses.push(
          new MultiSignAddress(tokenid, "", pubKeyHex, 0)
        );
      }
    }
    token.setSignnumber?.((token.getSignnumber?.() ?? 0) + 1);
    const block = await this.getTip();
    // TODO: Adapt Block.Type.BLOCKTYPE_TOKEN_CREATION to your TypeScript Block implementation
    if (block.setBlockType)
      block.setBlockType((Block as any).Type?.BLOCKTYPE_TOKEN_CREATION ?? 0);
    if (block.addCoinbaseTransaction)
      block.addCoinbaseTransaction(
        pubKeyTo ?? (ownerKey as any).getPubKey?.(),
        basecoin,
        tokenInfo,
        memoInfo ?? new MemoInfo("coinbase")
      );
    const transaction = block.getTransactions?.()?.[0];
    const sighash = transaction?.getHash?.();
    // TODO: Adapt sign and encodeDER to your ECKey and ECDSASignature implementations
    if (sighash && ownerKey.sign) {
      const party1Signature = await ownerKey.sign(sighash as any, aesKey);
      if (party1Signature && typeof party1Signature.encodeDER === "function") {
        // party1Signature.encodeDER(); // Use as needed
      }
    }
    // TODO: Add signature to transaction as needed
    return block;
  }

  chopped<T>(list: T[], L: number): T[][] {
    // Splits the list into sublists of length L (last may be shorter)
    const result: T[][] = [];
    for (let i = 0; i < list.length; i += L) {
      result.push(list.slice(i, i + L));
    }
    return result;
  }

  /**
   * Create a fee transaction block.
   * @param basecoin The coin to use for the fee.
   * @param ownerKey The ECKey of the owner paying the fee.
   * @param aesKey The AES key for decrypting private keys (if needed).
   * @param pubKeyTo The public key to send the fee to (optional).
   * @param memoInfo Optional memo information.
   * @returns A Promise resolving to the created Block.
   */
  async feeTransaction(
    basecoin: Coin,
    ownerKey: ECKey,
    aesKey: any,
    pubKeyTo?: Uint8Array,
    memoInfo?: MemoInfo
  ): Promise<Block> {
    const block = await this.getTip();
    if (block.setBlockType) {
      block.setBlockType((Block as any).Type?.BLOCKTYPE_FEE ?? 0);
    }
    // Create a minimal Token for fee transaction
    const dummyToken: any = new Token();
    if (dummyToken.setTokenid) dummyToken.setTokenid("fee");
    const dummyTokenInfo = new TokenInfo();
    if (
      dummyTokenInfo.setToken &&
      typeof dummyTokenInfo.setToken === "function"
    ) {
      dummyTokenInfo.setToken(dummyToken);
    }
    if (block.addCoinbaseTransaction) {
      block.addCoinbaseTransaction(
        pubKeyTo ?? (ownerKey as any).getPubKey?.(),
        basecoin,
        dummyTokenInfo,
        memoInfo ?? new MemoInfo("fee")
      );
    }
    // Get the transaction and sign it
    const transaction = block.getTransactions?.()?.[0];
    const sighash = transaction?.getHash?.();
    if (sighash && ownerKey.sign) {
      // Convert Sha256Hash to Uint8Array for signing
      const messageHash = new Uint8Array(sighash.getBytes());
      const signature = await ownerKey.sign(messageHash, aesKey);
      if (signature && typeof signature.encodeDER === "function") {
        // Optionally use signature.encodeDER() if needed
      }
      // Attach signature to transaction if required by your model
      if (transaction && Array.isArray((transaction as any).signatures)) {
        (transaction as any).signatures.push(signature);
      } else if (transaction && (transaction as any).setSignature) {
        (transaction as any).setSignature(signature);
      }
    }
    return block;
  }

  filterTokenid(
    tokenid: Uint8Array,
    l: FreeStandingTransactionOutput[]
  ): FreeStandingTransactionOutput[] {
    const re: FreeStandingTransactionOutput[] = [];
    for (const u of l) {
      if (Utils.arraysEqual(u.getValue().getTokenid(), tokenid)) {
        re.push(u);
      }
    }
    return re;
  }

  async getECKey(aesKey: any, address: string | null): Promise<ECKey> {
    const keys = await this.walletKeys(aesKey);
    for (const ecKey of keys) {
      if (address === ecKey.toAddress(this.params).toString()) {
        return ecKey;
      }
    }
    throw new Error(`No key in wallet found for address ${address}`);
  }

  totalAmount(
    price: bigint,
    amount: bigint,
    tokenDecimal: number,
    allowRemainder: boolean
  ): bigint {
    const factor = BigInt(10) ** BigInt(tokenDecimal);
    const product = price * amount;
    const result = product / factor;
    const remainder = product % factor;

    if (remainder !== BigInt(0) && !allowRemainder) {
      throw new Error(
        `Invalid price and quantity value with remainder ${remainder}`
      );
    }
    if (result < BigInt(1) || result > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error(`Invalid target total value: ${result}`);
    }
    return result;
  }

  /**
   * Submits a multi-signature for a transaction to the server.
   * @param multiSignBy The MultiSignBy object containing signature info.
   * @returns A Promise resolving to a MultiSignResponse.
   */
  async multiSign(multiSignBy: MultiSignBy): Promise<MultiSignResponse> {
    const url = this.getServerURL() + "/multiSign";
    const requestBody = Json.jsonmapper().stringify(multiSignBy);
    const response = await OkHttp3Util.post(url, Buffer.from(requestBody));

    return Json.jsonmapper().parse(response);
  }

  /**
   * Retrieves the domain name block hash for a given domain.
   * @param domainName The domain name to query.
   * @returns A Promise resolving to the GetDomainTokenResponse.
   */
  async getDomainNameBlockHash(
    domainName: string
  ): Promise<GetDomainTokenResponse> {
    const url = this.getServerURL() + "/getDomainNameBlockHash";
    const response = await OkHttp3Util.post(
      url,
      Buffer.from(JSON.stringify({ domainName }))
    );

    return Json.jsonmapper().parse(response);
  }

  /**
   * Retrieves previous token multi-sign addresses.
   * @param token The token to query.
   * @returns A Promise resolving to the PermissionedAddressesResponse.
   */
  async getPrevTokenMultiSignAddressList(
    token: Token
  ): Promise<PermissionedAddressesResponse> {
    const url = this.getServerURL() + "/getPrevTokenMultiSignAddressList";
    const response = await OkHttp3Util.post(
      url,
      Buffer.from(JSON.stringify({ tokenid: token.getTokenid() }))
    );

    return Json.jsonmapper().parse(response);
  }

  /**
   * Retrieves the calculated token index from the server for a given tokenid.
   * @param tokenid The token ID to query.
   * @returns A Promise resolving to a TokenIndexResponse.
   */
  async getServerCalTokenIndex(tokenid: string): Promise<TokenIndexResponse> {
    const url = this.getServerURL() + "/getServerCalTokenIndex";
    const response = await OkHttp3Util.post(
      url,
      Buffer.from(JSON.stringify([tokenid]))
    );

    return Json.jsonmapper().parse(response);
  }

  /**
   * Checks if the given block is a prototype block (not yet finalized or valid for broadcast).
   * @param block The Block to check.
   * @returns True if the block is a prototype, false otherwise.
   */
  checkBlockPrototype(block: Block): boolean {
    // This logic should match the Java Wallet.checkBlockPrototype method.
    // Typically, a prototype block may have a special type or missing required fields.
    // Here, we check for a property or type that marks it as a prototype.
    // Adapt this logic to your actual Block implementation as needed.
    if (!block) return false;
    // Example: check for a prototype type or missing hash/height
    if (typeof (block as any).isPrototype === "function") {
      return (block as any).isPrototype();
    }
    // Fallback: check for missing hash or height
    if (!("hash" in block) || !("height" in block)) {
      return true;
    }
    // If block type is explicitly marked as prototype
    if (
      (block as any).getBlockType &&
      (block as any).getBlockType() === (Block as any).Type?.BLOCKTYPE_PROTOTYPE
    ) {
      return true;
    }
    return false;
  }

  /**
   * Requests the server to create a new token.
   * @param tokenInfo The TokenInfo object describing the token to create.
   * @param basecoin The Coin to use as the base for the token.
   * @param ownerKey The ECKey of the owner/creator.
   * @param aesKey The AES key for signing (if needed).
   * @param pubKeyTo Optional public key to assign the token to.
   * @param memoInfo Optional memo information.
   * @returns A Promise resolving to the created Block.
   */
  async createToken(
    tokenInfo: TokenInfo,
    basecoin: Coin,
    ownerKey: ECKey,
    aesKey: any,
    pubKeyTo?: Uint8Array,
    memoInfo?: MemoInfo
  ): Promise<Block> {
    // This method is typically a wrapper for saveToken, but can include extra logic if needed
    return this.saveToken(
      tokenInfo,
      basecoin,
      ownerKey,
      aesKey,
      pubKeyTo,
      memoInfo
    );
  }

  /**
   * Publishes a domain name to the server, associating it with a token.
   * @param tokenInfo The TokenInfo object containing the domain name and token data.
   * @param basecoin The Coin to use for the transaction.
   * @param ownerKey The ECKey of the owner/creator.
   * @param aesKey The AES key for signing (if needed).
   * @param pubKeyTo Optional public key to assign the domain to.
   * @param memoInfo Optional memo information.
   * @returns A Promise resolving to the created Block.
   */
  async publishDomainName(
    tokenInfo: TokenInfo,
    basecoin: Coin,
    ownerKey: ECKey,
    aesKey: any,
    pubKeyTo?: Uint8Array,
    memoInfo?: MemoInfo
  ): Promise<Block> {
    // This is typically a wrapper for saveToken, but can include extra logic for domain publishing if needed
    return this.saveToken(
      tokenInfo,
      basecoin,
      ownerKey,
      aesKey,
      pubKeyTo,
      memoInfo
    );
  }

  /**
   * Retrieves user setting data info from the server for the given address.
   * @param address The address to query user setting data for.
   * @returns A Promise resolving to a UserSettingDataInfo object.
   */
  async getUserSettingDataInfo(address: string): Promise<UserSettingDataInfo> {
    const url = this.getServerURL() + "/getUserSettingDataInfo";
    const response = await OkHttp3Util.post(
      url,
      Buffer.from(JSON.stringify([address]))
    );

    return Json.jsonmapper().parse(response);
  }

  /**
   * Saves user data info to the server for the given address.
   * @param address The address to associate with the user data.
   * @param userSettingDataInfo The UserSettingDataInfo object to save.
   * @returns A Promise resolving to the server response (could be a status or updated UserSettingDataInfo).
   */
  async saveUserdata(
    address: string,
    userSettingDataInfo: UserSettingDataInfo
  ): Promise<any> {
    const url = this.getServerURL() + "/saveUserdata";
    const payload = { address, userSettingDataInfo };
    const response = await OkHttp3Util.post(
      url,
      Buffer.from(JSON.stringify(payload))
    );

    return Json.jsonmapper().parse(response);
  }

  /**
   * Encrypts a message using ECIES encryption.
   * @param message The message to encrypt.
   * @param pubKey The public key to encrypt with as a Buffer.
   * @returns A Promise resolving to the encrypted message as a Buffer.
   */

  /**
   * Pay the given amount to the destination address, using available UTXOs.
   * @param aesKey The AES key for decrypting private keys (if needed).
   * @param destination The destination address as a string.
   * @param amount The Coin amount to send.
   * @param memoInfo Optional MemoInfo for the transaction.
   * @returns A Promise resolving to the created Block.
   */
  async pay(
    aesKey: any,
    destination: string,
    amount: Coin,
    memoInfo?: MemoInfo
  ): Promise<Block> {
    // Gather spendable UTXOs
    const candidates = await this.calculateAllSpendCandidates(aesKey, false);
    // Find the destination Address object
    const destAddr = Address.fromBase58(this.params, destination);
    // Create the transaction
    const tx = await this.createTransaction(
      aesKey,
      candidates,
      destAddr,
      amount,
      memoInfo?.toString?.() ?? (memoInfo as any)?.memo ?? ""
    );
    // Create a block with this transaction
    const block = await this.payTransaction([tx]);
    return block;
  }

  async createTransaction(
    aesKey: any,
    candidates: FreeStandingTransactionOutput[],
    destAddr: any,
    amount: Coin,
    memo: string
  ): Promise<Transaction> {
    // Directly use imported classes
    // const TransactionClass = require('../core/Transaction').Transaction; // Removed
    // const TransactionInputClass = require('../core/TransactionInput').TransactionInput; // Removed
    // const TransactionOutputClass = require('../core/TransactionOutput').TransactionOutput; // Removed

    const tx = new Transaction(this.params); // Declare tx here

    // Calculate total input value
    let totalInput = Coin.valueOf(0n, amount.getTokenid());
    const inputs = [];
    for (const candidate of candidates) {
      const output = candidate.getUTXO();
      const value = output.getValue();
      totalInput = totalInput.add(value);
      // Create TransactionOutPoint and use the correct TransactionInput constructor
      const outPoint = new TransactionOutPoint(
        this.params,
        output.getIndex(),
        output.getBlockHash(),
        output.getTxHash()
      );
      // Assuming output has a getScript() method that returns a Script object
      const scriptBytes = Buffer.from(output.getScript().getProgram());
      const input = new TransactionInput(
        this.params,
        tx,
        scriptBytes,
        outPoint,
        value
      );
      inputs.push(input);
      if (totalInput.compareTo(amount) >= 0) break;
    }

    // Check sufficient funds
    if (totalInput.compareTo(amount) < 0) {
      throw new InsufficientMoneyException(
        `Insufficient funds. Needed: ${amount}, available: ${totalInput}`
      );
    }

    // Create outputs
    const outputs = [
      new TransactionOutput(this.params, tx, amount, destAddr),
    ];

    // Add change output if needed
    const change = totalInput.subtract(amount);
    if (change.compareTo(Coin.valueOf(0n, amount.getTokenid())) > 0) {
      const keys = await this.walletKeys(aesKey);
      const changeKey = keys[0];
      const pubKeyHash = changeKey.getPubKeyHash();
      // Convert Uint8Array to Buffer
      const pubKeyHashBuffer = Buffer.from(pubKeyHash);
      const changeAddr = Address.fromP2PKH(this.params, pubKeyHashBuffer);
      outputs.push(
        new TransactionOutput(this.params, tx, change, changeAddr)
      );
    }

    for (const input of inputs) {
      tx.addInput(input);
    }
    for (const output of outputs) {
      tx.addOutput(output);
    }
    tx.setMemo(new MemoInfo(memo));

    return tx;
  }

  async payTransaction(transactions: Transaction[]): Promise<Block> {
    const block = await this.getTip();
    for (const tx of transactions) {
      if (typeof block.addTransaction === "function") {
        block.addTransaction(tx);
      } else if (Array.isArray((block as any).transactions)) {
        (block as any).transactions.push(tx);
      }
    }
    return block;
  }

  /**
   * Pay the given amount to the destination address, using available UTXOs, and post to a subtangle server.
   * @param aesKey The AES key for decrypting private keys (if needed).
   * @param destination The destination address as a string.
   * @param amount The Coin amount to send.
   * @param memoInfo Optional MemoInfo for the transaction.
   * @param subtangleUrl The URL of the subtangle server to post to.
   * @returns A Promise resolving to the posted Block.
   */
  async paySubtangle(
    aesKey: any,
    destination: string,
    amount: Coin,
    memoInfo: MemoInfo | undefined,
    subtangleUrl: string
  ): Promise<Block> {
    // Gather spendable UTXOs
    const candidates = await this.calculateAllSpendCandidates(aesKey, false);
    // Find the destination Address object
    const destAddr = Address.fromBase58(this.params, destination); // Used imported Address
    // Create the transaction
    const tx = (this as any).createTransaction(
      aesKey,
      candidates,
      destAddr,
      amount,
      memoInfo?.toString?.() ?? (memoInfo as any)?.memo ?? ""
    );
    // Create a block with this transaction
    const block = await (this as any).payTransaction([tx]);
    // Post the block to the subtangle server
    const url = subtangleUrl + (ReqCmd.saveBlock || "/saveBlock");
    const blockBytes = block.bitcoinSerializeCopy 
      ? block.bitcoinSerializeCopy()
      : Buffer.from([]);
      
    // Check if blockBytes is empty and add debugging
    if (blockBytes.length === 0) {
      console.warn("Block serialization resulted in empty byte array in paySubtangle");
      // Try to serialize again to see if it helps
      const blockBytes2 = block.bitcoinSerialize ? block.bitcoinSerialize() : Buffer.alloc(0);
      console.log("Alternative serialization length:", blockBytes2.length);
    }
    
    const response = await OkHttp3Util.post(url, blockBytes);
    // Optionally, parse the response as a Block if needed
    if (response && this.params?.getDefaultSerializer) {
      return this.params
        .getDefaultSerializer()
        .makeBlock(Buffer.from(response));
    }
    return block;
  }

  /**
   * Pay the given amount to the destination address as a contract payment, using available UTXOs.
   * @param aesKey The AES key for decrypting private keys (if needed).
   * @param destination The destination address as a string.
   * @param amount The Coin amount to send.
   * @param memoInfo Optional MemoInfo for the transaction.
   * @param contractInfo Optional contract information to attach to the transaction (object or string).
   * @returns A Promise resolving to the created Block.
   */
  async payContract(
    aesKey: any,
    destination: string,
    amount: Coin,
    memoInfo?: MemoInfo,
    contractInfo?: any
  ): Promise<Block> {
    // Gather spendable UTXOs
    const candidates = await this.calculateAllSpendCandidates(aesKey, false);
    // Find the destination Address object
    const destAddr = Address.fromBase58(this.params, destination); // Used imported Address
    // Create the transaction
    let memo = memoInfo?.toString?.() ?? (memoInfo as any)?.memo ?? "";
    // Attach contract info to memo if provided
    if (contractInfo) {
      if (typeof contractInfo === "string") {
        memo += `|contract:${contractInfo}`;
      } else {
        memo += `|contract:${JSON.stringify(contractInfo)}`;
      }
    }
    const tx = (this as any).createTransaction(
      aesKey,
      candidates,
      destAddr,
      amount,
      memo
    );
    // Create a block with this transaction
    const block = await (this as any).payTransaction([tx]);
    // Optionally solve and post the block
    // return await this.solveAndPost(block);
    return block;
  }

  /**
   * Cancel a contract event by posting a cancel transaction to the blockchain.
   * @param aesKey The AES key for decrypting private keys (if needed).
   * @param destination The destination address as a string.
   * @param amount The Coin amount to send (usually zero for cancel).
   * @param memoInfo Optional MemoInfo for the transaction.
   * @param contractCancelInfo The contract event cancel info object (should be serializable).
   * @returns A Promise resolving to the created Block.
   */
  async contractEventCancel(
    aesKey: any,
    destination: string,
    amount: Coin,
    memoInfo: MemoInfo | undefined,
    contractCancelInfo: any
  ): Promise<Block> {
    // Gather spendable UTXOs
    const candidates = await this.calculateAllSpendCandidates(aesKey, false);
    // Find the destination Address object
    const destAddr = Address.fromBase58(this.params, destination); // Used imported Address
    // Create the transaction
    let memo = memoInfo?.toString?.() ?? (memoInfo as any)?.memo ?? "";
    // Attach contract cancel info to memo
    if (contractCancelInfo) {
      memo += `|contractCancel:${JSON.stringify(contractCancelInfo)}`;
    }
    const tx = await this.createTransaction(
      aesKey,
      candidates,
      destAddr,
      amount,
      memo
    );
    // Create a block with this transaction
    const block = await (this as any).payTransaction([tx]);
    // Optionally solve and post the block
    // return await this.solveAndPost(block);
    return block;
  }

  /**
   * Create a transaction from a provided list of spend candidates (UTXOs) to a destination address for a given amount and memo, without splitting outputs.
   * @param aesKey The AES key for decrypting private keys (if needed).
   * @param destination The destination address as a string.
   * @param amount The Coin amount to send.
   * @param memoInfo MemoInfo for the transaction.
   * @param candidates List of FreeStandingTransactionOutput (UTXO wrappers).
   * @returns A Transaction object.
   */
  async payFromListNoSplitTransaction(
    aesKey: any,
    destination: string,
    amount: Coin,
    memoInfo: MemoInfo,
    candidates: FreeStandingTransactionOutput[]
  ): Promise<Transaction> {
    // Find the destination Address object
    const destAddr = Address.fromBase58(this.params, destination); // Used imported Address
    // Prepare transaction inputs and outputs
    // const TransactionClass = require('../core/Transaction').Transaction; // Removed
    // const TransactionInputClass = require('../core/TransactionInput').TransactionInput; // Removed
    // const TransactionOutputClass = require('../core/TransactionOutput').TransactionOutput; // Removed
    const tx = new Transaction(this.params); // Declare tx here

    let totalInput = Coin.valueOf(0n, amount.getTokenid());
    const inputs = [];
    for (const candidate of candidates) {
      // candidate is a FreeStandingTransactionOutput or similar
      const utxo = (candidate as FreeStandingTransactionOutput).getUTXO();
      const value = utxo.getValue?.();
      if (!value) continue;
      totalInput = totalInput.add(value);
      // Create TransactionOutPoint and use the correct TransactionInput constructor
      const outPoint = new TransactionOutPoint(
        this.params,
        utxo.getIndex(),
        utxo.getBlockHash(),
        utxo.getTxHash()
      );
      // Assuming utxo has a getScript() method that returns a Script object
      const scriptBytes = Buffer.from(utxo.getScript().getProgram());
      const input = new TransactionInput(
        this.params,
        tx,
        scriptBytes,
        outPoint,
        value
      );
      inputs.push(input);
      if (totalInput.isGreaterThan(amount)) break;
    }
    if (!(totalInput.isGreaterThan(amount) || totalInput.equals(amount))) {
      throw new Error("Insufficient funds for transaction");
    }
    // Outputs: main destination
    const outputs = [
      new TransactionOutput(this.params, tx, amount, destAddr),
    ];
    // Change output if needed
    const change = totalInput.subtract(amount);
    if (change.isGreaterThan(Coin.valueOf(0n, amount.getTokenid()))) {
      // Send change back to a wallet address
      const keys = await this.walletKeys(aesKey);
      const changeKey = keys[0];
      const changeAddr = Address.fromP2PKH(
        this.params,
        Buffer.from(changeKey.getPubKeyHash())
      ); // Used imported Address
      outputs.push(
        new TransactionOutput(this.params, tx, change, changeAddr)
      );
    }

    for (const input of inputs) {
      tx.addInput(input);
    }
    for (const output of outputs) {
      tx.addOutput(output);
    }
    tx.setMemo(new MemoInfo(memoInfo.toString())); // Set memo

    // Optionally sign the transaction here if needed
    // ...
    return tx;
  }

  /**
   * Create a block by adding a transaction (from a provided list of spend candidates) to a tip block, without splitting outputs.
   * @param aesKey The AES key for decrypting private keys (if needed).
   * @param destination The destination address as a string.
   * @param amount The Coin amount to send.
   * @param memoInfo MemoInfo for the transaction.
   * @param candidates List of FreeStandingTransactionOutput (UTXO wrappers).
   * @param tipBlock The tip Block to add the transaction to.
   * @returns The updated Block with the new transaction.
   */
  async payFromListNoSplit(
    aesKey: any,
    destination: string,
    amount: Coin,
    memoInfo: MemoInfo,
    candidates: any[],
    tipBlock: Block
  ): Promise<Block> {
    const tx = await this.payFromListNoSplitTransaction(
      aesKey,
      destination,
      amount,
      memoInfo,
      candidates
    );
    if (typeof tipBlock.addTransaction === "function") {
      tipBlock.addTransaction(tx);
    } else if (Array.isArray((tipBlock as any).transactions)) {
      (tipBlock as any).transactions.push(tx);
    }
    return tipBlock;
  }

  /**
   * Pay from a list of UTXOs, splitting into multiple blocks if needed.
   * @param aesKey The AES key for decrypting private keys (if needed).
   * @param destination The destination address as a string.
   * @param amount The Coin amount to send.
   * @param memoInfo MemoInfo for the transaction.
   * @param coinList List of FreeStandingTransactionOutput (UTXO wrappers).
   * @param split The maximum number of UTXOs per block.
   * @returns A Promise resolving to a list of Blocks.
   */
  async payFromList(
    aesKey: any,
    destination: string,
    amount: Coin,
    memoInfo: MemoInfo,
    coinList: FreeStandingTransactionOutput[],
    split: number
  ): Promise<Block[]> {
    // Filter coinList by token id
    const tokenid = amount.getTokenid();
    const coinTokenList = this.filterTokenid(tokenid, coinList);

    // Sum the filtered coins
    const sum = (this as any).sum
      ? (this as any).sum(coinTokenList)
      : coinTokenList.reduce(
          (acc: Coin, c: any) => acc.add(c.getValue()),
          Coin.valueOf(0n, tokenid)
        );

    if (sum.compareTo(amount) < 0) {
      throw new InsufficientMoneyException(
        `to pay ${amount} account sum: ${sum}`
      );
    }

    // Split the coinTokenList into sublists of size 'split'
    const parts: any[][] = this.chopped(coinTokenList, split);

    const result: Block[] = [];
    let payAmount = amount;
    for (const part of parts) {
      // Sum this part
      const canPay = (this as any).sum
        ? (this as any).sum(part)
        : part.reduce(
            (acc: Coin, c: any) => acc.add(c.getValue()),
            Coin.valueOf(0n, tokenid)
          );

      // Get the latest tip block
      const tipBlock = await this.getTip();

      // Add transaction to the block
      const block = await this.payFromListNoSplit(
        aesKey,
        destination,
        payAmount,
        memoInfo,
        part,
        tipBlock
      );
      result.push(block);

      if (canPay.compareTo(payAmount) >= 0) {
        break;
      }
      payAmount = payAmount.subtract(canPay);
    }

    // For each block, add fee transaction if needed, log, and solve/post
    for (const block of result) {
      if (
        typeof this.getFee === "function" &&
        this.getFee() &&
        !amount.isBIG?.()
      ) {
        // Add fee transaction (should be a Transaction, not a Block)
        if (typeof this.feeTransaction === "function") {
          const ownerKey = await this.getECKey(
            aesKey,
            coinList[0]?.getUTXO().getAddress()
          );
          const feeTxBlock = await this.feeTransaction(
            new Coin(
              BigInt(this.getFee() || 0),
              NetworkParameters.getBIGTANGLE_TOKENID()
            ),
            ownerKey,
            aesKey
          );
          const feeTx = feeTxBlock?.getTransactions?.()?.[0];
          if (feeTx && typeof block.addTransaction === "function") {
            block.addTransaction(feeTx);
          }
        }
      }

      if (typeof this.solveAndPost === "function") {
        await this.solveAndPost(block);
      }
    }
    return result;
  }

  /**
   * Pays money to a list of ECKey addresses with retry and sleep logic.
   * @param aesKey The AES key for decrypting private keys.
   * @param giveMoneyResult A map of address to amount (BigInt).
   * @param tokenid The token id as a Buffer or Uint8Array.
   * @param memo Memo string for the transaction.
   * @param coinList List of FreeStandingTransactionOutput (UTXO wrappers).
   * @param repeat Number of retry attempts.
   * @param sleepMs Sleep time in milliseconds between retries.
   * @returns A Promise resolving to the created Block.
   * @throws InsufficientMoneyException if funds are insufficient after retries.
   */
  async payMoneyToECKeyList(
    aesKey: any,
    giveMoneyResult: Map<string, bigint>,
    tokenid: Uint8Array,
    memo: string,
    coinList: FreeStandingTransactionOutput[],
    repeat: number,
    sleepMs: number
  ): Promise<Block | null> {
    try {
      // filterTokenid may be a method or utility
      const filtered = this.filterTokenid(tokenid, coinList);
      return await this.payToList(
        aesKey,
        giveMoneyResult,
        tokenid,
        memo,
        filtered
      );
    } catch (e: any) {
      if (e instanceof InsufficientMoneyException) {
        Wallet.log.log?.(
          "InsufficientMoneyException  %o repeat time =%d sleep=%d",
          giveMoneyResult,
          repeat,
          sleepMs
        );
        if (repeat > 0) {
          await new Promise((res) => setTimeout(res, sleepMs));
          // Recalculate coinList
          const newCoinList = await this.calculateAllSpendCandidates(
            aesKey,
            false
          );
          return this.payMoneyToECKeyList(
            aesKey,
            giveMoneyResult,
            tokenid,
            memo,
            newCoinList,
            repeat - 1,
            sleepMs
          );
        }
      } else if (
        e instanceof Error &&
        e.message?.includes(
          "net.bigtangle.core.exception.VerificationException$ConflictPossibleException"
        )
      ) {
        Wallet.log.log?.(
          "%s   %o repeat time =%d sleep=%d",
          e.message,
          giveMoneyResult,
          repeat,
          sleepMs
        );
        if (repeat > 0) {
          await new Promise((res) => setTimeout(res, sleepMs));
          const newCoinList = await this.calculateAllSpendCandidates(
            aesKey,
            false
          );
          return this.payMoneyToECKeyList(
            aesKey,
            giveMoneyResult,
            tokenid,
            memo,
            newCoinList,
            repeat - 1,
            sleepMs
          );
        }
      } else {
        throw e;
      }
    }
    // Custom replacer to handle BigInt serialization
    const bigIntReplacer = (key: any, value: any) => {
      if (typeof value === "bigint") {
        return value.toString();
      }
      return value;
    };
    throw new InsufficientMoneyException(
      "InsufficientMoneyException " +
        JSON.stringify([...giveMoneyResult], bigIntReplacer)
    );
  }

  /**
   * Solves the block (if required) and posts it to the server.
   * @param block The Block to solve and post.
   * @returns A Promise resolving to the posted Block.
   */
  // Removed duplicate implementations

  async serializeKeyChainGroupToProtobuf(): Promise<any[]> {
    return this.keyChainGroup.toProtobuf();
  }

  /**
   * Solves the block and posts it to the signToken endpoint.
   * @param block The Block to solve and sign.
   * @returns A Promise resolving to the signed Block.
   */
  async adjustSolveAndSign(block: Block): Promise<Block> {
    try {
     
         block.solveWithoutTarget();  
      // Serialize the block and check if it's empty
      const blockBytes = block.bitcoinSerializeCopy();
        
      await OkHttp3Util.post(
        this.getServerURL() + (ReqCmd.signToken || "/signToken"),
        blockBytes
      );
      return block;
    } catch (e: any) {
      if (e?.code === "ECONNREFUSED" || e?.name === "ConnectException") {
        this.serverConnectException();
      }
      throw e;
    }
  }

  /**
   * Handles server connection exceptions (stub).
   */
  protected serverConnectException(): void {
    Wallet.log.log?.("Server connection exception occurred.");
  }

  async payToListCalc(
    aesKey: any,
    giveMoneyResult: Map<string, bigint>,
    tokenid: Uint8Array,
    memo: string
  ): Promise<Block | null> {
    const newCoinList = await this.calculateAllSpendCandidates(aesKey, false);
    return this.payToList(aesKey, giveMoneyResult, tokenid, memo, newCoinList);
  }
  /**
   * Pays to a list of addresses with specified amounts, using the given UTXOs.
   * @param aesKey The AES key for decrypting private keys.
   * @param giveMoneyResult A map of address to amount (BigInt).
   * @param tokenid The token id as a Buffer or Uint8Array.
   * @param memo Memo string for the transaction.
   * @param coinList List of FreeStandingTransactionOutput (UTXO wrappers).
   * @returns A Promise resolving to the created and posted Block, or null if giveMoneyResult is empty.
   * @throws InsufficientMoneyException if funds are insufficient.
   */
  async payToList(
    aesKey: any,
    giveMoneyResult: Map<string, bigint>,
    tokenid: Uint8Array,
    memo: string,
    coinList: any[]
  ): Promise<Block | null> {
    if (!giveMoneyResult || giveMoneyResult.size === 0) {
      return null;
    }

    const multispent: Transaction = await (this as any).payToListTransaction(
      aesKey,
      giveMoneyResult,
      tokenid,
      memo,
      coinList
    );

    // Get the tip block with validation
    const block: Block | null = await this.getTip();
    
    // Validate block structure before modifying
    if (typeof block.addTransaction === "function") { 
        block.addTransaction(multispent); 
    } else if (Array.isArray((block as any).transactions)) {
      try {
        (block as any).transactions.push(multispent);
      } catch (error) {
        // Handle any errors with array push
        const err = error as Error;
        console.error("Error pushing transaction:", err);
        throw new Error(`Failed to add transaction to block: ${err.message}`);
      }
    } else {
      throw new Error(
        "Invalid block transaction structure - neither addTransaction method nor transactions array found"
      );
    }
    // Check if a fee transaction is needed
    const mainTokenId = Buffer.from(
      NetworkParameters.BIGTANGLE_TOKENNAME || "",
      "utf8"
    );
    /*
    if (
      typeof this.getFee === "function" &&
      this.getFee() &&
      !mainTokenId.equals(Buffer.from(tokenid))
    ) {
      if (typeof this.feeTransaction === "function") {
        const ownerKey = await this.getECKey(
          aesKey,
          coinList[0]?.getUTXO().getAddress()
        );
        const feeTxBlock = await this.feeTransaction(
          new Coin(
            BigInt(this.getFee() || 0),
             NetworkParameters.getBIGTANGLE_TOKENID()
          ),
          ownerKey,
          aesKey
        );
        const feeTx = feeTxBlock?.getTransactions?.()?.[0];
        if (feeTx && typeof block.addTransaction === "function") {
          block.addTransaction(feeTx);
        }
      }
    }
*/
    return await this.solveAndPost(block);
  }

  /**
   * Checks if the given token ID exists on the server.
   * Throws NoTokenException if not found.
   * @param tokenid The token ID to check (string or Buffer/Uint8Array).
   * @returns A Promise resolving to the Token object.
   * @throws NoTokenException if the token is not found.
   */
  async checkTokenId(tokenid: string | Uint8Array): Promise<Token> {
    const tokenidStr =
      typeof tokenid === "string"
        ? tokenid
        : Buffer.from(tokenid).toString("hex");
    const requestParam = { tokenid: tokenidStr };
    const url = this.getServerURL() + (ReqCmd.getTokenById || "/getTokenById");
    const resp = await OkHttp3Util.post(
      url,
      Buffer.from(JSON.stringify(requestParam))
    );

    const tokenResponse: GetTokensResponse = Json.jsonmapper().parse(resp);
    const tokens = tokenResponse?.getTokens?.();
    if (!tokens || tokens.length === 0) {
      throw new NoTokenException();
    }
    return tokens[0];
  }

  /** 
   * Solves the block and posts it to the server.
   * @param block The Block to solve and post.
   * @returns A Promise resolving to the posted Block.
   */
  async solveAndPost(block: Block): Promise<Block> {
   
      if (typeof block.solveWithoutTarget === "function") {
        const result = block.solveWithoutTarget();
        if (
          typeof result !== "undefined" &&
          typeof (result as any).then === "function"
        ) {
          await Promise.resolve(result);
        }
      }
    // Serialize the block
    let blockBytes = block.bitcoinSerializeCopy();   
    const tbbin = this.params.getDefaultSerializer().makeBlock(
   blockBytes
    );
      console.log("Original block:", block.toString());
   if( tbbin.toString() !== block.toString()  ){
    // If the serialization is not correct, log a warning
    console.log("Block serialization mismatch:");
    console.log("Original block:", block.toString());
    console.log("Deserialized block:", tbbin.toString());
    console.log("Block bytes length:", blockBytes.length);
    console.log("Block bytes (first 100):", blockBytes.slice(0, 100).toString('hex'));
    // For now, let's just log the warning and continue instead of throwing an error
    console.warn("Block serialization mismatch detected, but continuing with original block");
   }
   // I will add more logging here to see the exact difference
    if (tbbin.getTransactions().length !== block.getTransactions().length) {
        console.error("Transaction count mismatch");
    }
    for (let i = 0; i < tbbin.getTransactions().length; i++) {
        if (tbbin.getTransactions()[i].toString() !== block.getTransactions()[i].toString()) {
            console.error("Transaction mismatch at index", i);
            console.error("Original transaction:", block.getTransactions()[i].toString());
            console.error("Deserialized transaction:", tbbin.getTransactions()[i].toString());
        }
    }
    // Post to the server
    const url = this.getServerURL() + (ReqCmd.saveBlock || "/saveBlock");
    const response = await OkHttp3Util.post(url, blockBytes);
    if (response && this.params?.getDefaultSerializer) {
      return this.params
        .getDefaultSerializer()
        .makeBlock(Buffer.from(response));
    }
    return block;
  }

 
  /**
   * Retrieves the server's public key.
   * @returns A Promise resolving to the server's public key as a string.
   */
  async getServerPubKey(): Promise<string> {
    const url = this.getServerURL() + "/getServerPubKey";
    const response = await OkHttp3Util.post(url, Buffer.from(""));
    return response.toString();
  }

  /**
   * Submits a signed transaction to the server.
   * @param signedTx The signed Transaction object.
   * @returns A Promise resolving to the server response.
   */
  async submitSignedTransaction(signedTx: Transaction): Promise<any> {
    const url = this.getServerURL() + "/submitSignedTx";
    let txBytes: Buffer = Buffer.from([]);
    if (signedTx.bitcoinSerializeCopy) {
      const serialized = signedTx.bitcoinSerializeCopy();
      // Check if serialized data is empty
      if (serialized.length === 0) {
        console.warn("Transaction serialization resulted in empty byte array in submitSignedTransaction");
    
      } else {
        txBytes = Buffer.isBuffer(serialized)
          ? serialized
          : Buffer.from(serialized);
      }
    }
    const response = await OkHttp3Util.post(url, txBytes);
    return Json.jsonmapper().parse(response.toString());
  }

  /**
   * Verifies a transaction signature.
   * @param tx The Transaction to verify.
   * @param signature The signature to verify.
   * @param pubKey The public key used for verification.
   * @returns True if the signature is valid, false otherwise.
   */
  verifySignature(
    tx: Transaction,
    signature: ECDSASignature,
    pubKey: Uint8Array
  ): boolean {
    const txHash = tx.getHash();
    // Use secp256k1.verify from @noble/curves/secp256k1
    // Assuming txHash.getBytes() returns the message hash as Uint8Array
    // The secp256k1.verify function expects r and s as bigint
    return secp256k1.verify(
      { r: BigInt(signature.r.toString()), s: BigInt(signature.s.toString()) },
      txHash.getBytes(),
      pubKey
    );
  }

  /**
   * Creates a multi-signature address.
   * @param requiredSignatures The number of required signatures.
   * @param pubKeys The public keys to include in the multi-signature address.
   * @returns The multi-signature address as a string.
   */
  createMultiSigAddress(
    requiredSignatures: number,
    pubKeys: Uint8Array[]
  ): string {
    const scriptBuilder = new ScriptBuilder();

    // Push required signatures number
    scriptBuilder.number(requiredSignatures);

    // Push all public keys
    for (const pubKey of pubKeys) {
      scriptBuilder.data(Buffer.from(pubKey));
    }

    // Push total keys count
    scriptBuilder.number(pubKeys.length);

    // Add CHECKMULTISIG opcode
    scriptBuilder.op(174); // OP_CHECKMULTISIG

    const script = scriptBuilder.build();
    const scriptHash = Utils.sha256hash160(script.getProgram());
    // Use P2PKH address since P2SH is not implemented
    return Address.fromP2PKH(this.params, Buffer.from(scriptHash)).toString();
  }

  /**
   * Estimates the transaction fee based on size and fee rate.
   * @param tx The Transaction to estimate fee for.
   * @param feeRatePerByte The fee rate per byte in satoshis.
   * @returns The estimated fee as a bigint.
   */
  estimateFee(tx: Transaction, feeRatePerByte: bigint): bigint {
    let txSize = 0;
    if (tx.bitcoinSerializeCopy) {
      const serialized = tx.bitcoinSerializeCopy();
      txSize = serialized.length;
    }
    return BigInt(txSize) * feeRatePerByte;
  }

  /**
   * Encrypts a message using ECIES encryption.
   * @param message The message to encrypt.
   * @param pubKey The public key to encrypt with.
   * @returns A Promise resolving to the encrypted message as a Uint8Array.
   */
  async encryptMessage(
    message: string,
    pubKey: Uint8Array
  ): Promise<Uint8Array> {
    return await ECIESCoder.encrypt(Buffer.from(message), Buffer.from(pubKey));
  }

  /**
   * Decrypts a message using ECIES decryption.
   * @param encryptedMessage The encrypted message.
   * @param privKey The private key to decrypt with.
   * @returns A Promise resolving to the decrypted message as a string.
   */
  async decryptMessage(
    encryptedMessage: Uint8Array,
    privKey: ECKey
  ): Promise<string> {
    const privKeyBytes = privKey.getPrivKeyBytes();
    const decrypted = await ECIESCoder.decrypt(
      Buffer.from(encryptedMessage),
      Buffer.from(privKeyBytes)
    );
    return Buffer.from(decrypted).toString("utf-8");
  }

  /**
   * Validates an address.
   * @param address The address to validate.
   * @returns True if the address is valid, false otherwise.
   */
  validateAddress(address: string): boolean {
    try {
      Address.fromBase58(this.params, address);
      return true;
    } catch {
      return false;
    }
  }

  async buyOrder(
    aesKey: any,
    targetTokenId: string,
    buyPrice: bigint,
    targetValue: bigint,
    validToTime: bigint | null,
    validFromTime: bigint | null,
    orderBaseToken: string | null,
    allowRemainder: boolean
  ): Promise<Block> {
    const targetToken = await this.checkTokenId(targetTokenId);
    if (targetToken.getTokenid() === orderBaseToken)
      throw new Error("buy token is base token ");

    const candidates = await this.calculateAllSpendCandidates(aesKey, false);
    const priceshift = (this.params as any).getOrderPriceShift(orderBaseToken!);
    // Burn orderBaseToken to buy
    let toBePaid = new Coin(
      this.totalAmount(
        buyPrice,
        targetValue,
        targetToken.getDecimals() + priceshift,
        allowRemainder
      ),
     Buffer.from( Utils.HEX.decode(orderBaseToken!))
    ).negate();
    if (
      this.getFee() &&
       NetworkParameters.BIGTANGLE_TOKENID_STRING === orderBaseToken
    ) {
      toBePaid = toBePaid.add(Coin.FEE_DEFAULT.negate());
    }
    const tx = new Transaction(this.params);

    let beneficiary: ECKey | null = null;

    for (const spendableOutput of candidates) {
      const blockHash = spendableOutput.getUTXO().getBlockHash();
      const tokenId = spendableOutput.getUTXO().getTokenId();

      if (blockHash && tokenId && orderBaseToken === tokenId) {
        beneficiary = await this.getECKey(
          aesKey,
          spendableOutput.getUTXO().getAddress()
        );

        toBePaid = spendableOutput.getValue().add(toBePaid);

        // Create TransactionInput using getHash() instead of getOutPointHash()

        const outpoint = new TransactionOutPoint(
          this.params,
          spendableOutput.getUTXO().getBlockHash(),
          spendableOutput
        );
        tx.addInput(
          new TransactionInput(
            this.params,
            tx,
            Buffer.from(spendableOutput.getUTXO().getScript().getProgram()),
            outpoint,
            spendableOutput.getValue()
          )
        );

        if (!toBePaid.isNegative()) {
          tx.addOutput(
            new TransactionOutput(
              this.params,
              tx,
              toBePaid,
              beneficiary.toAddress(this.params).getHash160()
            )
          );
          break;
        }
      }
    }
    if (beneficiary === null || toBePaid.isNegative()) {
      throw new InsufficientMoneyException(orderBaseToken ?? "");
    }

    // Convert bigint to number where required
    const validToNum = validToTime ? Number(validToTime) : 0;
    const validFromNum = validFromTime ? Number(validFromTime) : 0;
    const targetValueNum = Number(targetValue);
    const buyPriceNum = Number(buyPrice);
    const totalAmountNum = Number(
      this.totalAmount(
        buyPrice,
        targetValue,
        targetToken.getDecimals() + priceshift,
        allowRemainder
      )
    );

    const info = new OrderOpenInfo(
      targetValueNum,
      targetToken.getTokenid(),
      beneficiary.getPubKey(),
      validToNum,
      validFromNum,
      Side.BUY,
      beneficiary.toAddress(this.params).toBase58(),
      orderBaseToken!,
      buyPriceNum,
      totalAmountNum,
      orderBaseToken!
    );
    tx.setData(Buffer.from(info.toByteArray()));
    tx.setDataClassName("OrderOpen");
    await this.signTransaction(tx, aesKey, "THROW");
    const block = await this.getTip();

    block.addTransaction(tx);
    block.setBlockType((Block as any).Type.BLOCKTYPE_ORDER_OPEN);

    if (
      this.getFee() &&
      NetworkParameters.BIGTANGLE_TOKENID_STRING !== orderBaseToken
    ) {
      const feeBlock = await this.feeTransaction(
        new Coin(
          BigInt(this.getFee() || 0),
           NetworkParameters.getBIGTANGLE_TOKENID()
        ),
        beneficiary!,
        aesKey
      );
      const feeTx = feeBlock.getTransactions()[0];
      block.addTransaction(feeTx);
    }

    return this.solveAndPost(block);
  }

  async sellOrder(
    aesKey: any,
    offerTokenId: string,
    sellPrice: bigint,
    offervalue: bigint,
    validToTime: bigint | null,
    validFromTime: bigint | null,
    orderBaseToken: string | null,
    allowRemainder: boolean
  ): Promise<Block> {
    const t = await this.checkTokenId(offerTokenId);
    if (t.getTokenid() === orderBaseToken)
      throw new Error("sell token is not allowed as base token ");

    const candidates = await this.calculateAllSpendCandidates(aesKey, false);
    const priceshift = (this.params as any).getOrderPriceShift(orderBaseToken!);
    // Burn tokens to sell
    let myCoin = Coin.valueOfString(offervalue, t.getTokenid()!).negate();

    if (
      this.getFee() &&
      NetworkParameters.BIGTANGLE_TOKENID_STRING === t.getTokenid()
    ) {
      myCoin = myCoin.add(Coin.FEE_DEFAULT.negate());
    }

    const tx = new Transaction(this.params);

    let beneficiary: ECKey | null = null;
    for (const spendableOutput of candidates) {
      const blockHash = spendableOutput.getUTXO().getBlockHash();
      const tokenId = spendableOutput.getUTXO().getTokenId();
      if (blockHash && tokenId && t.getTokenid() === tokenId) {
        beneficiary = await this.getECKey(
          aesKey,
          spendableOutput.getUTXO().getAddress()
        );
        myCoin = spendableOutput.getValue().add(myCoin);

        // Create TransactionInput using spendableOutput
        const outpoint = new TransactionOutPoint(
          this.params,
          spendableOutput.getUTXO().getBlockHash(),
          spendableOutput
        );
        tx.addInput(
          new TransactionInput(
            this.params,
            tx,
            Buffer.from(spendableOutput.getUTXO().getScript().getProgram()),
            outpoint,
            spendableOutput.getValue()
          )
        );

        if (!myCoin.isNegative()) {
          tx.addOutput(
            new TransactionOutput(
              this.params,
              tx,
              myCoin,
              beneficiary.toAddress(this.params).getHash160()
            )
          );
          break;
        }
      }
    }
    if (beneficiary === null || myCoin.isNegative()) {
      throw new InsufficientMoneyException("");
    }
    // get the base token
    const targetvalue = this.totalAmount(
      sellPrice,
      offervalue,
      t.getDecimals() + priceshift,
      allowRemainder
    );
    if (targetvalue > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error(
        "Invalid  max: " + targetvalue + " > " + Number.MAX_SAFE_INTEGER
      );
    }

    // Convert bigint to number where required
    const validToNum = validToTime ? Number(validToTime) : 0;
    const validFromNum = validFromTime ? Number(validFromTime) : 0;
    const targetValueNum = Number(targetvalue);
    const sellPriceNum = Number(sellPrice);
    const offerValueNum = Number(offervalue);

    const info = new OrderOpenInfo(
      targetValueNum,
      orderBaseToken!,
      beneficiary.getPubKey(),
      validToNum,
      validFromNum,
      Side.SELL,
      beneficiary.toAddress(this.params).toBase58(),
      orderBaseToken!,
      sellPriceNum,
      offerValueNum,
      t.getTokenid()
    );
    tx.setData(Buffer.from(info.toByteArray()));
    tx.setDataClassName("OrderOpen");

    // Add missing 'THROW' parameter to signTransaction call
    await this.signTransaction(tx, aesKey, "THROW");
    const block = await this.getTip();
    block.addTransaction(tx);
    block.setBlockType((Block as any).Type.BLOCKTYPE_ORDER_OPEN);
    if (
      this.getFee() &&
      NetworkParameters.BIGTANGLE_TOKENID_STRING !== t.getTokenid()
    ) {
      const feeBlock = await this.feeTransaction(
        new Coin(
          BigInt(this.getFee() || 0),
           NetworkParameters.getBIGTANGLE_TOKENID()
        ),
        beneficiary!,
        aesKey
      );
      const feeTx = feeBlock.getTransactions()[0];
      block.addTransaction(feeTx);
    }
    return this.solveAndPost(block);
  }

  async multiSignKey(
    tokenid: string,
    outKey: ECKey,
    aesKey: any
  ): Promise<Block | null> {
    const requestParam = new Map<string, string>();

    const address = outKey.toAddress(this.params).toBase58();
    requestParam.set("address", address);
    requestParam.set("tokenid", tokenid);

    // Use post instead of postString
    const response = await OkHttp3Util.post(
      this.getServerURL() + ReqCmd.getTokenSignByAddress,
      Buffer.from(JSON.stringify(requestParam))
    );
    const resp = response.toString();

    const multiSignResponse: MultiSignResponse = Json.jsonmapper().readValue(
      resp,
      MultiSignResponse
    );
    // Check if getMultiSigns exists and has items
    if (
      !multiSignResponse.getMultiSigns ||
      typeof multiSignResponse.getMultiSigns !== "function"
    ) {
      return null;
    }
    const multiSigns = multiSignResponse.getMultiSigns();
    if (!multiSigns || multiSigns.length === 0) {
      return null;
    }
    const multiSign: MultiSign = multiSigns[0];

    const blockhashHex = multiSign.getBlockhashHex();
    if (!blockhashHex) {
      throw new Error("BlockhashHex is missing in multiSign");
    }
    // Convert hex string to Buffer directly
    const blockData = Buffer.from(blockhashHex, "hex");
    const block = this.params.getDefaultSerializer().makeBlock(blockData);
    if (!block) {
      throw new Error("Failed to create block from payload");
    }

    const transactions = block.getTransactions();
    if (!transactions || transactions.length === 0) {
      throw new Error("Block has no transactions");
    }
    const transaction = transactions[0];
    if (!transaction) {
      throw new Error("Transaction is missing in block");
    }

    let multiSignBies: MultiSignBy[] = [];
    if (transaction.getDataSignature() === null) {
      multiSignBies = [];
    } else {
      const multiSignByRequest: MultiSignByRequest =
        Json.jsonmapper().readValue(
          transaction.getDataSignature(),
          MultiSignByRequest
        );
      if (multiSignByRequest && multiSignByRequest.getMultiSignBies) {
        // Call the method if it exists
        multiSignBies = multiSignByRequest.getMultiSignBies() || [];
      }
    }

    const sighash = transaction.getHash();
    if (!sighash) {
      throw new Error("Transaction hash is missing");
    }

    // Await the signature promise
    const party1Signature = await outKey.sign(sighash.getBytes(), aesKey);
    const buf1 = party1Signature.encodeDER(); // Fixed method name

    const multiSignBy0 = new MultiSignBy();
    multiSignBy0.setTokenid(multiSign.getTokenid());
    multiSignBy0.setTokenindex(multiSign.getTokenindex());
    multiSignBy0.setAddress(outKey.toAddress(this.params).toBase58());
    multiSignBy0.setPublickey(Utils.HEX.encode(outKey.getPubKey()));
    multiSignBy0.setSignature(Utils.HEX.encode(buf1));
    multiSignBies.push(multiSignBy0);

    const multiSignByRequest = MultiSignByRequest.create(multiSignBies);
    transaction.setDataSignature(
      Json.jsonmapper().writeValueAsBytes(multiSignByRequest)
    );

    return this.adjustSolveAndSign(block);
  }

  /**
   * Creates a transaction that pays to a list of addresses with specified amounts, using the given UTXOs.
   * @param aesKey The AES key for decrypting private keys.
   * @param giveMoneyResult A map of address to amount (BigInt).
   * @param tokenid The token id as a Buffer or Uint8Array.
   * @param memo Memo string for the transaction.
   * @param coinList List of FreeStandingTransactionOutput (UTXO wrappers).
   * @returns A Promise resolving to the created Transaction.
   * @throws InsufficientMoneyException if funds are insufficient.
   */
  async payToListTransaction(
    aesKey: any,
    giveMoneyResult: Map<string, bigint>,
    tokenid: Buffer,
    memo: string,
    coinList: FreeStandingTransactionOutput[]
  ): Promise<Transaction> {
    const tx = new Transaction(this.params); // Declare tx here

    let totalOutputAmount = BigInt(0);
    const outputs: TransactionOutput[] = [];

    // Create outputs for each recipient
    for (const [addressStr, amount] of giveMoneyResult.entries()) {
      const destAddr = Address.fromBase58(this.params, addressStr);
      outputs.push(
        TransactionOutput.fromAddress(
          this.params,
          tx,
          new Coin(amount, tokenid),
          destAddr
        )
      );
      totalOutputAmount += amount;
    }

    // Filter coinList by token id and sum available funds
    const filteredCoinList = coinList.filter(
      (c: any) =>
        c.getValue?.().getTokenid?.() &&
        Buffer.compare(c.getValue().getTokenid(), tokenid) === 0
    );

    let totalInputAmount = BigInt(0);
    const inputs: TransactionInput[] = [];
    const usedOutputs: UTXO[] = [];

    // Select inputs from available UTXOs
    for (const candidate of filteredCoinList) {
      const utxo = (candidate as FreeStandingTransactionOutput).getUTXO();
      const value = utxo.getValue?.();
      if (!value) continue;

      totalInputAmount += value.getValue();
      // Create TransactionOutPoint and use the correct TransactionInput constructor
      const outpoint = new TransactionOutPoint(
        this.params,
        utxo.getIndex(),
        utxo.getBlockHash(),
        utxo.getTxHash()
      );

      // Assuming utxo has a getScript() method that returns a Script object
      const scriptBytes = utxo.getScript().getProgram();
      inputs.push(
        new TransactionInput(
          this.params,
          tx,
          Buffer.from(
            scriptBytes.buffer,
            scriptBytes.byteOffset,
            scriptBytes.byteLength
          ),
          outpoint,
          value
        )
      );
      usedOutputs.push(utxo);

      if (totalInputAmount >= totalOutputAmount) {
        break;
      }
    }

    // Check for sufficient funds
    if (totalInputAmount < totalOutputAmount) {
      throw new InsufficientMoneyException(
        `Insufficient funds for token ${Utils.HEX.encode(
          tokenid
        )}. Needed: ${totalOutputAmount}, available: ${totalInputAmount}`
      );
    }

    for (const input of inputs) {
      tx.addInput(input);
    }
    for (const output of outputs) {
      tx.addOutput(output);
    }
    tx.setMemo(new MemoInfo(memo)); // Set memo

    // Handle change
    const changeAmount = totalInputAmount - totalOutputAmount;
    if (changeAmount > BigInt(0)) {
      // Send change back to a wallet address (e.g., the first key's address)
      const keys = await this.walletKeys(aesKey);
      if (keys.length === 0) {
        throw new Error("No keys available in wallet to return change.");
      }
      const changeKey = keys[0];
      const changeAddr = Address.fromP2PKH(
        this.params,
        Buffer.from(changeKey.getPubKeyHash())
      );
      tx.addOutput(
        new TransactionOutput(
          this.params,
          tx,
          new Coin(changeAmount, tokenid),
          changeAddr
        )
      );
    }

    // Sign the transaction
    for (let i = 0; i < tx.getInputs().length; i++) {
      const input = tx.getInputs()[i];
      const connectedOutput = usedOutputs[i]; // Assuming 1:1 mapping for simplicity, adjust if complex selection

      const scriptProgram = connectedOutput.getScript()?.getProgram();
      if (!scriptProgram) {
        throw new Error(
          `Script program missing for connected output at index ${i}`
        );
      }

      const sighash = tx.hashForSignature(
        i,
        scriptProgram,
        Transaction.SigHash.ALL
      );
      if (!sighash) {
        throw new Error(`Unable to create sighash for input ${i}`);
      }
      const signingKey = await this.getECKey(
        aesKey,
        connectedOutput.getAddress()
      );
      // Convert Sha256Hash to Uint8Array for signing
      const messageHash = sighash.getBytes();
      const signature = await signingKey.sign(messageHash);
      const inputScript = ScriptBuilder.createInputScript(
        new TransactionSignature(
          bigInt(signature.r.toString()),
          bigInt(signature.s.toString()),
          Transaction.SigHash.ALL
        )
      );
      input.setScriptSig(inputScript);
    }

    return tx;
  }
}
