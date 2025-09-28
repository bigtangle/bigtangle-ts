import { ECKey } from '../../src/net/bigtangle/core/ECKey';
import { Sha256Hash } from '../../src/net/bigtangle/core/Sha256Hash';
import { TransactionSignature } from '../../src/net/bigtangle/crypto/TransactionSignature';
import { SigHash } from '../../src/net/bigtangle/core/SigHash';
import { Utils } from '../../src/net/bigtangle/utils/Utils';

async function testSignature() {
  // Test data from the logs
  const scriptSigHex = '483045022100cbd270d9b652ad48577ccd7d924b42063c913ef1135602b37f86c89e821cd3fa02206eb1a10d1898615121e843cdac7b43dd32248f0ebaaeccaa67199b55a554631b01';
  const scriptPubKeyHex = '2102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac';
  const hashHex = '73cd4c627a6d6a75bdd11c744e35d7cb9b214776492fe99e6fd0628c2c47c778';
  
  console.log('ScriptSig hex:', scriptSigHex);
  console.log('ScriptPubKey hex:', scriptPubKeyHex);
  console.log('Hash hex:', hashHex);
  
  // Parse the scriptSig to get the signature bytes
  const scriptSigBytes = Utils.HEX.decode(scriptSigHex);
  console.log('ScriptSig bytes length:', scriptSigBytes.length);
  
  // The first byte is the PUSHDATA opcode (0x48 = 72 bytes)
  const sigBytes = scriptSigBytes.slice(1); // Skip the PUSHDATA opcode
  console.log('Signature bytes length:', sigBytes.length);
  console.log('Signature bytes:', Utils.HEX.encode(sigBytes));
  
  // Parse the scriptPubKey to get the public key
  const scriptPubKeyBytes = Utils.HEX.decode(scriptPubKeyHex);
  console.log('ScriptPubKey bytes length:', scriptPubKeyBytes.length);
  
  // The first byte is the PUSHDATA opcode (0x21 = 33 bytes), then the public key
  const pubKeyBytes = scriptPubKeyBytes.slice(1, 34); // Get the 33-byte public key
  console.log('Public key bytes length:', pubKeyBytes.length);
  console.log('Public key bytes:', Utils.HEX.encode(pubKeyBytes));
  
  // Parse the signature
  try {
    const sig = TransactionSignature.decodeFromBitcoin(sigBytes, true, true);
    console.log('Signature parsed successfully');
    console.log('r:', sig.r.toString());
    console.log('s:', sig.s.toString());
    console.log('sighashFlags:', sig.sighashFlags);
  } catch (e) {
    console.error('Failed to parse signature:', e);
    return;
  }
  
  // Create ECKey from public key
  const pubKey = ECKey.fromPublic(pubKeyBytes);
  console.log('Public key created successfully');
  
  // Verify the signature
  const hashBytes = Utils.HEX.decode(hashHex);
  const hash = Sha256Hash.wrap(hashBytes);
  
  try {
    const isValid = pubKey.verify(hash.getBytes(), sigBytes);
    console.log('Signature verification result:', isValid);
  } catch (e) {
    console.error('Signature verification failed:', e);
  }
}

testSignature().catch(console.error);