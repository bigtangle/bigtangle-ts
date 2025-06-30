import { NetworkParameters } from '../../src/net/bigtangle/params/NetworkParameters';
import { Block } from '../../src/net/bigtangle/core/Block';
import { Transaction } from '../../src/net/bigtangle/core/Transaction';

export class MockNetworkParameters extends NetworkParameters {
    getId(): string {
        return "mock";
    }
    
    getPort(): number {
        return 12345;
    }
    
    getAddressHeader(): number {
        return 0;
    }
    
    getP2SHHeader(): number {
        return 5;
    }
    
    getAcceptableAddressCodes(): number[] {
        return [0, 5];
    }
    
    getGenesisBlock(): Block | null {
        return null;
    }
    
    getDnsSeeds(): string[] {
        return [];
    }
    
    getHttpSeeds(): string[] {
        return [];
    }
    
    serverSeeds(): string[] {
        return [];
    }
    
    getInterval(): number {
        return 10;
    }
    
    getTargetTimespan(): number {
        return 20;
    }
    
    getSpendableCoinbaseDepth(): number {
        return 100;
    }

    getMaxTarget(): bigint {
        return BigInt('0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    }

    // Minimal implementations for required methods
    getDefaultSerializer(): any {
        return {
            makeTransaction: () => new Transaction(this),
            makeBlock: () => new Block(this),
        };
    }
}
