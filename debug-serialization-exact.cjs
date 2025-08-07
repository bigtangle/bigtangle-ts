const { TestParams } = require('./dist/net/bigtangle/params/TestParams');
const { Utils } = require('./dist/net/bigtangle/core/Utils');

const PARAMS = TestParams.get();
const tip = '01000000ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f05548ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f05548170dafec26b25ed20a2c87d485de589c57fc1b32e65a37ea970feb15142b5f1a2a34856800000000ae470120000000000000000000000000cb16b4d62bdf6a05a961cf27a47355486891ebb9ee6892f8010000000100000000000000010100000001ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f055488b404ea4787ac1af3c007dc3462b9875d320ee983690b649d9c564da7a4c38d50000000049483045022100818570e724f91eb5d73b6a195c905fe7d56414cd39fef6aaba20d10f60402256022011f04e032d4bcd111218d07f32195e29f9e3dbb4ef517f91d596e248f84c08c201ffffffff0100000008016345785d8a000001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d7ab9d801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205da7d00000000';

console.log('=== Analyzing Block Serialization ===');

const blockde = PARAMS.getDefaultSerializer().makeBlock(
  Buffer.from(Utils.HEX.decode(tip))
);

const actual = blockde.bitcoinSerializeCopy();
const expectedBuf = Buffer.from(tip, 'hex');

console.log('Expected length:', expectedBuf.length);
console.log('Actual length:', actual.length);
console.log('Expected hex:', tip);
console.log('Actual hex:  ', actual.toString('hex'));

// Find all differences
console.log('\n=== Finding All Differences ===');
let differences = [];
const minLength = Math.min(expectedBuf.length, actual.length);
for (let i = 0; i < minLength; i++) {
  if (expectedBuf[i] !== actual[i]) {
    differences.push({
      position: i,
      expected: expectedBuf[i].toString(16).padStart(2, '0'),
      actual: actual[i].toString(16).padStart(2, '0')
    });
    if (differences.length >= 10) break; // Limit output
  }
}

console.log('Found', differences.length, 'differences:');
differences.forEach(diff => {
  console.log(`  Byte ${diff.position}: expected ${diff.expected}, actual ${diff.actual}`);
});

// Check if lengths match
if (expectedBuf.length !== actual.length) {
  console.log(`Length mismatch: expected ${expectedBuf.length}, actual ${actual.length}`);
}

// Analyze block structure
console.log('\n=== Block Structure Analysis ===');
console.log('Block hash:', blockde.getHashAsString());
console.log('Block version:', blockde.getVersion());
console.log('Block time:', blockde.getTime());
console.log('Block height:', blockde.getHeight());
console.log('Number of transactions:', blockde.getTransactions().length);

// Check transaction serialization
const tx = blockde.getTransactions()[0];
if (tx) {
  console.log('\n=== Transaction Analysis ===');
  console.log('Transaction hash:', tx.getHashAsString());
  console.log('Transaction length:', tx.getLength());
  console.log('Number of inputs:', tx.getInputs().length);
  console.log('Number of outputs:', tx.getOutputs().length);
  
  const txSerialized = tx.bitcoinSerializeCopy();
  console.log('Transaction serialized length:', txSerialized.length);
}
