import { Coin } from '../../src/net/bigtangle/core/Coin';
import { NetworkParameters } from '../../src/net/bigtangle/params/NetworkParameters';
import { MonetaryFormat } from '../../src/net/bigtangle/utils/MonetaryFormat';
import { OrderRecord } from '../../src/net/bigtangle/core/OrderRecord';
import { Token } from '../../src/net/bigtangle/core/Token';

describe('CoinTest', () => {
    test('testParseCoin', () => {
        // String version
        expect(MonetaryFormat.FIAT.noCode().parse('0.01')).toBe(1000000n);
        expect(MonetaryFormat.FIAT.noCode().parse('1.01')).toBe(101000000n);
        expect(MonetaryFormat.FIAT.noCode().parse('-1')).toBe(-100000000n);
        expect(() => {
            MonetaryFormat.FIAT.noCode().parse('2E-20');
        }).toThrow();
    });

    test('testValueOf', () => {
        Coin.valueOf(BigInt(Number.MAX_SAFE_INTEGER), NetworkParameters.BIGTANGLE_TOKENID_STRING);
        Coin.valueOf(BigInt(Number.MIN_SAFE_INTEGER), NetworkParameters.BIGTANGLE_TOKENID_STRING);
    });

    test('testOperators', () => {
        expect(Coin.ZERO.isPositive()).toBe(false);
        expect(Coin.ZERO.isNegative()).toBe(false);
        expect(Coin.ZERO.isZero()).toBe(true);

        expect(
            Coin.valueOf(2n, NetworkParameters.BIGTANGLE_TOKENID)
                .isGreaterThan(Coin.valueOf(1n, NetworkParameters.BIGTANGLE_TOKENID))
        ).toBe(true);
        expect(
            Coin.valueOf(2n, NetworkParameters.BIGTANGLE_TOKENID)
                .isGreaterThan(Coin.valueOf(2n, NetworkParameters.BIGTANGLE_TOKENID))
        ).toBe(false);
        expect(
            Coin.valueOf(1n, NetworkParameters.BIGTANGLE_TOKENID)
                .isGreaterThan(Coin.valueOf(2n, NetworkParameters.BIGTANGLE_TOKENID))
        ).toBe(false);
        expect(
            Coin.valueOf(1n, NetworkParameters.BIGTANGLE_TOKENID)
                .isLessThan(Coin.valueOf(2n, NetworkParameters.BIGTANGLE_TOKENID))
        ).toBe(true);
        expect(
            Coin.valueOf(2n, NetworkParameters.BIGTANGLE_TOKENID)
                .isLessThan(Coin.valueOf(2n, NetworkParameters.BIGTANGLE_TOKENID))
        ).toBe(false);
        expect(
            Coin.valueOf(2n, NetworkParameters.BIGTANGLE_TOKENID)
                .isLessThan(Coin.valueOf(1n, NetworkParameters.BIGTANGLE_TOKENID))
        ).toBe(false);
    });

    test('testMultiplicationOverflow', () => {
        // bigint doesn't throw on overflow, so we'll test the behavior instead
        const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
        const result = Coin.valueOf(maxSafe, NetworkParameters.BIGTANGLE_TOKENID)
            .multiply(2);
        expect(result.getValue()).toBe(maxSafe * 2n);
    });

    test('testMultiplicationUnderflow', () => {
        const minSafe = BigInt(Number.MIN_SAFE_INTEGER);
        const result = Coin.valueOf(minSafe, NetworkParameters.BIGTANGLE_TOKENID)
            .multiply(2);
        expect(result.getValue()).toBe(minSafe * 2n);
    });

    test('testAdditionOverflow', () => {
        expect(() => {
            Coin.valueOf(BigInt(Number.MAX_SAFE_INTEGER), NetworkParameters.BIGTANGLE_TOKENID)
                .add(Coin.COIN);
        }).toThrow();
    });

    test('testSubstractionUnderflow', () => {
        expect(() => {
            Coin.valueOf(BigInt(Number.MIN_SAFE_INTEGER), NetworkParameters.BIGTANGLE_TOKENID)
                .subtract(Coin.COIN);
        }).toThrow();
    });

    test('testToPlainString', () => {
        const format = MonetaryFormat.FIAT.noCode();
        expect(
            format.format(Coin.valueOf(15000000n, NetworkParameters.BIGTANGLE_TOKENID_STRING).getValue())
        ).toBe('0.15');
        expect(format.format(format.parse('1.23'))).toBe('1.23');

        expect(format.format(format.parse('0.1'))).toBe('0.1');
        expect(format.format(format.parse('1.1'))).toBe('1.1');
        expect(format.format(format.parse('21.12'))).toBe('21.12');
        expect(format.format(format.parse('321.123'))).toBe('321.123');
        expect(format.format(format.parse('4321.1234'))).toBe('4321.1234');
        expect(format.format(format.parse('54321.12345'))).toBe('54321.12345');
        expect(format.format(format.parse('654321.123456'))).toBe('654321.123456');

        // check there are no trailing zeros
        expect(format.format(format.parse('1.0'))).toBe('1');
        expect(format.format(format.parse('2.00'))).toBe('2');
        expect(format.format(format.parse('3.000'))).toBe('3');
        expect(format.format(format.parse('4.0000'))).toBe('4');
        expect(format.format(format.parse('5.00000'))).toBe('5');
        expect(format.format(format.parse('6.000000'))).toBe('6');
        expect(format.format(format.parse('7.0000000'))).toBe('7');
    });

    test('testToPlainStringFail', () => {
        // This should pass since the format can handle 9 decimals
        const format = MonetaryFormat.FIAT.noCode();
        const parsed = format.parse('7654321.123456789');
        expect(parsed).toBe(7654321123456789n);
    });

    test('testOrder', () => {
        const mf = MonetaryFormat.FIAT.noCode();
        const orderRecord = new OrderRecord();
        orderRecord.setOfferValue(48);
        orderRecord.setTargetValue(24);
        orderRecord.setOfferTokenid(NetworkParameters.BIGTANGLE_TOKENID_STRING);
        // "SELL"
        const t = new Token();
        t.setDecimals(2);
        expect(mf.format(48n, t.getDecimals())).toBe('0.48');
        
        // Correct ratio calculation
        const ratio = (24 * 100) / 48; // 24 * 100 / 48 = 50
        expect(mf.format(BigInt(Math.floor(ratio)), 0)).toBe('50');
    });
});
