import { BasicKeyChain } from '../../src/net/bigtangle/wallet/BasicKeyChain';
import { ECKey } from '../../src/net/bigtangle/core/ECKey';
import { BloomFilter, BloomUpdate } from '../../src/net/bigtangle/core/BloomFilter';
import { MockNetworkParameters } from '../utils/MockNetworkParameters';
import { expect } from 'vitest';
import bigInt from 'big-integer';

// Helper function to create test keys
function createTestKey(seed: number): ECKey {
    const priv = bigInt(seed);
    const pub = ECKey.publicPointFromPrivate(priv);
    const key = new ECKey(priv, pub);
    key.setCreationTimeSeconds(0);
    return key;
}


describe('BasicKeyChain', () => {
    let keyChain: BasicKeyChain;
    let key1: ECKey;
    let key2: ECKey;

    let mockNetParams: MockNetworkParameters;

    beforeEach(() => {
        mockNetParams = new MockNetworkParameters();
        keyChain = new BasicKeyChain(mockNetParams);
        key1 = createTestKey(1);
        key2 = createTestKey(2);
    });

    test('should import keys', () => {
        const count = keyChain.importKeys(key1, key2);
        expect(count).toBe(2);
        expect(keyChain.numKeys()).toBe(2);
    });

    test('should not import duplicate keys', () => {
        keyChain.importKey(key1);
        const count = keyChain.importKeys(key1);
        expect(count).toBe(0);
        expect(keyChain.numKeys()).toBe(1);
    });

    test('should find keys by public key hash', () => {
        keyChain.importKey(key1);
        const pubKeyHash = key1.getPubKeyHash();
        const foundKey = keyChain.findKeyFromPubHash(pubKeyHash);
        expect(foundKey).toEqual(key1);
    });

    test('should find keys by public key', () => {
        keyChain.importKey(key2);
        const pubKey = key2.getPubKey();
        const foundKey = keyChain.findKeyFromPubKey(pubKey);
        expect(foundKey).toEqual(key2);
    });

    test('should remove keys', () => {
        keyChain.importKeys(key1, key2);
        const removed = keyChain.removeKey(key1);
        expect(removed).toBe(true);
        expect(keyChain.numKeys()).toBe(1);
    });

    test('should get earliest key creation time', () => {
        key1.setCreationTimeSeconds(1000);
        key2.setCreationTimeSeconds(2000);
        keyChain.importKeys(key1, key2);
        
        const earliestTime = keyChain.getEarliestKeyCreationTime();
        expect(earliestTime).toBe(1000);
    });

    test('should create bloom filter', () => {
        // Spy on BloomFilter insert method
        const insertSpy = vi.spyOn(BloomFilter.prototype, 'insert');
        
        keyChain.importKeys(key1, key2);
        const tweak = 1234; // Use a number instead of Buffer
        const filter = keyChain.getFilter(100, 0.001, tweak);
        
        // Verify keys were added to the filter
        expect(insertSpy).toHaveBeenCalledWith(key1.getPubKeyHash());
        expect(insertSpy).toHaveBeenCalledWith(key2.getPubKeyHash());
    });

    test('should find keys before timestamp', () => {
        key1.setCreationTimeSeconds(1000);
        key2.setCreationTimeSeconds(2000);
        keyChain.importKeys(key1, key2);
        
        const keysBefore = keyChain.findKeysBefore(1500);
        expect(keysBefore).toContain(key1);
        expect(keysBefore).not.toContain(key2);
    });

    test('should find oldest key after timestamp', () => {
        key1.setCreationTimeSeconds(2000);
        key2.setCreationTimeSeconds(1000);
        keyChain.importKeys(key1, key2);
        
        const oldestKey = keyChain.findOldestKeyAfter(500);
        expect(oldestKey).toEqual(key2);
    });
});
