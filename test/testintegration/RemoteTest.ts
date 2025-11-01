import { beforeEach, expect, test } from "vitest";
import { ObjectMapper } from "jackson-js";
import { Buffer } from "buffer";
import { Address } from "../../src/net/bigtangle/core/Address";
import { Block } from "../../src/net/bigtangle/core/Block";
import { Coin } from "../../src/net/bigtangle/core/Coin";
import { ECKey } from "../../src/net/bigtangle/core/ECKey";
import { KeyValue } from "../../src/net/bigtangle/core/KeyValue";
import { MemoInfo } from "../../src/net/bigtangle/core/MemoInfo";
import { MultiSignAddress } from "../../src/net/bigtangle/core/MultiSignAddress";
import { OrderRecord } from "../../src/net/bigtangle/core/OrderRecord";
import { Sha256Hash } from "../../src/net/bigtangle/core/Sha256Hash";
import { Token } from "../../src/net/bigtangle/core/Token";
import { TokenInfo } from "../../src/net/bigtangle/core/TokenInfo";
import { TransactionInput } from "../../src/net/bigtangle/core/TransactionInput";
import { TransactionOutput } from "../../src/net/bigtangle/core/TransactionOutput";
import { UTXO } from "../../src/net/bigtangle/core/UTXO";
import { UtilGeneseBlock } from "../../src/net/bigtangle/core/UtilGeneseBlock";
import { Utils } from "../../src/net/bigtangle/core/Utils";
import { InsufficientMoneyException } from "../../src/net/bigtangle/exception/InsufficientMoneyException";
import { NetworkParameters } from "../../src/net/bigtangle/params/NetworkParameters";
import { ReqCmd } from "../../src/net/bigtangle/params/ReqCmd";
import { TestParams } from "../../src/net/bigtangle/params/TestParams";
import { GetBalancesResponse } from "../../src/net/bigtangle/response/GetBalancesResponse";
import { GetTokensResponse } from "../../src/net/bigtangle/response/GetTokensResponse";
import { TokenIndexResponse } from "../../src/net/bigtangle/response/TokenIndexResponse";
import { MonetaryFormat } from "../../src/net/bigtangle/utils/MonetaryFormat";
import { OkHttp3Util } from "../../src/net/bigtangle/utils/OkHttp3Util";
import { FreeStandingTransactionOutput } from "../../src/net/bigtangle/wallet/FreeStandingTransactionOutput";
import { Wallet } from "../../src/net/bigtangle/wallet/Wallet";
export abstract class RemoteTest {
  public objectMapper = new ObjectMapper();
  public contextRoot = "http://localhost:8088/";

  /*
   * default wallet which has key testpriv and yuanTokenPriv
   */
  public wallet!: Wallet;

  protected readonly aesKey: any = null;

  public static testPub =
    "02721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975";
  public static testPriv =
    "ec1d240521f7f254c52aea69fca3f28d754d1b89f310f42b0fb094d16814317f";
  public static yuanTokenPub =
    "02a717921ede2c066a4da05b9cdce203f1002b7e2abeee7546194498ef2fa9b13a";
  public static yuanTokenPriv =
    "8db6bd17fa4a827619e165bfd4b0f551705ef2d549a799e7f07115e5c3abad55";

  networkParameters: NetworkParameters = TestParams.get();

  public async checkTokenAssertTrue(tokenid: string, domainname: string) {
    const getTokensResponse = (await this.post(
      ReqCmd.getTokenById,
      [tokenid],
      GetTokensResponse
    )) as GetTokensResponse;
    const token_ = getTokensResponse.getTokens()![0];
    expect(token_.getDomainName() === domainname).toBeTruthy();
  }

  public setUp() {
    this.wallet = Wallet.fromKeysURL(
      this.networkParameters,
      [ECKey.fromPrivateString(RemoteTest.testPriv)],
      this.contextRoot
    );
  }

  protected async payTestTokenTo(
    beneficiary: ECKey,
    testKey: ECKey,
    amount: bigint,
    addedBlocks: Block[] = []
  ) {
    await this.payTestTokenToAmount(beneficiary, testKey, amount, addedBlocks);
  }

  protected async payBigTo(
    beneficiary: ECKey,
    amount: bigint,
    addedBlocks: Block[]
  ): Promise<Block> {
    const giveMoneyResult = new Map<string, bigint>();

    giveMoneyResult.set(
      beneficiary.toAddress(this.networkParameters).toString(),
      amount
    );

    // Convert token ID to Uint8Array
    const tokenIdBytes = Buffer.from(Utils.HEX.decode(NetworkParameters.BIGTANGLE_TOKENID_STRING));
    return this.payList(addedBlocks, giveMoneyResult, tokenIdBytes);
  }

  private async payList(
    addedBlocks: Block[],
    giveMoneyResult: Map<string, bigint>,
    tokenid: Buffer
  ): Promise<Block> {
    const coinList = await this.wallet.calculateAllSpendCandidates(null, false);
    this.logUTXOs(coinList);
    const b = await this.wallet.payMoneyToECKeyList(
      null,
      giveMoneyResult,
      tokenid,
      "payList",
      coinList,
      0,
      0
    );
    // log.debug("block " + (b == null ? "block is null" : b.toString()));
    if (addedBlocks !== null) {
      addedBlocks.push(b!);
    }

    return b!;
  }

  protected async payTestTokenToAmount(
    beneficiary: ECKey,
    testKey: ECKey,
    amount: bigint,
    addedBlocks: Block[]
  ) {
    // Use fee as bigint - no conversion needed
    await this.payBigTo(testKey, Coin.FEE_DEFAULT.getValue(), addedBlocks);

    const giveMoneyTestToken = new Map<string, bigint>();

    giveMoneyTestToken.set(
      beneficiary.toAddress(this.networkParameters).toString(),
      amount
    );
    const w = await Wallet.fromKeysURL(
      this.networkParameters,
      [testKey],
      this.contextRoot
    );

    const tokenidBytes = Buffer.from(Utils.HEX.decode(testKey.getPublicKeyAsHex()));
    const b = await w.payToList(
      null,
      giveMoneyTestToken,
      tokenidBytes,
      ""
    );
    // log.debug("block " + (b == null ? "block is null" : b.toString()));

    addedBlocks.push(b!);

    // Open sell order for test tokens
  }





  async makeBuyOrder(
    beneficiary: ECKey,
    tokenId: string,
    buyPrice: number,
    buyAmount: number,
    basetoken: string,
    addedBlocks: Block[]
  ): Promise<Block> {
    const w = await Wallet.fromKeysURL(
      this.networkParameters,
      [beneficiary],
      this.contextRoot
    );
    w.setServerURL(this.contextRoot);
    // Use fee as bigint
    await this.payBigTo(beneficiary, Coin.FEE_DEFAULT.getValue(), addedBlocks);
    const block = await w.buyOrder(
      null, // aesKey
      tokenId,
      BigInt(buyPrice),
      BigInt(buyAmount),
      null, // validToTime
      null, // validFromTime
      basetoken,
      true // allowRemainder
    );
    addedBlocks.push(block);

    return block;
  }

  protected async assertHasAvailableToken(
    testKey: ECKey,
    tokenId_: string,
    amount: bigint
  ) {
    // Asserts that the given ECKey possesses the given amount of tokens
    const balance = await this.getBalanceByKey(false, testKey);
    const hashMap = new Map<string, bigint>();
    for (const o of balance) {
      const value = o.getValue();
      if (!value) continue;

      const tokenId = Utils.toHexString(value.getTokenid());
      const current = hashMap.get(tokenId) || BigInt(0);
      hashMap.set(tokenId, current + value.getValue());
    }

    expect(amount === BigInt(0) ? null : amount).toBe(hashMap.get(tokenId_));
  }

  protected getRandomSha256Hash(): Sha256Hash {
    const rawHashBytes = new Uint8Array(32);
    crypto.getRandomValues(rawHashBytes);
    const sha256Hash = Sha256Hash.wrap(Buffer.from(rawHashBytes.buffer));
    if (sha256Hash === null) {
      throw new Error("Failed to create Sha256Hash");
    }
    return sha256Hash;
  }

  public async adjustSolve(block: Block): Promise<Block> {
    // save block
    const resp = await OkHttp3Util.post(
      this.contextRoot + ReqCmd.adjustHeight,
      Buffer.from(block.bitcoinSerialize())
    );

    const result = this.objectMapper.parse(resp) as { dataHex: string };
    const dataHex = result.dataHex;

    const adjust = this.networkParameters
      .getDefaultSerializer()
      .makeBlock(Buffer.from(Utils.HEX.decode(dataHex)));
    adjust.solve( );
    return adjust;
  }

  protected async getBalance(withZero: boolean = false): Promise<UTXO[]> {
    return this.getBalanceByKeys(withZero, await this.wallet.walletKeys(null));
  }

  public async getBalanceByKey(
    withZero: boolean,
    ecKey: ECKey
  ): Promise<UTXO[]> {
    return this.getBalanceByKeys(withZero, [ecKey]);
  }

  protected getLargeUTXO(outputs: UTXO[]): UTXO {
    // Filter out UTXOs with null values
    const validOutputs = outputs.filter((output) => output.getValue() !== null);

    if (validOutputs.length === 0) {
      throw new Error("No UTXOs with valid Coin values found");
    }

    let a = validOutputs[0];
    for (const b of validOutputs) {
      // Use non-null assertion since we filtered nulls
      if (b.getValue()!.isGreaterThan(a.getValue()!)) {
        a = b;
      }
    }
    return a;
  }

  // get balance for the walletKeys
  // This method is now defined only once
  protected async getBalanceByKeys(
    withZero: boolean,
    keys: ECKey[]
  ): Promise<UTXO[]> {
    const listUTXO = new Array<UTXO>();
    const keyStrHex000 = new Array<string>();

    for (const ecKey of keys) {
      keyStrHex000.push(Utils.toHexString(Buffer.from(ecKey.getPubKeyHash())));
    }
    const getBalancesResponse: GetBalancesResponse = (await this.post(
      ReqCmd.getBalances,
      keyStrHex000,
      GetBalancesResponse
    )) as GetBalancesResponse;

    if (getBalancesResponse.getOutputs() != null) {
      for (const utxo of getBalancesResponse.getOutputs()!) {
        if (utxo.getValue() === null) continue;

        if (withZero) {
          listUTXO.push(utxo);
        } else if (utxo.getValue()!.getValue() > 0) {
          listUTXO.push(utxo);
        }
      }
    }
    return listUTXO;
  }

  protected async getBalanceByToken(
    tokenid: string,
    withZero: boolean,
    keys: ECKey[]
  ): Promise<UTXO | null> {
    const ulist = await this.getBalanceByKeys(withZero, keys);

    for (const u of ulist) {
      if (u.getTokenId() && tokenid === u.getTokenId()) {
        return u;
      }
    }

    return null;
  }
  
  // Translated from Java: protected UTXO getBalance(String tokenid, boolean withZero, List<ECKey> keys)
  protected async getBalanceForToken(
    tokenid: string,
    withZero: boolean,
    keys: ECKey[]
  ): Promise<UTXO> {
    const ulist = await this.getBalanceByKeys(withZero, keys);

    for (const u of ulist) {
      if (tokenid === u.getTokenId()) {
        return u;
      }
    }

    throw new Error("UTXO not found for tokenid: " + tokenid);
  }

  protected async getBalanceAccount(
    withZero: boolean,
    keys: ECKey[]
  ): Promise<Coin[]> {
    const keyStrHex000 = new Array<string>();

    for (const ecKey of keys) {
      keyStrHex000.push(Utils.toHexString(Buffer.from(ecKey.getPubKeyHash())));
    }
    const getBalancesResponse = (await this.post(
      ReqCmd.getAccountBalances,
      keyStrHex000,
      GetBalancesResponse
    )) as GetBalancesResponse;

    // Access the balance property directly
    let re = getBalancesResponse.getBalance();
    re ??= new Array<Coin>();
    this.logCoins(re);
    return re;
  }

  public logCoins(list: Coin[]) {
    for (const coin of list) {
      console.debug(
        coin instanceof Coin
          ? coin.toString()
          : `Coin : ${JSON.stringify(coin)}`
      );
    }
  }

  public logUTXOs(list: FreeStandingTransactionOutput[]) {
    for (const coin of list) {
      console.debug(`  ${coin.toString()}`);
    }
  }
  
  // Proxy method to access wallet's checkSpendpending
  checkSpendpending(utxo: UTXO): boolean {
    return this.wallet.checkSpendpending(utxo);
  }
  
  // get balance for the walletKeys
  protected async getBalanceByAddress(address: string): Promise<UTXO[]> {
    const listUTXO = new Array<UTXO>();
    const keyStrHex000 = new Array<string>();

    keyStrHex000.push(
      Utils.toHexString(
        Address.fromBase58(this.networkParameters, address)!.getHash160()!
      )
    );
    const getBalancesResponse = (await this.post(
      ReqCmd.getBalances,
      keyStrHex000,
      GetBalancesResponse
    )) as GetBalancesResponse;

    for (const utxo of getBalancesResponse.getOutputs()!) {
      listUTXO.push(utxo);
    }

    return listUTXO;
  }

  protected async getBalanceByECKey(
    withZero: boolean,
    ecKey: ECKey
  ): Promise<UTXO[]> {
    const keys: ECKey[] = [];
    keys.push(ecKey);
    return this.getBalanceByKeys(withZero, keys);
  }
   
 

  protected checkResponse(resp: Uint8Array, code: number = 0) {
    this.checkResponseWithCode(resp, code);
  }

  protected checkResponseWithCode(resp: Uint8Array, code: number) {
    const result2 = this.objectMapper.parse(resp.toString()) as any;
    const error = result2.errorcode as number;
    expect(error === code).toBeTruthy();
  }

  protected async checkBalanceWithKey(coin: Coin, ecKey: ECKey) {
    const a: ECKey[] = [];
    a.push(ecKey);
    await this.checkBalance(coin, a);
  }

  protected async checkBalance(coin: Coin, a: ECKey[]) {
    const ulist = await this.getBalanceByKeys(false, a);
    let myutxo: UTXO | null = null;
    for (const u of ulist) {
      if (
        u.getTokenId() &&
        coin.getTokenHex() === u.getTokenId() &&
        coin.getValue() === u.getValue()?.getValue()
      ) {
        myutxo = u;
        break;
      }
    }
    expect(myutxo !== null).toBeTruthy();
    if (myutxo) {
      expect(
        myutxo.getAddress() !== null && myutxo.getAddress()!.length > 0
      ).toBeTruthy();
      console.log(myutxo.toString());
    }
  }

  protected async checkBalanceSumWithKey(coin: Coin, a: ECKey) {
    const keys: ECKey[] = [];
    keys.push(a);
    await this.checkBalanceSum(coin, keys);
  }

  protected async checkBalanceSum(coin: Coin, a: ECKey[]) {
    const ulist = await this.getBalanceByKeys(false, a);

    let sum = new Coin(BigInt(0), coin.getTokenid());
    for (const u of ulist) {
      if (coin.getTokenHex() === u.getTokenId()) {
        if (u.getValue()) sum = sum.add(u.getValue()!);
      }
    }
    if (coin.getValue() !== sum.getValue()) {
      console.log(" expected: " + coin + " got: " + sum);
    }
    expect(coin.getValue() === sum.getValue()).toBeTruthy();
  } 

  public async getServerCalTokenIndex(
    tokenid: string
  ): Promise<TokenIndexResponse> {
    const requestParam = new Map<string, string>();
    requestParam.set("tokenid", tokenid);
    const resp = await OkHttp3Util.postStringSingle(
      this.contextRoot + ReqCmd.getTokenIndex,
      Buffer.from(this.objectMapper.stringify(Object.fromEntries(requestParam)))
    );
    return this.objectMapper.parse(resp, {
      mainCreator: () => [TokenIndexResponse],
    }) as TokenIndexResponse;
  }





  public async post<T>(
    reqCmd: string,
    params: any, // Changed type to any to accommodate Map and Array
    responseClass: any
  ): Promise<T> {
    return OkHttp3Util.postClass(
      this.contextRoot + reqCmd,
      params,
      responseClass
    );
  }
 
}
