import { beforeEach, describe, expect, test } from "vitest";
import { Address } from "../../src/net/bigtangle/core/Address";
import { Block } from "../../src/net/bigtangle/core/Block";
import { Coin } from "../../src/net/bigtangle/core/Coin";
import { ECKey } from "../../src/net/bigtangle/core/ECKey";
import { TokenType } from "../../src/net/bigtangle/core/TokenType";
import { UTXO } from "../../src/net/bigtangle/core/UTXO";
import { Utils } from "../../src/net/bigtangle/core/Utils";
import { GetBalancesResponse } from "../../src/net/bigtangle/response/GetBalancesResponse";
import { Wallet } from "../../src/net/bigtangle/wallet/Wallet";
import { RemoteTest } from "./Remote.test";
import { MemoInfo } from "../../src/net/bigtangle/core/MemoInfo";

class RemoteFromAddressTests extends RemoteTest {
  public static yuanTokenPub = "02a717921ede2c066a4da05b9cdce203f1002b7e2abeee7546194498ef2fa9b13a";
  public static yuanTokenPriv = "8db6bd17fa4a827619e165bfd4b0f551705ef2d549a799e7f07115e5c3abad55";

  private accountKey: ECKey | undefined;
  yuanWallet: Wallet | undefined;

  public async testUserpay() {
    this.yuanWallet = await Wallet.fromKeysURL(
      this.networkParameters,
      [ECKey.fromPrivateString(RemoteFromAddressTests.yuanTokenPriv)],
      this.contextRoot
    );

    await this.payBigTo(
      ECKey.fromPrivateString(RemoteFromAddressTests.yuanTokenPriv),
      Coin.FEE_DEFAULT.getValue() * BigInt(1000),
      []
    );

  
    await this.testTokens();
/*
    this.accountKey = new ECKey(null, null);
    const list = await this.getBalanceAccount(false, await this.yuanWallet!.walletKeys(null));
    await this.createUserPay(this.accountKey!);
    const list2 = await this.getBalanceAccount(false, await this.yuanWallet!.walletKeys(null));

    const userkeys: ECKey[] = [];
    userkeys.push(this.accountKey!);
    const list3 = await this.getBalanceAccount(false, userkeys);
    for (const coin of list3) {
      console.debug(coin.toString());
    }
      */
  }

  private async createUserPay(accountKey: ECKey) {
    const ulist = await this.payKeys();
    for (const key of ulist) {
      // buyTicket(key, accountKey); // This method is currently commented out in Java
    }
  }

  /*
   * pay money to the key and use the key to buy lottery
   */
  public async buyTicket(key: ECKey, accountKey: ECKey) {
    const w = await Wallet.fromKeysURL(this.networkParameters, [key], this.contextRoot);
    console.debug("====ready buyTicket====");
    const bs = await w.pay(
      null,
      accountKey.toAddress(this.networkParameters).toString(),
      Coin.valueOf(BigInt(100), Buffer.from(Utils.HEX.decode(RemoteFromAddressTests.yuanTokenPub))),
      new MemoInfo(" buy ticket")
    );

    console.debug("====start buyTicket====");
    const userkeys: ECKey[] = [];
    userkeys.push(key);

    const utxos = await this.getBalanceByECKey(false, key);
    for (const utxo of utxos) {
      console.debug("user utxo==" + utxo.toString());
    }

    const userkeys2: ECKey[] = [];
    userkeys2.push(accountKey);

    await this.getBalanceAccount(false, await this.wallet.walletKeys(null));

    // checkResult(accountKey, key.toAddress(networkParameters).toBase58());
  }

  public async payKeys(): Promise<ECKey[]> {
    const userkeys: ECKey[] = [];
    const giveMoneyResult = new Map<string, bigint>();

    const key = ECKey.createNewKey();
    giveMoneyResult.set(
      Address.fromKey(this.networkParameters, key).toString(),
      BigInt(100)
    );
    userkeys.push(key);

    const key2 = ECKey.createNewKey();
    giveMoneyResult.set(
      Address.fromKey(this.networkParameters, key2).toString(),
      BigInt(100)
    );
    userkeys.push(key2); 
    
    await this.payBigTo(key, Coin.FEE_DEFAULT.getValue(), []);
  
    console.debug("====start check admin wallet====");

    await this.payBigTo(key2, Coin.FEE_DEFAULT.getValue(), []);
 
    console.debug("====start check admin wallet====");


    return userkeys;
  }

  public async testTokens() {
    const domain = "";
    const fromPrivate = ECKey.fromPrivateString(RemoteFromAddressTests.yuanTokenPriv);

    await this.createMultiSigTokenLocal(
      fromPrivate,
      "人民币",
      2,
      domain,
      "人民币 CNY",
      BigInt(10000000)
    );
  }

  public getAddress(): Address {
    return ECKey.fromPrivateString(RemoteFromAddressTests.yuanTokenPriv).toAddress(this.networkParameters);
  }

  // create a token with multi sign
  protected async createMultiSigTokenLocal(
    key: ECKey,
    tokename: string,
    decimals: number,
    domainname: string,
    description: string,
    amount: bigint
  ) {
    try {
      await this.createToken(
        key,
        tokename,
        decimals,
        domainname,
        description,
        amount,
        true,
        null,
        TokenType.currency,
        key.getPublicKeyAsHex(),
        await Wallet.fromKeysURL(this.networkParameters, [key], this.contextRoot)
      );
      const signkey = ECKey.fromPrivateString(RemoteTest.testPriv);

      // Note: The multiSign method may need to be implemented in the Wallet class
      // This is an approximation of the Java wallet.multiSign call
      await this.pullBlockDoMultiSign(key.getPublicKeyAsHex(), signkey, null);
      await this.pullBlockDoMultiSign(key.getPublicKeyAsHex(), key, null);
    } catch (error) {
      // TODO: handle exception
      console.warn("", error);
    }
  }

  // get balance for the walletKeys
  protected async getBalanceForAddress(address: string): Promise<UTXO[]> {
    const listUTXO: UTXO[] = [];
    const keyStrHex000: string[] = [];

    keyStrHex000.push(
      Utils.HEX.encode(
        Address.fromBase58(this.networkParameters, address)!.getHash160()!
      )
    );
    const response = await this.post(
      "getBalances",
      keyStrHex000,
      GetBalancesResponse
    );

    const getBalancesResponse = response as GetBalancesResponse;

    for (const utxo of getBalancesResponse.getOutputs()!) {
      listUTXO.push(utxo);
    }

    return listUTXO;
  }
}

describe("RemoteFromAddressTests", () => {
  const tests = new RemoteFromAddressTests();

  beforeEach(async () => {
    await tests.setUp();
  });

  test("testUserpay", async () => {
    await tests.testUserpay();
  }, 30000);
});
 
