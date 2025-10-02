import { ECDSASignature } from './src/net/bigtangle/core/ECDSASignature';

function debugDERStructure() {
    console.log('=== DER Structure Debug ===');
    
    // Use the exact values from the test
    const r = BigInt('0xcfd454a1215fdea463201a7a32c146c1cec54b60b12d47e118a2add41366cec6');
    const s = BigInt('0x3e7875d23cc80f958e45298bb8369d4422acfbc1c317353eebe02c89206b3e73');
    
    console.log('Original r:', r.toString(16));
    console.log('Original s:', s.toString(16));
    
    const signature = new ECDSASignature(r, s);
    
    // Test toDERInteger individually
    console.log('\n--- Individual DER INTEGERs ---');
    
    // Manually create r INTEGER
    let rHex = r.toString(16);
    if (rHex.length % 2 !== 0) rHex = '0' + rHex;
    let rBytes = Buffer.from(rHex, 'hex');
    console.log('rBytes before DER processing (hex):', rBytes.toString('hex'));
    console.log('rBytes before DER processing (length):', rBytes.length);
    console.log('rBytes[0]:', rBytes[0], 'MSB set?', (rBytes[0] & 0x80) !== 0);
    
    if (rBytes[0] & 0x80) {
        rBytes = Buffer.concat([Buffer.from([0x00]), rBytes]);
        console.log('Added leading zero for r');
    }
    
    const rDERLength = 1 + 1 + rBytes.length; // TAG + LENGTH + VALUE
    console.log('r INTEGER DER length:', rDERLength);
    
    // Manually create s INTEGER
    let sHex = s.toString(16);
    if (sHex.length % 2 !== 0) sHex = '0' + sHex;
    let sBytes = Buffer.from(sHex, 'hex');
    console.log('sBytes before DER processing (hex):', sBytes.toString('hex'));
    console.log('sBytes before DER processing (length):', sBytes.length);
    console.log('sBytes[0]:', sBytes[0], 'MSB set?', (sBytes[0] & 0x80) !== 0);
    
    if (sBytes[0] & 0x80) {
        sBytes = Buffer.concat([Buffer.from([0x00]), sBytes]);
        console.log('Added leading zero for s');
    }
    
    const sDERLength = 1 + 1 + sBytes.length; // TAG + LENGTH + VALUE
    console.log('s INTEGER DER length:', sDERLength);
    
    // Total content length
    const totalDERContentLength = rDERLength + sDERLength;
    console.log('Total DER content length:', totalDERContentLength);
    
    // Generate using actual method
    console.log('\n--- Actual method results ---');
    const der = signature.encodeDER();
    console.log('Full DER signature (hex):', Buffer.from(der).toString('hex'));
    console.log('Full DER signature (length):', der.length);
    console.log('signature[0] (SEQUENCE):', der[0]);
    console.log('signature[1] (length byte):', der[1]);
    console.log('Expected length byte:', totalDERContentLength);
    console.log('Match?', der[1] === totalDERContentLength);
}

debugDERStructure();