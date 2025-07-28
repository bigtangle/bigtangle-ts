import { Block } from './Block';
import { NetworkParameters } from '../params/NetworkParameters';
import { Sha256Hash } from './Sha256Hash';
import { BlockType } from './BlockType';
import { Coin } from './Coin';
import { Constants } from './Constants';
import { VerificationException } from '../exception/VerificationException';
import { TokenInfo } from './TokenInfo';
import { MemoInfo } from './MemoInfo';
import { ECKey } from './ECKey'; // Import ECKey
import { Utils } from './Utils'; // Import Utils
import bigInt from 'big-integer'; // Import big-integer

export class UtilGeneseBlock {
    // Define a static ECKey for the genesis address for testing purposes
    private static genesisKey: ECKey = ECKey.fromPrivate(bigInt('18E14A7B6A307F426A94F8114701E7C8E774E7F9A47E2C2035DB29A206321725', 16));

    public static createGenesis(params: NetworkParameters): Block {
        const block = new Block(params, NetworkParameters.BLOCK_VERSION_GENESIS);
        // Set fixed time for deterministic genesis block
        block.setTime(0);
        // Use the public key hash from the genesisKey for the miner address
        block.setMinerAddress(Buffer.from(UtilGeneseBlock.genesisKey.getPubKeyHash()));
        block.setPrevBlockHash(Sha256Hash.ZERO_HASH);
        block.setPrevBranchBlockHash(Sha256Hash.ZERO_HASH);
        block.setBlockType(BlockType.BLOCKTYPE_INITIAL);
        block.setHeight(0);
        block.addCoinbaseTransaction(
            // Use the public key bytes from the genesisKey for the coinbase transaction
            Buffer.from(UtilGeneseBlock.genesisKey.getPubKey()),
            Coin.valueOf(BigInt('10000000000000000'), Constants.BIGTANGLE_TOKENID),
            null as unknown as TokenInfo, // Cast to TokenInfo | null
            null as unknown as MemoInfo // Cast to MemoInfo | null
        );
        // For genesis block, set difficulty target to 0 for deterministic behavior
        block.setDifficultyTarget(0);
        // Don't solve genesis block as it should have fixed values
        try {
            block.verifyHeader();
        } catch (e: unknown) {
            if (e instanceof VerificationException) {
                throw new Error(e.message);
            } else {
                throw e;
            }
        }
        return block;
    }
}
