
import { Buffer } from 'buffer';
import { HDUtils } from '../../src/net/bigtangle/crypto/HDUtils';
import { ChildNumber } from '../../src/net/bigtangle/crypto/ChildNumber';
import { Utils } from '../../src/net/bigtangle/utils/Utils';

describe('HDUtilsTest', () => {
    test('testHmac', () => {
        const tv = [
            '0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b' + '0b0b0b0b',
            '4869205468657265',
            '87aa7cdea5ef619d4ff0b4241a1d6cb0' +
                '2379f4e2ce4ec2787ad0b30545e17cde' +
                'daa833b7d6b8a702038b274eaea3f4e4' +
                'be9d914eeb61f1702e696c203a126854',

            '4a656665',
            '7768617420646f2079612077616e7420' +
                '666f72206e6f7468696e673f',
            '164b7a7bfcf819e2e395fbe73b56e0a3' +
                '87bd64222e831fd610270cd7ea250554' +
                '9758bf75c05a994a6d034f65f8f0e6fd' +
                'caeab1a34d4a6b4b636e070a38bce737',

            'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' + 'aaaaaaaa',
            'dddddddddddddddddddddddddddddddd' +
                'dddddddddddddddddddddddddddddddd' +
                'dddddddddddddddddddddddddddddddd' +
                'dddd',
            'fa73b0089d56a284efb0f0756c890be9' +
                'b1b5dbdd8ee81a3655f83e33b2279d39' +
                'bf3e848279a722c806b485a47e67c807' +
                'b946a337bee8942674278859e13292fb',

            '0102030405060708090a0b0c0d0e0f10' + '111213141516171819',
            'cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd' +
                'cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd' +
                'cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd' +
                'cdcd',
            'b0ba465637458c6990e5a8c5f61d4af7' +
                'e576d97ff94b872de76f8050361ee3db' +
                'a91ca5c11aa25eb4d679275cc5788063' +
                'a5f19741120c4f2de2adebeb10a298dd',

            'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' +
                'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' +
                'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' +
                'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' +
                'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' +
                'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' +
                'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' +
                'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' +
                'aaaaaa',
            '54657374205573696e67204c61726765' +
                '72205468616e20426c6f636b2d53697a' +
                '65204b6579202d2048617368204b6579' +
                '204669727374',
            '80b24263c7c1a3ebb71493c1dd7be8b4' +
                '9b46d1f41b4aeec1121b013783f8f352' +
                '6b56d037e05f2598bd0fd2215d6a1e52' +
                '95e64f73f63f0aec8b915a985d786598',

            'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' +
                'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' +
                'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' +
                'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' +
                'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' +
                'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' +
                'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' +
                'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' +
                'aaaaaa',
            '54686973206973206120746573742075' +
                '73696e672061206c6172676572207468' +
                '616e20626c6f636b2d73697a65206b65' +
                '7920616e642061206c61726765722074' +
                '68616e20626c6f636b2d73697a652064' +
                '6174612e20546865206b6579206e6565' +
                '647320746f2062652068617368656420' +
                '6265666f7265206265696e6720757365' +
                '642062792074686520484d414320616c' +
                '676f726974686d2e',
            'e37b6a775dc87dbaa4dfa9f96e5e3ffd' +
                'debd71f8867289865df5a32d20cdc944' +
                'b6022cac3c4982b10d5eeb55c3e4de15' +
                '134676fb6de0446065c97440fa8c6a58',
        ];

        for (let i = 0; i < tv.length; i += 3) {
            expect(
                Buffer.compare(
                    getBytes(tv, i + 2),
                    HDUtils.hmacSha512(getBytes(tv, i), getBytes(tv, i + 1)),
                ),
            ).toBe(0);
        }
    });

    function getBytes(hmacTestVectors: string[], i: number): Buffer {
        return Buffer.from(Utils.HEX.decode(hmacTestVectors[i]));
    }

    test('testLongToByteArray', () => {
        const bytes = HDUtils.longTo4ByteArray(1026);
        expect(Utils.HEX.encode(bytes)).toBe('00000402');
    });

    test('testFormatPath', () => {
        const tv = [
            'M/44H/0H/0H/1/1',
            [
                new ChildNumber(44, true),
                new ChildNumber(0, true),
                new ChildNumber(0, true),
                new ChildNumber(1, false),
                new ChildNumber(1, false),
            ],

            'M/7H/3/3/1H',
            [
                new ChildNumber(7, true),
                new ChildNumber(3, false),
                new ChildNumber(3, false),
                new ChildNumber(1, true),
            ],

            'M/1H/2H/3H',
            [
                new ChildNumber(1, true),
                new ChildNumber(2, true),
                new ChildNumber(3, true),
            ],

            'M/1/2/3',
            [
                new ChildNumber(1, false),
                new ChildNumber(2, false),
                new ChildNumber(3, false),
            ],
        ];

        for (let i = 0; i < tv.length; i += 2) {
            const expectedStrPath = tv[i] as string;
            const path = tv[i + 1] as ChildNumber[];

            const generatedStrPath = HDUtils.formatPath(path);

            expect(generatedStrPath).toBe(expectedStrPath);
        }
    });

    test('testParsePath', () => {
        const tv = [
            'M/44H/0H/0H/1/1',
            [
                new ChildNumber(44, true),
                new ChildNumber(0, true),
                new ChildNumber(0, true),
                new ChildNumber(1, false),
                new ChildNumber(1, false),
            ],

            'M/7H/3/3/1H',
            [
                new ChildNumber(7, true),
                new ChildNumber(3, false),
                new ChildNumber(3, false),
                new ChildNumber(1, true),
            ],

            'M/1H/2H/3H',
            [
                new ChildNumber(1, true),
                new ChildNumber(2, true),
                new ChildNumber(3, true),
            ],

            'M/1/2/3',
            [
                new ChildNumber(1, false),
                new ChildNumber(2, false),
                new ChildNumber(3, false),
            ],
        ];

        for (let i = 0; i < tv.length; i += 2) {
            const strPath = tv[i] as string;
            const expectedPath = tv[i + 1] as ChildNumber[];

            const path = HDUtils.parsePath(strPath);

            expect(path).toEqual(expectedPath);
        }
    });
});
