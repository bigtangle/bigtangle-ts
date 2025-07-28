import { Buffer } from "buffer";
import { TestParams } from "./src/net/bigtangle/params/TestParams";
import { UtilGeneseBlock } from "./src/net/bigtangle/core/UtilGeneseBlock";

// Create a simple test to examine the bytes
async function run() {
  const PARAMS = TestParams.get();
  
  // Create a genesis block
  const blockGenisis = UtilGeneseBlock.createGenesis(PARAMS);
  const blockBytes = Buffer.from(blockGenisis.bitcoinSerializeCopy());
  
  console.log("Generated blockBytes length:", blockBytes.length);
  console.log("Generated blockBytes (hex):", blockBytes.toString('hex'));
  
  // Now let's look at what's in the actual test file
  // Block 00000000a6e5eb79dcec11897af55e90cd571a4335383a3ccfbc12ec81085935
  console.log("\nThis is a test to examine what bytes we're working with.");
  console.log("In the actual test, blockBytes is created from UtilGeneseBlock.createGenesis(PARAMS).bitcoinSerializeCopy()");
  console.log("Then it's deserialized and serialized again to check if they match.");
}

run().catch(console.error);