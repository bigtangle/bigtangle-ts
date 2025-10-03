import bigInt from 'big-integer';
import * as secp256k1 from 'secp256k1';

// Curve parameters for secp256k1
// The curve order n is a well-known constant
const CURVE_N_HEX = "fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141";

// Export curve parameters
export const CURVE = {
    n: bigInt(CURVE_N_HEX, 16),
    // g is not directly used in this implementation, but keeping for compatibility
    g: null,
};

// HALF_CURVE_ORDER = CURVE.n.shiftRight(1)
export const HALF_CURVE_ORDER = CURVE.n.shiftRight(1);
