import { TestParams } from './net/bigtangle/params/TestParams';
import { UtilGeneseBlock } from './net/bigtangle/core/UtilGeneseBlock';
import { Utils } from './net/bigtangle/utils/Utils';
import { Buffer } from 'buffer';

// Create genesis block
const PARAMS = TestParams.get();
const gen = UtilGeneseBlock.createGenesis(PARAMS);

console.log("Genesis Block:");
console.log(gen.toString());

// Serialize the block
const blockBytes = Buffer.from(gen.unsafeBitcoinSerialize());
const serializedHex = Utils.HEX.encode(blockBytes);

console.log("\nSerialized Block Hex:");
console.log(serializedHex);

// Expected hex from the Java test
const blockHex =
  "01000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008b404ea4787ac1af3c007dc3462b9875d320ee983690b649d9c564da7a4c38d56d235e5b00000000ae47012000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001010000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ffffffff00ffffffff000000000108016345785d8a000001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac000000000000000036000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000200147ae0000000000000000000000000000";

console.log("\nExpected Block Hex:");
console.log(blockHex);

console.log("\nDo they match?");
console.log(serializedHex === blockHex);

// Let's also check the length
console.log(`\nLength of serialized block: ${blockBytes.length}`);
console.log(`Length of expected block: ${blockHex.length / 2}`);