import { BigInteger  } from 'big-integer';

/**
 * Classes implementing this interface represent a monetary value, such as a Bitcoin or fiat amount.
 */
export interface Monetary {
    /**
     * Returns the number of "smallest units" of this monetary value. For Bitcoin, this would be the number of satoshis.
     */
    getValue(): BigInteger;

    signum(): number;
}