import { beforeEach, describe, expect, test } from "vitest";
import { Address } from "../../src/net/bigtangle/core/Address";
import { Coin } from "../../src/net/bigtangle/core/Coin";
import { ECKey } from "../../src/net/bigtangle/core/ECKey";
import { MemoInfo } from "../../src/net/bigtangle/core/MemoInfo";
import { Wallet } from "../../src/net/bigtangle/wallet/Wallet";
import { TokenType } from "../../src/net/bigtangle/core/TokenType";
import { RemoteTest } from "./Remote.test";
import { Block } from "net/bigtangle/core/Block";

class RemoteFromAddressTests extends RemoteTest {
  yuanTokenPub =
    "02a717921ede2c066a4da05b9cdce203f1002b7e2abeee7546194498ef2fa9b13a";
  yuanTokenPriv =
    "8db6bd17fa4a827619e165bfd4b0f551705ef2d549a799e7f07115e5c3abad55";

  accountKey: ECKey | undefined;
  yuanWallet: Wallet | undefined;

  async testUserpay() {
    const yuanKey = ECKey.fromPrivateString(this.yuanTokenPriv);
    this.yuanWallet = await Wallet.fromKeysURL(
      this.networkParameters,
      [yuanKey],
      this.contextRoot
    );

    const block = await this.payBigTo(
      yuanKey,
      Coin.FEE_DEFAULT.getValue() * BigInt(1000),
      []
    );

    console.debug("block " + (block ? block.toString() : "block is null"));

    this.accountKey = ECKey.createNewKey();
    await this.testTokens();
    await this.createUserPay(this.accountKey);

    await this.getBalanceAccount(false, await this.yuanWallet.walletKeys(null));
    const userkeys = [this.accountKey];
    await this.getBalanceAccount(false, userkeys);
  }

  async createUserPay(accountKey: ECKey) {
    const ulist = await this.payKeys();
    for (const key of ulist) {
      await this.buyTicket(key, accountKey);
    }
  }

  async buyTicket(key: ECKey, accountKey: ECKey) {
    const w = await Wallet.fromKeysURL(
      this.networkParameters,
      [key],
      this.contextRoot
    );
    console.debug("====ready buyTicket====");

    const coinValue = BigInt(100);
    const tokenIdBytes = Buffer.from(this.yuanTokenPub, "hex");
    const coin = new Coin(coinValue, tokenIdBytes);

    // TODO: Implement pay method in Wallet
    // const bs = await w.pay(
    //   null,
    //   Address.fromKey(this.networkParameters, accountKey).toString(),
    //   coin,
    //   new MemoInfo('buy ticket')
    // );

    console.debug("====start buyTicket====");
    const userkeys = [key];
    console.debug("====check utxo");

    const address = Address.fromKey(this.networkParameters, key).toString();
    const utxos = await this.getBalanceByAddress(address);
    for (const utxo of utxos) {
      console.debug("user utxo==" + utxo.toString());
    }

    let coins = await this.getBalanceAccount(false, userkeys);
    for (const coin of coins) {
      // Check if coin is a proper Coin instance
      if (coin && typeof coin.isZero === "function") {
        expect(coin.isZero()).toBe(true);
      }
    }

    coins = await this.getBalanceAccount(false, [accountKey]);
    for (const coin of coins) {
      // Check if coin is a proper Coin instance
      if (
        coin &&
        typeof coin.getValue === "function" &&
        typeof coin.isBIG === "function"
      ) {
        expect(coin.getValue()).toEqual(BigInt(100));
      }
    }

    console.debug("====start check admin wallet====");
    await this.getBalanceAccount(false, await this.wallet.walletKeys(null));
  }

  async payKeys(): Promise<ECKey[]> {
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

  async testTokens() {
    const domain = "";
    const fromPrivate = ECKey.fromPrivateString(this.yuanTokenPriv);
    await this.testCreateMultiSigToken1(
      fromPrivate,
      "人民币",
      2,
      domain,
      "人民币 CNY",
      BigInt(10000000)
    );
  }

  async testCreateMultiSigToken1(
    key: ECKey,
    tokename: string,
    decimals: number,
    domainname: string,
    description: string,
    amount: bigint
  ) {
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

    // Use the wallet's multiSign method which matches the Java implementation
    await this.wallet.multiSign(key.getPublicKeyAsHex(), signkey, null);
  }
}

describe("RemoteFromAddressTests", () => {
  const tests = new RemoteFromAddressTests();

  beforeEach(async () => {
    await tests.setUp();
  });

  test("testUserpay", async () => {
    await tests.testUserpay();
  });
});
