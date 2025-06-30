import { KeyChainFactory } from './KeyChainFactory';
import { DeterministicSeed } from './DeterministicSeed';
import { KeyCrypter } from '../crypto/KeyCrypter';
import { DeterministicKeyChain } from './DeterministicKeyChain';
import { MarriedKeyChain } from './MarriedKeyChain';
import { DeterministicKey } from '../crypto/DeterministicKey';
import { UnreadableWalletException } from './UnreadableWalletException';
import { HDUtils } from '../crypto/HDUtils';
import { ChildNumber } from '../crypto/ChildNumber';
import { MainNetParams } from '../params/MainNetParams';

/**
 * Default factory for creating keychains while de-serializing.
 */
export class DefaultKeyChainFactory implements KeyChainFactory {
    public makeKeyChain(key: any, firstSubKey: any, seed: DeterministicSeed, crypter: KeyCrypter, isMarried: boolean): DeterministicKeyChain {
        let chain: DeterministicKeyChain;
        if (isMarried) {
            // Fixed constructor call to match MarriedKeyChain signature
            chain = new MarriedKeyChain({} as any, seed, crypter);
        } else {
            chain = new DeterministicKeyChain(seed);
        }
        return chain;
    }

    public makeWatchingKeyChain(key: any, firstSubKey: any, accountKey: DeterministicKey,
                                                      isFollowingKey: boolean, isMarried: boolean): DeterministicKeyChain {
        // Fixed path comparison since ACCOUNT_ZERO_PATH might not exist
        const accountPath = accountKey.getPath();
        const expectedPath = [
            new ChildNumber(44 | 0x80000000),
            new ChildNumber(0 | 0x80000000),
            new ChildNumber(0 | 0x80000000)
        ];
        
        // Compare each ChildNumber in the path
        if (!(accountPath.length === expectedPath.length && 
              accountPath.every((val, idx) => val.equals(expectedPath[idx])))) {
            throw new UnreadableWalletException(`Expecting account key but found key with path: ${HDUtils.formatPath(accountPath)}`);
        }
        
        let chain: DeterministicKeyChain;
        if (isMarried) {
            // Pass network parameters as first argument - use get() for singleton
            chain = new MarriedKeyChain(MainNetParams.get(), accountKey);
        } else {
            chain = new DeterministicKeyChain(accountKey);
        }
        return chain;
    }
}
