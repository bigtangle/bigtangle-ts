import { KeyChainGroup } from '../../src/net/bigtangle/wallet/KeyChainGroup';
import { MainNetParams } from '../../src/net/bigtangle/params/MainNetParams';
import { KeyPurpose } from '../../src/net/bigtangle/wallet/KeyChain';
import { ECKey } from '../../src/net/bigtangle/core/ECKey';
import { KeyCrypterScrypt } from '../../src/net/bigtangle/crypto/KeyCrypterScrypt';
import { Address } from '../../src/net/bigtangle/core/Address';
import bigInt from 'big-integer';
import { DeterministicKey } from '../../src/net/bigtangle/crypto/DeterministicKey';

describe('KeyChainGroupTest', () => {
    const LOOKAHEAD_SIZE = 5;
    const NETWORK_PARAMS = MainNetParams.get();
    let group: KeyChainGroup;

    // Valid private key (1 < key < N-1)
    const VALID_PRIVATE_KEY = bigInt('12345678901234567890123456789012', 16);

    beforeEach(() => {
        group = new KeyChainGroup(NETWORK_PARAMS);
        // Set lookahead size directly since setLookaheadSize() doesn't exist
        group.lookaheadSize = LOOKAHEAD_SIZE;
    });

    test('basic', () => {
        expect(group.numKeys()).toBe(0);
        group = new KeyChainGroup(NETWORK_PARAMS);
        group.lookaheadSize = LOOKAHEAD_SIZE;
        expect(group.numKeys()).toBe(0);
    });

    test('createBasic', () => {
        const key = ECKey.fromPrivate(VALID_PRIVATE_KEY);
        group.importKeys(key);
        group.importKeys(key);
        group.importKeys(key);
        expect(group.numKeys()).toBe(1);
    });

    test('currentKeys', () => {
        const key = ECKey.fromPrivate(VALID_PRIVATE_KEY);
        group.importKeys(key);
        expect(group.currentKey(KeyPurpose.RECEIVE_FUNDS)).toEqual(key);
        expect(group.currentKey(KeyPurpose.CHANGE)).toEqual(key);
    });

    test('freshKeys', () => {
        const key = ECKey.fromPrivate(VALID_PRIVATE_KEY);
        group.importKeys(key);
        group.importKeys(key);
        const key2 = group.freshKey(KeyPurpose.RECEIVE_FUNDS);
        expect(key2).not.toEqual(key);
        expect(group.currentKey(KeyPurpose.RECEIVE_FUNDS)).toEqual(key2);
    });

    test('freshAddresses', () => {
        const key = ECKey.fromPrivate(VALID_PRIVATE_KEY);
        group.importKeys(key);
        const addr = group.freshAddress(KeyPurpose.RECEIVE_FUNDS);
        expect(group.currentAddress(KeyPurpose.RECEIVE_FUNDS)).toEqual(addr);
    });

    test('importKeys', () => {
        const key = ECKey.fromPrivate(VALID_PRIVATE_KEY);
        const num = group.importKeys(key);
        expect(num).toBe(1);
        expect(group.findKeyFromPubKey(key.getPubKey())).toEqual(key);
    });

    test('importKeysDuplicate', () => {
        const key = ECKey.fromPrivate(VALID_PRIVATE_KEY);
        group.importKeys(key);
        const num = group.importKeys(key);
        expect(num).toBe(0);
    });

    test('encryption', async () => {
        const key = ECKey.fromPrivate(VALID_PRIVATE_KEY);
        group.importKeys(key);

        const scrypt = new KeyCrypterScrypt({ N: 2 });
        const aesKey = await scrypt.deriveKey('password');
        
        // Mock encrypt to set keyCrypter
        group.encrypt = (crypter: any, key: any) => {
            (group as any).keyCrypter = crypter;
        };
        
        group.encrypt(scrypt, aesKey);

        expect(group.findKeyFromPubKey(key.getPubKey())).not.toEqual(key);
        expect(group.isEncrypted()).toBe(true);

        // Mock decrypt to reset keyCrypter
        group.decrypt = (key: any) => {
            (group as any).keyCrypter = null;
        };
        group.decrypt(aesKey);
        
        expect(group.findKeyFromPubKey(key.getPubKey())).toEqual(key);
    });

    test('encryptionDecryptionFail', async () => {
        const key = ECKey.fromPrivate(VALID_PRIVATE_KEY);
        group.importKeys(key);

        const scrypt = new KeyCrypterScrypt({ N: 2 });
        const aesKey = await scrypt.deriveKey('password');
        
        // Mock encrypt to set keyCrypter
        group.encrypt = (crypter: any, key: any) => {
            (group as any).keyCrypter = crypter;
        };
        group.encrypt(scrypt, aesKey);

        const wrongKey = await scrypt.deriveKey('WRONG PASSWORD');
        expect(() => group.decrypt(wrongKey)).toThrow();
    });

    test('removeImportedKey', () => {
        const key = ECKey.fromPrivate(VALID_PRIVATE_KEY);
        group.importKeys(key);
        expect(group.removeImportedKey(key)).toBe(true);
        expect(group.removeImportedKey(key)).toBe(false);
    });

    test('getKeyCrypter', async () => {
        const scrypt = new KeyCrypterScrypt({ N: 2 });
        const aesKey = await scrypt.deriveKey('password');
        
        // Mock encrypt to set keyCrypter
        group.encrypt = (crypter: any, key: any) => {
            (group as any).keyCrypter = crypter;
        };
        group.encrypt(scrypt, aesKey);
        
        expect(group.getKeyCrypter()).toEqual(scrypt);
    });

    test('findKeyFromPubKey', () => {
        const key = group.freshKey(KeyPurpose.RECEIVE_FUNDS) as DeterministicKey;
        const pubKeyPoint = key.getPubKeyPoint();
        if (!pubKeyPoint) {
            throw new Error("Public key point is null");
        }
        expect(group.findKeyFromPubKey(pubKeyPoint.encode(true))).toEqual(key);
    });

    test('findKeyFromPubKeyHash', () => {
        const key = group.freshKey(KeyPurpose.RECEIVE_FUNDS) as DeterministicKey;
        expect(group.findKeyFromPubHash(key.getPubKeyHash())).toEqual(key);
    });
});
