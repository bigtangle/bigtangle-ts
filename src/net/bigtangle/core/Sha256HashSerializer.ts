import { JsonStringifier, JsonParser } from 'jackson-js';
import { Sha256Hash } from './Sha256Hash';
import { Buffer } from 'buffer';

export class Sha256HashSerializer extends JsonStringifier<Sha256Hash> {
  public stringify(value: Sha256Hash): string {
    return JSON.stringify(value.getBytes().toString('hex'));
  }
}

export class Sha256HashDeserializer extends JsonParser<Sha256Hash> {
  public parse(value: any): Sha256Hash {
    const hexString = JSON.parse(value);
    const hash = Sha256Hash.wrap(Buffer.from(hexString, 'hex'));
    if (hash === null) {
      throw new Error('Invalid hash');
    }
    return hash;
  }
}
