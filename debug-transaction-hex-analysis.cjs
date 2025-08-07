const { Buffer } = require('buffer');

// Test data from testSerial2
const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

const buffer = Buffer.from(tip, 'hex');
console.log('Total buffer length:', buffer.length);
console.log('Full hex:', buffer.toString('hex'));

// Let's look for the transaction output pattern by searching for reasonable values
console.log('\n=== Searching for Transaction Outputs ===');

// Look for the pattern: value (8 bytes) + token_id_length + token_id + script_length + script
for (let i = 81; i < buffer.length - 50; i++) {
    try {
        // Try reading 8 bytes as little-endian value
        const value = buffer.readBigUInt64LE(i);
        
        // Look for reasonable values (positive, not too large)
        if (value >= 0n && value < 1000000000000n) {
            console.log(`\nFound potential value ${value} at offset ${i}`);
            
            // Check next bytes for token_id_length
            let pos = i + 8;
            if (pos >= buffer.length) continue;
            
            let tokenLen = buffer[pos];
            let tokenLenSize = 1;
            
            if (tokenLen === 0xfd && pos + 2 < buffer.length) {
                tokenLen = buffer.readUInt16LE(pos + 1);
                tokenLenSize = 3;
            } else if (tokenLen === 0xfe && pos + 4 < buffer.length) {
                tokenLen = buffer.readUInt32LE(pos + 1);
                tokenLenSize = 5;
            } else if (tokenLen === 0xff && pos + 8 < buffer.length) {
                tokenLen = Number(buffer.readBigUInt64LE(pos + 1));
                tokenLenSize = 9;
            }
            
            pos += tokenLenSize;
            if (pos + tokenLen >= buffer.length) continue;
            
            // Check script length
            if (pos + tokenLen >= buffer.length) continue;
            let scriptPos = pos + tokenLen;
            if (scriptPos >= buffer.length) continue;
            
            let scriptLen = buffer[scriptPos];
            let scriptLenSize = 1;
            
            if (scriptLen === 0xfd && scriptPos + 2 < buffer.length) {
                scriptLen = buffer.readUInt16LE(scriptPos + 1);
                scriptLenSize = 3;
            } else if (scriptLen === 0xfe && scriptPos + 4 < buffer.length) {
                scriptLen = buffer.readUInt32LE(scriptPos + 1);
                scriptLenSize = 5;
            } else if (scriptLen === 0xff && scriptPos + 8 < buffer.length) {
                scriptLen = Number(buffer.readBigUInt64LE(scriptPos + 1));
                scriptLenSize = 9;
            }
            
            const totalSize = 8 + tokenLenSize + tokenLen + scriptLenSize + scriptLen;
            if (scriptPos + scriptLenSize + scriptLen < buffer.length) {
                console.log(`  Valid structure found!`);
                console.log(`  Token length: ${tokenLen}`);
                console.log(`  Script length: ${scriptLen}`);
                console.log(`  Total output size: ${totalSize}`);
                
                // Extract the actual output data
                const outputData = buffer.slice(i, i + totalSize);
                console.log(`  Output hex: ${outputData.toString('hex')}`);
                
                // Also extract token ID and script
                const tokenId = buffer.slice(pos, pos + tokenLen);
                const script = buffer.slice(scriptPos + scriptLenSize, scriptPos + scriptLenSize + scriptLen);
                console.log(`  Token ID: ${tokenId.toString('hex')}`);
                console.log(`  Script: ${script.toString('hex')}`);
                
                break; // Just show the first one
            }
        }
    } catch (e) {
        // Skip invalid reads
    }
}

// Let's also try to find the transaction start more systematically
console.log('\n=== Finding Transaction Start ===');
console.log('Block header (80 bytes):', buffer.slice(0, 80).toString('hex'));
console.log('Next byte (transaction count?):', buffer[80]);
console.log('Transaction starts at offset 81');

// Look at the data starting from offset 81
console.log('\n=== Data starting from offset 81 ===');
const txData = buffer.slice(81);
console.log('Transaction data length:', txData.length);
console.log('First 100 bytes:', txData.slice(0, 100).toString('hex'));

// Look for the actual transaction output pattern
console.log('\n=== Looking for specific patterns ===');
// Search for the value 100000000 (1 BTC in satoshis)
const targetValue = 100000000n;
const targetValueBuffer = Buffer.allocUnsafe(8);
targetValueBuffer.writeBigUInt64LE(targetValue);

const valuePos = txData.indexOf(targetValueBuffer);
if (valuePos !== -1) {
    console.log(`Found target value ${targetValue} at position ${valuePos} in transaction data`);
    console.log('Context:', txData.slice(Math.max(0, valuePos-10), Math.min(txData.length, valuePos+50)).toString('hex'));
}
