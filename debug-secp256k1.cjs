const { secp256k1 } = require('@noble/curves/secp256k1');

// Test secp256k1.verify function directly
console.log('secp256k1.verify function:', typeof secp256k1.verify);