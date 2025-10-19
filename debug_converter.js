// Test file to debug the actual BigIntegerConverter issue
const fs = require('fs');

// Read the BigIntegerConverter file and eval parts of it 
const code = fs.readFileSync('/home/jcui/git/bigtangle-ts/src/net/bigtangle/core/BigIntegerConverter.ts', 'utf8');

// Extract just the class definition we need for testing
const classMatch = code.match(/class BigIntegerConverter \{[\s\S]*?export \{/);
if (classMatch) {
  const classCode = classMatch[0].replace('export {', '');
  
  // Create a test version
  const testCode = `
  ${classCode}
  
  // Test function
  function test() {
    const originalValue = 10000000n;
    console.log('Testing value:', originalValue);
    
    const converter = new BigIntegerConverter(originalValue);
    const bytes = converter.toByteArray();
    console.log('Serialized bytes:', Array.from(bytes));
    
    const deserialized = BigIntegerConverter.fromByteArray(bytes);
    const result = deserialized.getValue();
    console.log('Deserialized value:', result);
    console.log('Match:', originalValue === result);
  }
  
  test();
  `;
  
  // Write to a temporary file and run it
  fs.writeFileSync('/tmp/bigIntegerTest.js', testCode);
  require('/tmp/bigIntegerTest.js');
}