import { Coin } from '../../src/net/bigtangle/core/Coin';
import { MonetaryFormat } from '../../src/net/bigtangle/utils/MonetaryFormat';
import { NetworkParameters } from '../../src/net/bigtangle/params/NetworkParameters';

describe('MonetaryFormatTest', () => {
    const NO_CODE = MonetaryFormat.FIAT.withNoCode();

    test('testSigns', () => {
        // Pass Coin objects directly to format()
        expect(NO_CODE.format(Coin.COIN.negate())).toBe('-1.00');
        expect(
            NO_CODE.withNegativeSign('@')
                .format(Coin.COIN.negate())
        ).toBe('@1.00');
        expect(NO_CODE.format(Coin.COIN)).toBe('1.00');
        expect(NO_CODE.withPositiveSign('+').format(Coin.COIN)).toBe('+1.00');
    });

    test('testDecimalMark', () => {
        expect(
            NO_CODE.withDecimalMark(',').format(Coin.COIN.divide(100))
        ).toBe('0,01');
    });

    test('testGrouping', () => {
        // Use withShift, withMinDecimals, and withOptionalDecimals
        expect(format(Coin.COIN.divide(10), 0, 1, 2, 3)).toBe('0.1');
        expect(format(Coin.COIN.divide(100), 0, 1, 2, 3)).toBe('0.01');
        expect(format(Coin.COIN.divide(1000), 0, 1, 2, 3)).toBe('0.001');
        expect(format(Coin.COIN.divide(10000), 0, 1, 2, 3)).toBe('0.0001');
        expect(format(Coin.COIN.divide(100000), 0, 1, 2, 3)).toBe('0.00001');
        expect(format(Coin.COIN.divide(1000000), 0, 1, 2, 3)).toBe('0.000001');
    });

    test('testTooSmall', () => {
        expect(() => {
            format(Coin.valueOf(1n), 0, 1, 2, 3);
        }).toThrow();
    });

    test('btcRounding', () => {
        expect(format(Coin.ZERO, 0, 0)).toBe('0');
        // With 0 decimals, 1 coin = 1 unit
        expect(format(Coin.COIN, 0, 0)).toBe('1');
    });

    test('repeatOptionalDecimals', () => {
        // Use withMinDecimals and withOptionalDecimals
        expect(formatRepeat(Coin.COIN.divide(100), 2, 4)).toBe('0.01');
        expect(formatRepeat(Coin.COIN.divide(10), 2, 4)).toBe('0.1');
        
        expect(formatRepeat(Coin.COIN.divide(100), 2, 2)).toBe('0.01');
        expect(formatRepeat(Coin.COIN.divide(10), 2, 2)).toBe('0.1');
        
        expect(formatRepeat(Coin.COIN.divide(100), 2, 0)).toBe('0');
        expect(formatRepeat(Coin.COIN.divide(10), 2, 0)).toBe('0');
    });

    test('parse', () => {
        const coin = NO_CODE.parse('1');
        expect(coin.getValue()).toBe(1000000n);
        
        const coin2 = NO_CODE.parse('1.');
        expect(coin2.getValue()).toBe(1000000n);
        
        const coin3 = NO_CODE.parse('1.0');
        expect(coin3.getValue()).toBe(1000000n);
        
        const coin4 = NO_CODE.withDecimalMark(',').parse('1,0');
        expect(coin4.getValue()).toBe(1000000n);
        
        const coin5 = NO_CODE.parse('01.0000000000');
        expect(coin5.getValue()).toBe(1000000n);
        
        const coin6 = NO_CODE.withPositiveSign('+').parse('+1.0');
        expect(coin6.getValue()).toBe(1000000n);
        
        const coin7 = NO_CODE.parse('-1');
        expect(coin7.getValue()).toBe(-1000000n);
        
        const coin8 = NO_CODE.parse('-1.0');
        expect(coin8.getValue()).toBe(-1000000n);
        
        // .01 should be 0.01 * 10^6 = 10000 units
        const coin9 = NO_CODE.parse('.01');
        expect(coin9.getValue()).toBe(10000n);
    });

    function format(
        coin: Coin,
        shift: number,
        minDecimals: number,
        ...decimalGroups: number[]
    ): string {
        return NO_CODE.withShift(shift)
            .withMinDecimals(minDecimals)
            .withOptionalDecimals(...decimalGroups)
            .format(coin);
    }

    function formatRepeat(coin: Coin, decimals: number, repetitions: number): string {
        return NO_CODE.withMinDecimals(0)
            .withOptionalDecimals(...Array(repetitions).fill(decimals))
            .format(coin);
    }

    test('parse', () => {
        // Create a coin with the correct token ID
        const bigtangleTokenId = NetworkParameters.BIGTANGLE_TOKENID;
        const expectedCoin = new Coin(1000000n, bigtangleTokenId);
        const expectedNegatedCoin = new Coin(-1000000n, bigtangleTokenId);
        const expectedSmallCoin = new Coin(10000n, bigtangleTokenId);
        
        expect(NO_CODE.parse('1')).toEqual(expectedCoin);
        expect(NO_CODE.parse('1.')).toEqual(expectedCoin);
        expect(NO_CODE.parse('1.0')).toEqual(expectedCoin);
        expect(NO_CODE.withDecimalMark(',').parse('1,0')).toEqual(expectedCoin);
        expect(NO_CODE.parse('01.0000000000')).toEqual(expectedCoin);
        expect(NO_CODE.withPositiveSign('+').parse('+1.0')).toEqual(expectedCoin);
        expect(NO_CODE.parse('-1')).toEqual(expectedNegatedCoin);
        expect(NO_CODE.parse('-1.0')).toEqual(expectedNegatedCoin);
        expect(NO_CODE.parse('.01')).toEqual(expectedSmallCoin);
    });

    test('parseInvalidEmpty', () => {
        expect(() => {
            NO_CODE.parse('');
        }).toThrow();
    });

    test('parseInvalidWhitespaceSign', () => {
        expect(() => {
            NO_CODE.parse('- 1');
        }).toThrow();
    });

    test('parseInvalidMultipleDecimalMarks', () => {
        expect(() => {
            NO_CODE.parse('1.0.0');
        }).toThrow();
    });

    test('parseInvalidDecimalMark', () => {
        expect(() => {
            NO_CODE.withDecimalMark(',').parse('1.0');
        }).toThrow();
    });

    test('parseInvalidPositiveSign', () => {
        expect(() => {
            NO_CODE.withPositiveSign('@').parse('+1.0');
        }).toThrow();
    });

    test('parseInvalidNegativeSign', () => {
        expect(() => {
            NO_CODE.withNegativeSign('@').parse('-1.0');
        }).toThrow();
    });
});
