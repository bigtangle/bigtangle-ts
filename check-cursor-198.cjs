const { Buffer } = require('buffer');

const tip = "01000000ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f05548ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f05548170dafec26b25ed20a2c87d485de589c57fc1b32e65a37ea970feb15142b5f1a2a34856800000000ae470120000000000000000000000000cb16b4d62bdf6a05a961cf27a47355486891ebb9ee6892f8010000000100000000000000010100000001ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f055488b404ea4787ac1af3c007dc3462b9875d320ee983690b649d9c564da7a4c38d50000000049483045022100818570e724f91eb5d73b6a195c905fe7d56414cd39fef6aaba20d10f60402256022011f04e032d4bcd111218d07f32195e29f9e3dbb4ef517f91d596e248f84c08c201ffffffff0100000008016345785d8a000001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d7ab9d801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205da7d00000000";

const buffer = Buffer.from(tip, 'hex');
console.log('Buffer length:', buffer.length);

// Check what bytes are at cursor 198-202
console.log('Bytes at cursor 198-202:', buffer.slice(198, 202).toString('hex'));

// Read as little-endian 32-bit integer
const index = buffer.readUInt32LE(198);
console.log('Index as little-endian 32-bit integer:', index);

// Check what the bytes should represent
// 8b404ea4 in little-endian is a44e408b in big-endian
// a44e408b in decimal is 2756591755
console.log('This matches the parsed index:', index === 2756591755);

// This index seems very large. Let's check if it's correct.
// In Bitcoin, the index is usually a small number indicating which output of the previous transaction is being spent.
// An index of 2756591755 seems wrong.

// Let's check what bytes are at cursor 166-198 (txHash)
console.log('txHash bytes at cursor 166-198:', buffer.slice(166, 198).toString('hex'));

// This should be: ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f05548
console.log('Matches expected txHash:', buffer.slice(166, 198).toString('hex') === 'ae579cc5d5854d46e38495665fefad8b2dc110a083abcf7dae970bed19f05548');
