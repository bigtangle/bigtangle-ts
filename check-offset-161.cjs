const { Buffer } = require('buffer');

// Simulate the Utils.HEX.decode functionality
const tip = "01000000ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f05548ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f05548170dafec26b25ed20a2c87d485de589c57fc1b32e65a37ea970feb15142b5f1a2a34856800000000ae470120000000000000000000000000cb16b4d62bdf6a05a961cf27a47355486891ebb9ee6892f8010000000100000000000000010100000001ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f055488b404ea4787ac1af3c007dc3462b9875d320ee983690b649d9c564da7a4c38d50000000049483045022100818570e724f91eb5d73b6a195c905fe7d56414cd39fef6aaba20d10f60402256022011f04e032d4bcd111218d07f32195e29f9e3dbb4ef517f91d596e248f84c08c201ffffffff0100000008016345785d8a000001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d7ab9d801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205da7d00000000";

// Method 1: Direct hex decode
const buffer1 = Buffer.from(tip, 'hex');
console.log('Method 1 - Buffer length:', buffer1.length);
console.log('Method 1 - Byte at position 160:', buffer1[160].toString(16));
console.log('Method 1 - Bytes around 160:', buffer1.slice(155, 165).toString('hex'));

// Method 2: Simulate Utils.HEX.decode
// Based on Base16Encoding.decodeTo method
function simulateUtilsHexDecode(hexString) {
  // Pad with leading zero if length is odd
  if (hexString.length % 2 === 1) {
    hexString = '0' + hexString;
  }
  
  const target = new Uint8Array(Math.floor(hexString.length / 2));
  let bytesWritten = 0;
  
  // This is a simplified version of the alphabet decoding
  const alphabet = '0123456789abcdef';
  const decodabet = new Array(256);
  for (let i = 0; i < alphabet.length; i++) {
    decodabet[alphabet.charCodeAt(i)] = i;
  }
  
  function decodeChar(c) {
    const code = c.toLowerCase().charCodeAt(0);
    return decodabet[code];
  }
  
  for (let i = 0; i < hexString.length; i += 2) {
    const decoded = (decodeChar(hexString.charAt(i)) << 4) | decodeChar(hexString.charAt(i + 1));
    target[bytesWritten++] = decoded;
  }
  
  return Buffer.from(target);
}

const buffer2 = simulateUtilsHexDecode(tip);
console.log('Method 2 - Buffer length:', buffer2.length);
console.log('Method 2 - Byte at position 160:', buffer2[160].toString(16));
console.log('Method 2 - Byte at position 161:', buffer2[161].toString(16));
console.log('Method 2 - Bytes around 160:', buffer2.slice(155, 165).toString('hex'));
console.log('Method 2 - Bytes around 161:', buffer2.slice(156, 166).toString('hex'));

// Check what the first few bytes are
console.log('Method 1 - First 10 bytes:', buffer1.slice(0, 10).toString('hex'));
console.log('Method 2 - First 10 bytes:', buffer2.slice(0, 10).toString('hex'));

// Check what byte 161 should be in the original hex string
const expectedByte161 = tip.substring(161*2, 161*2+2);
console.log('Expected byte at position 161 from hex string:', expectedByte161);
