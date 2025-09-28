// Simple test to verify TransactionOutput serialization/deserialization
const { Buffer } = require('buffer');
const bigInt = require('big-integer');
const { Coin } = require('../../dist/src/net/bigtangle/core/Coin');
const { TransactionOutput } = require('../../dist/src/net/bigtangle/core/TransactionOutput');
const { TestParams } = require('../../dist/src/net/bigtangle/params/TestParams');

// Test with zero value
const params = TestParams.get();
const zeroCoin = new Coin(0n);
const scriptBytes = Buffer.from([0x76, 0xa9, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x88, 0xac]); // Simple P2PKH script

console.log('Creating TransactionOutput with zero value');
const output = new TransactionOutput(params, null, zeroCoin, scriptBytes);

// Serialize it
console.log('\nSerializing TransactionOutput');
const stream = {
  data: [],
  write(buffer) {
    console.log(`Writing ${buffer.length} bytes: ${buffer.toString('hex')}`);
    this.data.push(buffer);
  },
  getData() {
    return Buffer.concat(this.data);
  }
};

output.bitcoinSerializeToStream(stream);
const serialized = stream.getData();
console.log(`\nTotal serialized bytes: ${serialized.length}`);
console.log(`Serialized data: ${serialized.toString('hex')}`);

// Parse it back
console.log('\nParsing TransactionOutput from serialized data');
try {
  const parsedOutput = new TransactionOutput(params, null, serialized, 0);
  console.log(`Parsed value: ${parsedOutput.getValue().getValue().toString()}`);
  console.log(`Parsed script bytes: ${parsedOutput.getScriptBytes().toString('hex')}`);
} catch (e) {
  console.error('Error parsing TransactionOutput:', e);
}