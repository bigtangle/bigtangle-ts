import { MainNetParams } from './src/net/bigtangle/params/MainNetParams.js';
import { TransactionOutPoint } from './src/net/bigtangle/core/TransactionOutPoint.js';
import { Sha256Hash } from './src/net/bigtangle/core/Sha256Hash.js';
import { UnsafeByteArrayOutputStream } from './src/net/bigtangle/core/UnsafeByteArrayOutputStream.js';

// Create a TransactionOutPoint with zero hashes and index 1
const params = MainNetParams.get();
const outpoint = new TransactionOutPoint(
  params,
  1, // index
  Sha256Hash.ZERO_HASH, // blockHash
  Sha256Hash.ZERO_HASH  // txHash
);

// Serialize it
const stream = new UnsafeByteArrayOutputStream();
outpoint.bitcoinSerializeToStream(stream);
const serialized = stream.toByteArray();
console.log('Serialized length:', serialized.length);
console.log('Serialized bytes:', serialized.toString('hex'));

// Deserialize it
const deserialized = new TransactionOutPoint(params, serialized, 0);

// Check if they match
console.log('Original outpoint:');
console.log('  blockHash:', outpoint.getBlockHash()?.toString());
console.log('  txHash:', outpoint.getTxHash()?.toString());
console.log('  index:', outpoint.getIndex());

console.log('Deserialized outpoint:');
console.log('  blockHash:', deserialized.getBlockHash()?.toString());
console.log('  txHash:', deserialized.getTxHash()?.toString());
console.log('  index:', deserialized.getIndex());

// Check if they match
if (outpoint.getBlockHash()?.equals(deserialized.getBlockHash()) &&
    outpoint.getTxHash()?.equals(deserialized.getTxHash()) &&
    outpoint.getIndex() === deserialized.getIndex()) {
  console.log('SUCCESS: Serialization/deserialization matches!');
} else {
  console.log('ERROR: Serialization/deserialization does not match!');
}
