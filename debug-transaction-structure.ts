import { Buffer } from 'buffer';
import { MainNetParams } from './src/net/bigtangle/params/MainNetParams';
import { Transaction } from './src/net/bigtangle/core/Transaction';
import { VarInt } from './src/net/bigtangle/core/VarInt';

// Original hex from the debug output
const originalHex = '01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000';

console.log('Original hex length:', originalHex.length);
console.log('Original hex:', originalHex);

const buffer = Buffer.from(originalHex, 'hex');
console.log('Buffer length:', buffer.length);

// Manual parsing to understand the structure
let cursor = 0;

// Read version
const version = buffer.readUInt32LE(cursor);
console.log('Version:', version);
cursor += 4;

// Read number of inputs
const numInputsVarInt = VarInt.fromBuffer(buffer, cursor);
const numInputs = Number(numInputsVarInt.value);
console.log('Number of inputs:', numInputs);
console.log('VarInt bytes:', numInputsVarInt.getOriginalSizeInBytes());
cursor += numInputsVarInt.getOriginalSizeInBytes();

// Read inputs
for (let i = 0; i < numInputs && cursor < buffer.length; i++) {
    console.log(`\n--- Input ${i} ---`);
    console.log('Cursor at:', cursor);
    
    // Previous transaction hash (32 bytes)
    if (cursor + 32 > buffer.length) {
        console.log('Not enough bytes for previous tx hash');
        break;
    }
    const prevTxHash = buffer.slice(cursor, cursor + 32).reverse().toString('hex');
    console.log('Previous tx hash:', prevTxHash);
    cursor += 32;
    
    // Previous output index (4 bytes)
    if (cursor + 4 > buffer.length) {
        console.log('Not enough bytes for output index');
        break;
    }
    const outputIndex = buffer.readUInt32LE(cursor);
    console.log('Output index:', outputIndex);
    cursor += 4;
    
    // Script length (VarInt)
    if (cursor >= buffer.length) {
        console.log('Not enough bytes for script length');
        break;
    }
    const scriptLengthVarInt = VarInt.fromBuffer(buffer, cursor);
    const scriptLength = Number(scriptLengthVarInt.value);
    console.log('Script length:', scriptLength);
    console.log('Script length bytes:', scriptLengthVarInt.getOriginalSizeInBytes());
    cursor += scriptLengthVarInt.getOriginalSizeInBytes();
    
    // Script
    if (cursor + scriptLength > buffer.length) {
        console.log('Not enough bytes for script');
        break;
    }
    const script = buffer.slice(cursor, cursor + scriptLength).toString('hex');
    console.log('Script:', script);
    cursor += scriptLength;
    
    // Sequence (4 bytes)
    if (cursor + 4 > buffer.length) {
        console.log('Not enough bytes for sequence');
        break;
    }
    const sequence = buffer.readUInt32LE(cursor);
    console.log('Sequence:', sequence.toString(16));
    cursor += 4;
}

// Read number of outputs
if (cursor < buffer.length) {
    const numOutputsVarInt = VarInt.fromBuffer(buffer, cursor);
    const numOutputs = Number(numOutputsVarInt.value);
    console.log('\nNumber of outputs:', numOutputs);
    console.log('VarInt bytes:', numOutputsVarInt.getOriginalSizeInBytes());
    cursor += numOutputsVarInt.getOriginalSizeInBytes();
    
    // Read outputs
    for (let i = 0; i < numOutputs && cursor < buffer.length; i++) {
        console.log(`\n--- Output ${i} ---`);
        console.log('Cursor at:', cursor);
        
        // Value (8 bytes)
        if (cursor + 8 > buffer.length) {
            console.log('Not enough bytes for value');
            break;
        }
        const value = buffer.readBigUInt64LE(cursor);
        console.log('Value:', value.toString());
        cursor += 8;
        
        // Token ID length (VarInt)
        if (cursor >= buffer.length) {
            console.log('Not enough bytes for token ID length');
            break;
        }
        const tokenIdLengthVarInt = VarInt.fromBuffer(buffer, cursor);
        const tokenIdLength = Number(tokenIdLengthVarInt.value);
        console.log('Token ID length:', tokenIdLength);
        cursor += tokenIdLengthVarInt.getOriginalSizeInBytes();
        
        // Token ID
        if (cursor + tokenIdLength > buffer.length) {
            console.log('Not enough bytes for token ID');
            break;
        }
        const tokenId = buffer.slice(cursor, cursor + tokenIdLength).toString('hex');
        console.log('Token ID:', tokenId);
        cursor += tokenIdLength;
        
        // Script length (VarInt)
        if (cursor >= buffer.length) {
            console.log('Not enough bytes for script length');
            break;
        }
        const scriptLengthVarInt = VarInt.fromBuffer(buffer, cursor);
        const scriptLength = Number(scriptLengthVarInt.value);
        console.log('Script length:', scriptLength);
        cursor += scriptLengthVarInt.getOriginalSizeInBytes();
        
        // Script
        if (cursor + scriptLength > buffer.length) {
            console.log('Not enough bytes for script');
            break;
        }
        const script = buffer.slice(cursor, cursor + scriptLength).toString('hex');
        console.log('Script:', script);
        cursor += scriptLength;
    }
}

// Read lock time
if (cursor + 4 <= buffer.length) {
    const lockTime = buffer.readUInt32LE(cursor);
    console.log('\nLock time:', lockTime);
    cursor += 4;
}

console.log('\nRemaining bytes after standard transaction:', buffer.length - cursor);
if (cursor < buffer.length) {
    const remaining = buffer.slice(cursor);
    console.log('Remaining hex:', remaining.toString('hex'));
    
    // Try to interpret remaining as JSON
    try {
        const jsonStr = remaining.toString('utf8');
        console.log('Remaining as UTF8:', jsonStr);
        
        // Look for JSON structure
        const jsonStart = jsonStr.indexOf('{');
        if (jsonStart !== -1) {
            const jsonPart = jsonStr.substring(jsonStart);
            console.log('JSON part:', jsonPart);
            
            try {
                const parsed = JSON.parse(jsonPart);
                console.log('Parsed JSON:', parsed);
            } catch (e) {
                console.log('Could not parse as JSON:', e);
            }
        }
    } catch (e) {
        console.log('Could not interpret remaining as UTF8');
    }
}

// Now try to parse with the Transaction class
console.log('\n--- Attempting Transaction parsing ---');
try {
    const networkParams = MainNetParams.get();
    const tx = new Transaction(networkParams, buffer);
    
    console.log('Transaction parsed successfully!');
    console.log('Version:', tx.getVersion());
    console.log('Inputs:', tx.getInputs().length);
    console.log('Outputs:', tx.getOutputs().length);
    console.log('Lock time:', tx.getLockTime());
    console.log('Memo:', tx.getMemo());
    console.log('Data class name:', tx.getDataClassName());
    console.log('Data:', tx.getData()?.toString('hex'));
    console.log('Data signature:', tx.getDataSignature()?.toString('hex'));
} catch (e) {
    console.error('Transaction parsing failed:', e);
}
