import { beforeEach, describe, expect, test } from "vitest";
import { Address } from "../../src/net/bigtangle/core/Address";
import { Block } from "../../src/net/bigtangle/core/Block";
 
import { Coin } from "../../src/net/bigtangle/core/Coin";
import { ECKey } from "../../src/net/bigtangle/core/ECKey";
import { MemoInfo } from "../../src/net/bigtangle/core/MemoInfo";
 import { Wallet } from "../../src/net/bigtangle/wallet/Wallet";

import { TokenType } from "../../src/net/bigtangle/core/TokenType";
import { RemoteTest } from "./Remote.test";
import { ReqCmd } from "../../src/net/bigtangle/params/ReqCmd";
import { OkHttp3Util } from "../../src/net/bigtangle/utils/OkHttp3Util";
import { Utils } from "net/bigtangle/core/Utils";
import { sign } from "crypto";
 

class RemoteBinaryTests extends RemoteTest {}

describe("RemoteBinaryTests", () => {
  const tests = new RemoteBinaryTests();

  beforeEach(async () => {
    await tests.setUp();
  });

  test("testSerial", async () => {
    const tip =
      "01000000e77a339d8071a8dbe981b90b24ecb1242b11bf0174adf22e3f692a87f29a8e00e77a339d8071a8dbe981b90b24ecb1242b11bf0174adf22e3f692a87f29a8e004950c4d32a1307cfd34d985df710aa6ab50f621d5886ba47dcd650878a43083dde64cc6800000000ae470120000000000100000000000000d6c35def2bdf6a05a961cf27a47355486891ebb9ee6892f8010000000500000000000000010100000001ebdff912fe2010ff28c88e6d9ab0edc2c5622dd2d5e08769c73b810c6d44f900170dafec26b25ed20a2c87d485de589c57fc1b32e65a37ea970feb15142b5f1a010000004847304402204e1b0beb9146786dad6cfc3ea21dc36ffc2bea79396e0f152fffedc96fd07bf002200f41b26a7185df0c8acc66eb99c911960b26230ededb07b564daae0013f817e901ffffffff0100000008016345785d7ab9d801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d0000000001000000615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601615d21aacd5c6b11571f3a69c9ed408690ea05f063e8ad31a945ecda22261601fe8dc42e887a46b4e27969a74e256eadfc34678e03b7aa41da2c9bce36f9e01469d48f6800000000ae470120000000000200000000000000052c62022bdf6a05a961cf27a47355486891ebb9ee6892f8010000000600000000000000010100000001bb0977b65088b48bd069b86f55e652cf68240f1ddb744d0199ddc7ef09db8c0035309ef47df86bf23613939e14169e8df8605cde1b92c8916849837e696516ad0100000049483045022100fa7d6a086c244d84f942049c8e24d6f9f854ab85abce4eeaa77be984040e00d302204f5aa11ea921d718f133679b558c016763f0c9995156baed5dcd8033a1b1838e01ffffffff0100000008016345785d6b73b001bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac02030f424001bc1976a91451d65cb4f2e64551c447cd41635dd9214bbaf19d88ac08016345785d5c2d8801bc232102721b5eb0282e4bc86aab3380e2bba31d935cba386741c15447973432c61bc975ac00000000000000000000000000000000420000007b0a2020226b7622203a205b207b0a20202020226b657922203a20226d656d6f222c0a202020202276616c756522203a20227061794c697374220a20207d205d0a7d00000000";

    // Create a serializer with parseRetain set to true
    const serializer = tests.networkParameters.getSerializer(true);
    const block = serializer.makeBlock(Buffer.from(tip, "hex"));
 
  

     expect(Utils.HEX.encode(block.bitcoinSerialize())).toEqual(tip);

    console.log(block.toString());
    // Post to the server
    const url = tests.contextRoot + (ReqCmd.saveBlock || "/saveBlock");
    
      OkHttp3Util.post(url, Buffer.from(block.bitcoinSerialize()));
  });
});
