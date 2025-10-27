import { ECKey } from './src/net/bigtangle/core/ECKey';
import { Sha256Hash } from './src/net/bigtangle/core/Sha256Hash';

async function debugECDSA() {
  console.log("Creating key with private key 10...");
  const key = ECKey.fromPrivate(BigInt(10));
  console.log("Public key:", key.getPubKey());
  console.log("Public key hex:", key.getPublicKeyAsHex());
  
  const input = new Uint8Array(32);
  input[31] = 1;
  console.log("Input hash:", input);
  
  console.log("Signing...");
  const sig = await key.sign(input);
  console.log("Signature r:", sig.r.toString(16));
  console.log("Signature s:", sig.s.toString(16));
  
  const encodedSig = sig.encodeToDER();
  console.log("Encoded signature (DER):", Buffer.from(encodedSig).toString('hex'));
  
  console.log("Verifying with original key...");
  const result = key.verify(input, encodedSig);
  console.log("Verification result:", result);
  
  // Try creating the same key from private and see if it verifies
  console.log("Creating fresh key with same private key...");
  const freshKey = ECKey.fromPrivate(BigInt(10));
  const freshResult = freshKey.verify(input, encodedSig);
  console.log("Fresh key verification result:", freshResult);
}

debugECDSA().catch(console.error);