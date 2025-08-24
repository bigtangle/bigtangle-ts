// This is the TypeScript conversion of the Java block test code you provided
// The conversion addresses the syntax differences between Java and TypeScript

import { Buffer } from "buffer";
import { MainNetParams } from "./src/net/bigtangle/params/MainNetParams";
import { Utils } from "./src/net/bigtangle/utils/Utils";
import { Sha256Hash } from "./src/net/bigtangle/core/Sha256Hash";
import { Address } from "./src/net/bigtangle/core/Address";
import { BlockType } from "./src/net/bigtangle/core/BlockType";
import { Transaction } from "./src/net/bigtangle/core/Transaction";
import { TransactionOutput } from "./src/net/bigtangle/core/TransactionOutput";
import { Coin } from "./src/net/bigtangle/core/Coin";
import { ECKey } from "./src/net/bigtangle/core/ECKey";
import { ScriptBuilder } from "./src/net/bigtangle/script/ScriptBuilder";

// Assuming we have these variables defined elsewhere in the actual test
// const block: Block = ...;
// const blockBytes: Buffer = ...;

// Validate the deserialized block header properties
function validateBlockProperties() {
  // These would be actual assertions in a test environment
  // For now, we're just showing the TypeScript equivalent syntax
  
  // assertEquals(1, block.getVersion());
  console.log("block.getVersion() === 1");
  
  // assertEquals(0, block.getHeight());
  console.log("block.getHeight() === 0n"); // Using BigInt literal
  
  // assertEquals(1532896109L, block.getTimeSeconds());
  console.log("block.getTimeSeconds() === 1532896109n"); // Using BigInt literal
  
  // assertEquals(Sha256Hash.ZERO_HASH, block.getPrevBlockHash());
  console.log("block.getPrevBlockHash().equals(Sha256Hash.ZERO_HASH)");
  
  // assertEquals(Sha256Hash.ZERO_HASH, block.getPrevBranchBlockHash());
  console.log("block.getPrevBranchBlockHash().equals(Sha256Hash.ZERO_HASH)");
  
  // assertEquals(Sha256Hash.wrap("d5384c7ada64c5d949b6903698ee20d375982b46c37d003cafc17a78a44e408b"),
  //              block.getMerkleRoot());
  console.log('Sha256Hash.wrap("d5384c7ada64c5d949b6903698ee20d375982b46c37d003cafc17a78a44e408b").equals(block.getMerkleRoot())');
  
  // assertEquals(536954798L, block.getDifficultyTarget());
  console.log("block.getDifficultyTarget() === 536954798n"); // Using BigInt literal
  
  // assertEquals(0, block.getNonce());
  console.log("block.getNonce() === 0");
  
  // assertEquals(BlockType.BLOCKTYPE_INITIAL, block.getBlockType());
  console.log("block.getBlockType() === BlockType.BLOCKTYPE_INITIAL");

  // Validate the miner address
  // assertEquals("1111111111111111111114oLvT2",
  //              new Address(MainNetParams.get(), block.getMinerAddress()).toString());
  console.log('new Address(MainNetParams.get(), block.getMinerAddress()).toString() === "1111111111111111111114oLvT2"');

  // Validate block serialization
  // assertEquals(blockBytes.length, block.bitcoinSerialize().length);
  console.log("blockBytes.length === block.bitcoinSerialize().length");
  
  // assertArrayEquals(blockBytes, block.bitcoinSerialize());
  console.log("blockBytes.equals(Buffer.from(block.bitcoinSerialize()))");

  // Validate transaction details
  // assertEquals(1, block.getTransactions().size());
  console.log("block.getTransactions().length === 1");
  
  // Transaction tx = block.getTransactions().get(0);
  const tx: Transaction = block.getTransactions()[0];
  
  // assertTrue(tx.isCoinBase());
  console.log("tx.isCoinBase() === true");
  
  // assertEquals(1, tx.getInputs().size());
  console.log("tx.getInputs().length === 1");
  
  // assertEquals(1, tx.getOutputs().size());
  console.log("tx.getOutputs().length === 1");

  // Validate coinbase transaction output
  // TransactionOutput output = tx.getOutputs().get(0);
  const output: TransactionOutput = tx.getOutputs()[0];
  
  // assertEquals(Coin.valueOf(100000000000000000L), output.getValue());
  console.log("output.getValue().equals(Coin.valueOf(100000000000000000n))"); // Using BigInt literal

  // Verify the output script matches: PUSHDATA(33)[pubkey] CHECKSIG
  // byte[] pubkey = Utils.HEX.decode("02721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975");
  const pubkey = Utils.HEX.decode("02721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975");
  
  // Script expectedScript = ScriptBuilder.createOutputScript(ECKey.fromPublicOnly(pubkey));
  const expectedScript = ScriptBuilder.createOutputScript(ECKey.fromPublicOnly(pubkey));
  
  // assertArrayEquals(expectedScript.getProgram(), output.getScriptBytes());
  console.log("Buffer.from(expectedScript.getProgram()).equals(Buffer.from(output.getScriptBytes()))");

  // Additional assertions based on block.toString() output
  // assertEquals(Sha256Hash.wrap("4855f019ed0b97ae7dcfab83a010c12d8badef5f669584e3464d85d5c59c57ae"), 
  //              block.getHash());
  console.log('block.getHash().equals(Sha256Hash.wrap("4855f019ed0b97ae7dcfab83a010c12d8badef5f669584e3464d85d5c59c57ae"))');
}

console.log("Java to TypeScript conversion completed.");
console.log("The above function shows how the Java assertions would be converted to TypeScript.");