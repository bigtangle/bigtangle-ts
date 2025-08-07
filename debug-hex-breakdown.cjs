const { Buffer } = require('buffer');

// Test data from testSerial2
const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

const buffer = Buffer.from(tip, 'hex');
console.log('Total buffer length:', buffer.length);

// Let's break down the hex data into sections
console.log('\n=== Hex Breakdown ===');
console.log('Full hex:', tip);
console.log('\n=== Section Analysis ===');

// Block header: 160 bytes = 320 hex chars
const blockHeaderHex = tip.substring(0, 320);
console.log('Block header (320 chars):', blockHeaderHex);

// Transaction count: 1 byte = 2 hex chars
const txCountHex = tip.substring(320, 322);
console.log('Transaction count (2 chars):', txCountHex);

// Transaction version: 4 bytes = 8 hex chars
const txVersionHex = tip.substring(322, 330);
console.log('Transaction version (8 chars):', txVersionHex);

// Input count: 1 byte = 2 hex chars
const inputCountHex = tip.substring(330, 332);
console.log('Input count (2 chars):', inputCountHex);

// Previous transaction hash: 32 bytes = 64 hex chars
const prevTxHashHex = tip.substring(332, 396);
console.log('Previous tx hash (64 chars):', prevTxHashHex);

// Output index: 4 bytes = 8 hex chars
const outputIndexHex = tip.substring(396, 404);
console.log('Output index (8 chars):', outputIndexHex);

// Script length: VarInt - let's check the next byte
const scriptLenByte = tip.substring(404, 406);
console.log('Script length byte (2 chars):', scriptLenByte);

// The script length is 0x7d = 125 bytes = 250 hex chars
const scriptHex = tip.substring(406, 406 + 250);
console.log('Script (250 chars):', scriptHex);

// Sequence: 4 bytes = 8 hex chars
const sequenceHex = tip.substring(406 + 250, 406 + 250 + 8);
console.log('Sequence (8 chars):', sequenceHex);

// Now we should be at the outputs section
let currentPos = 406 + 250 + 8;
console.log('\n=== Output Section ===');
console.log('Current position:', currentPos);

// Output count: 1 byte = 2 hex chars
const outputCountHex = tip.substring(currentPos, currentPos + 2);
console.log('Output count (2 chars):', outputCountHex);

currentPos += 2;

// Now let's look at the actual output structure
console.log('\n=== Output Structure ===');
console.log('Remaining hex from outputs:', tip.substring(currentPos));

// Let's manually parse the output
console.log('\n=== Manual Output Parsing ===');

// Value: 8 bytes = 16 hex chars (little-endian)
const valueHex = tip.substring(currentPos, currentPos + 16);
console.log('Value hex (16 chars):', valueHex);
const value = BigInt('0x' + valueHex.match(/.{2}/g).reverse().join(''));
console.log('Value:', value.toString());

currentPos += 16;

// Token ID length: VarInt - let's check next byte
const tokenIdLenByte = tip.substring(currentPos, currentPos + 2);
console.log('Token ID length byte (2 chars):', tokenIdLenByte);

// This is where the issue might be - let's see what follows
const remainingAfterTokenLen = tip.substring(currentPos + 2);
console.log('Remaining after token length:', remainingAfterTokenLen.substring(0, 100), '...');

// Let's check if there's a pattern mismatch
console.log('\n=== Pattern Analysis ===');
console.log('Looking for 0x01 (output count = 1) at position', currentPos - 2);
console.log('Looking for 0x08 (value length = 8) at position', currentPos);
console.log('Looking for 0x00 (token length = 0) at position', currentPos + 16);

// Let's check the actual bytes at these positions
const checkPos = currentPos - 2;
const bytes = buffer.slice(checkPos, checkPos + 20);
console.log('Bytes at output section:', bytes.toString('hex'));
