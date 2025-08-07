const { Buffer } = require('buffer');

// Test data from BlockTest.ts - testSerial2
const tip = "01000000ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f05548ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f05548170dafec26b25ed20a2c87d485de589c57fc1b32e65a37ea970feb15142b5f1a2a34856800000000ae470120000000000000000000000000cb16b4d62bdf6a05a961cf27a47355486891ebb9ee6892f8010000000100000000000000010100000001ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f055488b404ea4787ac1af3c007dc3462b9875d320ee983690b649d9c564da7a4c38d50000000049483045022100818570e724f91eb5d73b6a195c905fe7d56414cd39fef6aaba20d10f60402256022011f04e032d4bcd111218d07f32195e29f9e3dbb4ef517f91d596e248f84c08c201ffffffff0100000008016345785d8a000001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d7ab9d801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205da7d00000000";

console.log('=== Exact Position Debug ===');

// Parse the original hex
const originalBuffer = Buffer.from(tip, 'hex');
console.log('Original buffer length:', originalBuffer.length);

// Show bytes around the problematic position
const start = 320;
const end = 340;
console.log(`\nBytes from ${start} to ${end}:`);
console.log('Hex:', originalBuffer.slice(start, end).toString('hex'));
console.log('ASCII:', originalBuffer.slice(start, end).toString('ascii'));

// Let's look at the exact sequence around where the output count should be
console.log('\n=== Detailed Analysis ===');
console.log('Byte at 326:', '0x' + originalBuffer[326].toString(16));
console.log('Byte at 327:', '0x' + originalBuffer[327].toString(16));
console.log('Byte at 328:', '0x' + originalBuffer[328].toString(16));
console.log('Byte at 329:', '0x' + originalBuffer[329].toString(16));

// Let's check what the correct position for output count should be
// Based on our manual parsing, after input should be at 327
// But byte 327 is 0x23 which is not 0x01 (output count = 1)

// Let's see if there's a discrepancy in our input size calculation
console.log('\n=== Checking Input Size ===');
let offset = 166; // Start of input
console.log('Input starts at:', offset);

// Previous tx hash (32 bytes)
console.log('Prev tx hash (32 bytes):', originalBuffer.slice(offset, offset + 32).toString('hex'));
offset += 32;

// Output index (4 bytes)
console.log('Output index (4 bytes):', originalBuffer.slice(offset, offset + 4).toString('hex'));
offset += 4;

// Script length (VarInt - 1 byte in this case)
console.log('Script length byte:', '0x' + originalBuffer[offset].toString(16));
const scriptLength = originalBuffer[offset];
offset += 1;

// Script bytes
console.log('Script bytes (' + scriptLength + ' bytes):', originalBuffer.slice(offset, offset + scriptLength).toString('hex'));
offset += scriptLength;

// Sequence (4 bytes)
console.log('Sequence (4 bytes):', originalBuffer.slice(offset, offset + 4).toString('hex'));
offset += 4;

console.log('Input should end at:', offset);

// Now check what's at this position
console.log('\n=== What\'s at the end of input ===');
console.log('Byte at position ' + offset + ':', '0x' + originalBuffer[offset].toString(16));
console.log('Next few bytes:', originalBuffer.slice(offset, offset + 10).toString('hex'));
