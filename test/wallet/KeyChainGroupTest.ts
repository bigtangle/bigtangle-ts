import { Buffer } from 'buffer';
import { KeyChainGroup } from '../../src/net/bigtangle/wallet/KeyChainGroup';
import { MainNetParams } from '../../src/net/bigtangle/params/MainNetParams';
import { DeterministicKey } from '../../src/net/bigtangle/crypto/DeterministicKey';
import { KeyChain, KeyPurpose } from '../../src/net/bigtangle/wallet/KeyChain';
import { ECKey } from '../../src/net/bigtangle/core/ECKey';
import { Sha256Hash } from '../../src/net/bigtangle/core/Sha256Hash';
import { DeterministicSeed } from '../../src/net/bigtangle/wallet/DeterministicSeed';
import { MnemonicCode } from '../../src/net/bigtangle/crypto/MnemonicCode';
import { MarriedKeyChain } from '../../src/net/bigtangle/wallet/MarriedKeyChain';
import { Address } from '../../src/net/bigtangle/core/Address';
import { RedeemData } from '../../src/net/bigtangle/wallet/RedeemData';
import { KeyCrypterScrypt } from '../../src/net/bigtangle/crypto/KeyCrypterScrypt';
import { BloomFilter } from '../../src/net/bigtangle/core/BloomFilter';
import { Utils } from '../../src/net/bigtangle/utils/Utils';
import BigInteger from 'big-integer';

describe('KeyChainGroupTest', () => {
    const LOOKAHEAD_SIZE = 5;
    const PARAMS = MainNetParams.get();
    const XPUB =
        'xpub68KFnj3bqUx1s7mHejLDBPywCAKdJEu1b49uniEEn2WSbHmZ7xbLqFTjJbtx1LUcAt1DwhoqWHmo2s5WMJp6wi38CiF2hYD49qVViKVvAoi';
    let group: KeyChainGroup;
    let watchingAccountKey: DeterministicKey;

    beforeEach(() => {
        Utils.setMockClock();
        group = new KeyChainGroup(PARAMS);
        group.setLookaheadSize(LOOKAHEAD_SIZE);
        group.getActiveKeyChain();

        watchingAccountKey = DeterministicKey.deserializeB58(null, XPUB, PARAMS);
    });

    async function createMarriedKeyChainGroup(): Promise<KeyChainGroup> {
        const group = new KeyChainGroup(PARAMS);
        const chain = await createMarriedKeyChain();
        group.addAndActivateHDChain(chain);
        group.setLookaheadSize(LOOKAHEAD_SIZE);
        group.getActiveKeyChain();
        return group;
    }

    async function createMarriedKeyChain(): Promise<MarriedKeyChain> {
        const entropy = Sha256Hash.hash(
            Buffer.from("don't use a seed like this in real life"),
        );
        const seed = await DeterministicSeed.fromEntropy(
            entropy.getBytes(),
            '',
            MnemonicCode.BIP39_STANDARDISATION_TIME_SECS,
        );
        const chain = new MarriedKeyChain(PARAMS, seed);
        chain.addFollowingAccountKeys([watchingAccountKey], 2);
        return chain;
    }

    test('freshCurrentKeys', () => {
        let numKeys =
            (group.getLookaheadSize() + group.getLookaheadThreshold()) * 2 +
            1 +
            (group.getActiveKeyChain() as any).getAccountPath().length +
            2;
        expect(group.numKeys()).toBe(numKeys);
        expect(group.getBloomFilterElementCount()).toBe(2 * numKeys);
        const r1 = group.currentKey(KeyPurpose.RECEIVE_FUNDS);
        expect(group.numKeys()).toBe(numKeys);
        expect(group.getBloomFilterElementCount()).toBe(2 * numKeys);

        const i1 = new ECKey(null, null);
        group.importKeys([i1]);
        numKeys++;
        expect(group.numKeys()).toBe(numKeys);
        expect(group.getBloomFilterElementCount()).toBe(2 * numKeys);

        const r2 = group.currentKey(KeyPurpose.RECEIVE_FUNDS);
        expect(r1).toEqual(r2);
        const c1 = group.currentKey(KeyPurpose.CHANGE);
        expect(r1).not.toEqual(c1);
        const r3 = group.freshKey(KeyPurpose.RECEIVE_FUNDS);
        expect(r1).not.toEqual(r3);
        const c2 = group.freshKey(KeyPurpose.CHANGE);
        expect(r3).not.toEqual(c2);
        const r4 = group.currentKey(KeyPurpose.RECEIVE_FUNDS);
        expect(r2).toEqual(r4);
        const c3 = group.currentKey(KeyPurpose.CHANGE);
        expect(c1).toEqual(c3);
        group.markPubKeyAsUsed(r4.getPubKey());
        const r5 = group.currentKey(KeyPurpose.RECEIVE_FUNDS);
        expect(r4).not.toEqual(r5);
    });

    test('freshCurrentKeysForMarriedKeychain', async () => {
        group = await createMarriedKeyChainGroup();

        expect(() => {
            group.freshKey(KeyPurpose.RECEIVE_FUNDS);
        }).toThrow();

        expect(() => {
            group.currentKey(KeyPurpose.RECEIVE_FUNDS);
        }).toThrow();
    });

    test('imports', () => {
        const key1 = new ECKey(null, null);
        const numKeys = group.numKeys();
        expect(group.removeImportedKey(key1)).toBe(false);
        expect(group.importKeys([key1])).toBe(1);
        expect(group.numKeys()).toBe(numKeys + 1);
        group.removeImportedKey(key1);
        expect(group.numKeys()).toBe(numKeys);
    });

    test('findKey', () => {
        const a = group.freshKey(KeyPurpose.RECEIVE_FUNDS);
        const b = group.freshKey(KeyPurpose.CHANGE);
        const c = new ECKey(null, null);
        const d = new ECKey(null, null);
        group.importKeys([c]);
        expect(group.hasKey(a)).toBe(true);
        expect(group.hasKey(b)).toBe(true);
        expect(group.hasKey(c)).toBe(true);
        expect(group.hasKey(d)).toBe(false);
        let result = group.findKeyFromPubKey(a.getPubKey());
        expect(a).toEqual(result);
        result = group.findKeyFromPubKey(b.getPubKey());
        expect(b).toEqual(result);
        result = group.findKeyFromPubHash(a.getPubKeyHash());
        expect(a).toEqual(result);
        result = group.findKeyFromPubHash(b.getPubKeyHash());
        expect(b).toEqual(result);
        result = group.findKeyFromPubKey(c.getPubKey());
        expect(c).toEqual(result);
        result = group.findKeyFromPubHash(c.getPubKeyHash());
        expect(c).toEqual(result);
        expect(group.findKeyFromPubKey(d.getPubKey())).toBeNull();
        expect(group.findKeyFromPubHash(d.getPubKeyHash())).toBeNull();
    });

    test('currentP2SHAddress', async () => {
        group = await createMarriedKeyChainGroup();
        const a1 = group.currentAddress(KeyPurpose.RECEIVE_FUNDS);
        expect(a1.isP2SHAddress()).toBe(true);
        const a2 = group.currentAddress(KeyPurpose.RECEIVE_FUNDS);
        expect(a1).toEqual(a2);
        const a3 = group.currentAddress(KeyPurpose.CHANGE);
        expect(a2).not.toEqual(a3);
    });

    test('freshAddress', async () => {
        group = await createMarriedKeyChainGroup();
        const a1 = group.freshAddress(KeyPurpose.RECEIVE_FUNDS);
        const a2 = group.freshAddress(KeyPurpose.RECEIVE_FUNDS);
        expect(a1.isP2SHAddress()).toBe(true);
        expect(a1).not.toEqual(a2);
        group.getBloomFilterElementCount();
        expect(group.numKeys()).toBe(
            (group.getLookaheadSize() + group.getLookaheadThreshold()) * 2 +
                (2 - group.getLookaheadThreshold()) +
                (group.getActiveKeyChain() as any).getAccountPath().length +
                3,
        );

        const a3 = group.currentAddress(KeyPurpose.RECEIVE_FUNDS);
        expect(a2).toEqual(a3);
    });

    test('findRedeemData', async () => {
        group = await createMarriedKeyChainGroup();

        expect(group.findRedeemDataFromScriptHash(new ECKey(null, null).getPubKey())).toBeNull();

        const address = group.currentAddress(KeyPurpose.RECEIVE_FUNDS);
        const redeemData = group.findRedeemDataFromScriptHash(address.getHash160());
        expect(redeemData).not.toBeNull();
        expect(redeemData!.redeemScript).not.toBeNull();
        expect(redeemData!.keys.length).toBe(2);
    });

    test('encryptionWithoutImported', () => {
        encryption(false);
    });

    test('encryptionWithImported', () => {
        encryption(true);
    });

    function encryption(withImported: boolean) {
        Utils.rollMockClock(0);
        const now = Utils.currentTimeSeconds();
        const a = group.freshKey(KeyPurpose.RECEIVE_FUNDS);
        expect(group.getEarliestKeyCreationTime()).toBe(now);
        Utils.rollMockClock(-86400);
        const yesterday = Utils.currentTimeSeconds();
        const b = new ECKey(null, null);

        expect(group.isEncrypted()).toBe(false);
        expect(() => {
            group.checkPassword('foo');
        }).toThrow();
        if (withImported) {
            expect(group.getEarliestKeyCreationTime()).toBe(now);
            group.importKeys([b]);
            expect(group.getEarliestKeyCreationTime()).toBe(yesterday);
        }
        const scrypt = new KeyCrypterScrypt(2);
        const aesKey = scrypt.deriveKey('password');
        group.encrypt(scrypt, aesKey);
        expect(group.isEncrypted()).toBe(true);
        expect(group.checkPassword('password')).toBe(true);
        expect(group.checkPassword('wrong password')).toBe(false);
        const ea = group.findKeyFromPubKey(a.getPubKey());
        expect(ea).not.toBeNull();
        expect(ea!.isEncrypted()).toBe(true);
        if (withImported) {
            const eb = group.findKeyFromPubKey(b.getPubKey());
            expect(eb).not.toBeNull();
            expect(eb!.isEncrypted()).toBe(true);
            expect(group.getEarliestKeyCreationTime()).toBe(yesterday);
        } else {
            expect(group.getEarliestKeyCreationTime()).toBe(now);
        }
        expect(() => {
            ea!.sign(Sha256Hash.ZERO_HASH.getBytes());
        }).toThrow();
        if (withImported) {
            const c = new ECKey(null, null);
            expect(() => {
                group.importKeys([c]);
            }).toThrow();
            group.importKeysAndEncrypt([c], aesKey);
            const ec = group.findKeyFromPubKey(c.getPubKey());
            expect(ec).not.toBeNull();
            expect(() => {
                group.importKeysAndEncrypt([ec!], aesKey);
            }).toThrow();
        }

        expect(() => {
            group.decrypt(scrypt.deriveKey('WRONG PASSWORD'));
        }).toThrow();

        group.decrypt(aesKey);
        expect(group.isEncrypted()).toBe(false);
        const da = group.findKeyFromPubKey(a.getPubKey());
        expect(da).not.toBeNull();
        expect(da!.isEncrypted()).toBe(false);
        if (withImported) {
            const db = group.findKeyFromPubKey(b.getPubKey());
            expect(db).not.toBeNull();
            expect(db!.isEncrypted()).toBe(false);
            expect(group.getEarliestKeyCreationTime()).toBe(yesterday);
        } else {
            expect(group.getEarliestKeyCreationTime()).toBe(now);
        }
    }

    test('encryptionWhilstEmpty', () => {
        group = new KeyChainGroup(PARAMS);
        group.setLookaheadSize(5);
        const scrypt = new KeyCrypterScrypt(2);
        const aesKey = scrypt.deriveKey('password');
        group.encrypt(scrypt, aesKey);
        expect(group.freshKey(KeyPurpose.RECEIVE_FUNDS).isEncrypted()).toBe(
            true,
        );
        const key = group.currentKey(KeyPurpose.RECEIVE_FUNDS);
        group.decrypt(aesKey);
        const dkey = group.findKeyFromPubKey(key.getPubKey());
        expect(dkey).not.toBeNull();
        expect(dkey!.isEncrypted()).toBe(false);
    });

    test('bloom', () => {
        const key1 = group.freshKey(KeyPurpose.RECEIVE_FUNDS);
        const key2 = new ECKey(null, null);
        let filter = group.getBloomFilter(
            group.getBloomFilterElementCount(),
            0.001,
            Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
        );
        expect(filter.contains(key1.getPubKeyHash())).toBe(true);
        expect(filter.contains(key1.getPubKey())).toBe(true);
        expect(filter.contains(key2.getPubKey())).toBe(false);
        for (let i = 0; i < LOOKAHEAD_SIZE + group.getLookaheadThreshold(); i++) {
            const k = group.freshKey(KeyPurpose.RECEIVE_FUNDS);
            expect(filter.contains(k.getPubKeyHash())).toBe(true);
        }
        expect(
            filter.contains(
                group.freshKey(KeyPurpose.RECEIVE_FUNDS).getPubKey(),
            ),
        ).toBe(false);
        group.importKeys([key2]);
        filter = group.getBloomFilter(
            group.getBloomFilterElementCount(),
            0.001,
            Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
        );
        expect(filter.contains(key1.getPubKeyHash())).toBe(true);
        expect(filter.contains(key1.getPubKey())).toBe(true);
        expect(filter.contains(key2.getPubKey())).toBe(true);
    });

    test('findRedeemScriptFromPubHash', async () => {
        group = await createMarriedKeyChainGroup();
        let address = group.freshAddress(KeyPurpose.RECEIVE_FUNDS);
        expect(group.findRedeemDataFromScriptHash(address.getHash160())).not.toBeNull();
        group.getBloomFilterElementCount();
        const group2 = await createMarriedKeyChainGroup();
        group2.freshAddress(KeyPurpose.RECEIVE_FUNDS);
        group2.getBloomFilterElementCount();
        for (
            let i = 0;
            i < group.getLookaheadSize() + group.getLookaheadThreshold();
            i++
        ) {
            address = group.freshAddress(KeyPurpose.RECEIVE_FUNDS);
            expect(
                group2.findRedeemDataFromScriptHash(address.getHash160()),
            ).not.toBeNull();
        }
        expect(
            group2.findRedeemDataFromScriptHash(
                group.freshAddress(KeyPurpose.RECEIVE_FUNDS).getHash160(),
            ),
        ).toBeNull();
    });

    test('bloomFilterForMarriedChains', async () => {
        group = await createMarriedKeyChainGroup();
        const bufferSize = group.getLookaheadSize() + group.getLookaheadThreshold();
        const expected = bufferSize * 2 * 2;
        expect(group.getBloomFilterElementCount()).toBe(expected);
        const address1 = group.freshAddress(KeyPurpose.RECEIVE_FUNDS);
        expect(group.getBloomFilterElementCount()).toBe(expected);
        const filter = group.getBloomFilter(
            expected + 2,
            0.001,
            Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
        );
        expect(filter.contains(address1.getHash160())).toBe(true);

        const address2 = group.freshAddress(KeyPurpose.CHANGE);
        expect(filter.contains(address2.getHash160())).toBe(true);

        for (let i = 0; i < bufferSize - 1; i++) {
            const address = group.freshAddress(KeyPurpose.RECEIVE_FUNDS);
            expect(filter.contains(address.getHash160())).toBe(true);
        }
        expect(
            filter.contains(
                group.freshAddress(KeyPurpose.RECEIVE_FUNDS).getHash160(),
            ),
        ).toBe(false);
    });

    test('earliestKeyTime', () => {
        const now = Utils.currentTimeSeconds();
        const yesterday = now - 86400;
        expect(group.getEarliestKeyCreationTime()).toBe(now);
        Utils.rollMockClock(10000);
        group.freshKey(KeyPurpose.RECEIVE_FUNDS);
        Utils.rollMockClock(10000);
        group.freshKey(KeyPurpose.RECEIVE_FUNDS);
        expect(group.getEarliestKeyCreationTime()).toBe(now);
        const key = new ECKey(null, null);
        key.setCreationTimeSeconds(yesterday);
        group.importKeys([key]);
        expect(group.getEarliestKeyCreationTime()).toBe(yesterday);
    });

    test('constructFromSeed', () => {
        const key1 = group.freshKey(KeyPurpose.RECEIVE_FUNDS);
        const seed = group.getActiveKeyChain().getSeed();
        expect(seed).not.toBeNull();
        const group2 = new KeyChainGroup(PARAMS, seed! as any);
        group2.setLookaheadSize(5);
        const key2 = group2.freshKey(KeyPurpose.RECEIVE_FUNDS);
        expect(key1).toEqual(key2);
    });

    test('markAsUsed', () => {
        const addr1 = group.currentAddress(KeyPurpose.RECEIVE_FUNDS);
        const addr2 = group.currentAddress(KeyPurpose.RECEIVE_FUNDS);
        expect(addr1).toEqual(addr2);
        group.markPubKeyHashAsUsed(addr1.getHash160());
        const addr3 = group.currentAddress(KeyPurpose.RECEIVE_FUNDS);
        expect(addr2).not.toEqual(addr3);
    });

    test('isNotWatching', () => {
        group = new KeyChainGroup(PARAMS);
        const key = ECKey.fromPrivate(BigInteger('10'));
        group.importKeys([key]);
        expect(group.isWatching()).toBe(false);
    });

    test('isWatching', () => {
        group = new KeyChainGroup(
            PARAMS,
            DeterministicKey.deserializeB58(
                null,
                'xpub69bjfJ91ikC5ghsqsVDHNq2dRGaV2HHVx7Y9LXi27LN9BWWAXPTQr4u8U3wAtap8bLdHdkqPpAcZmhMS5SnrMQC4ccaoBccFhh315P4UYzo',
                PARAMS,
            ) as any,
        );
        const watchingKey = ECKey.fromPublic((new ECKey(null, null) as any).getPubKeyPoint());
        group.importKeys([watchingKey]);
        expect(group.isWatching()).toBe(true);
    });

    test('isWatchingNoKeys', () => {
        expect(() => {
            group = new KeyChainGroup(PARAMS);
            group.isWatching();
        }).toThrow();
    });

    test('isWatchingMixedKeys', () => {
        expect(() => {
        group = new KeyChainGroup(
            PARAMS,
            DeterministicKey.deserializeB58(
                null,
                'xpub69bjfJ91ikC5ghsqsVDHNq2dRGaV2HHVx7Y9LXi27LN9BWWAXPTQr4u8U3wAtap8bLdHdkqPpAcZmhMS5SnrMQC4ccaoBccFhh315P4UYzo',
                PARAMS,
            ) as any,
        );
            const key = ECKey.fromPrivate(new (BigInteger as any)('10'));
            group.importKeys([key]);
            group.isWatching();
        }).toThrow();
    });
});
