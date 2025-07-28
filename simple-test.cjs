// simple-test.js
const { TestParams } = require('./dist/src/net/bigtangle/params/TestParams.js');
const { UtilGeneseBlock } = require('./dist/src/net/bigtangle/core/UtilGeneseBlock.js');

async function run() {
  try {
    const params = TestParams.get();
    
    // Create a genesis block
    const genesisBlock = UtilGeneseBlock.createGenesis(params);
    console.log("Created genesis block");
    console.log("Number of transactions:", genesisBlock.getTransactions().length);
    
    // Serialize it
    const blockBytes = Buffer.from(genesisBlock.bitcoinSerializeCopy());
    console.log("Serialized block, bytes length:", blockBytes.length);
    
    // Deserialize it
    const deserializedBlock = params.getDefaultSerializer().makeBlock(blockBytes);
    console.log("Deserialized block");
    console.log("Number of transactions:", deserializedBlock.getTransactions().length);
  } catch (e) {
    console.error("Error:", e);
  }
}

run();