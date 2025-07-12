import { Sha256Hash } from './Sha256Hash';
import { DataClass } from './DataClass';
import { Utils } from '../utils/Utils';
import { DataInputStream } from '../utils/DataInputStream';
import { UnsafeByteArrayOutputStream } from './UnsafeByteArrayOutputStream';
import { DataOutputStream } from '../utils/DataOutputStream';
import { ByteArrayInputStream } from '../utils/ByteArrayInputStream';
import { JsonProperty, JsonDeserialize, JsonSerialize } from "jackson-js";
import { Sha256HashDeserializer, Sha256HashSerializer } from "./Sha256HashSerializer";

export class ConfirmBlock extends DataClass {
    @JsonProperty()
    @JsonDeserialize({ using: Sha256HashDeserializer })
    @JsonSerialize({ using: Sha256HashSerializer })
    private blockHash: Sha256Hash | null = null;
    @JsonProperty()
    private confirmed: boolean = false;
    @JsonProperty()
    private time: number = 0;

    constructor() {
        super();
        this.setDefault();
    }

    public setDefault(): void {
        this.confirmed = false;
        this.time = Math.floor(Date.now() / 1000);
    }
    
    public parseDIS(dis: DataInputStream): this {
        this.setVersion(dis.readLong());
        this.blockHash = Sha256Hash.wrap(dis.readBytes(32));
        this.confirmed = dis.readBoolean();
        this.time = dis.readLong();
        return this;
    }

    

    public getBlockHash(): Sha256Hash | null {
        return this.blockHash;
    }

    public setBlockHash(blockHash: Sha256Hash | null): void {
        this.blockHash = blockHash;
    }

    public isConfirmed(): boolean {
        return this.confirmed;
    }

    public setConfirmed(confirmed: boolean): void {
        this.confirmed = confirmed;
    }

    public getTime(): number {
        return this.time;
    }

    public setTime(time: number): void {
        this.time = time;
    }
}
