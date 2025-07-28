import { Buffer } from 'buffer';
import { Block } from '../../src/net/bigtangle/core/Block';
import { NetworkParameters } from '../../src/net/bigtangle/params/NetworkParameters';
import { UtilGeneseBlock } from '../../src/net/bigtangle/core/UtilGeneseBlock';
import { Utils } from '../../src/net/bigtangle/core/Utils';

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
        const b = new Block(prevBlock.getParams()!, version);

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
        
        // For testing purposes, if both previous blocks have difficulty target 0 (genesis blocks),
        // set a reasonable difficulty target for the new block
        let difficultyTarget = prevBlock.getLastMiningRewardBlock() >= branchBlock.getLastMiningRewardBlock()
            ? prevBlock.getDifficultyTarget()
            : branchBlock.getDifficultyTarget();
            
        // If difficulty target is 0 (from genesis block), set a test value
        if (difficultyTarget === 0) {
            difficultyTarget = Utils.encodeCompactBits(BigInt("0x1d00ffff")); // Standard test difficulty
        }
        
        b.setDifficultyTarget(difficultyTarget);

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
