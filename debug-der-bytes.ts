import { ECDSASignature } from './src/net/bigtangle/core/ECDSASignature';

async function debugDERBytes() {
    console.log('Debugging DER byte encoding...');
    
    // Use the exact values from the test
    const r = BigInt('0xcfd454a1215fdea463201a7a32c146c1cec54b60b12d47e118a2add41366cec6');
    const s = BigInt('0x3e7875d23cc80f958e45298bb8369d4422acfbc1c317353eebe02c89206b3e73');
    
    console.log('r (bigint):', r.toString(16));
    console.log('s (bigint):', s.toString(16));
    
    const signature = new ECDSASignature(r, s);
    const der = signature.encodeDER();
    
    console.log('DER encoded (hex):', Buffer.from(der).toString('hex'));
    console.log('DER encoded (bytes):', Array.from(der));
    console.log('DER length:', der.length);
    
    // Manual verification
    console.log('\nManual verification:');
    console.log('signature[0] (SEQUENCE tag):', '0x' + der[0].toString(16));
    console.log('signature[1] (length byte):', '0x' + der[1].toString(16), '=', der[1]);
    console.log('signature.length:', der.length);
    console.log('signature.length - 3:', der.length - 3);
    console.log('Does signature[1] === signature.length - 3?', der[1] === der.length - 3);
}

debugDERBytes().catch(console.error);