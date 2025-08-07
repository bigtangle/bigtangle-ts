import { TestParams } from './src/net/bigtangle/params/TestParams';
import { Utils } from './src/net/bigtangle/core/Utils';
import { Buffer } from 'buffer';

const PARAMS = TestParams.get();

const tip = "01000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

const buffer = Buffer.from(Utils.HEX.decode(tip));
console.log('Total buffer length:', buffer.length);

// Let's manually parse the block structure
let cursor = 0;

// Block header (80 bytes)
console.log('Block header:', buffer.slice(0, 80).toString('hex'));
cursor = 80;

// Transaction count (VarInt)
const { VarInt } = require('./src/net/bigtangle/core/VarInt');
const varInt = VarInt.fromBuffer(buffer, cursor);
console.log('Transaction count:', varInt.value.toString());
console.log('VarInt size:', varInt.getOriginalSizeInBytes());
cursor += varInt.getOriginalSizeInBytes();

// For each transaction
console.log('Starting transaction parsing at offset:', cursor);

// Transaction version (4 bytes)
const version = buffer.readUInt32LE(cursor);
console.log('Transaction version:', version);
cursor += 4;

// Input count (VarInt)
const inputCountVarInt = VarInt.fromBuffer(buffer, cursor);
console.log('Input count:', inputCountVarInt.value.toString());
cursor += inputCountVarInt.getOriginalSizeInBytes();

// Parse first input
console.log('Parsing input at offset:', cursor);
const txHash = buffer.slice(cursor, cursor + 32).reverse().toString('hex');
console.log('Previous tx hash:', txHash);
cursor += 32;

const outputIndex = buffer.readUInt32LE(cursor);
console.log('Output index:', outputIndex);
cursor += 4;

// Script length (VarInt)
const scriptLenVarInt = VarInt.fromBuffer(buffer, cursor);
console.log('Script length:', scriptLenVarInt.value.toString());
cursor += scriptLenVarInt.getOriginalSizeInBytes();

const script = buffer.slice(cursor, cursor + Number(scriptLenVarInt.value));
console.log('Script:', script.toString('hex'));
cursor += Number(scriptLenVarInt.value);

// Sequence (4 bytes)
const sequence = buffer.readUInt32LE(cursor);
console.log('Sequence:', sequence);
cursor += 4;

// Output count (VarInt)
console.log('Current cursor position:', cursor);
console.log('Remaining bytes:', buffer.length - cursor);

if (cursor < buffer.length) {
    const outputCountVarInt = VarInt.fromBuffer(buffer, cursor);
    console.log('Output count:', outputCountVarInt.value.toString());
    console.log('This seems suspicious - 94 outputs in a small block?');
    cursor += outputCountVarInt.getOriginalSizeInBytes();
    
    // Try to parse first output
    console.log('Parsing first output at offset:', cursor);
    
    // Value length
    const valueLenVarInt = VarInt.fromBuffer(buffer, cursor);
    console.log('Value length:', valueLenVarInt.value.toString());
    cursor += valueLenVarInt.getOriginalSizeInBytes();
    
    console.log('Would need to read', valueLenVarInt.value.toString(), 'bytes for value at position', cursor);
    console.log('But only have', buffer.length - cursor, 'bytes remaining');
}
