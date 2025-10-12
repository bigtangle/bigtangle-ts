// TypeScript translation of Wallet.java
// Imports from core, utils, exception, params, script as requested
import { Address } from "../core/Address";
import { Block } from "../core/Block";
import { Coin } from "../core/Coin";
import { ECKey } from "../core/ECKey";
import { NetworkParameters } from "../params/NetworkParameters";
import { Token } from "../core/Token";
import { TokenInfo } from "../core/TokenInfo";
import { Transaction } from "../core/Transaction";
import { UTXO } from "../core/UTXO";
import { Utils } from "../utils/Utils";
import { Base58 } from "../utils/Base58";
import { Sha256Hash } from "../core/Sha256Hash";
import { DeterministicKey } from "../crypto/DeterministicKey";
import { TransactionSignature } from "../crypto/TransactionSignature";
import { InsufficientMoneyException } from "../exception/InsufficientMoneyException";
import { NoTokenException } from "../exception/NoTokenException";
import { ReqCmd } from "../params/ReqCmd";
import { ServerPool } from "../pool/server/ServerPool";
import { GetTokensResponse } from "../response/GetTokensResponse";
import { MultiSignResponse } from "../response/MultiSignResponse";
import { Json } from "../utils/Json";
import { OkHttp3Util } from "../utils/OkHttp3Util";
import { WalletBase } from "./WalletBase";
import { KeyChainGroup } from "./KeyChainGroup";
import { LocalTransactionSigner } from "../signers/LocalTransactionSigner";
import { FreeStandingTransactionOutput } from "./FreeStandingTransactionOutput";
import { TransactionInput } from "../core/TransactionInput";
import { TransactionOutput } from "../core/TransactionOutput";
import { MemoInfo } from "../core/MemoInfo";
import { OrderOpenInfo } from "../core/OrderOpenInfo";
import { BlockType } from "../core/BlockType";
import { TransactionOutPoint } from "../core/TransactionOutPoint";
import { ECDSASignature } from "../core/ECDSASignature";
import { SigHash } from "../core/SigHash";
import { MultiSignAddress } from "../core/MultiSignAddress";
import { MultiSignBy } from "../core/MultiSignBy";
import { MultiSignByRequest } from "../response/MultiSignByRequest";
import { KeyPurpose } from "../wallet/KeyChain";
import { ScriptBuilder } from "../script/ScriptBuilder";

// Define Buffer for browser environments if needed
declare const Buffer: any;

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
      this.setServerURL(url);
    }
  }

  // Additional WalletBase methods would be inherited automatically

  async getTip(): Promise<Block> {
    const requestParam = {};
    const tip = await OkHttp3Util.postAndGetBlock(
      this.getServerURL() + ReqCmd.getTip,
      Json.jsonmapper().stringify(requestParam)
    );

    const hexBytes = Utils.HEX.decode(tip);
    const buffer = Buffer.from(hexBytes);
    return this.params
      .getDefaultSerializer()
      .makeBlock(buffer);
  }

  
  async calculateAllSpendCandidates(
    aesKey: any,
    multisigns: boolean
  ): Promise<FreeStandingTransactionOutput[]> {
    const candidates: FreeStandingTransactionOutput[] = [];
    const utxos = await this.calculateAllSpendCandidatesUTXO(aesKey, multisigns);
    for (const output of utxos) {
      candidates.push(new FreeStandingTransactionOutput(this.params, output));
    }
    return candidates;
  }

  checkSpendpending(output: UTXO): boolean {
    // Check if the output is pending spend
    return output.isSpendPending() && 
           (Date.now() - output.getSpendPendingTime()) < WalletBase.SPENTPENDINGTIMEOUT;
  }


 
  async saveToken(
    tokenInfo: TokenInfo,
    basecoin: Coin,
    ownerKey: ECKey,
    aesKey: any,
    pubKeyTo?: Uint8Array,
    memoInfo?: MemoInfo
  ): Promise<Block> {
    // If pubKeyTo is not provided, use the owner key's public key
    if (!pubKeyTo) {
      pubKeyTo = ownerKey.getPubKey();
    }
    
    // If memoInfo is not provided, create a default memo
    if (!memoInfo) {
      memoInfo = new MemoInfo("coinbase");
    }
    const token = tokenInfo.getToken();
    if (!token) {
      throw new Error("Token cannot be null");
    }

    // Handle domain name block hash if needed
    if (Utils.isBlank(token.getDomainNameBlockHash()) && Utils.isBlank(token.getTokenname ? token.getTokenname() : "")) {
      const domainName = token.getTokenname ? token.getTokenname() : "";
      const getDomainBlockHashResponse = await this.getDomainNameBlockHash(domainName || "");
      const domainNameBlockHash = getDomainBlockHashResponse.getdomainNameToken ? getDomainBlockHashResponse.getdomainNameToken() : null;
      if (domainNameBlockHash) {
        token.setDomainNameBlockHash(domainNameBlockHash.getBlockHashHex ? domainNameBlockHash.getBlockHashHex() || "" : "");
        token.setTokenname(domainNameBlockHash.getTokenname ? domainNameBlockHash.getTokenname() || "" : "");
      }
    }

    if (Utils.isBlank(token.getDomainNameBlockHash()) && !Utils.isBlank(token.getTokenname ? token.getTokenname() : "")) {
      const domainResponse = await this.getDomainNameBlockHash((token.getTokenname ? token.getTokenname() : "") || "");
      const domain = domainResponse && domainResponse.getdomainNameToken ? domainResponse.getdomainNameToken() : null;
      if (domain && domain.getBlockHashHex) {
        token.setDomainNameBlockHash(domain.getBlockHashHex() || "");
      }
    }

    const multiSignAddresses = tokenInfo.getMultiSignAddresses ? tokenInfo.getMultiSignAddresses() : [];
    
    // Only get previous token multi-sign addresses if token has a domainNameBlockHash
    // This prevents server errors when creating first token or tokens without domains
    let permissionedAddressesResponse = null;
    const domainNameBlockHash = token.getDomainNameBlockHash ? token.getDomainNameBlockHash() : (token as any).domainNameBlockHash;
    if (domainNameBlockHash && domainNameBlockHash !== "") {
        permissionedAddressesResponse = await this.getPrevTokenMultiSignAddressList(token);
    }
    
    if (permissionedAddressesResponse != null && 
        permissionedAddressesResponse.getMultiSignAddresses != null &&
        permissionedAddressesResponse.getMultiSignAddresses().length > 0) {
      
      if (Utils.isBlank(token.getTokenname ? token.getTokenname() : "")) {
        const newTokenName = permissionedAddressesResponse.getTokenname ? 
          (typeof permissionedAddressesResponse.getTokenname === 'function' ? 
            permissionedAddressesResponse.getTokenname() : 
            permissionedAddressesResponse.getTokenname) : 
          permissionedAddressesResponse.tokenname;
        if (newTokenName && token.setTokenname) {
          token.setTokenname(newTokenName);
        }
      }

      for (const multiSignAddress of permissionedAddressesResponse.getMultiSignAddresses()) {
        const pubKeyHex = multiSignAddress.getPubKeyHex ? 
          (typeof multiSignAddress.getPubKeyHex === 'function' ? 
            multiSignAddress.getPubKeyHex() : 
            multiSignAddress.pubKeyHex) : 
          multiSignAddress.pubKeyHex;
        const tokenid = token.getTokenid ? 
          (typeof token.getTokenid === 'function' ? 
            token.getTokenid() : 
            (token as any).tokenid) : 
          (token as any).tokenid;
        multiSignAddresses.push(new MultiSignAddress(tokenid, "", pubKeyHex, 0));
      }
    }

    // +1 for domain name or super domain
    const currentSignNumber = token.getSignnumber ? token.getSignnumber() : (token as any).signnumber || 0;
    token.setSignnumber(currentSignNumber + 1);
    
    const block = await this.getTip();
    block.setBlockType(BlockType.BLOCKTYPE_TOKEN_CREATION);
    
    // Use the proper createCoinbaseTransaction method like Java implementation
    const tokenCreationTx = Transaction.createCoinbaseTransaction(
      this.params,
      Buffer.from(pubKeyTo),
      basecoin,
      tokenInfo,
      memoInfo
    );
    
    block.addTransaction(tokenCreationTx);

    const transactions = block.getTransactions ? block.getTransactions() : [];
    if (!transactions || transactions.length === 0) {
      throw new Error("No transactions found in block");
    }
    const transaction = transactions[0];

    const sighash = transaction.getHash();
    if (!sighash) {
      throw new Error("No hash found in transaction");
    }
    
    // Convert Sha256Hash to bytes for signing
    const sighashBytes = sighash.getBytes ? sighash.getBytes() : (sighash as any).bytes ? (sighash as any).bytes : new Uint8Array(0);
    
    // Handle ownerKey.sign which might return a Promise
    const party1Signature = await ownerKey.sign(sighashBytes, aesKey);
    const buf1 = (party1Signature as any).encodeToDER ? (party1Signature as any).encodeToDER!() : party1Signature;

    const multiSignBies: MultiSignBy[] = [];

    // First signature (owner key) - similar to the working method
    let multiSignBy0 = new MultiSignBy();
    const tokenResult = tokenInfo.getToken ? tokenInfo.getToken() : null;
    const tokenIdStr = tokenResult && tokenResult.getTokenid ? tokenResult.getTokenid() : (tokenResult as any)?.tokenid || "";
    multiSignBy0.setTokenid(tokenIdStr ? tokenIdStr.trim() : "");
    multiSignBy0.setTokenindex(0);
    multiSignBy0.setAddress(ownerKey.toAddress(this.params).toBase58());
    multiSignBy0.setPublickey(Utils.HEX.encode(ownerKey.getPubKey()));
    multiSignBy0.setSignature(Utils.HEX.encode(buf1 instanceof Uint8Array ? buf1 : new Uint8Array(buf1)));
    multiSignBies.push(multiSignBy0);

    // Add second signature from wallet key, similar to Java client approach
    const walletKeys = await this.walletKeys(aesKey);
    if (walletKeys.length > 0) {
        const secondKey = walletKeys[0];  // Use the first wallet key as second signer
        if (secondKey && secondKey.getPublicKeyAsHex() !== ownerKey.getPublicKeyAsHex()) {
            const secondSignature = await secondKey.sign(sighashBytes, aesKey);
            const buf2 = (secondSignature as any).encodeToDER ? (secondSignature as any).encodeToDER!() : secondSignature;
            
            const multiSignBy1 = new MultiSignBy();
            multiSignBy1.setTokenid(tokenIdStr ? tokenIdStr.trim() : "");
            multiSignBy1.setTokenindex(0);
            multiSignBy1.setAddress(secondKey.toAddress(this.params).toBase58());
            multiSignBy1.setPublickey(Utils.HEX.encode(secondKey.getPubKey()));
            multiSignBy1.setSignature(Utils.HEX.encode(buf2 instanceof Uint8Array ? buf2 : new Uint8Array(buf2)));
            multiSignBies.push(multiSignBy1);
        }
    }
    
    const multiSignByRequest = MultiSignByRequest.create(multiSignBies);
    // In TypeScript, we convert to JSON string and then to bytes
    const jsonData = Json.jsonmapper().stringify(multiSignByRequest);
    transaction.setDataSignature(new TextEncoder().encode(jsonData));

    // Add fee transaction like the Java implementation does
    // This creates the 2-transaction structure that the server expects
    if (this.getFee()) {
        const coinList = await this.calculateAllSpendCandidates(aesKey, false);
        const feeTx = await this.feeTransaction1(aesKey, coinList);
        block.addTransaction(feeTx);
    }
    
    return await this.adjustSolveAndSign(block);
  }

  /**
   * Pay a specific amount to an address
   * @param aesKey The encryption key
   * @param toAddress The recipient address
   * @param coin The amount to send
   * @param memoInfo Optional memo information
   * @returns A block containing the transaction
   */
  async pay(
    aesKey: any,
    toAddress: string,
    coin: Coin,
    memoInfo?: MemoInfo
  ): Promise<Block> {
    const giveMoneyResult = new Map<string, bigint>();
    giveMoneyResult.set(toAddress, coin.getValue());
    
    const coinList = await this.calculateAllSpendCandidates(aesKey, false);
    const block = await this.payMoneyToECKeyList(
      aesKey,
      giveMoneyResult,
      coin.getTokenid(),
      memoInfo ? memoInfo.toString() : "",
      coinList,
      0,
      0
    );
    
    if (!block) {
      throw new Error("Failed to create payment transaction");
    }
    
    return block;
  }

  /**
   * Pay specific amounts to multiple addresses
   * @param aesKey The encryption key
   * @param giveMoneyResult A map of addresses to amounts
   * @param tokenid The token ID to use
   * @param memo Optional memo information
   * @returns A block containing the transaction
   */
  async payToList(
    aesKey: any,
    giveMoneyResult: Map<string, bigint>,
    tokenid: Buffer,
    memo?: string
  ): Promise<Block | null> {
    const coinList = await this.calculateAllSpendCandidates(aesKey, false);
    return this.payMoneyToECKeyList(
      aesKey,
      giveMoneyResult,
      tokenid,
      memo || "",
      coinList,
      0,
      0
    );
  }

  chopped<T>(list: T[], L: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < list.length; i += L) {
      chunks.push(list.slice(i, i + L));
    }
    return chunks;
  }

  async feeTransaction(aesKey: any, block: Block ): Promise<Block> {
    const coinList = await this.calculateAllSpendCandidates(aesKey, false);
    const transaction = await this.feeTransaction1(aesKey, coinList); 
    block.addTransaction(transaction);
    return block;
  }

  async calculateAllSpendCandidatesUTXO(
    aesKey: any,
    multisigns: boolean
  ): Promise<UTXO[]> {
    const pubKeyHashs: string[] = [];
    const keys = await this.walletKeys(aesKey); 
    for (const ecKey of keys) { 
      pubKeyHashs.push(Utils.HEX.encode(ecKey.getPubKeyHash()));
    }
    
    if (pubKeyHashs.length === 0) {
      return [];
    }
    
    // Send the addresses array directly as JSON
    const jsonString = Json.jsonmapper().stringify(pubKeyHashs);
     
    // Create Buffer from the JSON string directly
    const buffer = Buffer.from(jsonString, 'utf8');
     
    const resp = await OkHttp3Util.post(
      this.getServerURL() + ReqCmd.getOutputs,
      buffer
    );
    
    // Parse response and convert plain objects to UTXO instances
    const responseObj: any = Json.jsonmapper().parse(resp);
    let utxos: UTXO[] = [];
    
    if (responseObj.outputs) {
      utxos = responseObj.outputs.map((outputData: any) => {
        return UTXO.fromJSONObject(outputData);
      });
    }
    if (!utxos) {
      return [];
    }
    
    // Filter out spent and pending outputs
    utxos = utxos.filter(utxo =>  
      utxo &&  
      !utxo.isSpent()  && 
      !this.checkSpendpending(utxo)
    );
    
    // If multisigns is false, filter out multisign UTXOs
    if (!multisigns) {
      utxos = utxos.filter(utxo => 
        utxo && 
        typeof utxo.isMultiSig === 'function' && 
        !utxo.isMultiSig()
      );
    }
    
    return utxos;
  }
  
    async feeTransaction1(
    aesKey: any,
    coinList: FreeStandingTransactionOutput[]
  ): Promise<Transaction> {
    const spent = new Transaction(this.params);
    spent.setMemo("fee");
    
    // Fixed fee in BIG
    let amount = Coin.FEE_DEFAULT.negate();
    let beneficiary: ECKey | null = null;
    
    // filter only for NetworkParameters.BIGTANGLE_TOKENID
    const coinListTokenid = this.filterTokenid(
      NetworkParameters.getBIGTANGLE_TOKENID(),
      coinList
    );
    
    for (const spendableOutput of coinListTokenid) {
      const utxo = spendableOutput.getUTXO();
      if (utxo) {
        beneficiary = await this.getECKey(aesKey, utxo.getAddress());
        amount = spendableOutput.getValue().add(amount);
        spent.addInput2(utxo.getBlockHash(), spendableOutput);
        
        if (!amount.isNegative()) {
          if (beneficiary) {
            spent.addOutputEckey(amount, beneficiary);
          }
          break;
        }
      }
    }
    
    if (beneficiary == null || amount.isNegative()) {
      throw new InsufficientMoneyException(
        Coin.FEE_DEFAULT.getValue() + " outputs size= " + coinListTokenid.length
      );
    }

    await this.signTransaction(spent, aesKey, 'THROW');
    return spent;
  }

  /**
   * Sign a token with a specific key
   * @param tokenid The token ID to sign
   * @param signkey The key to use for signing
   * @param aesKey The encryption key
   */
  async signToken(
    tokenid: string,
    signkey: ECKey,
    aesKey: any
  ): Promise<void> {
    // Get token info from server
    const token = await this.checkTokenId(tokenid);
    
    // Create a transaction that represents the signature
    const tx = new Transaction(this.params);
    
    // Add inputs and outputs as needed for the signature
    // This would typically involve creating a new transaction that references
    // the token and adds the signature
    
    // Sign the transaction with the provided key
    await this.signTransaction(tx, aesKey, 'THROW');
    
    // Add the transaction to a block and post
    const block = new Block(this.params);
    block.addTransaction(tx);
    // Use BLOCKTYPE_TOKEN_CREATION for token signing as well
    block.setBlockType(BlockType.BLOCKTYPE_TOKEN_CREATION);
    
    await this.solveAndPost(block);
  }

  /**
   * Multi-sign a token with a specific key
   * @param tokenid The token ID to multi-sign
   * @param signkey The key to use for multi-signing
   * @param aesKey The encryption key
   */
  async multiSign(
    tokenid: string,
    signkey: ECKey,
    aesKey: any
  ): Promise<void> {
    // This method should follow the same pattern as pullBlockDoMultiSign from RemoteTest
    // but implemented in the wallet
    
    // First, get the token signing request from the server
    const requestParam = new Map<string, any>();
    const address = signkey.toAddress(this.params).toBase58();
    requestParam.set("address", address);
    requestParam.set("tokenid", tokenid);
    
    const resp: string = await OkHttp3Util.postStringSingle(
      this.getServerURL() + ReqCmd.getTokenSignByAddress,
      Buffer.from(Json.jsonmapper().stringify(Object.fromEntries(requestParam)))
    );

    const trimmedResp = resp.trim();
    const multiSignResponse = Json.jsonmapper().parse(trimmedResp, {
      mainCreator: () => [MultiSignResponse],
    });

    // This would need to get the MultiSignResponse type
    if (!multiSignResponse || typeof multiSignResponse.getMultiSigns !== 'function') {
      console.log("No multi-sign data available or wrong response type");
      return;
    }
    
    const multiSigns = multiSignResponse.getMultiSigns();
    if (!multiSigns || multiSigns.length === 0) {
      console.log("No multi-sign data to process");
      return;
    }
    
    // Process the first multi-sign data
    const multiSign = multiSigns[0];

    // Get the block from the hash
    const payloadBytes = Buffer.from(multiSign.getBlockhashHex() as string, "hex");
    const block0 = this.params.getDefaultSerializer().makeBlock(payloadBytes);
    const transaction = block0.getTransactions()![0];

    // Get existing multi-sign by data or create new array
    let multiSignBies: MultiSignBy[] | null = null;
    if (transaction.getDataSignature() === null) {
      multiSignBies = new Array<MultiSignBy>();
    } else {
      const multiSignByRequest = Json.jsonmapper().parse(
        transaction.getDataSignature()!.toString(),
        { mainCreator: () => [MultiSignByRequest] }
      );
      multiSignBies = multiSignByRequest.getMultiSignBies()!;
    }
    
    // Create signature for this signing party
    const sighash = transaction.getHash();
    const partySignature = await signkey.sign(sighash!.getBytes());
    const signatureBytes = partySignature.encodeToDER();

    const multiSignBy = new MultiSignBy();
    multiSignBy.setTokenid(multiSign.getTokenid()!);
    multiSignBy.setTokenindex(multiSign.getTokenindex()!);
    multiSignBy.setAddress(signkey.toAddress(this.params).toBase58());
    multiSignBy.setPublickey(Utils.HEX.encode(signkey.getPubKey()));
    multiSignBy.setSignature(Utils.HEX.encode(signatureBytes));
    multiSignBies!.push(multiSignBy);
    
    const multiSignByRequest = MultiSignByRequest.create(multiSignBies!);
    transaction.setDataSignature(
      Buffer.from(Json.jsonmapper().stringify(multiSignByRequest))
    );
    
    // Post the updated block back to the server
    await OkHttp3Util.post(
      this.getServerURL() + ReqCmd.signToken,
      Buffer.from(block0.bitcoinSerialize())
    );
  }

  async checkTokenId(tokenid: string): Promise<Token> {
    const requestParam = new Map<string, any>();
    requestParam.set("tokenid", tokenid);
    
    // Using OkHttp3Util.post instead of postString
    const resp = await OkHttp3Util.post(
      this.getServerURL() + ReqCmd.getTokenById,
      Buffer.from(Json.jsonmapper().stringify(Object.fromEntries(requestParam)))
    );

    const token: GetTokensResponse = Json.jsonmapper().parse(resp, {
      mainCreator: () => [GetTokensResponse],
    });
    
    const tokens = token.getTokens();
    if (!tokens || tokens.length === 0) {
      throw new NoTokenException();
    }
    
    return tokens[0];
  }

  
  filterTokenid(
    tokenid: Uint8Array,
    l: FreeStandingTransactionOutput[]
  ): FreeStandingTransactionOutput[] {
    return l.filter(output => {
      const utxo = output.getUTXO();
      if (!utxo) return false;
      const tok = Utils.HEX.decode(utxo.getTokenId());
      return Utils.arraysEqual(tok, tokenid);
    });
  }

  async getECKey(aesKey: any, address: string | null): Promise<ECKey> {
    if (address === null) {
      throw new Error("Address cannot be null");
    }
    let pubKeyHash: Uint8Array;
    // Check if address is in base58 format (starts with '1' or '3' and contains alphanumeric characters)
    if (/^[1-9A-HJ-NP-Za-km-z]{26,35}$/.test(address)) {
      // Decode base58 address to get public key hash
      const decoded = Base58.decode(address);
      // The public key hash is between bytes 1-21 (after version byte, before checksum)
      pubKeyHash = decoded.subarray(1, 21);
    } else {
      // Try hex decoding if it's a hex string
      pubKeyHash = Utils.HEX.decode(address);
    }
    
    const key = this.keyChainGroup.findKeyFromPubHash(pubKeyHash);
    if (key) {
      return key;
    }
    throw new Error("Key not found for address: " + address);
  }
  
  async payMoneyToECKeyList(
    aesKey: any,
    giveMoneyResult: Map<string, bigint>,
    tokenid: Uint8Array,
    memo: string,
    coinList: FreeStandingTransactionOutput[],
    fee: number,
    confirmTarget: number
  ): Promise<Block | null> {
    if (giveMoneyResult.size === 0) {
      return null;
    }
    
    let summe = Coin.valueOf(BigInt(0), Buffer.from(tokenid));
    const multispent = new Transaction(this.params);
    multispent.setMemo(memo);
    
    // Add outputs for each recipient
    const entries = Array.from(giveMoneyResult.entries());
    for (const element of entries) {
      const [addressStr, amount] = element;
      const coin = new Coin(amount, Buffer.from(tokenid));
      const address = Address.fromBase58(this.params, addressStr);
      multispent.addOutputAddress(coin, address);
     summe= summe.add(coin);
    }
    
    let amount = summe.negate();
    // Add fee if needed
    if (this.getFee() && amount.isBIG()) {
      const fee = Coin.valueOf(Coin.FEE_DEFAULT.getValue(), amount.getTokenid());
      amount = amount.add(fee.negate());
    }
    
    let beneficiary: ECKey | null = null;
    // Filter only for tokenid
    const coinListTokenid = this.filterTokenid(tokenid, coinList);
    
        for (const spendableOutput of coinListTokenid) {
          const utxo = spendableOutput.getUTXO();
          if (utxo) {
            beneficiary = await this.getECKey(aesKey, utxo.getAddress());
            amount = amount.add(utxo.getValue());
            multispent.addInput2(spendableOutput.getUTXO().getBlockHash(), spendableOutput);
            
            if (!amount.isNegative()) {
              if (beneficiary) {
                multispent.addOutputEckey(amount, beneficiary);
              }
              break;
            }
          }
        }
    
    if (beneficiary == null || amount.isNegative()) {
      throw new InsufficientMoneyException(summe.toString() + " outputs size= " + coinListTokenid.length);
    }

    await this.signTransaction(multispent, aesKey, 'THROW');
    const block = await this.getTip();
    block.addTransaction(multispent);
 
    return await this.solveAndPost(block);
  }

  /**
   * Add a transaction signer to the wallet
   * @param signer The transaction signer to add
   */
  addTransactionSigner(signer: any): void {
    this.signers.push(signer);
  }

 

  /**
   * Get the current fee settings
   */
  getFee(): boolean {
    // Return default fee or configured fee - matches WalletBase signature
    return true; // or this.fee if available from WalletBase
  }

  /**
   * Get wallet keys
   * @param aesKey The encryption key
   * @returns Array of ECKey objects
   */
  async walletKeys(aesKey: any): Promise<ECKey[]> {
    // Return the keys from the key chain group
    return this.keyChainGroup.getImportedKeys();
  }

  /**
   * Solve the block and post it to the network
   * @param block The block to solve and post
   * @returns The solved block
   */
  async solveAndPost(block: Block): Promise<Block> {
    try {
      // Solve the block
      block.solve();
      
      // Check the valid to time must be at least the block creation time
      
      // Post the block to the network
      await OkHttp3Util.post(
        this.getServerURL() + ReqCmd.saveBlock,
        Buffer.from(block.bitcoinSerialize())
      );
      
      return block;
    } catch (error) {
      // Handle connection errors
      if (error instanceof Error && error.message.includes('connect')) {
        if (this.serverPool) {
          this.serverPool.removeServer(this.getServerURL());
        }
        throw error;
      }
      // Re-throw any other errors
      throw error;
    }
  }

  async buyOrder(
    aesKey: any,
    tokenId: string,
    buyPrice: bigint,
    buyAmount: bigint,
    validToTime: Date | null,
    validFromTime: Date | null,
    baseToken: string,
    allowRemainder: boolean
  ): Promise<Block> {
    // Create a transaction for the buy order
    const tx = new Transaction(this.params);
    
    // Create order info
    const orderInfo = new OrderOpenInfo();
    orderInfo.setTargetTokenid(tokenId);
    orderInfo.setPrice(Number(buyPrice));
    orderInfo.setTargetValue(Number(buyAmount));
    orderInfo.setOrderBaseToken(baseToken);
    orderInfo.setOfferTokenid(baseToken); // For buy orders, offer token is the base token
    
    if (validToTime) {
      orderInfo.setValidToTime(validToTime.getTime());
    }
    
    if (validFromTime) {
      orderInfo.setValidFromTime(validFromTime.getTime());
    }
    
    // Set the order info as transaction data
    tx.setData(orderInfo.toByteArray());
    
    // Add a simple memo
    tx.setMemo("buy order");
    
    // Sign the transaction
    await this.signTransaction(tx, aesKey, 'THROW');
    
    // Create a block with the transaction
    const block = new Block(this.params);
    block.addTransaction(tx);
    block.setBlockType(BlockType.BLOCKTYPE_ORDER_OPEN);
    
    return block;
  }

  public async sellOrder(
    aesKey: any,
    tokenId: string,
    sellPrice: bigint,
    offerValue: bigint,
    validToTime: Date | null,
    validFromTime: Date | null,
    baseToken: string,
    allowRemainder: boolean
  ): Promise<Block> {
    // Create a transaction for the sell order
    const tx = new Transaction(this.params);
    
    // Create order info
    const orderInfo = new OrderOpenInfo();
    orderInfo.setTargetTokenid(baseToken); // For sell orders, target token is the base token
    orderInfo.setPrice(Number(sellPrice));
    orderInfo.setOfferValue(Number(offerValue));
    orderInfo.setOfferTokenid(tokenId); // For sell orders, offer token is the token being sold
    orderInfo.setOrderBaseToken(baseToken);
    
    if (validToTime) {
      orderInfo.setValidToTime(validToTime.getTime());
    }
    
    if (validFromTime) {
      orderInfo.setValidFromTime(validFromTime.getTime());
    }
    
    // Set the order info as transaction data
    tx.setData(orderInfo.toByteArray());
    
    // Add a simple memo
    tx.setMemo("sell order");
    
    // Sign the transaction
    await this.signTransaction(tx, aesKey, 'THROW');
    
    // Create a block with the transaction
    const block = new Block(this.params);
    block.addTransaction(tx);
    block.setBlockType(BlockType.BLOCKTYPE_ORDER_OPEN);
    
    return block;
  }

  totalAmount(
    price: bigint,
    amount: bigint,
    tokenDecimal: number,
    allowRemainder: boolean
  ): bigint {
    // Calculate total amount: price * amount
    let total = price * amount;
    
    // If remainder is not allowed, we need to adjust based on token decimals
    if (!allowRemainder) {
      const divisor = BigInt(Math.pow(10, tokenDecimal));
      total = (total / divisor) * divisor;
    }
    
    return total;
  }

  /**
   * Get the balance of a specific token
   * @param aesKey The encryption key
   * @param tokenid The token ID to check
   * @returns The balance as a Coin object
   */
  async getBalance(aesKey: any, tokenid?: Uint8Array): Promise<Coin> {
    const utxos = await this.calculateAllSpendCandidatesUTXO(aesKey, false);
    
    let totalValue = BigInt(0);
    const tokenIdToCheck = tokenid || NetworkParameters.getBIGTANGLE_TOKENID();
    
    for (const utxo of utxos) {
      if (utxo && utxo.getTokenId) {
        const utxoTokenId = Utils.HEX.decode(utxo.getTokenId());
        if (Utils.arraysEqual(utxoTokenId, tokenIdToCheck)) {
          const value = utxo.getValue();
          const valueToAdd = typeof value === 'bigint' ? value : (value.getValue ? value.getValue() : BigInt(0));
          totalValue += valueToAdd;
        }
      }
    }
    
    return Coin.valueOf(totalValue, Buffer.from(tokenIdToCheck));
  }

  /**
   * Create a new key pair and add it to the wallet
   * @returns The new ECKey
   */
  freshReceiveKey(): ECKey {
    return this.keyChainGroup.freshKey(KeyPurpose.RECEIVE_FUNDS);
  }

  /**
   * Get the current receive address
   * @returns The current receive address
   */
  currentReceiveAddress(): Address {
    return this.keyChainGroup.currentAddress(KeyPurpose.RECEIVE_FUNDS);
  }

  /**
   * Get a fresh receive address
   * @returns A new receive address
   */
  freshReceiveAddress(): Address {
    return this.keyChainGroup.freshAddress(KeyPurpose.RECEIVE_FUNDS);
  }

  /**
   * Publish a domain name with associated data
   * @param aesKey The encryption key
   * @param domainName The domain name to publish
   * @param data The data associated with the domain
   * @returns A block containing the transaction
   */
  async publishDomainName(
    aesKey: any,
    domainName: string,
    data: string
  ): Promise<Block> {
    // Create a transaction for domain registration
    const tx = new Transaction(this.params);
    
    // Add domain name and data as transaction data
    const domainInfo = {
      domainName,
      data,
      timestamp: Date.now()
    };
    
    // Convert to byte array
    const domainData = new TextEncoder().encode(JSON.stringify(domainInfo));
    tx.setData(domainData);
    
    // Add a simple memo
    tx.setMemo(`domain registration: ${domainName}`);
    
    // Sign the transaction
    await this.signTransaction(tx, aesKey, 'THROW');
    
    // Create a block with the transaction
    const block = new Block(this.params);
    block.addTransaction(tx);
    // Use BLOCKTYPE_USERDATA for domain registration since BLOCKTYPE_DOMAIN doesn't exist
    block.setBlockType(BlockType.BLOCKTYPE_USERDATA);
    
    return block;
  }

  /**
   * Place a bid on an auction
   * @param aesKey The encryption key
   * @param auctionId The ID of the auction
   * @param bidAmount The amount to bid
   * @param tokenid The token ID for the bid
   * @returns A block containing the transaction
   */
  async placeBid(
    aesKey: any,
    auctionId: string,
    bidAmount: Coin,
    tokenid: Uint8Array
  ): Promise<Block> {
    // Create a transaction for the bid
    const tx = new Transaction(this.params);
    
    // Add auction info as transaction data
    const auctionInfo = {
      auctionId,
      bidAmount: bidAmount.getValue(),
      tokenid: Utils.HEX.encode(tokenid)
    };
    
    // Convert to byte array
    const auctionData = new TextEncoder().encode(JSON.stringify(auctionInfo));
    tx.setData(auctionData);
    
    // Add input representing the bid amount
    const utxos = await this.calculateAllSpendCandidatesUTXO(aesKey, false);
    const tokenUtxos = utxos.filter(utxo => 
      Utils.arraysEqual(Utils.HEX.decode(utxo.getTokenId()), tokenid)
    );
    
    if (tokenUtxos.length === 0) {
      throw new Error(`No UTXOs found for token: ${Utils.HEX.encode(tokenid)}`);
    }
    
    // Add outputs for bid
    let totalBid = BigInt(0);
    for (const utxo of tokenUtxos) {
      if (totalBid >= bidAmount.getValue()) {
        break;
      }
      tx.addInput2(utxo.getBlockHash(), new FreeStandingTransactionOutput(this.params, utxo));
      const utxoValue = utxo.getValue();
      const utxoValueBigInt = typeof utxoValue === 'bigint' ? utxoValue : utxoValue.getValue();
      totalBid = totalBid + utxoValueBigInt;
    }
    
    if (totalBid < bidAmount.getValue()) {
      throw new InsufficientMoneyException(`Insufficient funds for bid: ${bidAmount.toString()}`);
    }
    
    // If there's change, send it back
    if (totalBid > bidAmount.getValue()) {
      const changeAmount = Coin.valueOf(totalBid - bidAmount.getValue(), Buffer.from(tokenid));
      const beneficiary = await this.getECKey(aesKey, tokenUtxos[0].getAddress());
      const changeOutput = new TransactionOutput(this.params, tx, changeAmount, beneficiary.getPubKey());
      tx.addOutput(changeOutput);
    }
    
    // Add a simple memo
    tx.setMemo(`bid on auction: ${auctionId}`);
    
    // Sign the transaction
    await this.signTransaction(tx, aesKey, 'THROW');
    
    // Create a block with the transaction
    const block = new Block(this.params);
    block.addTransaction(tx);
    // Use BLOCKTYPE_USERDATA for bid transactions since BLOCKTYPE_BID doesn't exist
    block.setBlockType(BlockType.BLOCKTYPE_USERDATA);
    
    return block;
  }

  /**
   * Create a new token/coin
   * @param aesKey The encryption key
   * @param tokenInfo The token information
   * @param initialSupply The initial supply of the token
   * @param ownerKey The owner key for the token
   * @returns A block containing the transaction
   */
  async createToken(
    aesKey: any,
    tokenInfo: TokenInfo,
    initialSupply: Coin,
    ownerKey: ECKey
  ): Promise<Block> {
    // Create a transaction for the token creation
    const tx = new Transaction(this.params);
    
    // Add token creation data
    tx.setData(tokenInfo.toByteArray());
    
    // Add output for initial token supply
    const output = new TransactionOutput(this.params, tx, initialSupply, ownerKey.getPubKey());
    tx.addOutput(output);
    
    // Add a simple memo
    const tokenResult = tokenInfo.getToken ? tokenInfo.getToken() : null;
    const tokenName = tokenResult && tokenResult.getTokenname ? tokenResult.getTokenname() : "Unknown Token";
    tx.setMemo(`create token: ${tokenName}`);
    
    // Sign the transaction
    await this.signTransaction(tx, aesKey, 'THROW');
    
    // Create a block with the transaction
    const block = new Block(this.params);
    block.addTransaction(tx);
    block.setBlockType(BlockType.BLOCKTYPE_TOKEN_CREATION);
    
    return block;
  }

  /**
   * Get all unspent outputs for a specific address
   * @param aesKey The encryption key
   * @param address The address to check
   * @returns Array of unspent outputs
   */
  async getUnspentOutputsForAddress(aesKey: any, address: string): Promise<UTXO[]> {
    const utxos = await this.calculateAllSpendCandidatesUTXO(aesKey, false);
    return utxos.filter(utxo => utxo.getAddress() === address && !utxo.isSpent());
  }

  /**
   * Get transaction history for the wallet
   * @param aesKey The encryption key
   * @returns Array of transactions
   */
  async getTransactionHistory(aesKey: any): Promise<Transaction[]> {
    // Get wallet keys to identify relevant transactions
    const keys = await this.walletKeys(aesKey);
    const pubKeyHashes = keys.map(key => Utils.HEX.encode(key.getPubKeyHash()));
    
    // This would typically involve a call to the server to get transactions
    // associated with these public key hashes
    const requestParam = {
      pubKeyHashes: pubKeyHashes
    };
    
    const resp = await OkHttp3Util.post(
      this.getServerURL() + ReqCmd.getOutputsHistory,
      Buffer.from(Json.jsonmapper().stringify(requestParam))
    );
    
    // Parse the response and return an array of transactions
    // For now, returning an empty array as the actual implementation
    // would depend on the server response format
    const responseObj: any = Json.jsonmapper().parse(resp);
    
    if (responseObj.transactions) {
      return responseObj.transactions.map((txData: any) => {
        // Convert transaction data to Transaction objects
        return new Transaction(this.params);
      });
    }
    
    return [];
  }

  async getDomainNameBlockHash(domainname: string): Promise<any> { // Replace 'any' with proper type when available
    const requestParam = new Map<string, any>();
    requestParam.set("domainname", domainname);
    
    const resp = await OkHttp3Util.post(
      this.getServerURL() + ReqCmd.getDomainNameBlockHash,
      Buffer.from(Json.jsonmapper().stringify(Object.fromEntries(requestParam)))
    );

    // Return the response object - actual type depends on server implementation
    return Json.jsonmapper().parse(resp);
  }

  isBlank(str: string | null | undefined): boolean {
    return !str || str.trim().length === 0;
  }

  async getPrevTokenMultiSignAddressList(token: any): Promise<any> { // Replace 'any' with proper type when available
    // This would typically call an endpoint to get previous multi-sign addresses for a token
    const requestParam: any = {
      tokenid: token.getTokenid ? token.getTokenid() : (token as any).tokenid
    };
    
    // Only add domainNameBlockHash if it exists and is not empty
    const domainNameBlockHash = token.getDomainNameBlockHash ? 
      token.getDomainNameBlockHash() : 
      (token as any).domainNameBlockHash;
    
    if (domainNameBlockHash && domainNameBlockHash !== "") {
      requestParam.blockhash = domainNameBlockHash;
    }
    
    try {
      const resp = await OkHttp3Util.post(
        this.getServerURL() + ReqCmd.getTokenPermissionedAddresses,
        Buffer.from(Json.jsonmapper().stringify(requestParam))
      );

      return Json.jsonmapper().parse(resp);
    } catch (error) {
      console.error("Error getting previous token multi-sign addresses:", error);
      return null;
    }
  }

  async adjustSolveAndSign(block: Block): Promise<Block> {
    // Solve the block
    block.solve();
    console.log("Solved block with nonce:", block.toString()  );
    // Post the block to the network
    await OkHttp3Util.post(
      this.getServerURL() + ReqCmd.saveBlock,
      Buffer.from(block.bitcoinSerialize())
    );
    
    return block;
  }

  /**
   * Get wallet information summary
   * @param aesKey The encryption key
   * @returns Wallet summary information
   */
  async getWalletInfo(aesKey: any): Promise<any> {
    const info: any = {};
    
    // Get the current balance for default token
    info.balance = await this.getBalance(aesKey);
    
    // Get the number of keys in the wallet
    info.keyCount = this.keyChainGroup.numKeys();
    
    // Get the current receive address
    info.currentReceiveAddress = this.currentReceiveAddress().toString();
    
    // Get server information
    info.serverURL = this.getServerURL();
    
    return info;
  }

  // Other methods implemented as needed...
}
