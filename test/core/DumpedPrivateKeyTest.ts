import { DumpedPrivateKey } from '../../src/net/bigtangle/utils/DumpedPrivateKey';
import { ECKey } from '../../src/net/bigtangle/core/ECKey';
import bigInt from 'big-integer';
import { NetworkParameters } from '../../src/net/bigtangle/params/NetworkParameters';

// Minimal mock network parameters for testing
class MockNetworkParameters extends NetworkParameters {
    getP2SHHeader(): number { return 0; }
    getAddressHeader(): number { return 0; }
    getAcceptableAddressCodes(): number[] { return [0]; }
    getId(): string { return 'mock'; }
    getMaxTarget(): bigint { return BigInt(0); }
    getDefaultSerializer(): any { return null; }
    getProtocolVersionNum(version: number): number { return version; }
    getBip32HeaderPub(): number { return 0; }
    getBip32HeaderPriv(): number { return 0; }
    getDumpedPrivateKeyHeader(): number { return 128; }
    serverSeeds(): string[] { return []; }
    getGenesisPub(): string { return ""; }
}

describe('DumpedPrivateKeyTest', () => {
    const mockParams = new MockNetworkParameters();

    test('cloning', () => {
        const a = new DumpedPrivateKey(mockParams, ECKey.fromPrivate(bigInt('1')).getPrivKeyBytes(), true);
        const b = a.clone();

        expect(a).toEqual(b);
        expect(a).not.toBe(b);
    });

    test('roundtripBase58', () => {
        const base58 = '5HtUCLMFWNueqN9unpgX2DzjMg6SDNZyKRb8s3LJgpFg5ubuMrk';
        const key = DumpedPrivateKey.fromBase58(base58);
        expect(key.toBase58()).toBe(base58);
    });
});
