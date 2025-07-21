import { NetworkParameters } from "../params/NetworkParameters";
import { ECKey } from "../core/ECKey";
import { BloomFilter, BloomUpdate } from "../core/BloomFilter";

export class BasicKeyChain {
    private keys: Map<string, ECKey> = new Map();

    constructor(private params: NetworkParameters) {}

    public importKeys(...keys: ECKey[]): number {
        let count = 0;
        for (const key of keys) {
            const keyHex = Buffer.from(key.getPubKey()).toString('hex');
            if (!this.keys.has(keyHex)) {
                this.keys.set(keyHex, key);
                count++;
            }
        }
        return count;
    }

    public getKeys(): ECKey[] {
        return Array.from(this.keys.values());
    }

    public removeKey(key: ECKey): boolean {
        const keyHex = Buffer.from(key.getPubKey()).toString('hex');
        return this.keys.delete(keyHex);
    }

    public findKeyFromPubHash(pubKeyHash: Uint8Array): ECKey | null {
        for (const key of this.keys.values()) {
            if (Buffer.from(key.getPubKeyHash()).equals(Buffer.from(pubKeyHash))) {
                return key;
            }
        }
        return null;
    }

    public findKeyFromPubKey(pubkey: Uint8Array): ECKey | null {
        const keyHex = Buffer.from(pubkey).toString('hex');
        return this.keys.get(keyHex) || null;
    }

    public numKeys(): number {
        return this.keys.size;
    }

    public hasKey(key: ECKey): boolean {
        const keyHex = Buffer.from(key.getPubKey()).toString('hex');
        return this.keys.has(keyHex);
    }

    public numBloomFilterEntries(): number {
        return this.numKeys() * 2;
    }

    public getEarliestKeyCreationTime(): number {
        if (this.keys.size === 0) return 0;
        let earliest = Number.MAX_SAFE_INTEGER;
        for (const key of this.keys.values()) {
            earliest = Math.min(earliest, key.getCreationTimeSeconds());
        }
        return earliest;
    }

    public getFilter(elementCount: number, falsePositiveRate: number, nTweak: number): BloomFilter {
        const filter = new BloomFilter(this.params, elementCount, falsePositiveRate, nTweak, BloomUpdate.UPDATE_ALL);
        for (const key of this.keys.values()) {
            filter.insert(key.getPubKey());
            filter.insert(key.getPubKeyHash());
        }
        return filter;
    }

    public findKeysBefore(timestamp: number): ECKey[] {
        const result: ECKey[] = [];
        for (const key of this.keys.values()) {
            if (key.getCreationTimeSeconds() < timestamp) {
                result.push(key);
            }
        }
        return result;
    }

    public findOldestKeyAfter(timestamp: number): ECKey | null {
        let oldestKey: ECKey | null = null;
        for (const key of this.keys.values()) {
            if (key.getCreationTimeSeconds() >= timestamp) {
                if (!oldestKey || key.getCreationTimeSeconds() < oldestKey.getCreationTimeSeconds()) {
                    oldestKey = key;
                }
            }
        }
        return oldestKey;
    }
}
