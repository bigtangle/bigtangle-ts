import { ECKey } from './src/net/bigtangle/core/ECKey';
import { ECDSASignature } from './src/net/bigtangle/core/ECDSASignature';
import { Sha256Hash } from './src/net/bigtangle/core/Sha256Hash';
import { TransactionSignature } from './src/net/bigtangle/crypto/TransactionSignature';
import { SigHash } from './src/net/bigtangle/core/SigHash';

async function testDEREncoding() {
    console.log('Testing DER encoding...');
    
    // Create a test key
    const key = ECKey.createNewKey();
    console.log('Created key with private key:', key.getPrivKey().toString(16));
    
    // Sign a test message
    const message = new Uint8Array(32).fill(0x01); // All 1s
    const hash = Sha256Hash.wrap(message);
    
    const signature = await key.sign(hash.getBytes());
    console.log('Raw signature - r:', signature.r.toString(16), 's:', signature.s.toString(16));
    
    // Test DER encoding
    const derEncoded = signature.encodeToDER();
    console.log('DER encoded (hex):', Buffer.from(derEncoded).toString('hex'));
    console.log('DER encoded (bytes):', Array.from(derEncoded));
    
    // Test decoding
    const decodedSig = ECDSASignature.decodeDER(Buffer.from(derEncoded));
    console.log('Decoded signature - r:', decodedSig.r.toString(16), 's:', decodedSig.s.toString(16));
    
    // Check if original and decoded match
    console.log('R matches:', signature.r === decodedSig.r);
    console.log('S matches:', signature.s === decodedSig.s);
    
    // Test canonicalization
    console.log('Is canonical?', signature.isCanonical());
    const canonical = signature.toCanonicalised();
    console.log('Canonical signature - r:', canonical.r.toString(16), 's:', canonical.s.toString(16));
    console.log('Is canonical now?', canonical.isCanonical());
    
    // Test TransactionSignature
    const txSig = new TransactionSignature(signature, SigHash.ALL, false);
    console.log('Transaction signature DER + sighash (hex):', Buffer.from(txSig.encodeToBitcoin()).toString('hex'));
    
    // Test canonical TransactionSignature
    const canonicalTxSig = txSig.toCanonicalised();
    console.log('Canonical transaction signature DER + sighash (hex):', Buffer.from(canonicalTxSig.encodeToBitcoin()).toString('hex'));
    
    // Test validation
    const txSigBytes = txSig.encodeToBitcoin();
    console.log('Is encoding canonical?', TransactionSignature.isEncodingCanonical(txSigBytes));
    
    const canonicalTxSigBytes = canonicalTxSig.encodeToBitcoin();
    console.log('Is canonical encoding canonical?', TransactionSignature.isEncodingCanonical(canonicalTxSigBytes));
    
    console.log('Test completed.');
}

testDEREncoding().catch(console.error);