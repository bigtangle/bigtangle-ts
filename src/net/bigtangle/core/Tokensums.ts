import { DataClass } from './DataClass';
import bigInt, { BigInteger } from 'big-integer'; // Import bigInt and its BigInteger type
import { UTXO } from './UTXO';
import { OrderRecord } from './OrderRecord';
import { ContractEventRecord } from './ContractEventRecord';
import { NetworkParameters } from '../params/NetworkParameters';
import { Utils } from '../utils/Utils';
import { DataOutputStream } from '../utils/DataOutputStream';

export class Tokensums extends DataClass {
    public tokenid: string | null = null;
    public initial: BigInteger = bigInt(0);
    public unspent: BigInteger = bigInt(0);
    public order: BigInteger = bigInt(0);
    public contract: BigInteger = bigInt(0);
    public utxos: UTXO[] = [];
    public orders: OrderRecord[] = [];
    public contracts: ContractEventRecord[] = [];

    public calculate(): void {
        this.calcOutputs();
        this.ordersum();
        this.contractsum();
    }
    
    public calcOutputs(): void {
        for (const u of this.utxos) {
            if (u.isConfirmed() && !u.isSpent()) {
                const valueObj = u.getValue();
                if (valueObj !== null) {
                    this.unspent = (this.unspent as any).add(bigInt(valueObj.getValue().toString()));
                }
            } 
        }
    }

    public ordersum(): void {
        for (const orderRecord of this.orders) {
            if (orderRecord.getOfferTokenid() === this.tokenid) {
                this.order = (this.order as any).add(bigInt(orderRecord.getOfferValue().toString()));
            }
        }
    }

    public contractsum(): void {
        for (const c of this.contracts) {
            if (c.getTargetTokenid() === this.tokenid) {
                this.contract = (this.contract as any).add(c.getTargetValue() ?? bigInt(0));
            }
        }
    }

    public toString(): string {
        return `Tokensums [ \n tokenid=${this.tokenid},  \n initial=${this.initial}, \n unspent UTXO=${this.unspent}` +
               `, \n order=${this.order}` +
               `, \n contract=${this.contract}` +
               ` \n unspentUTXO.add(order).add(contract) = ${(this.unspent as any).add(this.order).add(this.contract)}]`;
    }

    public check(): boolean {
        if (NetworkParameters.BIGTANGLE_TOKENID_STRING === this.tokenid) {
            //fee payment, only create reward block will fee to miner
            return (this.initial as any).compareTo((this.unspent as any).add(this.order).add(this.contract)) >= 0;
        } else {
            return (this.initial as any).compareTo((this.unspent as any).add(this.order).add(this.contract)) === 0;
        }
    }

    public toByteArray(): Uint8Array {
        const dos = new DataOutputStream();
        try {
            dos.writeBytes(Buffer.from(super.toByteArray()));
            dos.writeNBytesString(this.tokenid ?? "");
            dos.writeBytes(Buffer.from(Utils.bigIntToBytes(this.initial, 32)));
            dos.writeBytes(Buffer.from(Utils.bigIntToBytes(this.unspent, 32)));
            dos.writeBytes(Buffer.from(Utils.bigIntToBytes(this.order, 32)));
            dos.writeInt(this.utxos.length);
            for (const c of this.utxos) {
                dos.writeBytes(Buffer.from(c.toByteArray()));
            }
            dos.writeInt(this.orders.length);
            for (const c of this.orders) {
                dos.writeBytes(Buffer.from(c.toByteArray()));
            }
            dos.close();
        } catch (e: any) {
            throw new Error(e);
        }
        return dos.toByteArray();
    }
 
    public unspentOrderSum(): BigInteger {
        return (this.unspent as any).add(this.order);
    }

    public getTokenid(): string | null {
        return this.tokenid;
    }

    public setTokenid(tokenid: string | null): void {
        this.tokenid = tokenid;
    }

    public getInitial(): BigInteger {
        return this.initial;
    }

    public setInitial(initial: BigInteger): void {
        this.initial = initial;
    }

    public getUnspent(): BigInteger {
        return this.unspent;
    }

    public setUnspent(unspent: BigInteger): void {
        this.unspent = unspent;
    }

    public getOrder(): BigInteger {
        return this.order;
    }

    public setOrder(order: BigInteger): void {
        this.order = order;
    }

    public getUtxos(): UTXO[] {
        return this.utxos;
    }

    public setUtxos(utxos: UTXO[]): void {
        this.utxos = utxos;
    }

    public getOrders(): OrderRecord[] {
        return this.orders;
    }

    public setOrders(orders: OrderRecord[]): void {
        this.orders = orders;
    }

    public getContract(): BigInteger {
        return this.contract;
    }

    public setContract(contract: BigInteger): void {
        this.contract = contract;
    }

    public getContracts(): ContractEventRecord[] {
        return this.contracts;
    }

    public setContracts(contracts: ContractEventRecord[]): void {
        this.contracts = contracts;
    }
}
