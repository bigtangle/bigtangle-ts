import { JsonStringifier, JsonParser } from 'jackson-js';
import { Sha256Hash } from './Sha256Hash';
import { Buffer } from 'buffer';

export class Sha256HashSerializer extends JsonStringifier<Sha256Hash> {
  public stringify(value: Sha256Hash, context: any, mainContext: any): string {
    return JSON.stringify(value.getBytes());
  }
}

export class Sha256HashDeserializer extends JsonParser<Sha256Hash> {
  public parse(value: any, context: any, mainContext: any): Sha256Hash {
    return Sha256Hash.wrap(Buffer.from(JSON.parse(value)));
  }
}
