const { TestParams } = require('./dist/src/net/bigtangle/params/TestParams.js');
const { UtilGeneseBlock } = require('./dist/src/net/bigtangle/core/UtilGeneseBlock.js');

async function run() {
  const PARAMS = TestParams.get();

  // Create a genesis block
  const blockGenisis = UtilGeneseBlock.createGenesis(PARAMS);
  const blockBytes = Buffer.from(blockGenisis.bitcoinSerializeCopy());

  console.log("blockBytes length:", blockBytes.length);
  console.log("blockBytes (hex):", blockBytes.toString('hex'));

  // Try to deserialize it
  const block1 = PARAMS.getDefaultSerializer().makeBlock(blockBytes);
  const serializedBlock = Buffer.from(block1.bitcoinSerializeCopy());

  console.log("serializedBlock length:", serializedBlock.length);
  console.log("serializedBlock (hex):", serializedBlock.toString('hex'));

  console.log("Buffers equal:", Buffer.compare(blockBytes, serializedBlock) === 0);
}

run().catch(console.error);