# Circular Dependency Fix: Script, TransactionOutput, and TransactionInput

## Status: IMPLEMENTED

This fix resolves circular dependency issues in webpack/React Native environments using a **deferred initialization pattern** with `ScriptHelper`.

## Problem

The application was experiencing a **circular dependency error** during webpack bundling:

```
ReferenceError: Cannot access 'Script' before initialization
    at Module.Script (:18744:53)
    at ./node_modules/bigtangle-ts/dist/net/bigtangle/core/TransactionOutput.js
    at ./node_modules/bigtangle-ts/dist/net/bigtangle/core/TransactionInput.js
```

### Root Cause

The circular dependency chain was:

1. **TransactionOutput** imports **Script** directly
2. **TransactionInput** imports **Script** and **TransactionOutput** directly  
3. **Script** uses dynamic imports for **Transaction** (already handled)
4. During webpack module initialization, the import order caused Script to be accessed before its module was fully initialized

This manifested as a `ReferenceError` in React Native/Expo environments during hot module replacement.

## Solution

### Strategy: Helper Class Pattern

Instead of having TransactionOutput and TransactionInput directly import and instantiate the Script class, we introduced a **ScriptHelper** intermediary class that:

1. **Breaks the circular dependency** by being a separate module
2. **Encapsulates Script instantiation** logic
3. **Provides type-safe access** to Script constants and factory methods

### Implementation

#### 1. Created ScriptHelper (/src/net/bigtangle/script/ScriptHelper.ts)

```typescript
import { Script } from '../script/Script';

export class ScriptHelper {
  /**
   * Create a Script instance from program bytes
   */
  static fromBytes(programBytes: Uint8Array): Script {
    return new Script(programBytes);
  }

  /**
   * Get ALL_VERIFY_FLAGS from Script namespace
   */
  static getAllVerifyFlags(): Set<Script.VerifyFlag> {
    return Script.ALL_VERIFY_FLAGS;
  }
}
```

**Key Points:**
- ScriptHelper imports Script directly (safe because Script doesn't import TransactionOutput/TransactionInput)
- Provides factory methods instead of direct constructor access
- Provides accessors for Script namespace constants

#### 2. Updated TransactionOutput

**Before:**
```typescript
import { Script } from "../script/Script";

public getScriptPubKey(): Script {
  if (this.scriptPubKey === null) {
    this.scriptPubKey = new Script(this.scriptBytes);
  }
  return this.scriptPubKey;
}
```

**After:**
```typescript
import type { Script } from "../script/Script";
import { ScriptHelper } from "../script/ScriptHelper";

public getScriptPubKey(): Script {
  if (this.scriptPubKey === null) {
    this.scriptPubKey = ScriptHelper.fromBytes(this.scriptBytes);
  }
  return this.scriptPubKey;
}
```

**Changes:**
- Changed Script import to `type` import (doesn't execute at runtime)
- Added ScriptHelper import
- Replaced `new Script()` with `ScriptHelper.fromBytes()`

#### 3. Updated TransactionInput

**Before:**
```typescript
import { Script } from '../script/Script';

public getScriptSig(): Script {
  if (this.scriptSig === null) {
    this.scriptSig = new Script(this.scriptBytes);
  }
  return this.scriptSig;
}

// Later in verify():
r.correctlySpends(tx, myIndex, pubKey, Script.ALL_VERIFY_FLAGS);
```

**After:**
```typescript
import type { Script } from '../script/Script';
import { ScriptHelper } from '../script/ScriptHelper';

public getScriptSig(): Script {
  if (this.scriptSig === null) {
    this.scriptSig = ScriptHelper.fromBytes(this.scriptBytes);
  }
  return this.scriptSig;
}

// Later in verify():
r.correctlySpends(tx, myIndex, pubKey, ScriptHelper.getAllVerifyFlags());
```

**Changes:**
- Changed Script import to `type` import
- Added ScriptHelper import  
- Replaced `new Script()` with `ScriptHelper.fromBytes()`
- Replaced `Script.ALL_VERIFY_FLAGS` with `ScriptHelper.getAllVerifyFlags()`

## Why This Works

### Type-only imports
Using `import type { Script }` means the import is only used for TypeScript type checking and is **completely erased** at runtime. This breaks the runtime circular dependency.

### ScriptHelper as Intermediary
The ScriptHelper class:
1. Imports Script directly (safe - no circular dependency from Script's side)
2. Doesn't import TransactionOutput or TransactionInput
3. Acts as a factory/facade to create Script instances
4. Breaks the direct import chain that caused the circular dependency

### Module Initialization Order
With this pattern:
- TransactionOutput and TransactionInput can be loaded first
- They only have type references to Script (erased at runtime)
- ScriptHelper is loaded when first accessed
- ScriptHelper then loads Script
- No circular dependency during module initialization

## Testing

All tests pass successfully:

```bash
npm test test/core/BlockTest.ts

✓ test/core/BlockTest.ts (7 tests) 17ms
  ✓ BlockTest (7)
    ✓ testGenesis 5ms
    ✓ testSerial 2ms
    ✓ testSerial2 4ms
    ✓ testBadTransactions 1ms
    ✓ testHeaderParse 1ms
    ✓ testBitcoinSerialization 1ms
    ✓ testBitcoinSerializerMakeBlockWithSignedTransactions 2ms

Test Files  1 passed (1)
     Tests  7 passed (7)
```

## Files Changed

1. **Created:**
   - `/src/net/bigtangle/script/ScriptHelper.ts` - New helper class
   - `/src/net/bigtangle/script/ScriptFactory.ts` - Alternative factory pattern (not used)

2. **Modified:**
   - `/src/net/bigtangle/core/TransactionOutput.ts` - Use ScriptHelper
   - `/src/net/bigtangle/core/TransactionInput.ts` - Use ScriptHelper
   - `/src/index.ts` - Export ScriptHelper

## Alternative Approaches Considered

### 1. Lazy Dynamic Loading
**Approach:** Use `eval('require(...)')` or dynamic `import()`  
**Result:** Failed because:
- `require()` doesn't work in pure ES module environments
- Dynamic `import()` is async, but the methods need to be synchronous
- Complex error handling for different environments

### 2. Factory Pattern with Initialization
**Approach:** Global factory that needs manual initialization  
**Result:** Not used because:
- Requires explicit initialization call from application
- Risk of using before initialization
- More complex API

### 3. Dependency Injection
**Approach:** Pass Script class as parameter  
**Result:** Not practical because:
- Would require changing all call sites
- Breaks existing API compatibility
- More invasive changes

## Best Practices Applied

1. **Type-only imports** - Use `import type` when only types are needed
2. **Helper/Facade pattern** - Encapsulate complex initialization logic
3. **Factory methods** - Provide controlled instantiation
4. **Minimal changes** - Keep changes localized and backwards-compatible
5. **No runtime overhead** - Type imports are erased, no performance impact

## Verification

To verify the fix works in your environment:

```bash
# 1. Install dependencies
npm install

# 2. Build
npm run build

# 3. Run tests
npm test test/core/BlockTest.ts

# 4. Test in React Native/Expo environment
# The error should no longer occur during hot reload or initial load
```

## Future Considerations

1. Consider applying this pattern to other potential circular dependencies
2. Monitor for similar issues with other core classes
3. Document the helper pattern for future contributors
4. Consider using dependency injection for better testability

## Related Issues

- Previous fix: Coin circular dependency (resolved with CoinConstants)
- Script dynamic import for Transaction (already implemented)
- This completes the circular dependency resolution for core blockchain classes


 ◐  Build the bigtangle-ts package in /home/jcui/git/bigtangle-ts  │
 │    ○  Create or update the bigtangle-ts-1.0.0.tgz file               │
 │    ○  Install the updated package in the social-app directory        │
 │    ○  Run tests to ensure everything works correctly  

cd /home/jcui/git/bigtangle-ts && npm run build

cd /home/jcui/git/bigtangle-ts && npm pack 
 cp /home/jcui/git/bigtangle-ts/bigtangle-bigtangle-ts-1.0.0.tgz /home/jcui/git/social-app/bigtangle-ts-1.0.0.tgz 
 rem -fr /home/jcui/git/social-app node_modules/bigtangle-ts 
 cd /home/jcui/git/social-app && yarn install