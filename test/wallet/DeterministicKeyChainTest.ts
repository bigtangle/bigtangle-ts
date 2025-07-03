import { Buffer } from 'buffer';
import { DeterministicKeyChain } from '../../src/net/bigtangle/wallet/DeterministicKeyChain';
import { Sha256Hash } from '../../src/net/bigtangle/core/Sha256Hash';
import { KeyPurpose } from '../../src/net/bigtangle/wallet/KeyChain';
import { Address } from '../../src/net/bigtangle/core/Address';
import { MainNetParams } from '../../src/net/bigtangle/params/MainNetParams';
import { DeterministicKey } from '../../src/net/bigtangle/crypto/DeterministicKey';
import { ChildNumber } from '../../src/net/bigtangle/crypto/ChildNumber';
import { Utils } from '../../src/net/bigtangle/utils/Utils';
import { DeterministicSeed } from '../../src/net/bigtangle/wallet/DeterministicSeed';

describe('DeterministicKeyChainTest', () => {
    let chain: DeterministicKeyChain;
    const ENTROPY = Sha256Hash.hash(
        Buffer.from("don't use a string seed like this in real life"),
    ).bytes;

    beforeEach(() => {
        const secs = 1389353062;
        const seed = new DeterministicSeed(null, ENTROPY, null, null, secs);
        chain = new DeterministicKeyChain(MainNetParams.get(), seed);
        chain.setLookaheadSize(10);
    });

    test('derive', () => {
        const key1 = chain.getKey(KeyPurpose.RECEIVE_FUNDS);
        expect(key1.isPubKeyOnly()).toBe(false);
        const key2 = chain.getKey(KeyPurpose.RECEIVE_FUNDS);
        expect(key2.isPubKeyOnly()).toBe(false);

        const address = Address.fromBase58(
            MainNetParams.get(),
            'n1bQNoEx8uhmCzzA5JPG6sFdtsUQhwiQJV',
        );
        expect(key1.toAddress(MainNetParams.get())).toEqual(address);
        expect(key2.toAddress(MainNetParams.get()).toString()).toBe(
            'mnHUcqUVvrfi5kAaXJDQzBb9HsWs78b42R',
        );

        const hashBytes = new Uint8Array(32); // 32 zero bytes for hash simulation
        key1.sign(hashBytes);
        expect(key1.isPubKeyOnly()).toBe(false);

        const key3 = chain.getKey(KeyPurpose.CHANGE);
        expect(key3.isPubKeyOnly()).toBe(false);
        expect(key3.toAddress(MainNetParams.get()).toString()).toBe(
            'mqumHgVDqNzuXNrszBmi7A2UpmwaPMx4HQ',
        );
        key3.sign(hashBytes);
        expect(key3.isPubKeyOnly()).toBe(false);
    });

    test('random', () => {
        const random = new Uint8Array(32); // 32 random bytes
        const seed = new DeterministicSeed(null, random, null, null, Date.now() / 1000);
        chain = new DeterministicKeyChain(MainNetParams.get(), seed);
        chain.setLookaheadSize(10);
        
        const hashBytes = new Uint8Array(32); // 32 zero bytes for hash simulation
        chain.getKey(KeyPurpose.RECEIVE_FUNDS).sign(hashBytes);
        chain.getKey(KeyPurpose.CHANGE).sign(hashBytes);
    });

    test('hierarchy', () => {
        const key = chain.getKeyByPath([
            ChildNumber.ZERO_HARDENED,
            ChildNumber.ZERO,
            ChildNumber.ZERO
        ]);
        expect(key).toBeInstanceOf(DeterministicKey);
    });
});
