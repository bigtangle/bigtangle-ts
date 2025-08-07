import { Buffer } from "buffer";
import { TestParams } from "./src/net/bigtangle/params/TestParams";
import { Utils } from "./src/net/bigtangle/utils/Utils";

const tip =
  "01000000ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f05548ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f05548170dafec26b25ed20a2c87d485de589c57fc1b32e65a37ea970feb15142b5f1a2a34856800000000ae470120000000000000000000000000cb16b4d62bdf6a05a961cf27a47355486891ebb9ee6892f8010000000100000000000000010100000001ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f055488b404ea4787ac1af3c007dc3462b9875d320ee983690b649d9c564da7a4c38d50000000049483045022100818570e724f91eb5d73b6a195c905fe7d56414cd39fef6aaba20d10f60402256022011f04e032d4bcd111218d07f32195e29f9e3dbb4ef517f91d596e248f84c08c201ffffffff0100000008016345785d8a000001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d7ab9d801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205da7d00000000";

console.log("=== Block Parsing Debug ===");

// Parse the original hex
const originalBuffer = Buffer.from(tip, "hex");
console.log("Original hex length:", tip.length);
console.log("Original buffer length:", originalBuffer.length);

// Try to deserialize
const PARAMS = TestParams.get();
const blockde = PARAMS.getDefaultSerializer().makeBlock(originalBuffer);
console.log("Deserialized block hash:", blockde.getHashAsString());
console.log("Number of transactions:", blockde.getTransactions().length);

// Let's look at the raw buffer to see what's happening
console.log("\n=== Raw Buffer Analysis ===");
console.log("First 100 bytes:", originalBuffer.slice(0, 100).toString('hex'));

// Let's manually parse the transaction count
// Block header is 168 bytes according to NetworkParameters.HEADER_SIZE
const headerSize = 168;
console.log("Header size:", headerSize);
console.log("Bytes after header:", originalBuffer.length - headerSize);

// Let's look at the bytes right after the header
console.log("First 20 bytes after header:", originalBuffer.slice(headerSize, headerSize + 20).toString('hex'));
