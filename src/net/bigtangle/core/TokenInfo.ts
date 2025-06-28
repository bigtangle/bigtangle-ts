import { DataClass } from './DataClass';
import { Token } from './Token';
import { MultiSignAddress } from './MultiSignAddress';
 
import { ObjectMapper  } from 'jackson-js';
/**
 * TokenInfo class represents information about a token and its associated multi-signature addresses.
 * It provides methods to serialize the object to a byte array, parse from a byte array,
 * and manage the token and multi-signature addresses.
 */
export class TokenInfo extends DataClass {
    private token: Token | null = null;
    private multiSignAddresses: MultiSignAddress[] = [];

    constructor() {
        super();
        this.multiSignAddresses = [];
    }

    public toByteArray(): Uint8Array {
        try {
            const jsonStr = JSON.stringify(this);
            return new TextEncoder().encode(jsonStr);
        } catch (e: any) {
            throw new Error(e);
        } 
    }

    public parse(buf: Uint8Array): TokenInfo {
        const jsonStr = new TextDecoder('utf-8').decode(buf);
        const objectMapper = new ObjectMapper();
      return objectMapper.parse<TokenInfo>(jsonStr, { mainCreator: () => [TokenInfo] });
       
    }

    public parseChecked(buf: Uint8Array): TokenInfo {
        const jsonStr = new TextDecoder('utf-8').decode(buf);
        try {
         const objectMapper = new ObjectMapper();
      return objectMapper.parse<TokenInfo>(jsonStr, { mainCreator: () => [TokenInfo] });
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