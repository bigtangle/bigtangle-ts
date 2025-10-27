import { ECKey } from './src/net/bigtangle/core/ECKey';
import { TransactionSignature } from './src/net/bigtangle/crypto/TransactionSignature';
import { ECDSASignature } from './src/net/bigtangle/core/ECDSASignature';
import { sha256 } from '@noble/hashes/sha256';
import { SigHash } from './src/net/bigtangle/core/SigHash';

async function testSignatureCompatibility() {
    console.log('Testing signature compatibility...');
    
    // Create a new key pair for testing
    const key = ECKey.createNewKey(true);
    console.log('Created new ECKey:', key.getPublicKeyAsHex());
    
    // Create a test message hash
    const message = 'Hello, this is a test message for signature verification.';
    const messageHash = sha256(new TextEncoder().encode(message));
    
    // Test basic ECKey signing
    const signature = await key.sign(messageHash);
    console.log('ECKey signature (r, s):', signature.r.toString(16), signature.s.toString(16));
    
    // Test ECDSASignature methods
    console.log('Is canonical?', signature.isCanonical());
    const canonicalSig = signature.toCanonicalised();
    console.log('Canonical signature (r, s):', canonicalSig.r.toString(16), canonicalSig.s.toString(16));
    
    // Test DER encoding/decoding
    const derEncoded = signature.encodeToDER();
    console.log('DER encoded length:', derEncoded.length, 'bytes');
    console.log('DER encoded (hex):', Buffer.from(derEncoded).toString('hex'));
    
    const decodedSig = ECDSASignature.decodeFromDER(derEncoded);
    console.log('Decoded signature matches original?', decodedSig.r === signature.r && decodedSig.s === signature.s);
    
    // Test TransactionSignature creation and encoding
    const txSignature = new TransactionSignature(signature, SigHash.ALL, false);
    console.log('TransactionSignature sighash flags:', txSignature.sighashFlags);
    
    // Test Bitcoin encoding (DER + sighash byte)
    const bitcoinEncoded = txSignature.encodeToBitcoin();
    console.log('Bitcoin encoded length:', bitcoinEncoded.length, 'bytes');
    console.log('Bitcoin encoded (hex):', Buffer.from(bitcoinEncoded).toString('hex'));
    
    // Test decoding Bitcoin format back
    const decodedTxSig = TransactionSignature.decodeFromBitcoin(bitcoinEncoded, true, true);
    console.log('Decoded TransactionSignature matches original?',
        decodedTxSig.r === txSignature.r && 
        decodedTxSig.s === txSignature.s && 
        decodedTxSig.sighashFlags === txSignature.sighashFlags);
    
    // Test transaction-specific signature method
    const txSigResult = await key.signTransactionInput(messageHash, undefined, SigHash.ALL, false);
    console.log('Transaction signature created via ECKey.signTransactionInput');
    console.log('Sighash flags:', txSigResult.sighashFlags);
    console.log('R component matches?', txSigResult.r === signature.r);
    console.log('S component matches?', txSigResult.s === signature.s);
    
    // Test signature verification
    const isVerified = key.verify(messageHash, bitcoinEncoded);
    console.log('Signature verification result:', isVerified);
    
    console.log('\nAll tests completed successfully!');
}

// Run the test
testSignatureCompatibility().catch(console.error);