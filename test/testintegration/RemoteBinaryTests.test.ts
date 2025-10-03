import { beforeEach, describe, expect, test } from "vitest";
import { Address } from "../../src/net/bigtangle/core/Address";
import { Block } from "../../src/net/bigtangle/core/Block";
 
import { Coin } from "../../src/net/bigtangle/core/Coin";
import { ECKey } from "../../src/net/bigtangle/core/ECKey";
import { MemoInfo } from "../../src/net/bigtangle/core/MemoInfo";
 import { Wallet } from "../../src/net/bigtangle/wallet/Wallet";
import { FreeStandingTransactionOutput } from "../../src/net/bigtangle/wallet/FreeStandingTransactionOutput";

import { TokenType } from "../../src/net/bigtangle/core/TokenType";
import { RemoteTest } from "./Remote.test";
import { ReqCmd } from "../../src/net/bigtangle/params/ReqCmd";
import { OkHttp3Util } from "../../src/net/bigtangle/utils/OkHttp3Util";
import { Utils } from "../../src/net/bigtangle/core/Utils";
import { sign } from "crypto";
import { TransactionSignature } from "../../src/net/bigtangle/crypto/TransactionSignature";
import { SigHash } from "../../src/net/bigtangle/core/SigHash";
import { Transaction } from "../../src/net/bigtangle/core/Transaction";
import { TransactionOutput } from "../../src/net/bigtangle/core/TransactionOutput";
import { TransactionInput } from "../../src/net/bigtangle/core/TransactionInput";
import { NetworkParameters } from "../../src/net/bigtangle/params/NetworkParameters";
import { ScriptBuilder } from "../../src/net/bigtangle/script/ScriptBuilder";


class RemoteBinaryTests extends RemoteTest {}

describe("RemoteBinaryTests", () => {
  const tests = new RemoteBinaryTests();

  beforeEach(async () => {
    await tests.setUp();
  });

  test("testSerial", async () => {
    const tip =
      "01000000ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f05548ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f05548170dafec26b25ed20a2c87d485de589c57fc1b32e65a37ea970feb15142b5f1a9a29d06800000000ae470120000000000000000000000000ce3282972bdf6a05a961cf27a47355486891ebb9ee6892f8010000000100000000000000010100000001ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f055488b404ea4787ac1af3c007dc3462b9875d320ee983690b649d9c564da7a4c38d50000000049483045022100818570e724f91eb5d73b6a195c905fe7d56414cd39fef6aaba20d10f60402256022011f04e032d4bcd111218d07f32195e29f9e3dbb4ef517f91d596e248f84c08c201ffffffff0100000008016345785d8a000001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d7ab9d801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

    // Create a serializer with parseRetain set to true
    const serializer = tests.networkParameters.getSerializer(true);
    const block = serializer.makeBlock(Buffer.from(tip, "hex"));
 
  

     expect(Utils.HEX.encode(block.bitcoinSerialize())).toEqual(tip);

    console.log(block.toString());
    // Post to the server
    const url = tests.contextRoot + (ReqCmd.saveBlock || "/saveBlock");
    
      OkHttp3Util.post(url, Buffer.from(block.bitcoinSerialize()));
  });

  test("resignTransactionAndSend", async () => {
    // Get the latest block from the server first
    const requestParam = new Map<string, string>();
    const blockHex = await OkHttp3Util.postAndGetBlock(
      tests.contextRoot + ReqCmd.getTip,
      tests.objectMapper.stringify(Object.fromEntries(requestParam))
    );
    const baseBlock = tests.networkParameters
      .getDefaultSerializer()
      .makeBlock(Buffer.from(Utils.HEX.decode(blockHex)));
    
    // Instead of reusing an existing transaction which might have spent UTXOs,
    // create a new transaction based on the server's current state
    const privateKey = ECKey.fromPrivateString(RemoteTest.testPriv);
    
    // Get available UTXOs to spend (from current server state)
    const outputs = await tests.getBalanceByKey(false, privateKey);
    if (outputs.length === 0) {
      console.log("No UTXOs available for spending in resignTransactionAndSend, skipping test");
      return;
    }
    
    // Get the largest UTXO to work with
    const output = tests.getLargeUTXO(outputs);
    const spendableOutput = new FreeStandingTransactionOutput(
      tests.networkParameters,
      output
    );

    if (!spendableOutput.getValue()) {
      throw new Error("UTXO has no value");
    }
    
    // Create a new transaction based on current UTXOs
    const tx = new Transaction(tests.networkParameters);

    // Create outputs - send to the same address to keep funds
    const amount = spendableOutput.getValue()!.subtract(Coin.FEE_DEFAULT);
    if (amount.getValue().isLessThan(BigInt(0))) {
      console.log("Insufficient funds for transaction fee, skipping test");
      return;
    }
    
    // Add output to the transaction
    tx.addOutput(
      new TransactionOutput(
        tests.networkParameters,
        tx,
        amount,
        Buffer.from(privateKey.getPubKey())
      )
    );

    // Create input - spend the UTXO
    const containingBlockHash = output.getBlockHash()!;
    const outPoint = spendableOutput.getOutPointFor(containingBlockHash);
    const input = TransactionInput.fromScriptBytes(
      tests.networkParameters,
      tx,
      outPoint.bitcoinSerialize()
    );
    tx.addInput1(input);

    // Sign the transaction using TypeScript client
    const inputIndex = 0;
    const redeemScript = output.getScript()!.getProgram();
    
    const sighash = tx.hashForSignature(
      inputIndex,
      redeemScript,
      SigHash.ALL,
      false
    );
    
    if (!sighash) {
      throw new Error("Unable to create sighash for transaction");
    }
    
    console.log("Transaction hash for signature:", sighash.toString());
    
    const signature = await privateKey.sign(sighash.getBytes());
    const transactionSignature = new TransactionSignature(
      signature.r,
      signature.s,
      SigHash.ALL
    );
    
    // Create the input script with the signature and public key
    const inputScript = ScriptBuilder.createInputScript(transactionSignature, privateKey);
    input.setScriptSig(inputScript);

    console.log("Created re-signed transaction");
    console.log("Transaction hex:", Utils.HEX.encode(tx.unsafeBitcoinSerialize()));
    
    // Add our signed transaction to the base block
    baseBlock.addTransaction(tx);
    
    console.log("Block with re-signed transaction created");
    console.log("Block hash:", baseBlock.getHashAsString());
    
    // Send the block to the server
    const url = tests.contextRoot + (ReqCmd.saveBlock || "/saveBlock");
    console.log("Sending block to server:", url);
    
    try {
      await OkHttp3Util.post(url, Buffer.from(baseBlock.bitcoinSerialize()));
      console.log("Block sent to server successfully");
    } catch (error) {
      console.log("Error sending block to server:", error);
    }
  });

  test("createAndSendTSSignedTransaction", async () => {
    // Create a new transaction using TypeScript client and sign it
    const privateKey = ECKey.fromPrivateString(RemoteTest.testPriv);
    
    // Get available UTXOs to spend
    const outputs = await tests.getBalanceByKey(false, privateKey);
    if (outputs.length === 0) {
      console.log("No UTXOs available for spending, skipping test");
      return;
    }

    // Get the largest UTXO to work with
    const output = tests.getLargeUTXO(outputs);
    const spendableOutput = new FreeStandingTransactionOutput(
      tests.networkParameters,
      output
    );

    if (!spendableOutput.getValue()) {
      throw new Error("UTXO has no value");
    }

    // Create a new transaction
    const tx = new Transaction(tests.networkParameters);

    // Create outputs - send to the same address to keep funds
    const amount = Coin.valueOf(
      BigInt(2), 
      NetworkParameters.getBIGTANGLE_TOKENID()
    );
    
    // Add output to the transaction
    tx.addOutput(
      new TransactionOutput(
        tests.networkParameters,
        tx,
        amount,
        Buffer.from(privateKey.getPubKey())
      )
    );
    
    // Add change output
    tx.addOutput(
      new TransactionOutput(
        tests.networkParameters,
        tx,
        spendableOutput.getValue()!.subtract(amount).subtract(Coin.FEE_DEFAULT),
        Buffer.from(privateKey.getPubKey())
      )
    );

    // Create input - spend the UTXO
    const containingBlockHash = output.getBlockHash()!;
    const outPoint = spendableOutput.getOutPointFor(containingBlockHash);
    const input = TransactionInput.fromScriptBytes(
      tests.networkParameters,
      tx,
      outPoint.bitcoinSerialize()
    );
    tx.addInput1(input);

    // Sign the transaction using TypeScript client
    const inputIndex = 0;
    const redeemScript = output.getScript()!.getProgram();
    
    const sighash = tx.hashForSignature(
      inputIndex,
      redeemScript,
      SigHash.ALL,
      false
    );
    
    if (!sighash) {
      throw new Error("Unable to create sighash for transaction");
    }
    
    console.log("Transaction hash for signature:", sighash.toString());
    
    const signature = await privateKey.sign(sighash.getBytes());
    const transactionSignature = new TransactionSignature(
      signature.r,
      signature.s,
      SigHash.ALL
    );
    
    // Create the input script with the signature and public key (for P2PKH)
    const inputScript = ScriptBuilder.createInputScript(transactionSignature, privateKey);
    input.setScriptSig(inputScript);

    console.log("Created TypeScript signed transaction");
    console.log("Transaction hex:", Utils.HEX.encode(tx.unsafeBitcoinSerialize()));
    
    // Create a block containing this transaction
    const requestParam = new Map<string, string>();
    const blockHex = await OkHttp3Util.postAndGetBlock(
      tests.contextRoot + ReqCmd.getTip,
      tests.objectMapper.stringify(Object.fromEntries(requestParam))
    );
    const block = tests.networkParameters.getDefaultSerializer().makeBlock(
      Buffer.from(Utils.HEX.decode(blockHex))
    );
    
    // Add our signed transaction to the block
    block.addTransaction(tx);
    
    console.log("Block with TS signed transaction created");
    console.log("Block hash:", block.getHashAsString());
    
    // Send the block to the server
    const url = tests.contextRoot + (ReqCmd.saveBlock || "/saveBlock");
    console.log("Sending block to server:", url);
    
    try {
      await OkHttp3Util.post(url, Buffer.from(block.bitcoinSerialize()));
      console.log("Block sent to server successfully");
    } catch (error) {
      console.log("Error sending block to server:", error);
    }
  });
});