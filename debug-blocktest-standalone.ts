// Java to TypeScript conversion of block test code
// This is a standalone demonstration showing the syntax differences

// Java imports would be converted to TypeScript imports
// import { Buffer } from "buffer"; // TypeScript equivalent

// Example showing the conversion of Java assertions to TypeScript

// Java:
// assertEquals(1, block.getVersion());
// TypeScript equivalent:
console.log("block.getVersion() === 1");

// Java:
// assertEquals(0, block.getHeight());
// TypeScript equivalent (using BigInt):
console.log("block.getHeight() === 0n");

// Java:
// assertEquals(1532896109L, block.getTimeSeconds());
// TypeScript equivalent (using BigInt):
console.log("block.getTimeSeconds() === 1532896109n");

// Java:
// assertEquals(Sha256Hash.ZERO_HASH, block.getPrevBlockHash());
// TypeScript equivalent:
console.log("block.getPrevBlockHash().equals(Sha256Hash.ZERO_HASH)");

// Java:
// assertEquals(Sha256Hash.ZERO_HASH, block.getPrevBranchBlockHash());
// TypeScript equivalent:
console.log("block.getPrevBranchBlockHash().equals(Sha256Hash.ZERO_HASH)");

// Java:
// assertEquals(Sha256Hash.wrap("d5384c7ada64c5d949b6903698ee20d375982b46c37d003cafc17a78a44e408b"),
//              block.getMerkleRoot());
// TypeScript equivalent:
console.log('Sha256Hash.wrap("d5384c7ada64c5d949b6903698ee20d375982b46c37d003cafc17a78a44e408b").equals(block.getMerkleRoot())');

// Java:
// assertEquals(536954798L, block.getDifficultyTarget());
// TypeScript equivalent (using BigInt):
console.log("block.getDifficultyTarget() === 536954798n");

// Java:
// assertEquals(0, block.getNonce());
// TypeScript equivalent:
console.log("block.getNonce() === 0");

// Java:
// assertEquals(BlockType.BLOCKTYPE_INITIAL, block.getBlockType());
// TypeScript equivalent:
console.log("block.getBlockType() === BlockType.BLOCKTYPE_INITIAL");

// Java:
// assertEquals("1111111111111111111114oLvT2",
//              new Address(MainNetParams.get(), block.getMinerAddress()).toString());
// TypeScript equivalent:
console.log('new Address(MainNetParams.get(), block.getMinerAddress()).toString() === "1111111111111111111114oLvT2"');

// Java:
// assertEquals(blockBytes.length, block.bitcoinSerialize().length);
// TypeScript equivalent:
console.log("blockBytes.length === block.bitcoinSerialize().length");

// Java:
// assertArrayEquals(blockBytes, block.bitcoinSerialize());
// TypeScript equivalent:
console.log("blockBytes.equals(Buffer.from(block.bitcoinSerialize()))");

// Java:
// assertEquals(1, block.getTransactions().size());
// TypeScript equivalent:
console.log("block.getTransactions().length === 1");

// Java:
// Transaction tx = block.getTransactions().get(0);
// TypeScript equivalent:
// const tx: Transaction = block.getTransactions()[0];

// Java:
// assertTrue(tx.isCoinBase());
// TypeScript equivalent:
console.log("tx.isCoinBase() === true");

// Java:
// assertEquals(1, tx.getInputs().size());
// TypeScript equivalent:
console.log("tx.getInputs().length === 1");

// Java:
// assertEquals(1, tx.getOutputs().size());
// TypeScript equivalent:
console.log("tx.getOutputs().length === 1");

// Java:
// TransactionOutput output = tx.getOutputs().get(0);
// TypeScript equivalent:
// const output: TransactionOutput = tx.getOutputs()[0];

// Java:
// assertEquals(Coin.valueOf(100000000000000000L), output.getValue());
// TypeScript equivalent (using BigInt):
console.log("output.getValue().equals(Coin.valueOf(100000000000000000n))");

// Java:
// byte[] pubkey = Utils.HEX.decode("02721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975");
// TypeScript equivalent:
// const pubkey = Utils.HEX.decode("02721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975");

// Java:
// Script expectedScript = ScriptBuilder.createOutputScript(ECKey.fromPublicOnly(pubkey));
// TypeScript equivalent:
// const expectedScript = ScriptBuilder.createOutputScript(ECKey.fromPublicOnly(pubkey));

// Java:
// assertArrayEquals(expectedScript.getProgram(), output.getScriptBytes());
// TypeScript equivalent:
console.log("Buffer.from(expectedScript.getProgram()).equals(Buffer.from(output.getScriptBytes()))");

// Java:
// assertEquals(Sha256Hash.wrap("4855f019ed0b97ae7dcfab83a010c12d8badef5f669584e3464d85d5c59c57ae"), 
//              block.getHash());
// TypeScript equivalent:
console.log('block.getHash().equals(Sha256Hash.wrap("4855f019ed0b97ae7dcfab83a010c12d8badef5f669584e3464d85d5c59c57ae"))');

console.log("Java to TypeScript conversion demonstration completed.");
console.log("This file shows how Java assertions would be converted to TypeScript syntax.");