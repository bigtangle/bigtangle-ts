const { Utils } = require('./src/net/bigtangle/utils/Utils.js');
const { VarInt } = require('./src/net/bigtangle/core/VarInt.js');

// Test value: 100,000,000 satoshis (1 BTC)
const value = 100000000n;

// Convert to bytes using the same method as TransactionOutput
const valueBytes = Buffer.from(Utils.bigIntToBytes(value));
console.log("Value bytes:", valueBytes.toString('hex'));

// Serialize as done in bitcoinSerializeToStream
const valueLengthVarInt = new VarInt(valueBytes.length);
const valueLengthBytes = valueLengthVarInt.encode();
console.log("Value length VarInt:", valueLengthVarInt.value.toString());
console.log("Value length bytes:", valueLengthBytes.toString('hex'));

// Full serialized representation
const fullSerialized = Buffer.concat([valueLengthBytes, valueBytes]);
console.log("Full serialized value:", fullSerialized.toString('hex'));

// Now try with value 0
const zeroValue = 0n;
const zeroValueBytes = Buffer.from(Utils.bigIntToBytes(zeroValue));
console.log("\nZero value bytes:", zeroValueBytes.toString('hex'));

const zeroValueLengthVarInt = new VarInt(zeroValueBytes.length);
const zeroValueLengthBytes = zeroValueLengthVarInt.encode();
console.log("Zero value length VarInt:", zeroValueLengthVarInt.value.toString());
console.log("Zero value length bytes:", zeroValueLengthBytes.toString('hex'));

const zeroFullSerialized = Buffer.concat([zeroValueLengthBytes, zeroValueBytes]);
console.log("Full serialized zero value:", zeroFullSerialized.toString('hex'));
