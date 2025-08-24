// Java to TypeScript conversion of block test code

// Import statements would typically go at the top
// import { Utils } from "./src/net/bigtangle/utils/Utils";
// import { Sha256Hash } from "./src/net/bigtangle/core/Sha256Hash";
// import { Address } from "./src/net/bigtangle/core/Address";
// import { MainNetParams } from "./src/net/bigtangle/params/MainNetParams";
// import { BlockType } from "./src/net/bigtangle/core/BlockType";
// import { Transaction } from "./src/net/bigtangle/core/Transaction";
// import { TransactionOutput } from "./src/net/bigtangle/core/TransactionOutput";
// import { Coin } from "./src/net/bigtangle/core/Coin";
// import { ECKey } from "./src/net/bigtangle/core/ECKey";
// import { ScriptBuilder } from "./src/net/bigtangle/script/ScriptBuilder";

// Assuming these variables are defined elsewhere in the test context
// const block: Block = ...;
// const blockBytes: Buffer = ...;
// const output: TransactionOutput = ...;

function validateBlockTest() {
  // Verify the output script
  const pubkey = Utils.HEX.decode("03d6053241c5abca6621c238922e7473977320ef310be0a8538cc2df7ee5a0187c");
  const scriptBytes = output.getScriptBytes();

  // Validate the deserialized block header properties
  console.assert(block.getVersion() === 1, "Block version should be 1");
  console.assert(block.getHeight() === 0n, "Block height should be 0");
  console.assert(block.getTimeSeconds() === 1532896109n, "Time should be 1532896109");
  console.assert(block.getPrevBlockHash().equals(Sha256Hash.ZERO_HASH), "Prev block hash should be zero hash");
  console.assert(block.getPrevBranchBlockHash().equals(Sha256Hash.ZERO_HASH), "Prev branch block hash should be zero hash");
  console.assert(block.getMerkleRoot().equals(Sha256Hash.wrap("d5384c7ada64c5d949b6903698ee20d375982b46c37d003cafc17a78a44e408b")), "Merkle root should match");
  console.assert(block.getDifficultyTarget() === 536954798n, "Difficulty target should be 536954798");
  console.assert(block.getNonce() === 0, "Nonce should be 0");
  console.assert(block.getBlockType() === BlockType.BLOCKTYPE_INITIAL, "Block type should be INITIAL");

  // Validate the miner address
  console.assert(new Address(MainNetParams.get(), block.getMinerAddress()).toString() === "1111111111111111111114oLvT2", "Miner address should match");

  // Validate block serialization
  console.assert(blockBytes.length === block.bitcoinSerialize().length, "Serialized block length should match");
  console.assert(blockBytes.equals(Buffer.from(block.bitcoinSerialize())), "Serialized block should match original");

  // Validate transaction details
  console.assert(block.getTransactions().length === 1, "Should have exactly 1 transaction");
  const tx: Transaction = block.getTransactions()[0];
  console.assert(tx.isCoinBase(), "Transaction should be coinbase");
  console.assert(tx.getInputs().length === 1, "Should have exactly 1 input");
  console.assert(tx.getOutputs().length === 1, "Should have exactly 1 output");

  // Validate coinbase transaction output
  const output: TransactionOutput = tx.getOutputs()[0];
  console.assert(output.getValue().equals(Coin.valueOf(100000000000000000n)), "Output value should match");

  // Verify the output script matches: PUSHDATA(33)[pubkey] CHECKSIG
  const pubkey2 = Utils.HEX.decode("02721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975");
  const expectedScript = ScriptBuilder.createOutputScript(ECKey.fromPublicOnly(pubkey2));
  console.assert(Buffer.from(expectedScript.getProgram()).equals(Buffer.from(output.getScriptBytes())), "Output script should match expected script");

  // Additional assertions based on block.toString() output
  console.assert(block.getHash().equals(Sha256Hash.wrap("4855f019ed0b97ae7dcfab83a010c12d8badef5f669584e3464d85d5c59c57ae")), "Block hash should match expected value");
}

// Run the validation
validateBlockTest();
console.log("Block test validation completed successfully!");