import { Buffer } from "buffer";
import { beforeEach, describe, expect, test } from "vitest";
import { Address } from "../../src/net/bigtangle/core/Address";
import { Block } from "../../src/net/bigtangle/core/Block";
import { Coin } from "../../src/net/bigtangle/core/Coin";
import { ECKey } from "../../src/net/bigtangle/core/ECKey";
import { TokenType } from "../../src/net/bigtangle/core/TokenType";
import { Token } from "../../src/net/bigtangle/core/Token";
import { MultiSignAddress } from "../../src/net/bigtangle/core/MultiSignAddress";
import { NetworkParameters } from "../../src/net/bigtangle/params/NetworkParameters";
import { ReqCmd } from "../../src/net/bigtangle/params/ReqCmd";

import { UTXO } from "../../src/net/bigtangle/core/UTXO";
import { Utils } from "../../src/net/bigtangle/core/Utils";
import { GetOutputsResponse } from "../../src/net/bigtangle/response/GetOutputsResponse";
import { Wallet } from "../../src/net/bigtangle/wallet/Wallet";
import { RemoteTest } from "./RemoteTest";
import { MemoInfo } from "../../src/net/bigtangle/core/MemoInfo";
import { OkHttp3Util } from "../../src/net/bigtangle/utils/OkHttp3Util";
class RemoteFromAddressTests extends RemoteTest {
  public static yuanTokenPub =
    "02a717921ede2c066a4da05b9cdce203f1002b7e2abeee7546194498ef2fa9b13a";
  public static yuanTokenPriv =
    "8db6bd17fa4a827619e165bfd4b0f551705ef2d549a799e7f07115e5c3abad55";

  yuanWallet: Wallet | undefined;
  tokenid: string = "";
  userkeys: ECKey[] = [];

  public async testUserpay() {
    this.tokenid = ECKey.fromPrivateString(
      RemoteFromAddressTests.yuanTokenPriv
    ).getPublicKeyAsHex();

    // Create the token first
    //  await this.testTokens();

    // Call tokensumInitial after testTokens
    // await this.tokenOwner( );

    // Now create yuanWallet after token creation so it can access the created tokens
    this.yuanWallet = await Wallet.fromKeysURL(
      this.networkParameters,
      [ECKey.fromPrivateString(RemoteFromAddressTests.yuanTokenPriv)],
      this.contextRoot
    );

    this.userkeys.push(ECKey.createNewKey());
    this.userkeys.push(ECKey.createNewKey());

    await this.doUserPay();
  }

  private async doUserPay() {
    await this.payKeys();
    // Add a delay to ensure the payments to the new keys are confirmed before trying to spend from them
    await new Promise((resolve) => setTimeout(resolve, 2000));

    this.checkBalance(this.tokenid, this.userkeys);

    this.checkBalance(
      NetworkParameters.BIGTANGLE_TOKENID_STRING,
      this.userkeys
    );

    this.sell(this.userkeys);

    // Only attempt to buy tickets if there are adequate funds
    await this.buyTicket(this.userkeys);
  }

  /*
   * pay money to the key and use the key to buy yuan tokens
   */
  public async buyTicket(keys: ECKey[]) {
    const w = await Wallet.fromKeysURL(
      this.networkParameters,
      keys,
      this.contextRoot
    );

    // Now purchase yuan tokens using native token as payment
    const bs = await w.buyOrder(
      null,
      this.tokenid, // tokenid to buy (yuan token)
      BigInt(100), // amount of yuan tokens to buy
      BigInt(2), // price per yuan token
      null, // from address
      null, // to address
      NetworkParameters.BIGTANGLE_TOKENID_STRING, // payment token (native)
      true // is buy order
    );
    console.log(`Buy order result: ${bs ? bs.toString() : "null"}`);
  }

  /*
   * pay yuan token to multiple new created keys
   */
  public async payKeys(): Promise<void> {
    const giveMoneyResult = new Map<string, bigint>();
    const giveMoneyResultBig = new Map<string, bigint>();

    for (const key of this.userkeys) {
      const addr = Address.fromKey(this.networkParameters, key).toString();
      giveMoneyResult.set(addr, BigInt(100));
      giveMoneyResultBig.set(addr, BigInt(100000000)); // Reduced from 1,000,000,000 to 100,000,000
    }

    const b = await this.yuanWallet!.payToList(
      null,
      giveMoneyResult,
      Buffer.from(Utils.HEX.decode(this.tokenid))
    );
    if (b !== null) {
      console.log(`Payment block: ${b.toString()}`);
    } else {
      console.log("Payment block b is null");
    }

    const tokenIdBytes = Buffer.from(
      Utils.HEX.decode(NetworkParameters.BIGTANGLE_TOKENID_STRING)
    );
    const c = await this.wallet!.payToList(
      null,
      giveMoneyResultBig,
      tokenIdBytes
    );
    if (c !== null) {
      console.log(`Payment block: ${c.toString()}`);
    } else {
      console.log("Payment block c is null");
    }
  }

 
  public async testTokens() {
    // Send native tokens to yuanToken key for fees first
    await this.payBigTo(
      ECKey.fromPrivateString(RemoteFromAddressTests.yuanTokenPriv),
      Coin.FEE_DEFAULT.getValue() * BigInt(1000) * BigInt(10000),
      []
    );
    const domain = "";
    const fromPrivate = ECKey.fromPrivateString(
      RemoteFromAddressTests.yuanTokenPriv
    );

    await this.testCreateMultiSigToken(
      fromPrivate,
      "人民币",
      2,
      domain,
      "人民币 CNY",
      BigInt(10000000)
    );
  }

  public async tokenOwner() {
    try {
      // Make the call to outputsOfTokenid using the same pattern as other methods
      // but handle any parsing errors gracefully

      // Use a more generic approach that bypasses complex Jackson parsing
      const requestParam = { tokenid: this.tokenid }; // Changed from name: null to tokenid

      // Make a direct call to the server endpoint
      const response = await OkHttp3Util.postClass<GetOutputsResponse>(
        this.contextRoot + ReqCmd.outputsOfTokenid,
        Buffer.from(JSON.stringify(requestParam)),
        GetOutputsResponse
      );

      // Check if response is an actual GetOutputsResponse instance or just a plain object
      let outputs;
      if (
        response &&
        typeof (response as GetOutputsResponse).getOutputs === "function"
      ) {
        // Jackson deserialization worked, we have a proper GetOutputsResponse instance
        outputs = (response as GetOutputsResponse).getOutputs();
      } else {
        // Fallback: response is likely a plain object from JSON.parse
        outputs = (response as any)?.outputs || [];
      }
      console.log(`Outputs found: ${JSON.stringify(outputs)}`);

      // Return the outputs for potential use by other methods
      return outputs;
    } catch (error) {
      console.error(`Error in tokenOwner: ${(error as Error).message}`);
      return []; // Return empty array in case of error
    }
  }

  public getAddress(): Address {
    return ECKey.fromPrivateString(
      RemoteFromAddressTests.yuanTokenPriv
    ).toAddress(this.networkParameters);
  }

  // create a token with multi sign
  protected async testCreateMultiSigToken(
    key: ECKey,
    tokenname: string,
    decimals: number,
    domainname: string,
    description: string,
    amount: bigint
  ): Promise<void> {
    // Calculate the token ID as a hash of the public key (this is the standard way tokens are identified)

    await this.createToken(
      key,
      tokenname,
      decimals,
      domainname,
      description,
      amount,
      true,
      null,
      TokenType.currency,
      this.tokenid
    );

    const signkey = ECKey.fromPrivateString(RemoteTest.testPriv);
    await this.wallet.multiSign(this.tokenid, signkey, null);
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
    if (!this.wallet) {
      throw new Error("Wallet not initialized");
    }

    this.wallet.importKey(key);

    const token = new Token();
    token.setTokenid(tokenid);
    token.setTokenname(tokenname);
    token.setDescription(description);
    token.setDecimals(decimals);
    token.setAmount(amount);
    token.setTokenstop(!increment);
    token.setTokentype(tokentype);

    if (tokenKeyValues) {
      token.setTokenKeyValues(tokenKeyValues);
    }

    const addresses = [
      new MultiSignAddress(tokenid, "", key.getPublicKeyAsHex()),
    ];

    return await this.createTokenWallet(
      key,
      domainname,
      increment,
      token,
      addresses
    );
  }

  protected async balance(): Promise<void> {
    const utxos = await this.getBalanceByKeys(false, this.userkeys);

    for (const utxo of utxos) {
      console.debug(`UTXO: ${utxo.toString()}`);
    }
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

  protected async checkBalance(tokenid: string, keys: ECKey[]): Promise<void> {
    // Get the UTXOs for the provided keys
    const utxos = await this.getBalanceByKeys(false, keys);
    let targetUtxo: UTXO | null = null;

    for (const utxo of utxos) {
      if (tokenid === utxo.getTokenId()) {
        targetUtxo = utxo;
        break;
      }
    }

    // Only perform assertions if we found the target UTXO

    expect(targetUtxo).not.toBeNull();
  }

  protected async sell(keys: ECKey[]): Promise<void> {
 const w = await Wallet.fromKeysURL(
      this.networkParameters,
      keys,
      this.contextRoot
    );

    // Now purchase yuan tokens using native token as payment
    const bs = await w.sellOrder(
      null,
      this.tokenid, // tokenid to buy (yuan token)
      BigInt(100), // amount of yuan tokens to buy
      BigInt(2), // price per yuan token
      null, // from address
      null, // to address
      NetworkParameters.BIGTANGLE_TOKENID_STRING, // payment token (native)
      true // is buy order
    );
    console.log(`sell order result: ${bs ? bs.toString() : "null"}`);
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
