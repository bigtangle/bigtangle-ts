const { Buffer } = require('buffer');

// Test data from testSerial2
const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

const buffer = Buffer.from(tip, 'hex');
console.log('Total buffer length:', buffer.length);

// Let's manually parse the transaction structure correctly
console.log('\n=== Correct Transaction Parsing ===');

// Skip block header (80 bytes) and transaction count (1 byte)
let offset = 81;
console.log('Starting at offset:', offset);

// Transaction version (4 bytes, little-endian)
const version = buffer.readUInt32LE(offset);
console.log('Version:', version);
offset += 4;

// Input count (VarInt) - let's be more careful here
console.log('Byte at offset', offset, ':', buffer[offset].toString(16));
let inputCount = buffer[offset];
let inputCountSize = 1;

// The actual input count should be 1, not 52
// Let's check if this is a compact size varint
if (inputCount < 0xfd) {
    // Single byte
    console.log('Input count (single byte):', inputCount);
} else if (inputCount === 0xfd) {
    inputCount = buffer.readUInt16LE(offset + 1);
    inputCountSize = 3;
    console.log('Input count (0xfd):', inputCount);
} else if (inputCount === 0xfe) {
    inputCount = buffer.readUInt32LE(offset + 1);
    inputCountSize = 5;
    console.log('Input count (0xfe):', inputCount);
} else if (inputCount === 0xff) {
    inputCount = Number(buffer.readBigUInt64LE(offset + 1));
    inputCountSize = 9;
    console.log('Input count (0xff):', inputCount);
}

console.log('Input count:', inputCount, 'at offset', offset);
offset += inputCountSize;

// Parse inputs - but let's be more careful about bounds
console.log('\n=== Parsing Inputs ===');
let remainingBytes = buffer.length - offset;
console.log('Remaining bytes:', remainingBytes);

// Let's look at the actual data structure more carefully
console.log('\n=== Looking at actual structure ===');
console.log('Data starting at offset', offset, ':', buffer.slice(offset, offset + 50).toString('hex'));

// Let's find the actual transaction output by looking for the pattern
// The transaction should have 1 input and 1 output based on the test
console.log('\n=== Finding Transaction Output ===');

// Look for the output section by searching for the value pattern
// The output should have value = 100000000 (0x00f2052a01000000 in little-endian)
const targetValue = 100000000n;
const targetValueBuffer = Buffer.allocUnsafe(8);
targetValueBuffer.writeBigUInt64LE(targetValue);

const valuePos = buffer.indexOf(targetValueBuffer);
if (valuePos !== -1) {
    console.log(`Found target value ${targetValue} at offset ${valuePos}`);
    
    // Now let's extract the output from this position
    let outOffset = valuePos;
    
    // Value (8 bytes)
    const value = buffer.readBigUInt64LE(outOffset);
    console.log('Output value:', value.toString());
    outOffset += 8;
    
    // Token ID length
    let tokenLen = buffer[outOffset];
    let tokenLenSize = 1;
    if (tokenLen === 0xfd) {
        tokenLen = buffer.readUInt16LE(outOffset + 1);
        tokenLenSize = 3;
    } else if (tokenLen === 0xfe) {
        tokenLen = buffer.readUInt32LE(outOffset + 1);
        tokenLenSize = 5;
    } else if (tokenLen === 0xff) {
        tokenLen = Number(buffer.readBigUInt64LE(outOffset + 1));
        tokenLenSize = 9;
    }
    
    console.log('Token ID length:', tokenLen);
    outOffset += tokenLenSize;
    
    // Token ID
    const tokenId = buffer.slice(outOffset, outOffset + tokenLen);
    console.log('Token ID:', tokenId.toString('hex'));
    outOffset += tokenLen;
    
    // Script length
    let scriptLen = buffer[outOffset];
    let scriptLenSize = 1;
    if (scriptLen === 0xfd) {
        scriptLen = buffer.readUInt16LE(outOffset + 1);
        scriptLenSize = 3;
    } else if (scriptLen === 0xfe) {
        scriptLen = buffer.readUInt32LE(outOffset + 1);
        scriptLenSize = 5;
    } else if (scriptLen === 0xff) {
        scriptLen = Number(buffer.readBigUInt64LE(outOffset + 1));
        scriptLenSize = 9;
    }
    
    console.log('Script length:', scriptLen);
    outOffset += scriptLenSize;
    
    // Script
    const script = buffer.slice(outOffset, outOffset + scriptLen);
    console.log('Script:', script.toString('hex'));
    
    // Create the expected output bytes
    const outputBytes = buffer.slice(valuePos, outOffset + scriptLen);
    console.log('\n=== Expected Output Bytes ===');
    console.log('Output hex:', outputBytes.toString('hex'));
    console.log('Output length:', outputBytes.length);
    
    // Now let's extract the actual transaction bytes
    // Find the transaction start (after block header)
    const txStart = 81;
    
    // Find the transaction end by looking for locktime (4 bytes of 0)
    // Locktime is usually at the end
    let locktimePos = -1;
    for (let i = buffer.length - 4; i >= txStart; i--) {
        if (buffer.readUInt32LE(i) === 0) {
            locktimePos = i;
            break;
        }
    }
    
    if (locktimePos !== -1) {
        const txBytes = buffer.slice(txStart, locktimePos + 4);
        console.log('\n=== Transaction Bytes ===');
        console.log('Transaction hex:', txBytes.toString('hex'));
        console.log('Transaction length:', txBytes.length);
    }
} else {
    console.log('Target value not found, looking for other patterns...');
    
    // Let's manually find the transaction structure
    console.log('\n=== Manual Structure Analysis ===');
    
    // Skip block header
    let pos = 81;
    
    // Version
    const txVersion = buffer.readUInt32LE(pos);
    console.log('Transaction version:', txVersion);
    pos += 4;
    
    // Input count - should be 1
    const inputCountByte = buffer[pos];
    console.log('Input count byte:', inputCountByte);
    
    if (inputCountByte === 1) {
        pos += 1;
        
        // Previous transaction hash
        const prevHash = buffer.slice(pos, pos + 32).toString('hex');
        console.log('Previous hash:', prevHash);
        pos += 32;
        
        // Previous output index
        const prevIndex = buffer.readUInt32LE(pos);
        console.log('Previous index:', prevIndex);
        pos += 4;
        
        // Script length
        const scriptLen = buffer[pos];
        console.log('Script length:', scriptLen);
        pos += 1;
        
        // Script
        const script = buffer.slice(pos, pos + scriptLen);
        console.log('Script:', script.toString('hex'));
        pos += scriptLen;
        
        // Sequence
        const sequence = buffer.readUInt32LE(pos);
        console.log('Sequence:', sequence);
        pos += 4;
        
        // Output count
        const outputCountByte = buffer[pos];
        console.log('Output count byte:', outputCountByte);
        pos += 1;
        
        if (outputCountByte === 1) {
            // Output value
            const outputValue = buffer.readBigUInt64LE(pos);
            console.log('Output value:', outputValue.toString());
            pos += 8;
            
            // Token ID length
            const tokenLen = buffer[pos];
            console.log('Token ID length:', tokenLen);
            pos += 1;
            
            // Token ID
            const tokenId = buffer.slice(pos, pos + tokenLen);
            console.log('Token ID:', tokenId.toString('hex'));
            pos += tokenLen;
            
            // Output script length
            const outputScriptLen = buffer[pos];
            console.log('Output script length:', outputScriptLen);
            pos += 1;
            
            // Output script
            const outputScript = buffer.slice(pos, pos + outputScriptLen);
            console.log('Output script:', outputScript.toString('hex'));
            pos += outputScriptLen;
            
            // Locktime
            const locktime = buffer.readUInt32LE(pos);
            console.log('Locktime:', locktime);
            pos += 4;
            
            console.log('\n=== Transaction Bytes ===');
            const txBytes = buffer.slice(81, pos);
            console.log('Transaction hex:', txBytes.toString('hex'));
            console.log('Transaction length:', txBytes.length);
        }
    }
}
