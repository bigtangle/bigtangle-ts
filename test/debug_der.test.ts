import { ECKey } from '../src/net/bigtangle/core/ECKey';
import { ECDSASignature } from '../src/net/bigtangle/core/ECDSASignature';
import { Sha256Hash } from '../src/net/bigtangle/core/Sha256Hash';
import { describe, test } from 'vitest';

describe('Debug DER', () => {
  test('debug DER encoding', async () => {
    const privkey = BigInt("0x180cb41c7c600be951b5d3d0a7334acc7506173875834f7a6c4c786a28fcbb19");
    const key = ECKey.fromPrivate(privkey);
    const message = Sha256Hash.ZERO_HASH.getBytes();
    
    console.log("Private key:", privkey.toString(16));
    console.log("Message hash:", Buffer.from(message).toString('hex'));
    
    // Sign the message
    const signature = await key.sign(message);
    console.log("Original signature - r:", signature.r.toString(16));
    console.log("Original signature - s:", signature.s.toString(16));
    
    // Encode to DER
    const der = signature.encodeToDER();
    console.log("DER encoded:", der.toString('hex'));
    
    // Try to decode from DER
    try {
      const decoded = ECDSASignature.decodeFromDER(der);
      console.log("Decoded signature - r:", decoded.r.toString(16));
      console.log("Decoded signature - s:", decoded.s.toString(16));
      
      // Check if they match
      console.log("r matches:", signature.r === decoded.r);
      console.log("s matches:", signature.s === decoded.s);
      
      // Try verification with decoded signature
      const verifyResult = key.verify(message, decoded.encodeToDER());
      console.log("Verification with decoded signature:", verifyResult);
      
      // Try verification with original DER
      const verifyResult2 = key.verify(message, der);
      console.log("Verification with original DER:", verifyResult2);
      
    } catch (e) {
      console.error("Error decoding DER:", e);
    }
  });
});
