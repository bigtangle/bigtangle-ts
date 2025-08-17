import { Block } from './Block';
import { NetworkParameters } from '../params/NetworkParameters';
import { Sha256Hash } from './Sha256Hash';
import { BlockType } from './BlockType';
import { Coin } from './Coin';
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
        const block = Block.setBlock7(params, Sha256Hash.ZERO_HASH, Sha256Hash.ZERO_HASH,
            BlockType.BLOCKTYPE_INITIAL, 0, Utils.encodeCompactBits(params.getMaxTarget()), 0);
        block.setHeight(0);
        // Use the public key hash from the genesisKey for the miner address
        block.setMinerAddress(Buffer.from(UtilGeneseBlock.genesisKey.getPubKeyHash()));
        block.addCoinbaseTransaction(
            // Use the public key bytes from the genesisKey for the coinbase transaction
            Buffer.from(UtilGeneseBlock.genesisKey.getPubKey()),
            Coin.valueOf(BigInt('10000000000000000'), NetworkParameters.getBIGTANGLE_TOKENID() ),
            null as unknown as TokenInfo, // Cast to TokenInfo | null
            null as unknown as MemoInfo // Cast to MemoInfo | null
        );
        // For genesis block, we don't need to solve it, just set a valid difficulty target
        block.setDifficultyTarget(Utils.encodeCompactBits(params.getMaxTarget()));
        // Since this is a genesis block, we don't need to solve it
        try {
            block.verifyHeader();
        } catch (e: unknown) {
            if (e instanceof VerificationException) {
                throw new Error(e.message);
            } else {
                throw e;
            }
        }
        // Debug: print serialized genesis block length/hex to diagnose header size mismatch
        try {
            console.log(`UtilGeneseBlock.createGenesis: block.length=${block.getLength()}`);
            console.log(`UtilGeneseBlock.createGenesis: transactions=${block.getTransactions().length}`);
            if (block.getTransactions().length > 0) {
                const tx = block.getTransactions()[0];
                console.log(`UtilGeneseBlock.createGenesis: firstTx.outputs=${tx.getOutputs().length}`);
                console.log(`UtilGeneseBlock.createGenesis: firstTx.inputs=${tx.getInputs().length}`);
            }
            const ser = block.bitcoinSerialize();
            console.log(`UtilGeneseBlock.createGenesis: serialized length=${ser.length}`);
            const fullHex = Buffer.from(ser).toString('hex');
            console.log(`UtilGeneseBlock.createGenesis: fullHex=${fullHex}`);
            // If it's large enough, print header vs transactions split
            if (ser.length >= 168) {
                const hdr = Buffer.from(ser.slice(0, 168)).toString('hex');
                const trx = Buffer.from(ser.slice(168)).toString('hex');
                console.log(`UtilGeneseBlock.createGenesis: headerHex=${hdr}`);
                console.log(`UtilGeneseBlock.createGenesis: txHex=${trx}`);
            } else {
                console.log('UtilGeneseBlock.createGenesis: serialized < 168 bytes; full payload shown');
            }
        } catch (e) {
            console.error('UtilGeneseBlock.createGenesis: error serializing genesis', e);
        }
        return block;
    }
}
