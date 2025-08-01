
import { HDKeyDerivation } from '../../src/net/bigtangle/crypto/HDKeyDerivation';
import { DeterministicHierarchy } from '../../src/net/bigtangle/crypto/DeterministicHierarchy';
import { ChildNumber } from '../../src/net/bigtangle/crypto/ChildNumber';
import { MainNetParams } from '../../src/net/bigtangle/params/MainNetParams';
import { Base58 } from '../../src/net/bigtangle/utils/Base58';
import { Utils } from '../../src/net/bigtangle/utils/Utils';

class HDWTestVector {
    public seed: string;
    public priv: string;
    public pub: string;
    public derived: DerivedTestCase[];

    public constructor(
        seed: string,
        priv: string,
        pub: string,
        derived: DerivedTestCase[],
    ) {
        this.seed = seed;
        this.priv = priv;
        this.pub = pub;
        this.derived = derived;
    }
}

class DerivedTestCase {
    public name: string;
    public path: ChildNumber[];
    public pub: string;
    public priv: string;

    public constructor(
        name: string,
        path: ChildNumber[],
        priv: string,
        pub: string,
    ) {
        this.name = name;
        this.path = path;
        this.pub = pub;
        this.priv = priv;
    }

    public getPathDescription(): string {
        return 'm/' + this.path.map((p) => p.toString()).join('/');
    }
}

describe('BIP32Test', () => {
    const tvs: HDWTestVector[] = [
        new HDWTestVector(
            '000102030405060708090a0b0c0d0e0f',
            'xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi',
            'xpub661MyMwAqRbcFtXgS5sYJABqqG9YLmC4Q1Rdap9gSE8NqtwybGhePY2gZ29ESFjqJoCu1Rupje8YtGqsefD265TMg7usUDFdp6W1EGMcet8',
            [
                new DerivedTestCase(
                    'Test1 m/0H',
                    [new ChildNumber(0, true)],
                    'xprv9uHRZZhk6KAJC1avXpDAp4MDc3sQKNxDiPvvkX8Br5ngLNv1TxvUxt4cV1rGL5hj6KCesnDYUhd7oWgT11eZG7XnxHrnYeSvkzY7d2bhkJ7',
                    'xpub68Gmy5EdvgibQVfPdqkBBCHxA5htiqg55crXYuXoQRKfDBFA1WEjWgP6LHhwBZeNK1VTsfTFUHCdrfp1bgwQ9xv5ski8PX9rL2dZXvgGDnw',
                ),
                new DerivedTestCase(
                    'Test1 m/0H/1',
                    [new ChildNumber(0, true), new ChildNumber(1, false)],
                    'xprv9wTYmMFdV23N2TdNG573QoEsfRrWKQgWeibmLntzniatZvR9BmLnvSxqu53Kw1UmYPxLgboyZQaXwTCg8MSY3H2EU4pWcQDnRnrVA1xe8fs',
                    'xpub6ASuArnXKPbfEwhqN6e3mwBcDTgzisQN1wXN9BJcM47sSikHjJf3UFHKkNAWbWMiGj7Wf5uMash7SyYq527Hqck2AxYysAA7xmALppuCkwQ',
                ),
                new DerivedTestCase(
                    'Test1 m/0H/1/2H',
                    [
                        new ChildNumber(0, true),
                        new ChildNumber(1, false),
                        new ChildNumber(2, true),
                    ],
                    'xprv9z4pot5VBttmtdRTWfWQmoH1taj2axGVzFqSb8C9xaxKymcFzXBDptWmT7FwuEzG3ryjH4ktypQSAewRiNMjANTtpgP4mLTj34bhnZX7UiM',
                    'xpub6D4BDPcP2GT577Vvch3R8wDkScZWzQzMMUm3PWbmWvVJrZwQY4VUNgqFJPMM3No2dFDFGTsxxpG5uJh7n7epu4trkrX7x7DogT5Uv6fcLW5',
                ),
                new DerivedTestCase(
                    'Test1 m/0H/1/2H/2',
                    [
                        new ChildNumber(0, true),
                        new ChildNumber(1, false),
                        new ChildNumber(2, true),
                        new ChildNumber(2, false),
                    ],
                    'xprvA2JDeKCSNNZky6uBCviVfJSKyQ1mDYahRjijr5idH2WwLsEd4Hsb2Tyh8RfQMuPh7f7RtyzTtdrbdqqsunu5Mm3wDvUAKRHSC34sJ7in334',
                    'xpub6FHa3pjLCk84BayeJxFW2SP4XRrFd1JYnxeLeU8EqN3vDfZmbqBqaGJAyiLjTAwm6ZLRQUMv1ZACTj37sR62cfN7fe5JnJ7dh8zL4fiyLHV',
                ),
                new DerivedTestCase(
                    'Test1 m/0H/1/2H/2/1000000000',
                    [
                        new ChildNumber(0, true),
                        new ChildNumber(1, false),
                        new ChildNumber(2, true),
                        new ChildNumber(2, false),
                        new ChildNumber(1000000000, false),
                    ],
                    'xprvA41z7zogVVwxVSgdKUHDy1SKmdb533PjDz7J6N6mV6uS3ze1ai8FHa8kmHScGpWmj4WggLyQjgPie1rFSruoUihUZREPSL39UNdE3BBDu76',
                    'xpub6H1LXWLaKsWFhvm6RVpEL9P4KfRZSW7abD2ttkWP3SSQvnyA8FSVqNTEcYFgJS2UaFcxupHiYkro49S8yGasTvXEYBVPamhGW6cFJodrTHy',
                ),
            ],
        ),
        new HDWTestVector(
            'fffcf9f6f3f0edeae7e4e1dedbd8d5d2cfccc9c6c3c0bdbab7b4b1aeaba8a5a29f9c999693908d8a8784817e7b7875726f6c696663605d5a5754514e4b484542',
            'xprv9s21ZrQH143K31xYSDQpPDxsXRTUcvj2iNHm5NUtrGiGG5e2DtALGdso3pGz6ssrdK4PFmM8NSpSBHNqPqm55Qn3LqFtT2emdEXVYsCzC2U',
            'xpub661MyMwAqRbcFW31YEwpkMuc5THy2PSt5bDMsktWQcFF8syAmRUapSCGu8ED9W6oDMSgv6Zz8idoc4a6mr8BDzTJY47LJhkJ8UB7WEGuduB',
            [
                new DerivedTestCase(
                    'Test2 m/0',
                    [new ChildNumber(0, false)],
                    'xprv9vHkqa6EV4sPZHYqZznhT2NPtPCjKuDKGY38FBWLvgaDx45zo9WQRUT3dKYnjwih2yJD9mkrocEZXo1ex8G81dwSM1fwqWpWkeS3v86pgKt',
                    'xpub69H7F5d8KSRgmmdJg2KhpAK8SR3DjMwAdkxj3ZuxV27CprR9LgpeyGmXUbC6wb7ERfvrnKZjXoUmmDznezpbZb7ap6r1D3tgFxHmwMkQTPH',
                ),
                new DerivedTestCase(
                    'Test2 m/0/2147483647H',
                    [new ChildNumber(0, false), new ChildNumber(2147483647, true)],
                    'xprv9wSp6B7kry3Vj9m1zSnLvN3xH8RdsPP1Mh7fAaR7aRLcQMKTR2vidYEeEg2mUCTAwCd6vnxVrcjfy2kRgVsFawNzmjuHc2YmYRmagcEPdU9',
                    'xpub6ASAVgeehLbnwdqV6UKMHVzgqAG8Gr6riv3Fxxpj8ksbH9ebxaEyBLZ85ySDhKiLDBrQSARLq1uNRts8RuJiHjaDMBU4Zn9h8LZNnBC5y4a',
                ),
                new DerivedTestCase(
                    'Test2 m/0/2147483647H/1',
                    [
                        new ChildNumber(0, false),
                        new ChildNumber(2147483647, true),
                        new ChildNumber(1, false),
                    ],
                    'xprv9zFnWC6h2cLgpmSA46vutJzBcfJ8yaJGg8cX1e5StJh45BBciYTRXSd25UEPVuesF9yog62tGAQtHjXajPPdbRCHuWS6T8XA2ECKADdw4Ef',
                    'xpub6DF8uhdarytz3FWdA8TvFSvvAh8dP3283MY7p2V4SeE2wyWmG5mg5EwVvmdMVCQcoNJxGoWaU9DCWh89LojfZ537wTfunKau47EL2dhHKon',
                ),
                new DerivedTestCase(
                    'Test2 m/0/2147483647H/1/2147483646H',
                    [
                        new ChildNumber(0, false),
                        new ChildNumber(2147483647, true),
                        new ChildNumber(1, false),
                        new ChildNumber(2147483646, true),
                    ],
                    'xprvA1RpRA33e1JQ7ifknakTFpgNXPmW2YvmhqLQYMmrj4xJXXWYpDPS3xz7iAxn8L39njGVyuoseXzU6rcxFLJ8HFsTjSyQbLYnMpCqE2VbFWc',
                    'xpub6ERApfZwUNrhLCkDtcHTcxd75RbzS1ed54G1LkBUHQVHQKqhMkhgbmJbZRkrgZw4koxb5JaHWkY4ALHY2grBGRjaDMzQLcgJvLJuZZvRcEL',
                ),
                new DerivedTestCase(
                    'Test2 m/0/2147483647H/1/2147483646H/2',
                    [
                        new ChildNumber(0, false),
                        new ChildNumber(2147483647, true),
                        new ChildNumber(1, false),
                        new ChildNumber(2147483646, true),
                        new ChildNumber(2, false),
                    ],
                    'xprvA2nrNbFZABcdryreWet9Ea4LvTJcGsqrMzxHx98MMrotbir7yrKCEXw7nadnHM8Dq38EGfSh6dqA9QWTyefMLEcBYJUuekgW4BYPJcr9E7j',
                    'xpub6FnCn6nSzZAw5Tw7cgR9bi15UV96gLZhjDstkXXxvCLsUXBGXPdSnLFbdpq8p9HmGsApME5hQTZ3emM2rnY5agb9rXpVGyy3bdW6EEgAtqt',
                ),
            ],
        ),
        new HDWTestVector(
            '4b381541583be4423346c643850da4b320e46a87ae3d2a4e6da11eba819cd4acba45d239319ac14f863b8d5ab5a0d0c64d2e8a1e7d1457df2e5a3c51c73235be',
            'xprv9s21ZrQH143K25QhxbucbDDuQ4naNntJRi4KUfWT7xo4EKsHt2QJDu7KXp1A3u7Bi1j8ph3EGsZ9Xvz9dGuVrtHHs7pXeTzjuxBrCmmhgC6',
            'xpub661MyMwAqRbcEZVB4dScxMAdx6d4nFc9nvyvH3v4gJL378CSRZiYmhRoP7mBy6gSPSCYk6SzXPTf3ND1cZAceL7SfJ1Z3GC8vBgp2epUt13',
            [
                new DerivedTestCase(
                    'Test3 m/0H',
                    [new ChildNumber(0, true)],
                    'xprv9uPDJpEQgRQfDcW7BkF7eTya6RPxXeJCqCJGHuCJ4GiRVLzkTXBAJMu2qaMWPrS7AANYqdq6vcBcBUdJCVVFceUvJFjaPdGZ2y9WACViL4L',
                    'xpub68NZiKmJWnxxS6aaHmn81bvJeTESw724CRDs6HbuccFQN9Ku14VQrADWgqbhhTHBaohPX4CjNLf9fq9MYo6oDaPPLPxSb7gwQN3ih19Zm4Y',
                ),
            ],
        ),
    ];

    function testVector(testCase: number) {
        const tv = tvs[testCase];
        const params = MainNetParams.get();
        const masterPrivateKey = HDKeyDerivation.createMasterPrivateKey(
            Utils.HEX.decode(tv.seed),
        );
        expect(testEncode(tv.priv)).toBe(
            testEncode(masterPrivateKey.serializePrivB58(params)),
        );
        expect(testEncode(tv.pub)).toBe(
            testEncode(masterPrivateKey.serializePubB58(params)),
        );
        const dh = new DeterministicHierarchy(masterPrivateKey);
        for (let i = 0; i < tv.derived.length; i++) {
            const tc = tv.derived[i];
            expect(tc.name).toBe(
                `Test${testCase + 1} ${tc.getPathDescription()}`,
            );
        const ehkey = dh.get(tc.path, false, true);
        expect(testEncode(tc.priv)).toBe(testEncode(ehkey.serializePrivB58(params)));
        expect(testEncode(tc.pub)).toBe(testEncode(ehkey.serializePubB58(params)));
        }
    }

    function testEncode(what: string): string {
        return Utils.HEX.encode(Base58.decodeChecked(what));
    }

    test('testVector1', () => {
        testVector(0);
    });

    test('testVector2', () => {
        testVector(1);
    });

    test('testVector3', () => {
        testVector(2);
    });
});
