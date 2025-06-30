import { ECKey } from '../core/ECKey';
import { BloomFilter, BloomUpdate } from '../core/BloomFilter';
import { NetworkParameters } from '../params/NetworkParameters';

export class BasicKeyChain {
    private keys: ECKey[] = [];
    private lookaheadSize: number = 100;
    private lookaheadThreshold: number = 10;
    private bloomFilterFactory: (params: NetworkParameters, elements: number, falsePositiveRate: number, tweak: number) => BloomFilter;

    constructor(private networkParams: NetworkParameters) {
        // Default factory uses BloomFilter class
        this.bloomFilterFactory = (params, elements, falsePositiveRate, tweak) => {
            return new BloomFilter(params, elements, falsePositiveRate, tweak, BloomUpdate.UPDATE_P2PUBKEY_ONLY);
        };
    }

    // Allow setting a custom bloom filter factory for testing
    setBloomFilterFactory(factory: (params: NetworkParameters, elements: number, falsePositiveRate: number, tweak: number) => BloomFilter) {
        this.bloomFilterFactory = factory;
    }

    importKey(key: ECKey): boolean {
        if (!this.findKeyFromPubKey(key.getPubKey())) {
            this.keys.push(key);
            return true;
        }
        return false;
    }

    importKeys(...keys: ECKey[]): number {
        let count = 0;
        for (const key of keys) {
            if (this.importKey(key)) {
                count++;
            }
        }
        return count;
    }

    removeKey(key: ECKey): boolean {
        const index = this.keys.indexOf(key);
        if (index !== -1) {
            this.keys.splice(index, 1);
            return true;
        }
        return false;
    }

    findKeyFromPubHash(pubKeyHash: Uint8Array): ECKey | null {
        return this.keys.find(key => 
            Buffer.from(key.getPubKeyHash()).equals(Buffer.from(pubKeyHash))
        ) || null;
    }

    findKeyFromPubKey(pubKey: Uint8Array): ECKey | null {
        return this.keys.find(key => 
            Buffer.from(key.getPubKey()).equals(Buffer.from(pubKey))
        ) || null;
    }

    numKeys(): number {
        return this.keys.length;
    }

    getEarliestKeyCreationTime(): number {
        return Math.min(...this.keys.map(key => key.getCreationTimeSeconds()));
    }

    getFilter(elements: number, falsePositiveRate: number, tweak: number): BloomFilter {
        const filter = this.bloomFilterFactory(this.networkParams, elements, falsePositiveRate, tweak);
        for (const key of this.keys) {
            filter.insert(key.getPubKeyHash());
        }
        return filter;
    }

    findKeysBefore(timestamp: number): ECKey[] {
        return this.keys.filter(key => key.getCreationTimeSeconds() < timestamp);
    }

    findOldestKeyAfter(timestamp: number): ECKey | null {
        const candidates = this.keys
            .filter(key => key.getCreationTimeSeconds() > timestamp)
            .sort((a, b) => a.getCreationTimeSeconds() - b.getCreationTimeSeconds());
        
        return candidates.length > 0 ? candidates[0] : null;
    }

    // Additional methods from the Java implementation
    setLookaheadSize(lookaheadSize: number): void {
        this.lookaheadSize = lookaheadSize;
    }

    setLookaheadThreshold(lookaheadThreshold: number): void {
        this.lookaheadThreshold = lookaheadThreshold;
    }

    getLookaheadSize(): number {
        return this.lookaheadSize;
    }

    getLookaheadThreshold(): number {
        return this.lookaheadThreshold;
    }

    // Other methods as needed...
}
