import { scrypt } from 'scrypt-js';
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { EncryptionType } from './EncryptableItem';
import { KeyParameter, KeyCrypter } from './KeyCrypter';
import { EncryptedData } from './EncryptedData';

export interface ScryptParameters {
  N: number;
  r: number;
  p: number;
  salt: Uint8Array;
}

export class KeyCrypterScrypt implements KeyCrypter {
  // Add the required method from KeyCrypter interface
  getUnderstoodEncryptionType(): EncryptionType {
    return EncryptionType.ENCRYPTED_SCRYPT_AES;
  }
  static readonly KEY_LENGTH = 32;
  static readonly BLOCK_LENGTH = 16;
  static readonly SALT_LENGTH = 8;

  private readonly scryptParameters: ScryptParameters;

  constructor(params?: Partial<ScryptParameters> & { salt?: Uint8Array }) {
    const salt = params?.salt ?? KeyCrypterScrypt.randomSalt();
    this.scryptParameters = {
      N: params?.N ?? 16384,
      r: params?.r ?? 8,
      p: params?.p ?? 1,
      salt,
    };
  }

  static randomSalt(): Uint8Array {
    return randomBytes(KeyCrypterScrypt.SALT_LENGTH);
  }

  async deriveKey(password: string): Promise<KeyParameter> {
    const passwordBytes = Buffer.from(password, 'utf8');
    const { N, r, p, salt } = this.scryptParameters;

    const key = await scrypt(passwordBytes, salt, N, r, p, KeyCrypterScrypt.KEY_LENGTH);
    return { key: new Uint8Array(key) };
  }

  async encrypt(plainBytes: Uint8Array, aesKey: KeyParameter): Promise<EncryptedData> {
    const keyBytes = aesKey.key;
    const iv = randomBytes(KeyCrypterScrypt.BLOCK_LENGTH);
    const cipher = createCipheriv('aes-256-cbc', keyBytes, iv);
    const encrypted = Buffer.concat([cipher.update(plainBytes), cipher.final()]);
    return new EncryptedData(iv, new Uint8Array(encrypted));
  }

  async decrypt(data: EncryptedData, aesKey: KeyParameter): Promise<Uint8Array> {
    const { initialisationVector: iv, encryptedBytes } = data;
    const keyBytes = aesKey.key;
    const decipher = createDecipheriv('aes-256-cbc', keyBytes, iv);
    const decrypted = Buffer.concat([
      decipher.update(encryptedBytes),
      decipher.final(),
    ]);
    return new Uint8Array(decrypted);
  }

  getScryptParameters(): ScryptParameters {
    return this.scryptParameters;
  }

  static convertToByteArray(str: string): Uint8Array {
    // UTF-16 to byte array
    const buf = new Uint8Array(str.length * 2);
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      buf[i * 2] = code >> 8;
      buf[i * 2 + 1] = code & 0xff;
    }
    return buf;
  }

  toString(): string {
    return `AES-256-CBC, Scrypt (N: ${this.scryptParameters.N})`;
  }

  equals(other: KeyCrypter): boolean {
    if (other instanceof KeyCrypterScrypt) {
      return (
        Buffer.compare(
          Buffer.from(this.scryptParameters.salt),
          Buffer.from(other.scryptParameters.salt)
        ) === 0 &&
        this.scryptParameters.N === other.scryptParameters.N &&
        this.scryptParameters.r === other.scryptParameters.r &&
        this.scryptParameters.p === other.scryptParameters.p
      );
    }
    return false;
  }

  hashCode(): number {
    // Simple hashCode using sum of bytes + scrypt params
    const saltSum = this.scryptParameters.salt.reduce((acc, v) => acc + v, 0);
    return saltSum + this.scryptParameters.N + this.scryptParameters.r + this.scryptParameters.p;
  }
}
