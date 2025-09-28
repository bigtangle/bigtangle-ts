import { DataClass } from './DataClass';
import { Token } from './Token';
import { MultiSignAddress } from './MultiSignAddress';
 
import { ObjectMapper, JsonProperty } from 'jackson-js';
/**
 * TokenInfo class represents information about a token and its associated multi-signature addresses.
 * It provides methods to serialize the object to a byte array, parse from a byte array,
 * and manage the token and multi-signature addresses.
 */
export class TokenInfo extends DataClass {
    // The version property is inherited from DataClass and is now protected,
    // so it doesn't need to be redefined here.
    // @JsonProperty() // No longer needed here as it's handled in DataClass

    @JsonProperty()
    private token: Token | null = null;
    @JsonProperty()
    private multiSignAddresses: MultiSignAddress[] = [];

    constructor() {
        super();
        this.multiSignAddresses = [];
    }

    public toByteArray(): Uint8Array {
        try {
            const replacer = (key: string, value: any) => {
                if (typeof value === 'bigint') {
                    return value.toString();
                }
                return value;
            };
            const jsonStr = JSON.stringify(this, replacer);
            return new TextEncoder().encode(jsonStr);
        } catch (e: any) {
            throw new Error(e);
        } 
    }

    public parse(buf: Uint8Array): TokenInfo {
        const jsonStr = new TextDecoder('utf-8').decode(buf);
        const objectMapper = new ObjectMapper();
        const parsed = objectMapper.parse(jsonStr, { 
            mainCreator: () => [TokenInfo],
            features: {
                deserialization: {
                    FAIL_ON_UNKNOWN_PROPERTIES: false
                }
            }
        }) as TokenInfo;
        if (parsed.token) {
            const tokenData = parsed.token as any;
            const token = new Token();
            token.setAmount(BigInt(tokenData.amount));
            token.setTokenid(tokenData.tokenid);
            token.setTokenname(tokenData.tokenname);
            token.setDescription(tokenData.description);
            token.setSignnumber(tokenData.signnumber);
            token.setTokenindex(tokenData.tokenindex);
            token.setTokenstop(tokenData.tokenstop);
            token.setTokentype(tokenData.tokentype);
            token.setDomainName(tokenData.domainName);
            token.setDomainNameBlockHash(tokenData.domainNameBlockHash);
            token.setConfirmed(tokenData.confirmed);
            token.setRevoked(tokenData.revoked);
            token.setLanguage(tokenData.language);
            token.setClassification(tokenData.classification);
            token.setDecimals(tokenData.decimals);
            token.setPrevblockhash(tokenData.prevblockhash);
            token.setBlockHash(tokenData.blockHash);
            parsed.setToken(token);
        }
        return parsed;
    }

    public parseChecked(buf: Uint8Array): TokenInfo {
        const jsonStr = new TextDecoder('utf-8').decode(buf);
        try {
            const objectMapper = new ObjectMapper();
            return objectMapper.parse(jsonStr, { 
                mainCreator: () => [TokenInfo],
                features: {
                    deserialization: {
                        FAIL_ON_UNKNOWN_PROPERTIES: false
                    }
                }
            }) as TokenInfo;
        } catch (e: any) {
            throw new Error(e);
        }
    }

    public getToken(): Token | null {
        return this.token;
    }

    public setToken(token: Token | null): void {
        this.token = token;
    }

    public getMultiSignAddresses(): MultiSignAddress[] {
        return this.multiSignAddresses;
    }

    public setMultiSignAddresses(multiSignAddresses: MultiSignAddress[]): void {
        this.multiSignAddresses = multiSignAddresses;
    }

    public toString(): string {
        return `TokenInfo [tokens=${this.token}, multiSignAddresses=${this.multiSignAddresses}]`;
    }
}
