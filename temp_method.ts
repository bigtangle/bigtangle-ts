  public bitcoinSerializeToStream(stream: any): void {
    checkNotNull(this.scriptBytes);

    const valuebytes = new BigIntegerConverter(
      this.value.getValue()
    ).toByteArray();
    stream.write(new VarInt(valuebytes.length).encode());
    stream.write(valuebytes);

    // Write the tokenid with length prefix
    const tokenid = this.value.getTokenid();
    stream.write(new VarInt(tokenid.length).encode());
    stream.write(tokenid);

    // Write the script with length prefix
    stream.write(new VarInt(this.scriptBytes.length).encode());
    stream.write(this.scriptBytes);
  }