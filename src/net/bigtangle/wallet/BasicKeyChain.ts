import { NetworkParameters } from "../params/NetworkParameters";
import { ECKey } from "../core/ECKey";
import { Address } from "../core/Address";
import { BloomFilter, BloomUpdate } from "../core/BloomFilter";

export class BasicKeyChain {
    private keys: ECKey[] = [];

    constructor(private params: NetworkParameters) {}

    public importKeys(...keys: ECKey[]): number {
        this.keys.push(...keys);
        return keys.length;
    }

    public getKeys(): ECKey[] {
        return [...this.keys];
    }

    public removeKey(key: ECKey): boolean {
        const index = this.keys.findIndex(k => k.equals(key));
        if (index !== -1) {
            this.keys.splice(index, 1);
            return true;
        }
        return false;
    }

    public findKeyFromPubHash(pubKeyHash: Uint8Array): ECKey | null {
        return this.keys.find(key => 
            Buffer.from(key.getPubKeyHash()).equals(Buffer.from(pubKeyHash))
        ) || null;
    }

    public findKeyFromPubKey(pubkey: Uint8Array): ECKey | null {
        return this.keys.find(key => 
            Buffer.from(key.getPubKey()).equals(Buffer.from(pubkey))
        ) || null;
    }

  public numKeys(): number {
    return this.keys.length;
  }
  
  public hasKey(key: ECKey): boolean {
    return this.keys.some(k => k.equals(key));
  }
  
  public numBloomFilterEntries(): number {
    return this.keys.length;
  }

  public getEarliestKeyCreationTime(): number {
    if (this.keys.length === 0) return 0;
    return Math.min(...this.keys.map(key => key.getCreationTimeSeconds()));
  }

  public getFilter(elementCount: number, falsePositiveRate: number, nTweak: number): BloomFilter {
    const filter = new BloomFilter(this.params, elementCount, falsePositiveRate, nTweak, BloomUpdate.UPDATE_ALL);
    this.keys.forEach(key => filter.insert(key.getPubKeyHash()));
    return filter;
  }

  public findKeysBefore(timestamp: number): ECKey[] {
    return this.keys.filter(key => key.getCreationTimeSeconds() < timestamp);
  }

  public findOldestKeyAfter(timestamp: number): ECKey | null {
    const candidates = this.keys.filter(key => key.getCreationTimeSeconds() >= timestamp);
    if (candidates.length === 0) return null;
    return candidates.reduce((oldest, current) => 
      oldest.getCreationTimeSeconds() < current.getCreationTimeSeconds() ? oldest : current);
  }
}
