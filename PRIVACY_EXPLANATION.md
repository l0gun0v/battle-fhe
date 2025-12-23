# How Information Visibility Works in FHE Battleship Game

## Overview

In this FHE (Fully Homomorphic Encryption) Battleship game, all ship positions are encrypted and remain private. Here's how each player can see information:

## What Each Player Can See

### 1. **After Placing Ships**

When a player places their ships:
- ✅ **They can decrypt their OWN ship placement** - They know where their ships are
- ❌ **They CANNOT see the opponent's ship placement** - It remains encrypted

### 2. **After Making a Move**

When a player makes a move (targets a cell):

**The player making the move can decrypt:**
- ✅ **Hit/Miss Result** (`isHit`): They can decrypt whether their move was a hit or miss
- ✅ **Opponent's Hit Mask**: They can decrypt which cells they've targeted on the opponent's board
- ❌ **Opponent's Ship Placement**: They CANNOT decrypt this - ship positions stay private!

**The opponent (being attacked) can decrypt:**
- ✅ **Their own ship placement**: They know where their ships are
- ✅ **Their own hit mask**: They can see which cells have been targeted on their board
- ❌ **The attacker's hit result**: They don't automatically see if the move was a hit/miss (this is private to the attacker)

### 3. **How Decryption Works**

The contract uses `FHE.allow()` to grant decryption permissions:

```solidity
// After a move, the contract grants permissions:
FHE.allow(isHit, msg.sender);  // Attacker can decrypt hit/miss result
FHE.allow(opponentPlayer.hitMask, msg.sender);  // Attacker can decrypt their attack history
// NOTE: opponentPlayer.shipPlacement is NOT allowed - stays private!
```

## Example Flow

### Alice's Turn (Attacking Bob):

1. **Alice makes a move** targeting cell 5
2. **Contract computes** (encrypted): `isHit = (Bob's ships & (1 << 5)) != 0`
3. **Contract grants permissions**:
   - Alice can decrypt `isHit` → She learns if she hit or missed
   - Alice can decrypt `Bob's hitMask` → She sees her attack history
   - Alice CANNOT decrypt `Bob's shipPlacement` → Bob's ship positions stay secret!

4. **Alice decrypts the result**:
   ```typescript
   const isHit = await game.makeMove(5, encryptedCell, proof);
   const hitResult = await fhevm.userDecryptEbool(
     isHit,
     gameAddress,
     alice
   );
   // hitResult = true (hit) or false (miss)
   ```

### Bob's Perspective (Being Attacked):

1. **Bob sees the event** `MoveMade(Alice, 5)` - He knows Alice targeted cell 5
2. **Bob can decrypt his own hit mask** to see which cells have been attacked:
   ```typescript
   const myHitMask = await game.getHitMask(bob.address);
   const attackedCells = await fhevm.userDecryptEuint(
     FhevmType.euint256,
     myHitMask,
     gameAddress,
     bob
   );
   // attackedCells shows which bits are set (which cells were targeted)
   ```
3. **Bob CANNOT decrypt** whether Alice's move was a hit or miss (that's private to Alice)
4. **Bob CANNOT decrypt** Alice's ship placement (that's private to Alice)

## Privacy Guarantees

✅ **Ship positions remain encrypted** - Only the owner can decrypt their own ship placement
✅ **Hit/miss results are private** - Only the attacker knows if their move hit
✅ **Attack history is visible** - Both players can see which cells have been targeted
✅ **No information leakage** - The contract never reveals ship positions to opponents

## How to Decrypt Information

### Decrypt Hit Result (for the attacker):
```typescript
const tx = await game.makeMove(cell, encryptedCell, proof);
const receipt = await tx.wait();
// The return value isHit is an ebool - decrypt it:
const isHit = await game.makeMove(cell, encryptedCell, proof);
const hitResult = await fhevm.userDecryptEbool(
  isHit,
  gameAddress,
  attacker
);
```

### Decrypt Hit Mask (attack history):
```typescript
const hitMask = await game.getHitMask(opponentAddress);
const maskValue = await fhevm.userDecryptEuint(
  FhevmType.euint256,
  hitMask,
  gameAddress,
  attacker  // Only the attacker can decrypt
);
// maskValue is a bitmask showing which cells have been targeted
```

### Decrypt Your Own Ship Placement:
```typescript
const myShips = await game.getShipPlacement(myAddress);
const shipMask = await fhevm.userDecryptEuint(
  FhevmType.euint256,
  myShips,
  gameAddress,
  me  // Only I can decrypt my own ships
);
```

## Key Points

1. **FHE.allow()** is crucial - it grants decryption permissions to specific addresses
2. **Without permission**, encrypted data cannot be decrypted
3. **Ship placements are never granted to opponents** - maximum privacy
4. **Hit results are only visible to the attacker** - the defender doesn't know if they were hit until they check their own board state

This design ensures that players can play fairly without revealing their ship positions, while still being able to track the game state they need to see.

