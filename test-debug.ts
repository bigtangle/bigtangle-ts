import { Buffer } from 'buffer';
import { Utils } from './src/net/bigtangle/utils/Utils';
import { VarInt } from './src/net/bigtangle/core/VarInt';
import bigInt from 'big-integer';

// Hex data from the test
const hex = "01000000ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f05548ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f05548170dafec26b25ed20a2c87d485de589c57fc1b32e65a37ea970feb15142b5f1a2a34856800000000ae470120000000000000000000000000cb16b4d62bdf6a05a961cf27a47355486891ebb9ee6892f8010000000100000000000000010100000001ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f055488b404ea4787ac1af3c007dc3462b9875d320ee983690b649d9c564da7a4c38d50000000049483045022100818570e724f91eb5d73b6a195c905fe7d56414cd39fef6aaba20d10f60402256022011f04e032d4bcd111218d07f32195e29f9e3dbb4ef517f91d596e248f84c08c201ffffffff0100000008016345785d8a000001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d7ab9d801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";
const buffer = Buffer.from(hex, 'hex');
console.log('Buffer length:', buffer.length);

// Parse the transaction manually
let cursor = 0;

// Version (4 bytes)
const version = buffer.readUInt32LE(cursor);
console.log('Version:', version);
cursor += 4;

// Number of inputs (VarInt)
const numInputsVarInt = VarInt.fromBuffer(buffer, cursor);
const numInputs = Number(numInputsVarInt.value);
console.log('Num inputs:', numInputs, '(VarInt size:', numInputsVarInt.getOriginalSizeInBytes(), ')');
cursor += numInputsVarInt.getOriginalSizeInBytes();

// Skip inputs (for now)
for (let i = 0; i < numInputs; i++) {
  // Skip outpoint (36 bytes)
  cursor += 36;
  // Skip script (VarInt + script bytes)
  const scriptLenVarInt = VarInt.fromBuffer(buffer, cursor);
  const scriptLen = Number(scriptLenVarInt.value);
  cursor += scriptLenVarInt.getOriginalSizeInBytes() + scriptLen;
  // Skip sequence (4 bytes)
  cursor += 4;
}

console.log('Cursor after inputs:', cursor);

// Number of outputs (VarInt)
const numOutputsVarInt = VarInt.fromBuffer(buffer, cursor);
const numOutputs = Number(numOutputsVarInt.value);
console.log('Num outputs:', numOutputs, '(VarInt size:', numOutputsVarInt.getOriginalSizeInBytes(), ')');
console.log('Bytes at cursor:', buffer.slice(cursor, cursor + 10).toString('hex'));
cursor += numOutputsVarInt.getOriginalSizeInBytes();

// Parse outputs
for (let i = 0; i < numOutputs; i++) {
  console.log(`Output ${i} at cursor ${cursor}:`);
  console.log('Bytes:', buffer.slice(cursor, cursor + 50).toString('hex'));
  
  // Skip value (8 bytes) + tokenid length (VarInt) + tokenid + script length (VarInt) + script
  // This is a simplified skip, in reality we'd parse the full output structure
  cursor += 8; // value
  const tokenIdLenVarInt = VarInt.fromBuffer(buffer, cursor);
  const tokenIdLen = Number(tokenIdLenVarInt.value);
  cursor += tokenIdLenVarInt.getOriginalSizeInBytes() + tokenIdLen;
  const scriptLenVarInt = VarInt.fromBuffer(buffer, cursor);
  const scriptLen = Number(scriptLenVarInt.value);
  cursor += scriptLenVarInt.getOriginalSizeInBytes() + scriptLen;
  
  console.log(`  Parsed output ${i}, new cursor position: ${cursor}`);
}

console.log('Final cursor position:', cursor);
console.log('Buffer length:', buffer.length);
