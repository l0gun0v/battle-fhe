/**
 * Example: How to interact with the Battleship game and decrypt information
 * 
 * This shows how each player can see information after making moves.
 */

import { ethers, fhevm } from "hardhat";
import { BattleshipGame, BattleshipFactory } from "./types";
import { FhevmType } from "@fhevm/hardhat-plugin";

async function exampleGameplay() {
  const [alice, bob] = await ethers.getSigners();
  
  // 1. Create game
  const factory = await ethers.getContractFactory("BattleshipFactory");
  const battleshipFactory = (await factory.deploy()) as BattleshipFactory;
  
  const createTx = await battleshipFactory.connect(alice).createGame(3, 2);
  await createTx.wait();
  
  // Get game address from event
  const gameAddress = "0x..."; // Get from event
  const game = (await ethers.getContractAt("BattleshipGame", gameAddress)) as BattleshipGame;
  
  // 2. Bob joins
  await game.connect(bob).joinGame();
  
  // 3. Both players place ships
  // Alice's ships at cells 1 and 5 (bitmask: 0b000010010 = 18)
  const aliceShips = 18n;
  const aliceEncryptedShips = await fhevm
    .createEncryptedInput(gameAddress, alice.address)
    .add256(aliceShips)
    .encrypt();
  
  await game
    .connect(alice)
    .placeShips(aliceEncryptedShips.handles[0], aliceEncryptedShips.inputProof);
  
  // Bob's ships at cells 2 and 7 (bitmask: 0b100000100 = 260)
  const bobShips = 260n;
  const bobEncryptedShips = await fhevm
    .createEncryptedInput(gameAddress, bob.address)
    .add256(bobShips)
    .encrypt();
  
  await game
    .connect(bob)
    .placeShips(bobEncryptedShips.handles[0], bobEncryptedShips.inputProof);
  
  // ============================================
  // ALICE'S TURN - Making a Move
  // ============================================
  
  console.log("\n=== Alice's Turn ===");
  
  // Alice targets cell 2 (Bob has a ship there)
  const targetCell = 2;
  const encryptedCell = await fhevm
    .createEncryptedInput(gameAddress, alice.address)
    .add256(BigInt(targetCell))
    .encrypt();
  
  // Alice makes the move
  const isHitEncrypted = await game
    .connect(alice)
    .makeMove(targetCell, encryptedCell.handles[0], encryptedCell.inputProof);
  
  // ✅ Alice can decrypt the hit result
  const isHit = await fhevm.userDecryptEbool(
    isHitEncrypted,
    gameAddress,
    alice
  );
  console.log(`Alice's move result: ${isHit ? "HIT!" : "MISS"}`);
  
  // ✅ Alice can decrypt Bob's hit mask (her attack history)
  const bobHitMask = await game.getHitMask(bob.address);
  const bobHitMaskDecrypted = await fhevm.userDecryptEuint(
    FhevmType.euint256,
    bobHitMask,
    gameAddress,
    alice  // Alice can decrypt because she made the moves
  );
  console.log(`Cells Alice has targeted: ${bobHitMaskDecrypted.toString(2)}`);
  
  // ❌ Alice CANNOT decrypt Bob's ship placement
  // This would fail or return encrypted data:
  try {
    const bobShipsEncrypted = await game.getShipPlacement(bob.address);
    // Alice cannot decrypt this - no permission granted!
    // const bobShipsDecrypted = await fhevm.userDecryptEuint(...); // Would fail
    console.log("Alice cannot see Bob's ship positions (encrypted)");
  } catch (e) {
    console.log("Alice has no permission to decrypt Bob's ships");
  }
  
  // ============================================
  // BOB'S PERSPECTIVE - Being Attacked
  // ============================================
  
  console.log("\n=== Bob's Perspective ===");
  
  // ✅ Bob can decrypt his own ship placement
  const bobShipsEncrypted = await game.getShipPlacement(bob.address);
  const bobShipsDecrypted = await fhevm.userDecryptEuint(
    FhevmType.euint256,
    bobShipsEncrypted,
    gameAddress,
    bob  // Bob can decrypt his own ships
  );
  console.log(`Bob's ships are at: ${bobShipsDecrypted.toString(2)}`);
  
  // ✅ Bob can decrypt his own hit mask (shows which cells were attacked)
  const bobHitMaskFromBob = await game.getHitMask(bob.address);
  const bobHitMaskDecryptedByBob = await fhevm.userDecryptEuint(
    FhevmType.euint256,
    bobHitMaskFromBob,
    gameAddress,
    bob  // Bob can decrypt his own hit mask
  );
  console.log(`Cells attacked on Bob's board: ${bobHitMaskDecryptedByBob.toString(2)}`);
  
  // ❌ Bob CANNOT decrypt Alice's hit result
  // Bob doesn't know if Alice's move was a hit or miss
  // He can only infer from checking his own ship positions
  console.log("Bob cannot see if Alice's move was a hit or miss");
  console.log("Bob must check his own ship positions to know if he was hit");
  
  // Bob can check: was cell 2 hit?
  const cell2Bit = 1n << 2n; // Bit position for cell 2
  const wasCell2Attacked = (bobHitMaskDecryptedByBob & cell2Bit) !== 0n;
  const hasShipAtCell2 = (bobShipsDecrypted & cell2Bit) !== 0n;
  
  if (wasCell2Attacked && hasShipAtCell2) {
    console.log("Bob deduces: Cell 2 was attacked and I have a ship there = HIT!");
  } else if (wasCell2Attacked && !hasShipAtCell2) {
    console.log("Bob deduces: Cell 2 was attacked but no ship there = MISS");
  }
  
  // ============================================
  // SUMMARY: What Each Player Can See
  // ============================================
  
  console.log("\n=== Information Visibility Summary ===");
  console.log("\nAlice (Attacker) can see:");
  console.log("  ✅ Whether her move was a hit or miss");
  console.log("  ✅ Which cells she has targeted (Bob's hit mask)");
  console.log("  ❌ Bob's ship positions (encrypted, private)");
  
  console.log("\nBob (Defender) can see:");
  console.log("  ✅ His own ship positions");
  console.log("  ✅ Which cells have been attacked (his hit mask)");
  console.log("  ❌ Whether Alice's moves were hits or misses");
  console.log("  (Bob can deduce hits by comparing hit mask with his ship positions)");
}

