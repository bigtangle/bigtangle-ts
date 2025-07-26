
import { Buffer } from 'buffer';
import { Block } from '../../src/net/bigtangle/core/Block';
import { Utils } from '../../src/net/bigtangle/core/Utils';
import { Gzip } from '../../src/net/bigtangle/utils/Gzip';
import { NetworkParameters } from '../../src/net/bigtangle/params/NetworkParameters';
import { UtilGeneseBlock } from '../../src/net/bigtangle/core/UtilGeneseBlock';
import { TestParams } from '../../src/net/bigtangle/params/TestParams';

describe('UtilsTest', () => {
    test('testSolve', () => {
        for (let i = 0; i < 20; i++) {
            const block = UtilsTest.createBlock(
                TestParams.get(),
                UtilGeneseBlock.createGenesis(TestParams.get()),
                UtilGeneseBlock.createGenesis(TestParams.get())
            );
            console.time('Solve time');
            block.solve(block.getDifficultyTargetAsInteger());
            console.timeEnd('Solve time');
        }
    });

    // test('testSolveMain', () => {
    //     for (let i = 0; i < 20; i++) {
    //         const block = UtilsTest.createBlock(
    //             MainNetParams.get(),
    //             UtilGeneseBlock.createGenesis(MainNetParams.get()),
    //             UtilGeneseBlock.createGenesis(MainNetParams.get())
    //         );
    //         console.time('Solve time');
    //         block.solve();
    //         console.timeEnd('Solve time');
    //     }
    // });

    // test('testSolveMainReward', () => {
    //     for (let i = 0; i < 20; i++) {
    //         const block = UtilsTest.createBlock(
    //             MainNetParams.get(),
    //             UtilGeneseBlock.createGenesis(MainNetParams.get()),
    //             UtilGeneseBlock.createGenesis(MainNetParams.get())
    //         );
    //         console.time('Solve time');
    //         block.solveDifficult(MainNetParams.get().getMaxTargetReward());
    //         console.timeEnd('Solve time');
    //     }
    // });

    test('testReverseBytes', () => {
        expect(
            Buffer.compare(
                Buffer.from([1, 2, 3, 4, 5]),
                Utils.reverseBytes(Buffer.from([5, 4, 3, 2, 1])),
            ),
        ).toBe(0);
    });

    test('testReverseDwordBytes', () => {
        // Test case for reversing an 8-byte buffer in dword chunks
        expect(
            Buffer.compare(
                Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]),
                Utils.reverseDwordBytes(Buffer.from([4, 3, 2, 1, 8, 7, 6, 5]), 8), // Changed -1 to 8
            ),
        ).toBe(0);
        // Test case for reversing a 4-byte prefix in dword chunks
        expect(
            Buffer.compare(
                Buffer.from([1, 2, 3, 4]),
                Utils.reverseDwordBytes(Buffer.from([4, 3, 2, 1, 8, 7, 6, 5]), 4),
            ),
        ).toBe(0);
        // Test case for length 0, expecting an empty buffer
        expect(
            Buffer.compare(
                Buffer.from([]),
                Utils.reverseDwordBytes(Buffer.from([4, 3, 2, 1, 8, 7, 6, 5]), 0),
            ),
        ).toBe(0);
        // Test case for empty input buffer and length 0
        expect(
            Buffer.compare(Buffer.from([]), Utils.reverseDwordBytes(Buffer.from([]), 0)),
        ).toBe(0);
        // Add a test case for negative length, expecting an empty buffer
        expect(
            Buffer.compare(
                Buffer.from([]),
                Utils.reverseDwordBytes(Buffer.from([4, 3, 2, 1, 8, 7, 6, 5]), -1),
            ),
        ).toBe(0);
    });

    test('testMaxOfMostFreq', () => {
        expect(Utils.maxOfMostFreq()).toBe(0);
        expect(Utils.maxOfMostFreq(0, 0, 1)).toBe(0);
        expect(Utils.maxOfMostFreq(1, 1, 2, 2)).toBe(2);
        expect(Utils.maxOfMostFreq(1, 1, 2, 2, 1)).toBe(1);
        expect(Utils.maxOfMostFreq(-1, -1, 2, 2, -1)).toBe(-1);
    });

    test('compactEncoding', () => {
        expect(Utils.decodeCompactBits(0x05123456)).toBe(BigInt('0x1234560000'));
        expect(Utils.decodeCompactBits(0x0600c0de)).toBe(BigInt('0xc0de000000'));
        expect(Utils.encodeCompactBits(BigInt('0x1234560000'))).toBe(0x05123456);
        expect(Utils.encodeCompactBits(BigInt('0xc0de000000'))).toBe(0x0600c0de);
    });

    test('dateTimeFormat', () => {
        expect(Utils.dateTimeFormat(1416135273781)).toBe('2014-11-16T10:54:33Z');
        expect(Utils.dateTimeFormat(new Date(1416135273781))).toBe(
            '2014-11-16T10:54:33Z',
        );
    });

    test('gzip', async () => {
        const b = Buffer.from('Hallo', 'utf-8');
        const compressed = await Gzip.compress(b);
        const decompressed = await Gzip.decompressOut(compressed);
        expect(Buffer.compare(decompressed, b)).toBe(0);
    });
});

export class UtilsTest {
    public static createBlock(
        params: NetworkParameters,
        prevBlock: Block,
        branchBlock: Block,
    ): Block {
        return UtilsTest.createNextBlock(
            prevBlock,
            branchBlock,
            NetworkParameters.BLOCK_VERSION_GENESIS,
            // Use a valid test address for our network
            Buffer.from('0000000000000000000000000000000000000000', 'hex'),
        );
    }

    /**
     * Returns a solved, valid empty block that builds on top of this one and
     * the specified other Block.
     */
    public static createNextBlock(
        prevBlock: Block,
        branchBlock: Block,
        version: number,
        mineraddress: Buffer,
    ): Block {
        // Use a static factory method to create the Block instance
        const b = new Block(prevBlock.getParams(), version);

        b.setMinerAddress(mineraddress);
        b.setPrevBlockHash(prevBlock.getHash());
        b.setPrevBranchBlockHash(branchBlock.getHash());

        // Set difficulty according to previous consensus
        // only BLOCKTYPE_REWARD and BLOCKTYPE_INITIAL should overwrite this
        b.setLastMiningRewardBlock(
            Math.max(
                prevBlock.getLastMiningRewardBlock(),
                branchBlock.getLastMiningRewardBlock(),
            ),
        );
        b.setDifficultyTarget(
            prevBlock.getLastMiningRewardBlock() >=
                branchBlock.getLastMiningRewardBlock()
                ? prevBlock.getDifficultyTarget()
                : branchBlock.getDifficultyTarget(),
        );

        b.setHeight(Math.max(prevBlock.getHeight(), branchBlock.getHeight()) + 1);

        // Don't let timestamp go backwards
        const currTime = Math.floor(Date.now() / 1000);
        const minTime = Math.max(currTime, branchBlock.getTimeSeconds());
        if (currTime >= minTime) b.setTime(currTime + 1);
        else b.setTime(minTime);
        b.solve(b.getDifficultyTargetAsInteger());
        try {
            b.verifyHeader();
        } catch (e: unknown) {
            throw new Error(String(e));
        }
        if (b.getVersion() !== version) {
            throw new Error('Block version mismatch');
        }
        return b;
    }
}
