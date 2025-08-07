const { Buffer } = require('buffer');

// Test data from testSerial2
const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

const buffer = Buffer.from(tip, 'hex');
console.log('Total buffer length:', buffer.length);

// Let's examine the actual bytes starting from position 312
console.log('=== Examining Actual Java Encoding ===');
let offset = 312;

// Output count
const outputCount = buffer[offset];
console.log(`Byte ${offset}: Output count = ${outputCount}`);
offset += 1;

// Now let's examine the actual encoding
console.log('\n=== Actual Java Encoding Analysis ===');

// Read value length (VarInt)
function readVarInt(buf, pos) {
    let value = 0;
    let shift = 0;
    let byte;
    let bytesRead = 0;
    
    do {
        if (pos + bytesRead >= buf.length) {
            throw new Error('Buffer overflow reading VarInt');
        }
        byte = buf[pos + bytesRead];
        value |= (byte & 0x7F) << shift;
        shift += 7;
        bytesRead++;
    } while ((byte & 0x80) !== 0 && bytesRead < 9);
    
    return { value, bytesRead };
}

try {
    // Read value length
    const valueLenInfo = readVarInt(buffer, offset);
    console.log(`Value length: ${valueLenInfo.value} (VarInt took ${valueLenInfo.bytesRead} bytes)`);
    offset += valueLenInfo.bytesRead;
    
    // Read value bytes
    if (valueLenInfo.value > 0) {
        const valueBytes = buffer.slice(offset, offset + valueLenInfo.value);
        console.log(`Value bytes: ${valueBytes.toString('hex')}`);
        
        // Convert to number
        let val = 0n;
        for (let i = 0; i < valueBytes.length; i++) {
            val = (val << 8n) | BigInt(valueBytes[i]);
        }
        console.log(`Value: ${val.toString()}`);
        offset += valueLenInfo.value;
    } else {
        console.log('Value: 0 (empty)');
    }
    
    // Read token ID length
    const tokenLenInfo = readVarInt(buffer, offset);
    console.log(`Token ID length: ${tokenLenInfo.value} (VarInt took ${tokenLenInfo.bytesRead} bytes)`);
    offset += tokenLenInfo.bytesRead;
    
    if (tokenLenInfo.value > 0) {
        const tokenBytes = buffer.slice(offset, offset + tokenLenInfo.value);
        console.log(`Token ID: ${tokenBytes.toString('hex')}`);
        offset += tokenLenInfo.value;
    } else {
        console.log('Token ID: empty');
    }
    
    // Read script length
    const scriptLenInfo = readVarInt(buffer, offset);
    console.log(`Script length: ${scriptLenInfo.value} (VarInt took ${scriptLenInfo.bytesRead} bytes)`);
    offset += scriptLenInfo.bytesRead;
    
    if (scriptLenInfo.value > 0) {
        const scriptBytes = buffer.slice(offset, offset + scriptLenInfo.value);
        console.log(`Script: ${scriptBytes.toString('hex')}`);
        offset += scriptLenInfo.value;
    } else {
        console.log('Script: empty');
    }
    
} catch (error) {
    console.error('Error parsing:', error.message);
}

// Let's also examine the bytes around the expected value
console.log('\n=== Byte-by-byte from 312 ===');
for (let i = 312; i < Math.min(312 + 50, buffer.length); i++) {
    console.log(`Byte ${i}: 0x${buffer[i].toString(16).padStart(2, '0')} (${buffer[i]})`);
}

// Let's search for the actual value 100000000 in different encodings
console.log('\n=== Search for 100000000 in different encodings ===');
const targetValue = 100000000;

// Java BigInteger encoding (minimal bytes)
function encodeJavaBigInt(value) {
    if (value === 0) return Buffer.from([0]);
    
    let val = BigInt(value);
    const bytes = [];
    
    while (val > 0n) {
        bytes.unshift(Number(val & 0xFFn));
        val = val >> 8n;
    }
    
    // Remove leading zeros
    while (bytes.length > 1 && bytes[0] === 0) {
        bytes.shift();
    }
    
    return Buffer.from(bytes);
}

const javaEncoding = encodeJavaBigInt(targetValue);
console.log('Java BigInteger encoding:', javaEncoding.toString('hex'));
console.log('Java encoding length:', javaEncoding.length);

// Find this encoding in the buffer
const hexStr = buffer.toString('hex');
const javaPos = hexStr.indexOf(javaEncoding.toString('hex'));
console.log('Java encoding found at:', javaPos);

// Let's also check the actual bytes at the expected position
console.log('\n=== Detailed byte analysis ===');
let pos = 312 + 1; // Skip output count

// Read VarInt for value length
let byte = buffer[pos];
let value = 0;
let shift = 0;
let bytesRead = 0;

do {
    byte = buffer[pos + bytesRead];
    value |= (byte & 0x7F) << shift;
    shift += 7;
    bytesRead++;
} while ((byte & 0x80) !== 0 && bytesRead < 9);

console.log(`VarInt value length: ${value} at position ${pos}`);
console.log(`VarInt bytes: ${buffer.slice(pos, pos + bytesRead).toString('hex')}`);
pos += bytesRead;

// Read the actual value bytes
const valueBytes = buffer.slice(pos, pos + value);
console.log(`Value bytes: ${valueBytes.toString('hex')}`);
console.log(`Value bytes length: ${valueBytes.length}`);

// Convert to number
let val = 0n;
for (let i = 0; i < valueBytes.length; i++) {
    val = (val << 8n) | BigInt(valueBytes[i]);
}
console.log(`Decoded value: ${val.toString()}`);
