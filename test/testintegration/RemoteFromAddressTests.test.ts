import { beforeEach, describe, expect, test } from "vitest";
import { Address } from "../../src/net/bigtangle/core/Address";
 
import { Coin } from "../../src/net/bigtangle/core/Coin";
import { ECKey } from "../../src/net/bigtangle/core/ECKey";
import { MemoInfo } from "../../src/net/bigtangle/core/MemoInfo";
 import { Wallet } from "../../src/net/bigtangle/wallet/Wallet";

import { TokenType } from "../../src/net/bigtangle/core/TokenType";
import { RemoteTest } from "./Remote.test";
 

class RemoteFromAddressTests extends RemoteTest {
  yuanTokenPub = '02a717921ede2c066a4da05b9cdce203f1002b7e2abeee7546194498ef2fa9b13a';
  yuanTokenPriv = '8db6bd17fa4a827619e165bfd4b0f551705ef2d549a799e7f07115e5c3abad55';
  testPriv = "180cb41c7c600be951b5d3d0a7334acc7506173875834c742e0e78830092a00a";
  
  accountKey: ECKey | undefined;
  yuanWallet: Wallet | undefined;
  
  
  async testUserpay() {
    const yuanKey = ECKey.fromPrivateString(this.yuanTokenPriv);
    this.yuanWallet = await Wallet.fromKeysURL(this.networkParameters, [yuanKey],this.contextRoot);
    await this.getBalanceAccount(false, await this.yuanWallet.walletKeys(null));
    await this.payBigTo(
      yuanKey,
      Coin.FEE_DEFAULT.getValue() * BigInt(1000),
      []
    );

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
    const w = await Wallet.fromKeysURL(this.networkParameters, [key],this.contextRoot);
    console.debug('====ready buyTicket====');
    
    const coinValue = BigInt(100);
    const tokenIdBytes = Buffer.from(this.yuanTokenPub, 'hex');
    const coin = new Coin(coinValue, tokenIdBytes);
    
    const bs = await w.pay(
      null,
      Address.fromKey(this.networkParameters, accountKey ).toString(),
      coin,
      new MemoInfo('buy ticket')
    );

    console.debug('====start buyTicket====');
    const userkeys = [key];
    console.debug('====check utxo');
    
    const address =   Address.fromKey(this.networkParameters, key  ).toString();
    const utxos = await this.getBalanceByAddress(address);
    for (const utxo of utxos) {
      console.debug('user utxo==' + utxo.toString());
    }
    
    let coins = await this.getBalanceAccount(false, userkeys);
    for (const coin of coins) {
      expect(coin.isZero()).toBe(true);
    }

    coins = await this.getBalanceAccount(false, [accountKey]);
    for (const coin of coins) {
      expect(coin.getValue()).toEqual(BigInt(100));
    }
    
    console.debug('====start check admin wallet====');
    await this.getBalanceAccount(false, await this.wallet.walletKeys(null));
  }

  async payKeys(): Promise<ECKey[]> {
    const userkeys: ECKey[] = [];
    const giveMoneyResult = new Map<string, bigint>();
    
    const key = ECKey.createNewKey();
    giveMoneyResult.set( Address.fromKey(this.networkParameters, key).toString(), BigInt(100));
    userkeys.push(key);
    
    const key2 = ECKey.createNewKey();
    giveMoneyResult.set( Address.fromKey(this.networkParameters, key2).toString(), BigInt(100));
    userkeys.push(key2);

    const memo = 'pay to user';
    const tokenId = Buffer.from(this.yuanTokenPub, 'hex');
    
    const b = await this.yuanWallet!.payToListCalc(null, giveMoneyResult, tokenId, memo );
    console.debug('block ' + (b ? b.toString() : 'block is null'));

    console.debug('====start check yuanWallet wallet====');
    const list = await this.getBalanceAccount(false, await this.yuanWallet!.walletKeys(null));
    for (const coin of list) {
      if (!coin.isBIG()) {
        expect(coin.getValue()).toEqual(BigInt(10000000) - BigInt(200));
      }
    }
    
    let coins = await this.getBalanceAccount(false, userkeys);
    for (const coin of coins) {
      if (!coin.isBIG()) {
        expect(coin.getValue()).toEqual(BigInt(100));
      }
    }

    await this.payBigTo(key, Coin.FEE_DEFAULT.getValue(), []);
    console.debug('====start check admin wallet====');
    
    let adminCoins = await this.getBalanceAccount(false, await this.wallet.walletKeys(null));
    const totalCoins = BigInt(1000000000000000); // Replace with actual total coin value
    let adminCoin = totalCoins - (Coin.FEE_DEFAULT.getValue() * BigInt(1001));
    
    for (const coin of adminCoins) {
      if (coin.isBIG()) {
        expect(coin.getValue()).toEqual(
          adminCoin - Coin.FEE_DEFAULT.getValue() - BigInt(1000)
        );
      }
    }

    await this.payBigTo(key2, Coin.FEE_DEFAULT.getValue(), []);
    console.debug('====start check admin wallet====');
    
    adminCoins = await this.getBalanceAccount(false, await this.wallet.walletKeys(null));
    adminCoin = adminCoin - Coin.FEE_DEFAULT.getValue() - BigInt(1000);
    
    for (const coin of adminCoins) {
      if (coin.isBIG()) {
        expect(coin.getValue()).toEqual(
          adminCoin - Coin.FEE_DEFAULT.getValue() - BigInt(1000)
        );
      }
    }
    
    coins = await this.getBalanceAccount(false, userkeys);
    for (const coin of coins) {
      if (coin.isBIG()) {
        expect(coin.getValue()).toEqual(BigInt(1000));
      }
    }
    
    return userkeys;
  }

  async testTokens() {
    const domain = '';
    const fromPrivate = ECKey.fromPrivateString(this.yuanTokenPriv);
    await this.testCreateMultiSigToken1(
      fromPrivate,
      '人民币',
      2,
      domain,
      '人民币 CNY',
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
        await Wallet.fromKeysURL(this.networkParameters, [key],this.contextRoot)
      );
      
      const signkey = ECKey.fromPrivateString(RemoteTest.testPriv);
      await this.wallet.multiSignKey( key.getPublicKeyAsHex(),signkey , null);
    } catch (e) {
      console.warn('Error in testCreateMultiSigToken', e);
    }
  }
 
 
}
describe('RemoteFromAddressTests', () => {
  const tests = new RemoteFromAddressTests();

  beforeEach(async () => {
    await tests.setUp();
  });

  test('testUserpay', async () => {
    await tests.testUserpay();
  });
 
});
