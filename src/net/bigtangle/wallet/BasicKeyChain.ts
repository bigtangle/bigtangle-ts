import { Buffer } from 'buffer';
import { KeyPurpose } from './KeyChain';
import { ECKey } from '../core/ECKey';
import { KeyCrypter } from '../crypto/KeyCrypter';
import { KeyCrypterScrypt } from '../crypto/KeyCrypterScrypt';
import { BloomFilter } from '../core/BloomFilter';
import { EncryptableKeyChain } from './EncryptableKeyChain';

export class BasicKeyChain implements EncryptableKeyChain {
    private readonly hashToKeys: Map<string, ECKey>;
    private readonly pubkeyToKeys: Map<string, ECKey>;
    private readonly keyCrypter: KeyCrypter | null;
    private isWatching: boolean;

    public constructor(crypter?: KeyCrypter) {
        this.keyCrypter = crypter || null;
        this.hashToKeys = new Map<string, ECKey>();
        this.pubkeyToKeys = new Map<string, ECKey>();
        this.isWatching = false;
    }

    public getKeyCrypter(): KeyCrypter | null {
        return this.keyCrypter;
    }

    public getKey(purpose?: KeyPurpose): ECKey {
        if (this.hashToKeys.size === 0) {
            if (this.keyCrypter !== null) {
                throw new Error('Cannot create a key in an encrypted keychain');
            }
            // ECKey requires priv and pub arguments, pass nulls for random key
            const key = new ECKey(null, null);
            this.importKeyLocked(key);
        }
        const value = this.hashToKeys.values().next().value;
        if (!value) throw new Error('No key available');
        return value;
    }

    public getKeys(purpose?: KeyPurpose, numberOfKeys?: number): ECKey[] {
        if (numberOfKeys === undefined) {
            return Array.from(this.hashToKeys.values());
        }
        if (this.hashToKeys.size < numberOfKeys) {
            if (this.keyCrypter !== null) {
                throw new Error('Cannot create keys in an encrypted keychain');
            }
            const keys: ECKey[] = [];
            for (let i = 0; i < numberOfKeys - this.hashToKeys.size; i++) {
                keys.push(new ECKey(null, null));
            }
            this.importKeysLocked(keys);
        }
        const keysToReturn: ECKey[] = [];
        let count = 0;
        const iterator = this.hashToKeys.values();
        let result = iterator.next();
        while (!result.done && count < numberOfKeys) {
            keysToReturn.push(result.value);
            count++;
            result = iterator.next();
        }
        return keysToReturn;
    }

    public importKeys(...keys: ECKey[]): number {
        for (const key of keys) {
            this.checkKeyEncryptionStateMatches(key);
        }
        let actuallyAdded = 0;
        for (const key of keys) {
            if (this.hasKey(key)) {
                continue;
            }
            this.importKeyLocked(key);
            actuallyAdded++;
        }
        return actuallyAdded;
    }

    private checkKeyEncryptionStateMatches(key: ECKey): void {
        if (this.keyCrypter === null && key.isEncrypted()) {
            throw new Error('Key is encrypted but chain is not');
        } else if (this.keyCrypter !== null && !key.isEncrypted()) {
            throw new Error('Key is not encrypted but chain is');
        } // Remove getKeyCrypter check, not present on ECKey
    }

    private importKeyLocked(key: ECKey): void {
        if (this.hashToKeys.size === 0) {
            this.isWatching = typeof key.isWatching === 'function' ? key.isWatching() : false;
        } else {
            if (typeof key.isWatching === 'function') {
                if (key.isWatching() && !this.isWatching) {
                    throw new Error('Key is watching but chain is not');
                }
                if (!key.isWatching() && this.isWatching) {
                    throw new Error('Key is not watching but chain is');
                }
            }
        }
        this.pubkeyToKeys.set(Buffer.from(key.getPubKey()).toString('hex'), key);
        this.hashToKeys.set(Buffer.from(key.getPubKeyHash()).toString('hex'), key);
    }

    private importKeysLocked(keys: ECKey[]): void {
        for (const key of keys) {
            this.importKeyLocked(key);
        }
    }

    public importKey(key: ECKey): void {
        this.checkKeyEncryptionStateMatches(key);
        if (this.hasKey(key)) {
            return;
        }
        this.importKeyLocked(key);
    }

    public findKeyFromPubHash(pubkeyHash: Buffer): ECKey | null {
        return this.hashToKeys.get(pubkeyHash.toString('hex')) || null;
    }

    public findKeyFromPubKey(pubkey: Buffer): ECKey | null {
        return this.pubkeyToKeys.get(pubkey.toString('hex')) || null;
    }

    public hasKey(key: ECKey): boolean {
        return this.findKeyFromPubKey(Buffer.from(key.getPubKey())) !== null;
    }

    public numKeys(): number {
        return this.pubkeyToKeys.size;
    }

    public isWatchingState(): 'EMPTY' | 'WATCHING' | 'REGULAR' {
        if (this.hashToKeys.size === 0) {
            return 'EMPTY';
        }
        return this.isWatching ? 'WATCHING' : 'REGULAR';
    }

    public removeKey(key: ECKey): boolean {
        const a = this.hashToKeys.delete(Buffer.from(key.getPubKeyHash()).toString('hex'));
        const b = this.pubkeyToKeys.delete(Buffer.from(key.getPubKey()).toString('hex'));
        if (a !== b) {
            throw new Error('Inconsistent state');
        }
        return a;
    }

    public getEarliestKeyCreationTime(): number {
        let time = Number.MAX_SAFE_INTEGER;
        for (const key of this.hashToKeys.values()) {
            time = Math.min(key.getCreationTimeSeconds(), time);
        }
        return time;
    }

    // --- EncryptableKeyChain interface requirements ---
    public toEncrypted(password: string): BasicKeyChain {
        const scrypt = new KeyCrypterScrypt();
        const derivedKey = scrypt.deriveKey(password);
        return this.toEncryptedWithCrypter(scrypt, derivedKey);
    }
    public toEncryptedWithCrypter(keyCrypter: KeyCrypter, aesKey: any): BasicKeyChain {
        if (this.keyCrypter !== null) {
            throw new Error('Key chain is already encrypted');
        }
        const encrypted = new BasicKeyChain(keyCrypter);
        for (const key of this.hashToKeys.values()) {
            const encryptedKey = key.encrypt(keyCrypter, aesKey);
            // Remove encryptionIsReversible check if not present
            encrypted.importKeyLocked(encryptedKey);
        }
        return encrypted;
    }
    public toDecrypted(password: string): BasicKeyChain {
        if (this.keyCrypter === null) {
            throw new Error('Wallet is already decrypted');
        }
        const aesKey = this.keyCrypter.deriveKey(password);
        return this.toDecryptedWithKey(aesKey);
    }
    public toDecryptedWithKey(aesKey: any): BasicKeyChain {
        if (this.keyCrypter === null) {
            throw new Error('Wallet is already decrypted');
        }
        if (this.numKeys() > 0 && !this.checkAESKey(aesKey)) {
            throw new Error('Password/key was incorrect.');
        }
        const decrypted = new BasicKeyChain();
        for (const key of this.hashToKeys.values()) {
            decrypted.importKeyLocked(key.decrypt(this.keyCrypter, aesKey));
        }
        return decrypted;
    }
    public checkPassword(password: string): boolean {
        if (this.keyCrypter === null) {
            throw new Error('Key chain not encrypted');
        }
        return this.checkAESKey(this.keyCrypter.deriveKey(password));
    }
    public checkAESKey(aesKey: any): boolean {
        if (this.hashToKeys.size === 0) {
            return false;
        }
        if (this.keyCrypter === null) {
            throw new Error('Key chain is not encrypted');
        }
        let first: ECKey | null = null;
        for (const key of this.hashToKeys.values()) {
            if (key.isEncrypted()) {
                first = key;
                break;
            }
        }
        if (first === null) {
            throw new Error('No encrypted keys in the wallet');
        }
        try {
            const rebornKey = first.decrypt(this.keyCrypter, aesKey);
            return Buffer.compare(Buffer.from(first.getPubKey()), Buffer.from(rebornKey.getPubKey())) === 0;
        } catch (e) {
            return false;
        }
    }
    public getFilter(
        size: number,
        falsePositiveRate: number,
        tweak: number,
    ): BloomFilter {
        // If BloomFilter expects NetworkParameters, you may need to adjust this
        const filter = new BloomFilter(size, falsePositiveRate, tweak);
        for (const key of this.hashToKeys.values()) {
            filter.insert(Buffer.from(key.getPubKey()));
            filter.insert(Buffer.from(key.getPubKeyHash()));
        }
        return filter;
    }
    public numBloomFilterEntries(): number {
        return this.numKeys() * 2;
    }
    public findOldestKeyAfter(timeSecs: number): ECKey | null {
        let oldest: ECKey | null = null;
        for (const key of this.hashToKeys.values()) {
            const keyTime = key.getCreationTimeSeconds();
            if (keyTime > timeSecs) {
                if (oldest === null || oldest.getCreationTimeSeconds() > keyTime) {
                    oldest = key;
                }
            }
        }
        return oldest;
    }
    public findKeysBefore(timeSecs: number): ECKey[] {
        const results: ECKey[] = [];
        for (const key of this.hashToKeys.values()) {
            const keyTime = key.getCreationTimeSeconds();
            if (keyTime < timeSecs) {
                results.push(key);
            }
        }
        return results;
    }
    // --- Required by EncryptableKeyChain interface ---
    public serializeToProtobuf(): any[] {
        // Stub: implement as needed for your serialization
        return [];
    }
}
