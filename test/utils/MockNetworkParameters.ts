import { NetworkParameters } from '../../src/net/bigtangle/params/NetworkParameters';
import { Block } from '../../src/net/bigtangle/core/Block';
import { Transaction } from '../../src/net/bigtangle/core/Transaction';

export class MockNetworkParameters extends NetworkParameters {
    getP2SHHeader(): number { return 5; }
    getAddressHeader(): number { return 0; }
    getAcceptableAddressCodes(): number[] { return [0, 5]; }
    getId(): string { return 'mock'; }
    getMaxTarget(): bigint { return BigInt('0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'); }
    getDefaultSerializer(): any { 
        return {
            makeTransaction: () => new Transaction(this),
            makeBlock: () => new Block(this),
        };
    }
    getProtocolVersionNum(version: number): number { return version; }
    getBip32HeaderPub(): number { return 0; }
    getBip32HeaderPriv(): number { return 0; }
    getDumpedPrivateKeyHeader(): number { return 128; }
    serverSeeds(): string[] { return []; }
    getGenesisPub(): string { return ""; }
    getPort(): number { return 12345; }
    getGenesisBlock(): Block | null { return null; }
    getDnsSeeds(): string[] { return []; }
    getHttpSeeds(): string[] { return []; }
    getInterval(): number { return 10; }
    getTargetTimespan(): number { return 20; }
    getSpendableCoinbaseDepth(): number { return 100; }
}
