import { AbstractResponse } from './AbstractResponse';
import { OrderRecord } from '../core/OrderRecord';
import { Token } from '../core/Token';

export class OrderdataResponse extends AbstractResponse {
    private allOrdersSorted: OrderRecord[] | null = null;
    private tokennames: Map<string, Token> | null = null;

    public static createOrderRecordResponse(allOrdersSorted: OrderRecord[], tokennames: Map<string, Token>): OrderdataResponse {
        const res = new OrderdataResponse();
        res.allOrdersSorted = allOrdersSorted;
        res.tokennames = tokennames;
        return res;
    }

    public getAllOrdersSorted(): OrderRecord[] | null {
        return this.allOrdersSorted;
    }

    public setAllOrdersSorted(allOrdersSorted: OrderRecord[] | null): void {
        this.allOrdersSorted = allOrdersSorted;
    }

    public getTokennames(): Map<string, Token> | null {
        return this.tokennames;
    }

    public setTokennames(tokennames: Map<string, Token> | null): void {
        this.tokennames = tokennames;
    }

    public static fromJSON(json: any): OrderdataResponse {
        const res = new OrderdataResponse();

        res.setErrorcode(json.errorcode ?? null);
        res.setMessage(json.message ?? null);
        res.setDuration(json.duration ?? null);

        if (Array.isArray(json.allOrdersSorted)) {
            const orders = json.allOrdersSorted.map((o: any) => OrderRecord.fromJSON(o));
            res.setAllOrdersSorted(orders);
        }

        if (json.tokennames && typeof json.tokennames === 'object') {
            const tokenMap = new Map<string, Token>();
            for (const [key, val] of Object.entries(json.tokennames)) {
                tokenMap.set(key, Token.fromJSON(val));
            }
            res.setTokennames(tokenMap);
        }

        return res;
    }
}
