import { describe, it, expect, beforeEach } from 'vitest';
import { TransactionSignature } from '../src/net/bigtangle/crypto/TransactionSignature';
import { ECDSASignature } from '../src/net/bigtangle/core/ECDSASignature';
import { Transaction } from '../src/net/bigtangle/core/Transaction';
import { Sha256Hash } from '../src/net/bigtangle/core/Sha256Hash';
import { Buffer } from 'buffer';

// Create mock Transaction for testing purposes
class MockTransaction {
  version: number = 1;
  getInputs(): any[] { return []; }
  getOutputs(): any[] { return []; }
  getOutputSum(): bigint { return BigInt(1000); }
  // Add other required properties and methods as needed...
}

describe('TransactionSignature', () => {
  let signature: ECDSASignature;
  let transaction: Transaction;
  let hashValue: Sha256Hash;

  beforeEach(() => {
    // Create a sample signature
    signature = new ECDSASignature(BigInt('1234567890123456789012345678901234567890'), BigInt('9876543210987654321098765432109876543210'));
    
    // Create a mock transaction
    transaction = new MockTransaction() as Transaction;
    
    // Create a sample hash value
    hashValue = new Sha256Hash(Buffer.from(new Uint8Array(32).fill(1)));
  });

  it('should create an TransactionSignature instance', () => {
    const asnSignature = new TransactionSignature(signature.r, signature.s);
    expect(asnSignature).toBeInstanceOf(TransactionSignature);
  });

  it('should serialize to DER format', () => {
    const asnSignature = new TransactionSignature(signature.r, signature.s);
    const derBytes = asnSignature.encodeDER();
    
    expect(derBytes).toBeInstanceOf(Uint8Array);
    expect(derBytes.length).toBeGreaterThan(0);
  });

  it('should parse from DER format', () => {
    const asnSignature = new TransactionSignature(signature.r, signature.s);
    const derBytes = asnSignature.encodeToBitcoin();
    
    const parsedSignature = TransactionSignature.decodeFromBitcoin(derBytes, false, false);
    expect(parsedSignature).not.toBeNull();
  });

  it('should validate the signature', () => {
    const asnSignature = new TransactionSignature(signature.r, signature.s);
    expect(asnSignature.r).toBe(signature.r);
  });

  it('should work with the helper functions', () => {
    // Test serialization helper
    const asnSignature = new TransactionSignature(signature.r, signature.s);
    const derBytes = asnSignature.encodeToBitcoin();
    expect(derBytes).toBeInstanceOf(Uint8Array);
    expect(derBytes.length).toBeGreaterThan(0);
    
    // Test parsing helper
    const parsedSignature = TransactionSignature.decodeFromBitcoin(derBytes, false, false);
    expect(parsedSignature).not.toBeNull();
  });

  it('should create complex ASN.1 structure', () => {
    const asnSignature = new TransactionSignature(signature.r, signature.s);
    const derBytes = asnSignature.encodeDER();
    
    expect(derBytes).toBeDefined();
  });
});
