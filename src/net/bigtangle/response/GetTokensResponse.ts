import { AbstractResponse } from './AbstractResponse';
import { Token } from '../core/Token';
import { JsonProperty, JsonClassType } from "jackson-js";


export class GetTokensResponse extends AbstractResponse {
      @JsonProperty()
      @JsonClassType({ type: () => [Array, [Token]] }) // OrderRecord[]
    private tokens: Token[] | null = null;
      @JsonProperty()
  @JsonClassType({ type: () => [Map, [String, Token]] }) // Map<string, Token>
    private amountMap: Map<string, BigInteger> | null = null;

    public static create(tokens: Token[], amountMap?: Map<string, BigInteger>): GetTokensResponse {
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
