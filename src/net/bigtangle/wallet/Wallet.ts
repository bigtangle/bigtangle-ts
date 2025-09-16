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
import { Base58 } from "../utils/Base58";
import { Sha256Hash } from "../core/Sha256Hash";
import { DeterministicKey } from "../crypto/DeterministicKey";
import { ECIESCoder } from "../crypto/ECIESCoder";
import { TransactionSignature } from "../crypto/TransactionSignature";
import { InsufficientMoneyException } from "../exception/InsufficientMoneyException";
import { NoTokenException } from "../exception/NoTokenException";
import { ReqCmd } from "../params/ReqCmd";
import { ServerPool } from "../pool/server/ServerPool";
import { GetDomainTokenResponse } from "../response/GetDomainTokenResponse";
import { BlockType } from "../core/BlockType";
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
import { WalletProtobufSerializer } from "./WalletProtobufSerializer";
import { ECDSASignature } from "../crypto/ECDSASignature";
import { secp256k1 } from "@noble/curves/secp256k1";
import { SigHash } from "../core/SigHash";

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
    // Serialize the wallet to the file stream
    const serializer = new WalletProtobufSerializer();
    serializer.writeWallet(this, f);
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


  // Other methods implemented as needed...

  async saveToken(
    tokenInfo: TokenInfo,
    basecoin: Coin,
    ownerKey: ECKey,
    aesKey: any,
    pubKeyTo?: Uint8Array,
    memoInfo?: MemoInfo
  ): Promise<Block> {
    // Create a transaction for the token
    const tx = new Transaction(this.params);
    
    // Add output for the token
    const output = new TransactionOutput(this.params, tx, basecoin, ownerKey.getPubKey());
    tx.addOutput(output);
    
    // Add memo if provided
    if (memoInfo) {
      tx.setMemo(memoInfo.toString());
    }
    
    // Sign the transaction
    await this.signTransaction(tx, aesKey, 'THROW');
    
    // Create a block with the transaction
    const block = new Block(this.params);
    block.addTransaction(tx);
    
    return block;
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

  async feeTransaction(aesKey: any): Promise<Block> {
    const coinList = await this.calculateAllSpendCandidates(aesKey, false);
    const transaction = await this.feeTransaction1(aesKey, coinList);
    const block = new Block(this.params);
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
    console.log("Sending addresses array to getOutputs:", jsonString);
    
    // Create Buffer from the JSON string directly
    const buffer = Buffer.from(jsonString, 'utf8');
    
    console.log("Buffer content:", buffer.toString('utf8'));
    
    const resp = await OkHttp3Util.post(
      this.getServerURL() + ReqCmd.getOutputs,
      buffer
    );
    
    // Parse response and convert plain objects to UTXO instances
    const responseObj = Json.jsonmapper().parse(resp);
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
            const output = new TransactionOutput(this.params, spent, amount, beneficiary.getPubKey());
            spent.addOutput(output);
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
    // Implementation would go here
    // This is a placeholder implementation
    console.log(`Signing token ${tokenid} with key ${signkey.getPublicKeyAsHex()}`);
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
            amount = utxo.getValue().add(amount);  
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
    const block = await this.getTip()   ;
    block.addTransaction(multispent);
 
    return await this.solveAndPost(block);
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

  // Other methods implemented as needed...
}
