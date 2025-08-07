const { TestParams } = require('./dist/net/bigtangle/params/TestParams');
const { Utils } = require('./dist/net/bigtangle/core/Utils');

const PARAMS = TestParams.get();
const tip = '01000000ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f05548ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f05548170dafec26b25ed20a2c87d485de589c57fc1b32e65a37ea970feb15142b5f1a2a34856800000000ae470120000000000000000000000000cb16b4d62bdf6a05a961cf27a47355486891ebb9ee6892f8010000000100000000000000010100000001ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f055488b404ea4787ac1af3c007dc3462b9875d320ee983690b649d9c564da7a4c38d50000000049483045022100818570e724f91eb5d73b6a195c905fe7d56414cd39fef6aaba20d10f60402256022011f04e032d4bcd111218d07f32195e29f9e3dbb4ef517f91d596e248f84c08c201ffffffff0100000008016345785d8a000001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d7ab9d801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205da7d00000000';

console.log('Analyzing serialization differences...');

const blockde = PARAMS.getDefaultSerializer().makeBlock(
  Buffer.from(Utils.HEX.decode(tip))
);

const actual = blockde.bitcoinSerializeCopy();
const expectedBuf = Buffer.from(tip, 'hex');

console.log('Expected length:', tip.length);
console.log('Actual length:', actual.length * 2);

// Convert to hex strings for comparison
const expectedHex = tip;
const actualHex = actual.toString('hex');

console.log('Expected hex:', expectedHex);
console.log('Actual hex:  ', actualHex);

// Find first difference
let firstDiff = -1;
for (let i = 0; i < Math.min(expectedBuf.length, actual.length); i++) {
  if (expectedBuf[i] !== actual[i]) {
    firstDiff = i;
    break;
  }
}

if (firstDiff !== -1) {
  console.log('\n=== FIRST DIFFERENCE ===');
  console.log('Position:', firstDiff);
  console.log('Expected byte:', expectedBuf[firstDiff].toString(16).padStart(2, '0'));
  console.log('Actual byte:  ', actual[firstDiff].toString(16).padStart(2, '0'));
  
  // Show context around the difference
  const start = Math.max(0, firstDiff - 20);
  const end = Math.min(expectedBuf.length, firstDiff + 20);
  
  console.log('\nContext around difference:');
  console.log('Expected:', expectedHex.substring(start * 2, end * 2));
  console.log('Actual:  ', actualHex.substring(start * 2, end * 2));
  
  // Show byte-by-byte comparison
  console.log('\nByte-by-byte comparison (position, expected, actual):');
  for (let i = Math.max(0, firstDiff - 5); i < Math.min(expectedBuf.length, firstDiff + 5); i++) {
    const marker = i === firstDiff ? '***' : '   ';
    console.log(`${marker} ${i.toString().padStart(3)}: ${expectedBuf[i].toString(16).padStart(2, '0')} vs ${actual[i].toString(16).padStart(2, '0')}`);
  }
} else {
  console.log('No differences found in the compared range');
}

// Check if lengths match
if (expectedBuf.length !== actual.length) {
  console.log('\n=== LENGTH MISMATCH ===');
  console.log('Expected length:', expectedBuf.length);
  console.log('Actual length:  ', actual.length);
  
  if (actual.length > expectedBuf.length) {
    console.log('Extra bytes in actual:', actualHex.substring(expectedBuf.length * 2));
  } else {
    console.log('Missing bytes from actual (expected):', expectedHex.substring(actual.length * 2));
  }
}

// Analyze block structure
console.log('\n=== BLOCK STRUCTURE ANALYSIS ===');
console.log('Block hash:', blockde.getHashAsString());
console.log('Block version:', blockde.getVersion());
console.log('Block time:', blockde.getTime());
console.log('Block height:', blockde.getHeight());
console.log('Number of transactions:', blockde.getTransactions().length);

if (blockde.getTransactions().length > 0) {
  const tx = blockde.getTransactions()[0];
  console.log('First transaction hash:', tx.getHashAsString());
  console.log('Transaction inputs:', tx.getInputs().length);
  console.log('Transaction outputs:', tx.getOutputs().length);
}
