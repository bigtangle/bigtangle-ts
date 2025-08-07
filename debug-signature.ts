import { secp256k1 } from '@noble/curves/secp256k1';
import { ECDSASignature } from './src/net/bigtangle/core/ECDSASignature';

// Test the signature verification
console.log('Testing secp256k1.verify with ECDSASignature object');
const signature = new ECDSASignature(1n, 2n);
const sig = new secp256k1.Signature(signature.r, signature.s);
console.log('Signature object created:', sig);