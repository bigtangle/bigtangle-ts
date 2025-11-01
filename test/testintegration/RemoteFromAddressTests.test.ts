import { Buffer } from "buffer";
import { beforeEach, describe, expect, test } from "vitest";
import { Address } from "../../src/net/bigtangle/core/Address";
import { Block } from "../../src/net/bigtangle/core/Block";
import { Coin } from "../../src/net/bigtangle/core/Coin";
import { ECKey } from "../../src/net/bigtangle/core/ECKey";
import { TokenType } from "../../src/net/bigtangle/core/TokenType";
import { Token } from "../../src/net/bigtangle/core/Token";
import { MultiSignAddress } from "../../src/net/bigtangle/core/MultiSignAddress";
import { Sha256Hash } from "../../src/net/bigtangle/core/Sha256Hash";

import { UTXO } from "../../src/net/bigtangle/core/UTXO";
import { Utils } from "../../src/net/bigtangle/core/Utils";
import { GetBalancesResponse } from "../../src/net/bigtangle/response/GetBalancesResponse";
import { Wallet } from "../../src/net/bigtangle/wallet/Wallet";
import { RemoteTest } from "./RemoteTest";
import { MemoInfo } from "../../src/net/bigtangle/core/MemoInfo";

class RemoteFromAddressTests extends RemoteTest {
  public static yuanTokenPub = "02a717921ede2c066a4da05b9cdce203f1002b7e2abeee7546194498ef2fa9b13a";
  public static yuanTokenPriv = "8db6bd17fa4a827619e165bfd4b0f551705ef2d549a799e7f07115e5c3abad55";

  private accountKey: ECKey | undefined;
  yuanWallet: Wallet | undefined;

  public async testUserpay() {
    // Send native tokens to yuanToken key for fees first
    await this.payBigTo(
      ECKey.fromPrivateString(RemoteFromAddressTests.yuanTokenPriv),
      Coin.FEE_DEFAULT.getValue() * BigInt(1000),
      []
    );

    // Create the token first
    await this.testTokens();  

    // Now create yuanWallet after token creation so it can access the created tokens
    this.yuanWallet = await Wallet.fromKeysURL(
      this.networkParameters,
      [ECKey.fromPrivateString(RemoteFromAddressTests.yuanTokenPriv)],
      this.contextRoot
    );

    this.accountKey = ECKey.createNewKey();
    const list = await this.getBalanceAccount(false, await this.yuanWallet!.walletKeys(null));
    await this.createUserPay(this.accountKey!);
    const list2 = await this.getBalanceAccount(false, await this.yuanWallet!.walletKeys(null));

    const userkeys: ECKey[] = [];
    userkeys.push(this.accountKey!);
    const list3 = await this.getBalanceAccount(false, userkeys);
    for (const coin of list3) {
      console.debug(coin.toString());
    }
     
  }

  private async createUserPay(accountKey: ECKey) {
    const ulist = await this.payKeys();
    for (const key of ulist) {
       await this.buyTicket(key, accountKey); // This method is currently commented out in Java
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

      // Compute the correct token ID based on the yuan token public key (same as in testCreateMultiSigToken)
    const yuanTokenKey = ECKey.fromPrivateString(RemoteFromAddressTests.yuanTokenPriv);
    const tokenHash = Sha256Hash.of(Buffer.from(yuanTokenKey.getPubKey()));
    const tokenidHex = Utils.HEX.encode(tokenHash.getBytes());
    const decodedBytes: Uint8Array = Utils.HEX.decode(tokenidHex);
    const correctTokenId: Buffer = Buffer.from(decodedBytes);
    const b = await this.yuanWallet!.payToList(null, giveMoneyResult, correctTokenId);
    console.debug("block " + (b == null ? "block is null" : b.toString()));

    await this.payBigTo(key, Coin.FEE_DEFAULT.getValue(), []);
  
    console.debug("====start check admin wallet====");

    await this.payBigTo(key2, Coin.FEE_DEFAULT.getValue(), []);
 
    console.debug("====start check admin wallet====");

    return userkeys;
  }

  public async testTokens() {
    const domain = "";
    const fromPrivate = ECKey.fromPrivateString(RemoteFromAddressTests.yuanTokenPriv);

    await this.testCreateMultiSigToken(
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
  protected async testCreateMultiSigToken(key: ECKey, tokenname: string, decimals: number, domainname: string,
      description: string, amount: bigint): Promise<void> {
    
     
			// Generate a proper tokenid - this should be a unique identifier for the token
      // For now, we'll use a hash of key and other parameters to generate a unique id
      const hash = Sha256Hash.of(Buffer.from(key.getPubKey()));
      const tokenid = Utils.HEX.encode(hash.getBytes() as any);
			await this.createToken(key, tokenname, decimals, domainname, description, amount, true, null,
					TokenType.currency, tokenid);
      const signkey = ECKey.fromPrivateString(RemoteTest.testPriv);

      // Note: In the Java client, the tokenid parameter is actually the public key as hex
      // This is how the original Java code works
        await this.wallet.multiSign(key.getPublicKeyAsHex(), signkey, null);

   

  }

  // Create a token with multi-signature support
  protected async createToken(
    key: ECKey,
    tokenname: string,
    decimals: number,
    domainname: string,
    description: string,
    amount: bigint,
    increment: boolean,
    tokenKeyValues: any, // Replace with proper type if TokenKeyValues exists
    tokentype: TokenType,
    tokenid: string
  ): Promise<Block> {
    // Assuming we have a wallet instance available
    if (!this.wallet) {
      throw new Error("Wallet not initialized");
    }
    
    this.wallet.importKey(key);
    
    // Build a simple token info
    // Note: The actual implementation may vary based on Token class methods
    const token = new Token();  // Assuming we have a constructor or need to build it differently
    token.setTokenid(tokenid); // Set the tokenid on the token object
    token.setTokenname(tokenname);
    token.setDescription(description);
    token.setDecimals(decimals);
    token.setAmount(amount);
    token.setTokenstop(!increment);
    token.setTokentype(tokentype); // TokenType should be properly handled
    // Set other required properties as needed
    
    if (tokenKeyValues) {
      token.setTokenKeyValues(tokenKeyValues);
    }
    
    // Create addresses array
    const addresses = [new MultiSignAddress(tokenid, "", key.getPublicKeyAsHex())];
    
    return await this.createTokenWallet(key, domainname, increment, token, addresses);
  }

  // Create token wallet method
  protected async createTokenWallet(
    key: ECKey,
    domainname: string,
    increment: boolean,
    token: Token,
    addresses: MultiSignAddress[]
  ): Promise<Block> {
    if (!this.wallet) {
      throw new Error("Wallet not initialized");
    }
    
    return await this.wallet.createToken(
      key,
      domainname,
      increment,
      token,
      addresses,
      Buffer.from(key.getPubKey()),
      new MemoInfo("coinbase")
    );
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
  }, 300000);
});
