const { Buffer } = require('buffer');

const tip = "01000000ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f05548ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f05548170dafec26b25ed20a2c87d485de589c57fc1b32e65a37ea970feb15142b5f1a2a34856800000000ae470120000000000000000000000000cb16b4d62bdf6a05a961cf27a47355486891ebb9ee6892f8010000000100000000000000010100000001ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f055488b404ea4787ac1af3c007dc3462b9875d320ee983690b649d9c564da7a4c38d50000000049483045022100818570e724f91eb5d73b6a195c905fe7d56414cd39fef6aaba20d10f60402256022011f04e032d4bcd111218d07f32195e29f9e3dbb4ef517f91d596e248f84c08c201ffffffff0100000008016345785d8a000001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d7ab9d801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205da7d00000000";

const buffer = Buffer.from(tip, 'hex');
console.log('Buffer length:', buffer.length);

// Check what byte is at cursor 327
console.log('Byte at cursor 327:', buffer[327].toString(16));

// Check bytes around cursor 327
console.log('Bytes around cursor 327:', buffer.slice(325, 335).toString('hex'));

// Check what the byte sequence should represent
// After parsing 1 input of 161 bytes starting at cursor 166
// We should be at cursor 166 + 161 = 327
// The byte at cursor 327 should be the number of outputs
const numOutputsByte = buffer[327];
console.log('Number of outputs byte:', numOutputsByte);
console.log('Number of outputs:', numOutputsByte);

// This seems wrong - 35 outputs is too many
// Let's check if this is a VarInt
function readVarInt(buffer, offset) {
    const firstByte = buffer[offset];
    if (firstByte < 0xfd) {
        return { value: firstByte, bytesRead: 1 };
    } else if (firstByte === 0xfd) {
        return { value: buffer.readUInt16LE(offset + 1), bytesRead: 3 };
    } else if (firstByte === 0xfe) {
        return { value: buffer.readUInt32LE(offset + 1), bytesRead: 5 };
    } else {
        const high = buffer.readUInt32LE(offset + 1);
        const low = buffer.readUInt32LE(offset + 5);
        return { value: (BigInt(high) << 32n) | BigInt(low), bytesRead: 9 };
    }
}

const varIntResult = readVarInt(buffer, 327);
console.log('VarInt result at cursor 327:', varIntResult);
