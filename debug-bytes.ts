import bigInt from 'big-integer';
import { Utils } from './src/net/bigtangle/utils/Utils';
import { Buffer } from 'buffer';

// Test how bigIntToBytes and bytesToBigInt work with zero
console.log('Testing zero value serialization:');

// Test with zero
const zeroBigInt = bigInt(0);
console.log('Zero as bigInt:', zeroBigInt.toString());

const zeroBytes = Utils.bigIntToBytes(zeroBigInt);
console.log('Zero serialized as bytes:', zeroBytes);
console.log('Zero bytes as hex:', Buffer.from(zeroBytes).toString('hex'));

const zeroBack = Utils.bytesToBigInt(zeroBytes);
console.log('Zero deserialized back:', zeroBack.toString());

// Test with empty array
try {
  const emptyBytes = new Uint8Array(0);
  console.log('Empty bytes array:', emptyBytes);
  
  const emptyBack = Utils.bytesToBigInt(emptyBytes);
  console.log('Empty bytes deserialized:', emptyBack.toString());
} catch (e) {
  console.log('Error with empty bytes:', e);
}

// Test with single zero byte
const singleZeroBytes = new Uint8Array([0]);
console.log('Single zero byte array:', singleZeroBytes);
console.log('Single zero byte as hex:', Buffer.from(singleZeroBytes).toString('hex'));

const singleZeroBack = Utils.bytesToBigInt(singleZeroBytes);
console.log('Single zero byte deserialized:', singleZeroBack.toString());