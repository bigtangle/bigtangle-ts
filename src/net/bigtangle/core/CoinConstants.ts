import { Coin } from "./Coin";
import { NetworkParameters } from "../params/NetworkParameters";

// Internal cache for constants to avoid repeated object creation
let _ZERO: Coin | null = null;
let _COIN: Coin | null = null;
let _SATOSHI: Coin | null = null;
let _NEGATIVE_SATOSHI: Coin | null = null;
let _FEE_DEFAULT: Coin | null = null;

/**
 * Factory class for Coin constants to avoid circular dependency issues
 * during module initialization due to static initialization order.
 */
export class CoinConstants {
  public static get ZERO(): Coin {
    _ZERO ??= Coin.valueOfString(0n, "bc");
    return _ZERO;
  }

  public static get COIN(): Coin {
    _COIN ??= Coin.valueOfString(1000000n, "bc");
    return _COIN;
  }

  public static get SATOSHI(): Coin {
    _SATOSHI ??= Coin.valueOfString(1n, "bc");
    return _SATOSHI;
  }

  public static get NEGATIVE_SATOSHI(): Coin {
    _NEGATIVE_SATOSHI ??= Coin.valueOfString(-1n, "bc");
    return _NEGATIVE_SATOSHI;
  }

  public static get FEE_DEFAULT(): Coin {
    _FEE_DEFAULT ??= Coin.valueOfString(1000n, "bc");
    return _FEE_DEFAULT;
  }

  /**
   * Resets all cached constants (useful for testing)
   */
  public static reset(): void {
    _ZERO = null;
    _COIN = null;
    _SATOSHI = null;
    _NEGATIVE_SATOSHI = null;
    _FEE_DEFAULT = null;
  }

  /**
   * Creates a standard Coin value with appropriate token ID
   */
  public static createStandardCoin(satoshis: bigint): Coin {
    return Coin.valueOf(satoshis, NetworkParameters.getBIGTANGLE_TOKENID());
  }
}

export default CoinConstants;