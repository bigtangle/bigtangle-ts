import { Buffer } from "buffer";
import { MainNetParams } from "./src/net/bigtangle/params/MainNetParams";
import { TestParams } from "./src/net/bigtangle/params/TestParams";
import { Utils } from "./src/net/bigtangle/utils/Utils";
import { Sha256Hash } from "./src/net/bigtangle/core/Sha256Hash";
import { Address } from "./src/net/bigtangle/core/Address";
import { BlockType } from "./src/net/bigtangle/core/BlockType";
import { Block } from "./src/net/bigtangle/core/Block";
import { Transaction } from "./src/net/bigtangle/core/Transaction";
import { TransactionOutput } from "./src/net/bigtangle/core/TransactionOutput";
import { Coin } from "./src/net/bigtangle/core/Coin";
import { ECKey } from "./src/net/bigtangle/core/ECKey";
import { Script } from "./src/net/bigtangle/script/Script";
import { ScriptBuilder } from "./src/net/bigtangle/script/ScriptBuilder";

// This is the TypeScript conversion of the Java block test code
// Assuming we have these test data bytes from somewhere
// const blockBytes = Buffer.from(...); // Actual block data would go here
// const block = PARAMS.getDefaultSerializer().makeBlock(blockBytes);

// Validate the deserialized block header properties
function validateBlockProperties(block: Block, blockBytes: Buffer) {
  // Validate the deserialized block header properties
  console.assert(block.getVersion() === 1, "Block version should be 1");
  console.assert(block.getHeight() === BigInt(0), "Block height should be 0");
  console.assert(block.getTimeSeconds() === BigInt(1532896109), "Time should be 1532896109");
  console.assert(block.getPrevBlockHash().equals(Sha256Hash.ZERO_HASH), "Prev block hash should be zero hash");
  console.assert(block.getPrevBranchBlockHash().equals(Sha256Hash.ZERO_HASH), "Prev branch block hash should be zero hash");
  
  const expectedMerkleRoot = Sha256Hash.wrap("d5384c7ada64c5d949b6903698ee20d375982b46c37d003cafc17a78a44e408b");
  console.assert(block.getMerkleRoot().equals(expectedMerkleRoot), "Merkle root should match expected value");
  
  console.assert(block.getDifficultyTarget() === BigInt(536954798), "Difficulty target should be 536954798");
  console.assert(block.getNonce() === 0, "Nonce should be 0");
  console.assert(block.getBlockType() === BlockType.BLOCKTYPE_INITIAL, "Block type should be INITIAL");

  // Validate the miner address
  const minerAddress = new Address(MainNetParams.get(), block.getMinerAddress()!);
  console.assert(minerAddress.toString() === "1111111111111111111114oLvT2", "Miner address should match");

  // Validate block serialization
  const serializedBlock = block.bitcoinSerialize();
  console.assert(blockBytes.length === serializedBlock.length, "Serialized block length should match");
  console.assert(blockBytes.equals(Buffer.from(serializedBlock)), "Serialized block should match original");

  // Validate transaction details
  const transactions = block.getTransactions();
  console.assert(transactions!.length === 1, "Should have exactly 1 transaction");

  const tx: Transaction = transactions![0];
  console.assert(tx.isCoinBase(), "Transaction should be coinbase");
  console.assert(tx.getInputs().length === 1, "Should have exactly 1 input");
  console.assert(tx.getOutputs().length === 1, "Should have exactly 1 output");

  // Validate coinbase transaction output
  const output: TransactionOutput = tx.getOutputs()[0];
  console.assert(output.getValue().equals(Coin.valueOf(BigInt(100000000000000000))), "Output value should match");

  // Verify the output script matches: PUSHDATA(33)[pubkey] CHECKSIG
  const pubkey = Utils.HEX.decode("02721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975");
  const expectedScript = ScriptBuilder.createOutputScript(ECKey.fromPublicOnly(pubkey));
  const scriptBytes = output.getScriptBytes();
  console.assert(Buffer.from(expectedScript.getProgram()).equals(Buffer.from(scriptBytes)), "Output script should match expected script");

  // Additional assertions based on block.toString() output
  const expectedHash = Sha256Hash.wrap("4855f019ed0b97ae7dcfab83a010c12d8badef5f669584e3464d85d5c59c57ae");
  console.assert(block.getHash().equals(expectedHash), "Block hash should match expected value");
}

console.log("Block test conversion from Java to TypeScript completed.");
console.log("To use this code:");
console.log("1. Load actual block data into blockBytes");
console.log("2. Parse the block using PARAMS.getDefaultSerializer().makeBlock(blockBytes)");
console.log("3. Call validateBlockProperties(block, blockBytes)");