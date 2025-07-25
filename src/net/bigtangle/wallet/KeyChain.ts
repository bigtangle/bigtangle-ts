import { ECKey } from '../core/ECKey';
import { BloomFilter } from '../core/BloomFilter';
import * as Protos from './Protos';

export enum KeyPurpose {
    RECEIVE_FUNDS,
    CHANGE,
    REFUND,
    AUTHENTICATION,
}

/**
 * <p>A KeyChain is a class that stores a collection of keys for a {@link net.bigtangle.wallet.Wallet}. Key chains
 * are expected to be able to look up keys given a hash (i.e. address) or pubkey bytes, and provide keys on request
 * for a given purpose. They can inform event listeners about new keys being added.</p>
 *
 * <p>However it is important to understand what this interface does <i>not</i> provide. It cannot encrypt or decrypt
 * keys, for instance you need an implementor of {@link EncryptableKeyChain}. It cannot have keys imported into it,
 * that you to use a method of a specific key chain instance, such as {@link BasicKeyChain}. The reason for these
 * restrictions is to support key chains that may be handled by external hardware or software, or which are derived
 * deterministically from a seed (and thus the notion of importing a key is meaningless).</p>
 */
export interface KeyChain {
    /** Returns true if the given key is in the chain. */
    hasKey(key: ECKey): boolean;

    /** Obtains a number of key/s intended for the given purpose. The chain may create new key/s, derive, or re-use an old one. */
    getKeys(purpose: KeyPurpose, numberOfKeys: number): ECKey[];

    /** Obtains a key intended for the given purpose. The chain may create a new key, derive one, or re-use an old one. */
    getKey(purpose: KeyPurpose): ECKey;

    /** Returns a list of keys serialized to the bitcoinj protobuf format. */
    serializeToProtobuf(): Protos.Key[];

    /** Returns the number of keys this key chain manages. */
    numKeys(): number;

    /**
     * Returns the number of elements this chain wishes to insert into the Bloom filter. The size passed to
     * {@link #getFilter(int, double, long)} should be at least this large.
     */
    numBloomFilterEntries(): number;

    /**
     * <p>Returns the earliest creation time of keys in this chain, in seconds since the epoch. This can return zero
     * if at least one key does not have that data (was created before key timestamping was implemented). If there
     * are no keys in the wallet, {@link Long#MAX_VALUE} is returned.</p>
     */
    getEarliestKeyCreationTime(): number;

    /**
     * <p>Gets a bloom filter that contains all of the public keys from this chain, and which will provide the given
     * false-positive rate if it has size elements. Keep in mind that you will get 2 elements in the bloom filter for
     * each key in the key chain, for the public key and the hash of the public key (address form). For this reason
     * size should be <i>at least</i> 2x the result of {@link #numKeys()}.</p>
     *
     * <p>This is used to generate a {@link BloomFilter} which can be {@link BloomFilter#merge(BloomFilter)}d with
     * another. It could also be used if you have a specific target for the filter's size.</p>
     *
     * <p>See the docs for {@link net.bigtangle.core.BloomFilter#BloomFilter(int, double, long)} for a brief
     * explanation of anonymity when using bloom filters, and for the meaning of these parameters.</p>
     */
    getFilter(size: number, falsePositiveRate: number, tweak: number): BloomFilter;
}
