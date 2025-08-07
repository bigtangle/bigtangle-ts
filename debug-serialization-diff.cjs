const { TestParams } = require('./dist/net/bigtangle/params/TestParams');
const { Utils } = require('./dist/net/bigtangle/core/Utils');

const PARAMS = TestParams.get();
const tip = "01000000ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f05548ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f05548170dafec26b25ed20a2c87d485de589c57fc1b32e65a37ea970feb15142b5f1a2a34856800000000ae470120000000000000000000000000cb16b4d62bdf6a05a961cf27a47355486891ebb9ee6892f8010000000100000000000000010100000001ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f055488b404ea4787ac1af3c007dc3462b9875d320ee983690b649d9c564da7a4c38d50000000049483045022100818570e724f91eb5d73b6a195c905fe7d56414cd39fef6aaba20d10f60402256022011f04e032d4bcd111218d07f32195e29f9e3dbb4ef517f91d596e248f84c08c201ffffffff0100000008016345785d8a000001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d7ab9d801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205da7d00000000";

console.log("=== Java Serialization Analysis ===");
console.log("Expected hex length:", tip.length);
console.log("Expected hex:", tip);

// Parse the block
const blockde = PARAMS.getDefaultSerializer().makeBlock(
  Buffer.from(Utils.HEX.decode(tip))
);

// Serialize it back
const actual = blockde.bitcoinSerializeCopy();
const actualHex = actual.toString('hex');

console.log("Actual hex length:", actualHex.length);
console.log("Actual hex:", actualHex);

// Compare byte by byte
const expectedBuf = Buffer.from(tip, 'hex');
console.log("\n=== Byte-by-byte comparison ===");
console.log("Expected length:", expectedBuf.length);
console.log("Actual length:", actual.length);

let firstDiff = -1;
let diffCount = 0;
const maxDiffs = 10;

for (let i = 0; i < Math.min(expectedBuf.length, actual.length); i++) {
  if (expectedBuf[i] !== actual[i]) {
    if (firstDiff === -1) firstDiff = i;
    diffCount++;
    
    if (diffCount <= maxDiffs) {
      console.log(`Diff at byte ${i}:`);
      console.log(`  Expected: 0x${expectedBuf[i].toString(16).padStart(2, '0')} (${expectedBuf[i]})`);
      console.log(`  Actual:   0x${actual[i].toString(16).padStart(2, '0')} (${actual[i]})`);
      
      // Show context
      const start = Math.max(0, i - 8);
      const end = Math.min(expectedBuf.length, i + 8);
      console.log(`  Context: expected=${expectedBuf.slice(start, end).toString('hex')}`);
      console.log(`  Context: actual=  ${actual.slice(start, end).toString('hex')}`);
    }
  }
}

console.log(`\nTotal differences: ${diffCount}`);
console.log(`First difference at byte: ${firstDiff}`);

// Show the last few bytes
console.log("\n=== Last 50 bytes ===");
console.log("Expected:", expectedBuf.slice(-50).toString('hex'));
console.log("Actual:  ", actual.slice(-50).toString('hex'));

// Check if it's just trailing zeros or something
const expectedEnd = expectedBuf.slice(-20);
const actualEnd = actual.slice(-20);
console.log("\n=== End comparison ===");
console.log("Expected end:", expectedEnd.toString('hex'));
console.log("Actual end:  ", actualEnd.toString('hex'));
console.log("Ends match:", expectedEnd.equals(actualEnd));

// Check if lengths differ
if (expectedBuf.length !== actual.length) {
  console.log("\n=== Length mismatch ===");
  console.log("Expected length:", expectedBuf.length);
  console.log("Actual length:", actual.length);
  
  if (actual.length > expectedBuf.length) {
    console.log("Extra bytes at end:", actual.slice(expectedBuf.length).toString('hex'));
  } else {
    console.log("Missing bytes at end:", expectedBuf.slice(actual.length).toString('hex'));
  }
}
