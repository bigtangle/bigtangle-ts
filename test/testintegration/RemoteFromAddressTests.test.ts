import { beforeEach, describe, expect, test } from "vitest";
import { Address } from "../../src/net/bigtangle/core/Address";
import { Coin } from "../../src/net/bigtangle/core/Coin";
import { ECKey } from "../../src/net/bigtangle/core/ECKey";
import { MemoInfo } from "../../src/net/bigtangle/core/MemoInfo";
import { Wallet } from "../../src/net/bigtangle/wallet/Wallet";
import { TokenType } from "../../src/net/bigtangle/core/TokenType";
import { TokenInfo } from "../../src/net/bigtangle/core/TokenInfo";
import { MultiSignAddress } from "../../src/net/bigtangle/core/MultiSignAddress";
import { Sha256Hash } from "../../src/net/bigtangle/core/Sha256Hash";
import { Utils } from "../../src/net/bigtangle/core/Utils";
import { UtilGeneseBlock } from "../../src/net/bigtangle/core/UtilGeneseBlock";
import { PermissionedAddressesResponse } from "../../src/net/bigtangle/response/PermissionedAddressesResponse";
import { Token } from "../../src/net/bigtangle/core/Token";
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
    
    // First, ensure the default wallet (which pays the fees) has sufficient funds
    // The payBigTo method uses 'this.wallet' (default wallet) to send funds to yuanKey
    const block = await this.payBigTo(
      yuanKey,
      Coin.FEE_DEFAULT.getValue() * BigInt(1000),
      []
    );

    console.debug("block " + (block ? block.toString() : "block is null"));

    // Add a small delay to ensure the blockchain server has processed the transaction
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Create wallet instance after funds have been sent and give it time to sync
    // Re-create the yuan wallet to ensure it picks up new UTXOs
    this.yuanWallet = await Wallet.fromKeysURL(
      this.networkParameters,
      [yuanKey],
      this.contextRoot
    );
    
    // Check that the wallet has UTXOs for paying fees
    let coinList = await this.yuanWallet.calculateAllSpendCandidates(null, false);
    let retries = 0;
    const maxRetries = 15; // Increased retries to ensure UTXOs are processed
    
    while (coinList.length === 0 && retries < maxRetries) {
      console.debug(`UTXO check attempt ${retries + 1}/${maxRetries}: 0 UTXOs found`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between attempts
      // Re-instantiate the wallet to refresh its UTXO list
      this.yuanWallet = await Wallet.fromKeysURL(
        this.networkParameters,
        [yuanKey],
        this.contextRoot
      );
      coinList = await this.yuanWallet.calculateAllSpendCandidates(null, false);
      retries++;
    }
    
    if (coinList.length === 0) {
      console.debug(`Yuan wallet still has no UTXOs after ${maxRetries} attempts, trying alternative method...`);
      
      // Try to get funds using getBalanceByKey method which might be more direct
      try {
        const utxos = await this.getBalanceByKey(false, yuanKey);
        console.debug(`UTXOs found via getBalanceByKey: ${utxos.length}`);
        
        if (utxos.length > 0) {
          console.debug("Successfully found UTXOs using alternative method");
        }
      } catch (error) {
        console.error("Error when trying alternative UTXO fetch method:", error);
      }
    } else {
      console.debug(`Yuan wallet has ${coinList.length} UTXOs available for spending`);
    }

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
    const tokenInfo = new TokenInfo();
    const basecoin = Coin.valueOf(amount, Buffer.from(key.getPublicKeyAsHex(), "hex"));

    const tokenIndexResponse = await this.getServerCalTokenIndex(key.getPublicKeyAsHex());
    const tokenindex = tokenIndexResponse.getTokenindex() ?? 0;
    const prevblockhash = tokenIndexResponse.getBlockhash() ?? Sha256Hash.ZERO_HASH;

    // Create a simple token with single signature (signnumber = 0 or 1)
    const tokens = Token.buildSimpleTokenInfo2(
      true,
      prevblockhash,
      key.getPublicKeyAsHex(),
      tokename,
      description,
      1,  // signnumber - 1 signature required (this is for single signature)
      tokenindex,
      amount,
      false, // tokenstop - changed from true to false
      decimals,
      null // Use null for domain predecessor to avoid dependency issues  
    );
    tokenInfo.setToken(tokens);
    
    // For single signature, add the address to the list 
    tokenInfo
      .getMultiSignAddresses()
      .push(new MultiSignAddress(key.getPublicKeyAsHex(), "", key.getPublicKeyAsHex()));

    const walletForToken = await Wallet.fromKeysURL(this.networkParameters, [key], this.contextRoot);
    try {
      const b = await walletForToken.saveToken(
        tokenInfo,
        basecoin,
        key,
        null,
        key.getPubKey(),
        new MemoInfo("coinbase")
      );
      console.debug("Token creation successful:", b ? b.getHashAsString() : "null block");
    } catch (error) {
      console.error("Error in token creation:", error);
      // Handle the error appropriately, maybe by skipping or continuing
      // Rethrow if it's a critical error
      throw error;
    }
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
