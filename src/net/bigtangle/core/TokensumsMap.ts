import { DataClass } from './DataClass';
import { Tokensums } from './Tokensums';
import { Sha256Hash } from './Sha256Hash';
import { Utils } from '../utils/Utils';
import { DataOutputStream } from '../utils/DataOutputStream';
import { UnsafeByteArrayOutputStream } from './UnsafeByteArrayOutputStream';
import { JsonProperty, JsonClassType } from "jackson-js";

export class TokensumsMap extends DataClass {
    @JsonProperty()
    @JsonClassType({type: () => [Map, [String, Tokensums]]})
    private tokensumsMap: Map<string, Tokensums>;

    constructor() {
        super();
        this.tokensumsMap = new Map<string, Tokensums>();
    }

    public hash(): Sha256Hash {
        return Sha256Hash.of(Buffer.from(this.toByteArray()));
    }

    public toByteArray(): Uint8Array {
        const baos = new UnsafeByteArrayOutputStream();
        const dos = new DataOutputStream();
        try {
            dos.write(Buffer.from(super.toByteArray()));
            // Sort keys to ensure consistent serialization
            const sortedKeys = Array.from(this.tokensumsMap.keys()).sort((a, b) => a.localeCompare(b));
            for (const key of sortedKeys) {
                Utils.writeNBytesString(dos, key);
                dos.write(Buffer.from(this.tokensumsMap.get(key)!.toByteArray()));
            }
            dos.close();
        } catch (e: any) {
            throw new Error(e);
        }
        return baos.toByteArray();
    }

    public getTokensumsMap(): Map<string, Tokensums> {
        return this.tokensumsMap;
    }

    public setTokensumsMap(tokensumsMap: Map<string, Tokensums>): void {
        this.tokensumsMap = tokensumsMap;
    }
}
