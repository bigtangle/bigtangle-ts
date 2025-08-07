const { Buffer } = require('buffer');

// Test data from testSerial2
const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

const buffer = Buffer.from(tip, 'hex');
console.log('Total buffer length:', buffer.length);

// Parse block structure
let offset = 0;

// Block header (80 bytes)
console.log('\n=== Block Header ===');
console.log('Magic:', buffer.readUInt32LE(offset)); offset += 4;
console.log('Block size:', buffer.readUInt32LE(offset)); offset += 4;
console.log('Version:', buffer.readUInt32LE(offset)); offset += 4;
console.log('Previous block hash:', buffer.slice(offset, offset + 32).toString('hex')); offset += 32;
console.log('Merkle root:', buffer.slice(offset, offset + 32).toString('hex')); offset += 32;
console.log('Timestamp:', buffer.readUInt32LE(offset)); offset += 4;
console.log('Bits:', buffer.readUInt32LE(offset)); offset += 4;
console.log('Nonce:', buffer.readUInt32LE(offset)); offset += 4;

// Transaction count (VarInt)
console.log('\n=== Transaction Count ===');
const txCountByte = buffer[offset];
console.log('Transaction count byte:', txCountByte.toString(16), 'at offset', offset);
if (txCountByte < 0xfd) {
    console.log('Transaction count:', txCountByte);
    offset += 1;
} else {
    console.log('Extended transaction count - need to parse VarInt');
}

console.log('Current offset after header:', offset);

// Now let's examine the transaction data
console.log('\n=== Transaction Data ===');
console.log('Transaction data starting at offset', offset);
console.log('Next 100 bytes:', buffer.slice(offset, offset + 100).toString('hex'));

// Look for transaction output data
// Skip transaction structure to find outputs
console.log('\n=== Looking for outputs ===');

// Transaction structure:
// - version (4 bytes)
// - input count (VarInt)
// - inputs...
// - output count (VarInt)
// - outputs...

let txOffset = offset;
console.log('Transaction version:', buffer.readUInt32LE(txOffset)); txOffset += 4;

// Input count
const inputCountByte = buffer[txOffset];
console.log('Input count byte:', inputCountByte.toString(16));
if (inputCountByte === 1) {
    txOffset += 1;
    console.log('Input count: 1');
} else {
    console.log('Need to parse VarInt for input count');
}

// Skip first input (should be around 41 bytes for coinbase)
console.log('First input data:', buffer.slice(txOffset, txOffset + 50).toString('hex'));
txOffset += 41; // Approximate skip for coinbase input

// Output count
const outputCountByte = buffer[txOffset];
console.log('Output count byte:', outputCountByte.toString(16), 'at offset', txOffset);
if (outputCountByte === 1) {
    txOffset += 1;
    console.log('Output count: 1');
} else {
    console.log('Need to parse VarInt for output count');
}

console.log('Output data starting at offset', txOffset);
console.log('Next 100 bytes of output:', buffer.slice(txOffset, txOffset + 100).toString('hex'));

// Now examine the output structure
console.log('\n=== Output Structure Analysis ===');
let outOffset = txOffset;

// Value (should be 8 bytes for satoshi amount)
const valueBytes = buffer.slice(outOffset, outOffset + 8);
console.log('Value bytes (8 bytes):', valueBytes.toString('hex'));
console.log('Value as LE uint64:', valueBytes.readBigUInt64LE(0).toString());
outOffset += 8;

// Script length (VarInt)
const scriptLenByte = buffer[outOffset];
console.log('Script length byte:', scriptLenByte.toString(16), 'at offset', outOffset);
if (scriptLenByte < 0xfd) {
    console.log('Script length:', scriptLenByte);
    outOffset += 1 + scriptLenByte;
} else {
    console.log('Extended script length - need to parse VarInt');
}

console.log('Remaining bytes after output:', buffer.length - outOffset);
console.log('Remaining data:', buffer.slice(outOffset).toString('hex'));
