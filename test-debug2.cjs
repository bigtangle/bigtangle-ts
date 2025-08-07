const { TransactionOutput } = require('./dist/src/net/bigtangle/core/TransactionOutput');
const { Coin } = require('./dist/src/net/bigtangle/core/Coin');
const { TestParams } = require('./dist/src/net/bigtangle/params/TestParams');
const { Buffer } = require('buffer');

// Create a test network parameters
const params = TestParams.get();

// Create a zero-value output
const coin = new Coin(0n, Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex'));
const output = new TransactionOutput(params, null, coin, Buffer.alloc(0));

// Serialize it
const stream = {
  data: [],
  write(buffer) {
    this.data.push(buffer);
  },
  getData() {
    return Buffer.concat(this.data);
  }
};

output.bitcoinSerializeToStream(stream);
const serialized = stream.getData();

console.log('Serialized output:', serialized.toString('hex'));
console.log('Serialized length:', serialized.length);