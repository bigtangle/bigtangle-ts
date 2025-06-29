import { AbstractResponse } from './AbstractResponse';
import { Token } from '../core/Token';
import bigInt from 'big-integer';

export class GetTokensResponse extends AbstractResponse {
    private tokens: Token[] | null = null;
    private amountMap: Map<string, any> | null = null;

    public static create(tokens: Token[], amountMap?: Map<string, any>): GetTokensResponse {
        const res = new GetTokensResponse();
        res.tokens = tokens;
        if (amountMap) {
            res.amountMap = amountMap;
        }
        return res;
    }

    public getTokens(): Token[] | null {
        return this.tokens;
    }

    public getAmountMap(): Map<string, BigInteger> | null {
        return this.amountMap;
    }
}
