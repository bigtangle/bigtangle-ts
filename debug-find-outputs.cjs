const { Buffer } = require('buffer');

// Test data from testSerial2
const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

const buffer = Buffer.from(tip, 'hex');
console.log('Total buffer length:', buffer.length);

// Let's manually find the outputs section by looking for patterns
console.log('=== Manual Analysis ===');

// Let's look at the hex data around where we expect outputs to start
const hexStr = tip;

// Find the sequence bytes (0xffffffff) which should mark the end of the input
const sequencePos = hexStr.indexOf('ffffffff');
console.log('Sequence found at position:', sequencePos);

// The outputs should start right after the sequence
const outputsStart = sequencePos + 8; // +8 for 'ffffffff'
console.log('Outputs should start at position:', outputsStart);

// Let's look at the bytes starting from this position
const outputsHex = hexStr.substring(outputsStart);
console.log('Outputs hex:', outputsHex);

// Now let's manually parse from this position
let offset = outputsStart / 2; // Convert hex position to byte position

function readVarIntFromPos(pos) {
    const firstByte = parseInt(hexStr.substring(pos * 2, pos * 2 + 2), 16);
    if (firstByte < 0xfd) {
        return { value: firstByte, length: 1 };
    } else if (firstByte === 0xfd) {
        const value = parseInt(hexStr.substring(pos * 2 + 2, pos * 2 + 6), 16);
        return { value, length: 3 };
    } else if (firstByte === 0xfe) {
        const value = parseInt(hexStr.substring(pos * 2 + 2, pos * 2 + 10), 16);
        return { value, length: 5 };
    } else {
        // Handle 64-bit
        return { value: 0, length: 9 };
    }
}

// Check output count
const outputCountInfo = readVarIntFromPos(offset);
console.log('Output count:', outputCountInfo.value);

// Let's also check what the actual output structure looks like
console.log('\n=== Expected Output Structure ===');
console.log('Output count (1 byte):', hexStr.substring(offset * 2, offset * 2 + 2));

// Move past output count
offset += outputCountInfo.length;

// Value length
const valueLenInfo = readVarIntFromPos(offset);
console.log('Value length:', valueLenInfo.value);

// Move past value length
offset += valueLenInfo.length;

// Value bytes (should be 8 bytes for 64-bit value)
const valueBytes = hexStr.substring(offset * 2, offset * 2 + valueLenInfo.value * 2);
console.log('Value bytes:', valueBytes);

// Let's also check the actual TransactionOutput structure from the Java code
console.log('\n=== Java TransactionOutput Structure ===');
console.log('According to Java code, TransactionOutput has:');
console.log('- value (BigInteger) - serialized as byte[]');
console.log('- tokenid (byte[])');
console.log('- script (byte[])');

// Let's try to find the actual start of outputs by looking for the pattern
console.log('\n=== Pattern Search ===');

// Look for the pattern that should start outputs: 01 (output count) followed by 08 (value length)
for (let i = 320; i < hexStr.length - 4; i += 2) {
    const outputCountByte = hexStr.substring(i, i + 2);
    const valueLenByte = hexStr.substring(i + 2, i + 4);
    
    if (outputCountByte === '01' && valueLenByte === '08') {
        console.log('Found potential outputs start at position:', i);
        console.log('Context:', hexStr.substring(i - 10, i + 20));
        break;
    }
}

// Let's also check the actual bytes at the expected position
console.log('\n=== Byte Analysis ===');
const expectedStart = 332; // From previous calculations
console.log('Bytes at expected start:', hexStr.substring(expectedStart * 2, expectedStart * 2 + 20));
