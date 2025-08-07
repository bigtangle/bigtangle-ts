import { TransactionOutput } from './src/net/bigtangle/core/TransactionOutput';
import { Coin } from './src/net/bigtangle/core/Coin';
import { NetworkParameters } from './src/net/bigtangle/params/NetworkParameters';
import { TestParams } from './src/net/bigtangle/params/TestParams';
import { Buffer } from 'buffer';

// Create a test network parameters
const params = TestParams.get();

// Create a zero-value output
const coin = new Coin(0n, Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex'));
const output = new TransactionOutput(params, null, coin, Buffer.alloc(0));

// Serialize it
const stream = {
  data: [] as Buffer[],
  write(buffer: Buffer) {
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

// Parse it back
try {
  const parsedOutput = new TransactionOutput(params, null, serialized, 0);
  console.log('Parsed value:', parsedOutput.getValue().getValue().toString());
} catch (e) {
  console.error('Error parsing:', e);
}