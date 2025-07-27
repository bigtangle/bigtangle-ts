const { Buffer } = require('buffer');

// Hex data from the test
const hex = "01000000ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f05548ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f05548170dafec26b25ed20a2c87d485de589c57fc1b32e65a37ea970feb15142b5f1a2a34856800000000ae470120000000000000000000000000cb16b4d62bdf6a05a961cf27a47355486891ebb9ee6892f8010000000100000000000000010100000001ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f055488b404ea4787ac1af3c007dc3462b9875d320ee983690b649d9c564da7a4c38d50000000049483045022100818570e724f91eb5d73b6a195c905fe7d56414cd39fef6aaba20d10f60402256022011f04e032d4bcd111218d07f32195e29f9e3dbb4ef517f91d596e248f84c08c201ffffffff0100000008016345785d8a000001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d7ab9d801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

const buffer = Buffer.from(hex, 'hex');
console.log('Buffer length:', buffer.length);

// Parse the transaction manually
// Skip block header (161 bytes)
let cursor = 161;
console.log('Parsing transaction at cursor', cursor);

// Version (4 bytes)
const version = buffer.readUInt32LE(cursor);
console.log('Version:', version);
cursor += 4;

// Number of inputs (VarInt)
function readVarInt(buf, offset) {
  const first = buf[offset];
  if (first < 0xfd) {
    return { value: first, size: 1 };
  } else if (first === 0xfd) {
    return { value: buf.readUInt16LE(offset + 1), size: 3 };
  } else if (first === 0xfe) {
    return { value: buf.readUInt32LE(offset + 1), size: 5 };
  } else {
    // For simplicity, we'll assume it's 0xff and read as BigInt
    return { value: Number(buf.readBigUInt64LE(offset + 1)), size: 9 };
  }
}

const numInputsVarInt = readVarInt(buffer, cursor);
const numInputs = numInputsVarInt.value;
console.log('Num inputs:', numInputs, '(VarInt size:', numInputsVarInt.size, ')');
cursor += numInputsVarInt.size;

// Skip inputs (for now)
for (let i = 0; i < numInputs; i++) {
  // Skip outpoint (36 bytes)
  cursor += 36;
  // Skip script (VarInt + script bytes)
  const scriptLenVarInt = readVarInt(buffer, cursor);
  const scriptLen = scriptLenVarInt.value;
  cursor += scriptLenVarInt.size + scriptLen;
  // Skip sequence (4 bytes)
  cursor += 4;
}

console.log('Cursor after inputs:', cursor);

// Number of outputs (VarInt)
const numOutputsVarInt = readVarInt(buffer, cursor);
const numOutputs = numOutputsVarInt.value;
console.log('Num outputs:', numOutputs, '(VarInt size:', numOutputsVarInt.size, ')');
console.log('Bytes at cursor:', buffer.slice(cursor, cursor + 10).toString('hex'));
cursor += numOutputsVarInt.size;

// Parse outputs
for (let i = 0; i < numOutputs; i++) {
  console.log(`Output ${i} at cursor ${cursor}:`);
  console.log('Bytes:', buffer.slice(cursor, cursor + 50).toString('hex'));
  
  // Parse value length (VarInt)
  const valueLenVarInt = readVarInt(buffer, cursor);
  const valueLen = valueLenVarInt.value;
  console.log(`  Value length: ${valueLen} (VarInt size: ${valueLenVarInt.size})`);
  cursor += valueLenVarInt.size;
  
  // Parse value bytes
  const valueBytes = buffer.slice(cursor, cursor + valueLen);
  console.log(`  Value bytes: ${valueBytes.toString('hex')}`);
  cursor += valueLen;
  
  // Parse tokenid length (VarInt)
  const tokenIdLenVarInt = readVarInt(buffer, cursor);
  const tokenIdLen = tokenIdLenVarInt.value;
  console.log(`  TokenId length: ${tokenIdLen} (VarInt size: ${tokenIdLenVarInt.size})`);
  cursor += tokenIdLenVarInt.size;
  
  // Parse tokenid
  const tokenId = buffer.slice(cursor, cursor + tokenIdLen);
  console.log(`  TokenId: ${tokenId.toString('hex')}`);
  cursor += tokenIdLen;
  
  // Parse script length (VarInt)
  const scriptLenVarInt = readVarInt(buffer, cursor);
  const scriptLen = scriptLenVarInt.value;
  console.log(`  Script length: ${scriptLen} (VarInt size: ${scriptLenVarInt.size})`);
  cursor += scriptLenVarInt.size;
  
  // Parse script
  const script = buffer.slice(cursor, cursor + scriptLen);
  console.log(`  Script: ${script.toString('hex')}`);
  cursor += scriptLen;
  
  console.log(`  Parsed output ${i}, new cursor position: ${cursor}`);
}

console.log('Final cursor position:', cursor);
console.log('Buffer length:', buffer.length);
console.log('Remaining bytes:', buffer.length - cursor);
