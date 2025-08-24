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

// Assuming we have these test data bytes from somewhere
// const blockBytes = Buffer.from(...); // Actual block data would go here
// const block = PARAMS.getDefaultSerializer().makeBlock(blockBytes);

// Validate the deserialized block header properties
// Note: These would be called inside a test function in a real test file
function validateBlockProperties(block: Block, blockBytes: Buffer) {
  // assertEquals(1, block.getVersion());
  console.assert(block.getVersion() === 1, "Block version should be 1");

  // assertEquals(0, block.getHeight());
  console.assert(block.getHeight() === 0n, "Block height should be 0");

  // assertEquals(1532896109L, block.getTimeSeconds());
  console.assert(block.getTimeSeconds() === 1532896109n, "Time should be 1532896109");

  // assertEquals(Sha256Hash.ZERO_HASH, block.getPrevBlockHash());
  console.assert(block.getPrevBlockHash().equals(Sha256Hash.ZERO_HASH), "Prev block hash should be zero hash");

  // assertEquals(Sha256Hash.ZERO_HASH, block.getPrevBranchBlockHash());
  console.assert(block.getPrevBranchBlockHash().equals(Sha256Hash.ZERO_HASH), "Prev branch block hash should be zero hash");

  // assertEquals(Sha256Hash.wrap("d5384c7ada64c5d949b6903698ee20d375982b46c37d003cafc17a78a44e408b"),
  // block.getMerkleRoot());
  const expectedMerkleRoot = Sha256Hash.wrap("d5384c7ada64c5d949b6903698ee20d375982b46c37d003cafc17a78a44e408b");
  console.assert(block.getMerkleRoot().equals(expectedMerkleRoot), "Merkle root should match expected value");

  // assertEquals(536954798L, block.getDifficultyTarget());
  console.assert(block.getDifficultyTarget() === 536954798n, "Difficulty target should be 536954798");

  // assertEquals(0, block.getNonce());
  console.assert(block.getNonce() === 0, "Nonce should be 0");

  // assertEquals(BlockType.BLOCKTYPE_INITIAL, block.getBlockType());
  console.assert(block.getBlockType() === BlockType.BLOCKTYPE_INITIAL, "Block type should be INITIAL");

  // Validate the miner address
  // assertEquals("1111111111111111111114oLvT2",
  // new Address(MainNetParams.get(), block.getMinerAddress()).toString());
  const minerAddress = new Address(MainNetParams.get(), block.getMinerAddress());
  console.assert(minerAddress.toString() === "1111111111111111111114oLvT2", "Miner address should match");

  // Validate block serialization
  // assertEquals(blockBytes.length, block.bitcoinSerialize().length);
  const serializedBlock = block.bitcoinSerialize();
  console.assert(blockBytes.length === serializedBlock.length, "Serialized block length should match");

  // assertArrayEquals(blockBytes, block.bitcoinSerialize());
  console.assert(blockBytes.equals(Buffer.from(serializedBlock)), "Serialized block should match original");

  // Validate transaction details
  // assertEquals(1, block.getTransactions().size());
  const transactions = block.getTransactions();
  console.assert(transactions.length === 1, "Should have exactly 1 transaction");

  const tx: Transaction = transactions[0];
  // assertTrue(tx.isCoinBase());
  console.assert(tx.isCoinBase(), "Transaction should be coinbase");

  // assertEquals(1, tx.getInputs().size());
  console.assert(tx.getInputs().length === 1, "Should have exactly 1 input");

  // assertEquals(1, tx.getOutputs().size());
  console.assert(tx.getOutputs().length === 1, "Should have exactly 1 output");

  // Validate coinbase transaction output
  const output: TransactionOutput = tx.getOutputs()[0];
  // assertEquals(Coin.valueOf(100000000000000000L), output.getValue());
  console.assert(output.getValue().equals(Coin.valueOf(100000000000000000n)), "Output value should match");

  // Verify the output script matches: PUSHDATA(33)[pubkey] CHECKSIG
  const pubkey = Utils.HEX.decode("02721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975");
  // Create the expected script using ScriptBuilder
  const expectedScript = ScriptBuilder.createOutputScript(ECKey.fromPublicOnly(pubkey));
  const scriptBytes = output.getScriptBytes();
  console.assert(Buffer.from(expectedScript.getProgram()).equals(Buffer.from(scriptBytes)), "Output script should match expected script");

  // Additional assertions based on block.toString() output
  // assertEquals(Sha256Hash.wrap("4855f019ed0b97ae7dcfab83a010c12d8badef5f669584e3464d85d5c59c57ae"), 
  // block.getHash());
  const expectedHash = Sha256Hash.wrap("4855f019ed0b97ae7dcfab83a010c12d8badef5f669584e3464d85d5c59c57ae");
  console.assert(block.getHash().equals(expectedHash), "Block hash should match expected value");
}

console.log("Block test conversion completed. To run these validations, you would need to:");
console.log("1. Load actual block data into blockBytes");
console.log("2. Parse the block using PARAMS.getDefaultSerializer().makeBlock(blockBytes)");
console.log("3. Call validateBlockProperties(block, blockBytes)");