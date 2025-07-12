import { Coin } from './Coin';
import { Script } from '../script/Script';
import { Sha256Hash } from './Sha256Hash';
import { MemoInfo } from './MemoInfo';
import { Utils } from '../utils/Utils';
import { Address } from './Address';
import { SpentBlock } from './SpentBlock';
import { JsonProperty, JsonDeserialize, JsonSerialize } from "jackson-js";
import { Sha256HashDeserializer, Sha256HashSerializer } from "./Sha256HashSerializer";

/**
 * A UTXO message contains the information necessary to check a spending
 * transaction.
 */
export class UTXO extends SpentBlock {
    @JsonProperty()
    private value: Coin | null = null;
    @JsonProperty()
    private script: Script | null = null;
    @JsonProperty()
    @JsonDeserialize({ using: Sha256HashDeserializer })
    @JsonSerialize({ using: Sha256HashSerializer })
    private hash: Sha256Hash | null = null;
    @JsonProperty()
    private index: number = 0;
    @JsonProperty()
    private coinbase: boolean = false;
    @JsonProperty()
    private address: string | null = null;
    @JsonProperty()
    private fromaddress: string | null = null;
    @JsonProperty()
    private spendPending: boolean = false;
    @JsonProperty()
    private spendPendingTime: number = 0;
    @JsonProperty()
    private tokenId: string | null = null;
    @JsonProperty()
    private minimumsign: number = 0;
    @JsonProperty()
    private memo: string | null = null;
   
    constructor(
        hash?: Sha256Hash,
        index?: number,
        value?: Coin,
        coinbase?: boolean,
        script?: Script,
        address?: string,
        blockhash?: Sha256Hash,
        fromaddress?: string,
        memo?: string,
        tokenid?: string,
        spent?: boolean,
        confirmed?: boolean,
        spendPending?: boolean,
        minimumsign?: number,
        spendPendingTime?: number,
        time?: number,
        spenderBlockHash?: Sha256Hash
    ) {
        super();
        this.value = value ?? null;
        this.script = script ?? null;
        this.hash = hash ?? null;
        this.index = index ?? 0;
        this.coinbase = coinbase ?? false;
        this.address = address ?? null;
        this.fromaddress = fromaddress ?? null;
        this.spendPending = spendPending ?? false;
        this.spendPendingTime = spendPendingTime ?? 0;
        this.tokenId = tokenid ?? null;
        this.minimumsign = minimumsign ?? 0;
        this.memo = memo ?? null;

        // Set properties from superclass if provided
        if (blockhash) this.setBlockHash(blockhash);
        if (spent !== undefined) this.setSpent(spent);
        if (spenderBlockHash) this.setSpenderBlockHash(spenderBlockHash);
        if (confirmed !== undefined) this.setConfirmed(confirmed);
        if (time !== undefined) this.setTime(time);
    }

    public keyAsString(): string {
        return `${this.getBlockHashHex()}-${Utils.HEX.encode(this.hash ? this.hash.getBytes() : new Uint8Array())}-${this.index}`;
    }

    public getSpendPendingTime(): number {
        return this.spendPendingTime;
    }

    public isZero(): boolean {
        return this.value !== null && this.value.isZero();
    }

    public setSpendPendingTime(spendPendingTime: number): void {
        this.spendPendingTime = spendPendingTime;
    }

    public setScriptHex(scriptHex: string): void {
        this.script = new Script(Utils.HEX.decode(scriptHex));
    }

    public setHashHex(hashHex: string): void {
        this.hash = Sha256Hash.wrap(Buffer.from(Utils.HEX.decode(hashHex)));
    }

    public setValue(value: Coin): void {
        this.value = value;
    }

    public setHash(hash: Sha256Hash): void {
        this.hash = hash;
    }

    public setIndex(index: number): void {
        this.index = index;
    }

    public setCoinbase(coinbase: boolean): void {
        this.coinbase = coinbase;
    }

    public setAddress(address: string): void {
        this.address = address;
    }

    public isMultiSig(): boolean {
        return this.minimumsign > 1;
    }

    public getTokenId(): string | null {
        return this.tokenId;
    }

    public setTokenid(tokenid: string): void {
        this.tokenId = tokenid;
    }

    public getTokenidBuf(): Uint8Array {
        return this.tokenId ? Utils.HEX.decode(this.tokenId) : new Uint8Array();
    }

    public getFromaddress(): string | null {
        return this.fromaddress;
    }

    public setFromaddress(fromaddress: string): void {
        this.fromaddress = fromaddress;
    }

    public memoToString(): string | null {
        return this.memo ? MemoInfo.parseToString(this.memo) : null;
    }

    public getValue(): Coin | null {
        return this.value;
    }

    public getScript(): Script | null {
        return this.script;
    }

    public setScript(script: Script): void {
        this.script = script;
    }

    public getScriptHex(): string {
        return this.script ? Utils.HEX.encode(this.script.getProgram()) : "";
    }

    public getTxHash(): Sha256Hash | null {
        return this.hash;
    }

    public getHashHex(): string {
        return this.hash ? Utils.HEX.encode(this.hash.getBytes()) : "";
    }

    public getIndex(): number {
        return this.index;
    }

    public isCoinbase(): boolean {
        return this.coinbase;
    }

    public getAddress(): string | null {
        return this.address;
    }

    public toStringShort(): string {
        return `UTXO ${this.value} (${this.hash}:${this.index})`;
    }

    public toString(): string {
        return `UTXO [value=${this.value}, \n script=${this.script}, \n hash=${this.hash}, \n index=${this.index}` +
               `, coinbase=${this.coinbase}, \n address=${this.address}, \n fromaddress=${this.fromaddress}` +
               `, \n time=${Utils.dateTimeFormat(this.getTime() * 1000)}` +
               `, \n memo=${this.memo} \n confirmed=${this.isConfirmed()}` +
               `, \n spent=${this.isSpent()} \n spendPending=${this.spendPending}` +
               `, \n spendPendingTime=${this.spendPendingTime}` +
               `, \n spenderBlockHash=${this.getSpenderBlockHash()} \n tokenId=${this.tokenId}` +
               `, \n minimumsign=${this.minimumsign} \n ]`;
    }

    public hashCode(): number {
        let result = 17;
        result = 31 * result + this.index;
        result = 31 * result + (this.hash ? this.hash.hashCode() : 0);
        result = 31 * result + (this.getBlockHash() ? this.getBlockHash()!.hashCode() : 0);
        return result;
    }

    public equals(o: any): boolean {
        if (this === o) return true;
        if (o === null || !(o instanceof UTXO)) return false;
        const other = o as UTXO;
        return this.getIndex() === other.getIndex() &&
               (this.getTxHash() === other.getTxHash() || (this.getTxHash() !== null && other.getTxHash() !== null && this.getTxHash()!.equals(other.getTxHash()!))) &&
               (this.getBlockHash() === other.getBlockHash() || (this.getBlockHash() !== null && other.getBlockHash() !== null && this.getBlockHash()!.equals(other.getBlockHash()!)));
    }

    public getMemo(): string | null {
        return this.memo;
    }

    public setMemo(memo: string): void {
        this.memo = memo;
    };

    public isSpendPending(): boolean {
        return this.spendPending;
    }

    public setSpendPending(spendPending: boolean): void {
        this.spendPending = spendPending;
    }

    public getMinimumsign(): number {
        return this.minimumsign;
    }

    public setMinimumsign(minimumsign: number): void {
        this.minimumsign = minimumsign;
    }
}
