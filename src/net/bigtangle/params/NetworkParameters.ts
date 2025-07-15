/**
 * Abstract class representing network parameters for different blockchain networks.
 */
export abstract class NetworkParameters {
    // Static constants
    static HEADER_SIZE = 80;
    static BLOCK_VERSION_GENESIS = 1;
    static MAX_DEFAULT_BLOCK_SIZE = 1000000;
    static MAX_REWARD_BLOCK_SIZE = 1000000;
    static ALLOWED_TIME_DRIFT = 2 * 60 * 60; // 2 hours
    static MAX_BLOCK_SIGOPS = 20000;
    static ORDER_TIMEOUT_MAX = 30 * 24 * 60 * 60; // 30 days in seconds
    static BIGTANGLE_TOKENID_STRING = "bc";
    static BIGTANGLE_TOKENID = Buffer.from("bc", "hex");
    static BIGTANGLE_TOKENNAME = "BigTangle";
    static BIGTANGLE_DECIMAL = 6;
    static ID_MAINNET = "main";
    static ID_UNITTESTNET = "test";
    static BigtangleCoinTotal =  BigInt(1000000000000);

    abstract getP2SHHeader(): number;
    abstract getAddressHeader(): number;
    abstract getAcceptableAddressCodes(): number[];
    abstract getId(): string;
    
    // Additional required methods
    abstract getMaxTarget(): bigint;
    abstract getDefaultSerializer(): any; // Replace 'any' with actual serializer type if available
    abstract getProtocolVersionNum(version: number): number;
    abstract getBip32HeaderPub(): number;
    abstract getBip32HeaderPriv(): number;
    abstract getDumpedPrivateKeyHeader(): number;
    abstract serverSeeds(): string[];
    abstract getGenesisPub(): string;
}
