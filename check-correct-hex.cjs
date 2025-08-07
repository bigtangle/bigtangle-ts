const { Buffer } = require('buffer');

// Original hex string (1065 characters - odd)
const originalTip = "01000000ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f05548ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f05548170dafec26b25ed20a2c87d485de589c57fc1b32e65a37ea970feb15142b5f1a2a34856800000000ae470120000000000000000000000000cb16b4d62bdf6a05a961cf27a47355486891ebb9ee6892f8010000000100000000000000010100000001ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f055488b404ea4787ac1af3c007dc3462b9875d320ee983690b649d9c564da7a4c38d50000000049483045022100818570e724f91eb5d73b6a195c905fe7d56414cd39fef6aaba20d10f60402256022011f04e032d4bcd111218d07f32195e29f9e3dbb4ef517f91d596e248f84c08c201ffffffff0100000008016345785d8a000001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d7ab9d801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205da7d00000000";

console.log('Original hex string length:', originalTip.length);
console.log('Is length even?', originalTip.length % 2 === 0);

// Check what byte should be at position 160 in the original hex string
const byte160Original = originalTip.substring(160*2, 160*2+2);
console.log('Byte at position 160 in original hex:', byte160Original);

// Check what byte should be at position 161 in the original hex string
const byte161Original = originalTip.substring(161*2, 161*2+2);
console.log('Byte at position 161 in original hex:', byte161Original);

// Fix: Add leading zero to make length even
const fixedTip = '0' + originalTip;
console.log('Fixed hex string length:', fixedTip.length);
console.log('Is fixed length even?', fixedTip.length % 2 === 0);

// Check what byte is at position 161 in the fixed hex string (should be the same as position 160 in original)
const byte161Fixed = fixedTip.substring(161*2, 161*2+2);
console.log('Byte at position 161 in fixed hex:', byte161Fixed);

// Decode both versions
const bufferOriginal = Buffer.from(originalTip, 'hex');
const bufferFixed = Buffer.from(fixedTip, 'hex');

console.log('Original buffer length:', bufferOriginal.length);
console.log('Fixed buffer length:', bufferFixed.length);

console.log('Original buffer byte at 160:', bufferOriginal[160].toString(16));
console.log('Fixed buffer byte at 160:', bufferFixed[160].toString(16));
console.log('Fixed buffer byte at 161:', bufferFixed[161].toString(16));

// Check first 10 bytes
console.log('Original first 10 bytes:', bufferOriginal.slice(0, 10).toString('hex'));
console.log('Fixed first 10 bytes:', bufferFixed.slice(0, 10).toString('hex'));
