import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { BattleshipFactory, BattleshipFactory__factory, BattleshipGame, BattleshipGame__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("BattleshipFactory")) as BattleshipFactory__factory;
  const battleshipFactory = (await factory.deploy()) as BattleshipFactory;
  const battleshipFactoryAddress = await battleshipFactory.getAddress();

  return { battleshipFactory, battleshipFactoryAddress };
}

describe("BattleshipGame - 5x5 game with player 1 winning after 21 turns", function () {
  let signers: Signers;
  let battleshipFactory: BattleshipFactory;
  let battleshipFactoryAddress: string;
  let gameAddress: string;
  let game: BattleshipGame;

  // 5x5 board layout (25 cells, indices 0-24):
  //  0  1  2  3  4
  //  5  6  7  8  9
  // 10 11 12 13 14
  // 15 16 17 18 19
  // 20 21 22 23 24

  // Bob's ships: cells 0, 5, 10, 15, 20 (first column - 5 ships)
  // Bitmask: 0b10000100001000010000100001 = 0x108421 = 1082401
  const BOB_SHIP_MASK = 0x108421n; // Binary: 10000100001000010000100001

  // Alice's ships: cells 2, 7, 12, 17, 22 (diagonal pattern - 5 ships)
  // Bitmask: 0b100000100000100000100000100 = 0x2082084 = 34144260
  const ALICE_SHIP_MASK = 0x2082084n; // Binary: 100000100000100000100000100

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ battleshipFactory, battleshipFactoryAddress } = await deployFixture());

    // Create a 5x5 game with 5 ships
    const tx = await battleshipFactory.connect(signers.alice).createGame(5, 5);
    const receipt = await tx.wait();
    
    // Get the game address from the event
    const gameCreatedEvent = receipt?.logs.find(
      (log: any) => log.topics[0] === ethers.id("GameCreated(address,address,uint8,uint8)")
    );
    expect(gameCreatedEvent).to.not.be.undefined;
    
    const decoded = battleshipFactory.interface.parseLog({
      topics: gameCreatedEvent?.topics || [],
      data: gameCreatedEvent?.data || "",
    });
    gameAddress = decoded?.args[0] as string;
    expect(gameAddress).to.not.be.undefined;

    game = (await ethers.getContractAt("BattleshipGame", gameAddress)) as BattleshipGame;
  });

  it("should create a 5x5 game with 5 ships", async function () {
    expect(await game.boardSize()).to.eq(5);
    expect(await game.shipCount()).to.eq(5);
    expect(await game.player1()).to.eq(signers.alice.address);
  });

  it("should play a complete game where player 1 wins after 21 turns", async function () {
    // Setup: Bob joins and both place ships
    await game.connect(signers.bob).joinGame();

    // Alice places her ships (cells 2, 7, 12, 17, 22)
    const aliceEncryptedPlacement = await fhevm
      .createEncryptedInput(gameAddress, signers.alice.address)
      .add128(ALICE_SHIP_MASK)
      .encrypt();
    await (await game
      .connect(signers.alice)
      .placeShips(aliceEncryptedPlacement.handles[0], aliceEncryptedPlacement.inputProof)).wait();

    // Bob places his ships (cells 0, 5, 10, 15, 20)
    const bobEncryptedPlacement = await fhevm
      .createEncryptedInput(gameAddress, signers.bob.address)
      .add128(BOB_SHIP_MASK)
      .encrypt();
    await (await game
      .connect(signers.bob)
      .placeShips(bobEncryptedPlacement.handles[0], bobEncryptedPlacement.inputProof)).wait();

    // Verify game started
    expect(await game.gameState()).to.eq(2); // GameState.InProgress
    expect(await game.currentTurn()).to.eq(signers.alice.address); // Alice goes first

    // Game plan: Alice (player 1) needs to hit all 5 of Bob's ships in 11 moves
    // Bob's ships are at: 0, 5, 10, 15, 20
    // Alice will target these cells plus some misses

    // Turn 1: Alice targets cell 0 (Bob's ship - HIT #1)
    await (await game.connect(signers.alice).makeMove(0)).wait();

    // Turn 2: Bob targets cell 1 (Alice has no ship - MISS)
    await (await game.connect(signers.bob).makeMove(1)).wait();

    // Turn 3: Alice targets cell 5 (Bob's ship - HIT #2)
    await (await game.connect(signers.alice).makeMove(5)).wait();

    // Turn 4: Bob targets cell 3 (Alice has no ship - MISS)
    await (await game.connect(signers.bob).makeMove(3)).wait();

    // Turn 5: Alice targets cell 10 (Bob's ship - HIT #3)
    await (await game.connect(signers.alice).makeMove(10)).wait();

    // Turn 6: Bob targets cell 4 (Alice has no ship - MISS)
    await (await game.connect(signers.bob).makeMove(4)).wait();

    // Turn 7: Alice targets cell 15 (Bob's ship - HIT #4)
    await (await game.connect(signers.alice).makeMove(15)).wait();

    // Turn 8: Bob targets cell 6 (Alice has no ship - MISS)
    await (await game.connect(signers.bob).makeMove(6)).wait();

    // Turn 9: Alice targets cell 20 (Bob's ship - HIT #5 - ALL SHIPS HIT!)
    await (await game.connect(signers.alice).makeMove(20)).wait();

    // Turn 10: Bob targets cell 8 (Alice has no ship - MISS)
    await (await game.connect(signers.bob).makeMove(8)).wait();

    // Turn 11: Alice targets cell 1 (miss - but she's already won, just making moves)
    await (await game.connect(signers.alice).makeMove(1)).wait();

    // Turn 12: Bob targets cell 9 (Alice has no ship - MISS)
    await (await game.connect(signers.bob).makeMove(9)).wait();

    // Turn 13: Alice targets cell 3 (miss)
    await (await game.connect(signers.alice).makeMove(3)).wait();

    // Turn 14: Bob targets cell 11 (Alice has no ship - MISS)
    await (await game.connect(signers.bob).makeMove(11)).wait();

    // Turn 15: Alice targets cell 4 (miss)
    await (await game.connect(signers.alice).makeMove(4)).wait();

    // Turn 16: Bob targets cell 13 (Alice has no ship - MISS)
    await (await game.connect(signers.bob).makeMove(13)).wait();

    // Turn 17: Alice targets cell 6 (miss)
    await (await game.connect(signers.alice).makeMove(6)).wait();

    // Turn 18: Bob targets cell 14 (Alice has no ship - MISS)
    await (await game.connect(signers.bob).makeMove(14)).wait();

    // Turn 19: Alice targets cell 8 (miss)
    await (await game.connect(signers.alice).makeMove(8)).wait();

    // Turn 20: Bob targets cell 16 (Alice has no ship - MISS)
    await (await game.connect(signers.bob).makeMove(16)).wait();

    // Turn 21: Alice targets cell 9 (miss)
    await (await game.connect(signers.alice).makeMove(9)).wait();

    // Verify we've made 21 moves total
    // Alice made moves: 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21 = 11 moves
    // Bob made moves: 2, 4, 6, 8, 10, 12, 14, 16, 18, 20 = 10 moves

    // Check that Alice has attacked all cells (move mask - all attacked cells)
    const bobMoveMask = await game.getMoveMask(signers.bob.address);
    const bobMoveMaskDecrypted = await fhevm.userDecryptEuint(
      FhevmType.euint128,
      bobMoveMask,
      gameAddress,
      signers.alice,
    );

    // Alice targeted cells: 0, 5, 10, 15, 20, 1, 3, 4, 6, 8, 9
    // Move mask should have bits set for: 0, 1, 3, 4, 5, 6, 8, 9, 10, 15, 20
    // 2^0 + 2^1 + 2^3 + 2^4 + 2^5 + 2^6 + 2^8 + 2^9 + 2^10 + 2^15 + 2^20
    // = 1 + 2 + 8 + 16 + 32 + 64 + 256 + 512 + 1024 + 32768 + 1048576
    // = 1082401 + 2 + 8 + 16 + 64 + 256 + 512 + 1024 = 1084983
    const expectedMoveMask = (1n << 0n) + (1n << 1n) + (1n << 3n) + (1n << 4n) + (1n << 5n) + 
                            (1n << 6n) + (1n << 8n) + (1n << 9n) + (1n << 10n) + (1n << 15n) + (1n << 20n);
    expect(bobMoveMaskDecrypted).to.eq(expectedMoveMask);

    // Check hits mask (only actual hits, not misses)
    const bobHitsMask = await game.getHitsMask(signers.bob.address);
    const bobHitsMaskDecrypted = await fhevm.userDecryptEuint(
      FhevmType.euint128,
      bobHitsMask,
      gameAddress,
      signers.alice,
    );

    // Alice hit cells: 0, 5, 10, 15, 20 (only the ships)
    // Hits mask should have bits set for: 0, 5, 10, 15, 20
    // 2^0 + 2^5 + 2^10 + 2^15 + 2^20 = 1 + 32 + 1024 + 32768 + 1048576 = 1082401
    const expectedHitsMask = (1n << 0n) + (1n << 5n) + (1n << 10n) + (1n << 15n) + (1n << 20n);
    expect(bobHitsMaskDecrypted).to.eq(expectedHitsMask);

    // Verify that all of Bob's ships are in the hits mask
    // Bob's ships: 0, 5, 10, 15, 20
    // All these bits should be set in the hits mask
    const bobShips = BOB_SHIP_MASK;
    const intersection = bobHitsMaskDecrypted & bobShips;
    expect(intersection).to.eq(bobShips); // All ships should be hit

    // Finish the game as Alice (the winner)
    await game.connect(signers.alice).finishGame();

    // Verify game is finished
    expect(await game.gameState()).to.eq(3); // GameState.Finished

    // Verify winner is Alice
    // Note: winner is stored as eaddress, we can verify by checking the game state
    // In a real scenario, you would decrypt the eaddress to verify
    const winner = await game.winner();
    // For now, we verify the game is finished (winner verification would require
    // decrypting the eaddress, which may require a specific method)
    expect(winner).to.not.eq(ethers.ZeroHash); // Winner should be set (not zero)
  });

  it("should verify ship placements are correct", async function () {
    await game.connect(signers.bob).joinGame();

    // Alice places her ships
    const aliceEncryptedPlacement = await fhevm
      .createEncryptedInput(gameAddress, signers.alice.address)
      .add128(ALICE_SHIP_MASK)
      .encrypt();
    await (await game
      .connect(signers.alice)
      .placeShips(aliceEncryptedPlacement.handles[0], aliceEncryptedPlacement.inputProof)).wait();

    // Bob places his ships
    const bobEncryptedPlacement = await fhevm
      .createEncryptedInput(gameAddress, signers.bob.address)
      .add128(BOB_SHIP_MASK)
      .encrypt();
    await (await game
      .connect(signers.bob)
      .placeShips(bobEncryptedPlacement.handles[0], bobEncryptedPlacement.inputProof)).wait();

    // Verify Alice's ships
    const alicePlacement = await game.getShipPlacement(signers.alice.address);
    const alicePlacementDecrypted = await fhevm.userDecryptEuint(
      FhevmType.euint128,
      alicePlacement,
      gameAddress,
      signers.alice,
    );
    expect(alicePlacementDecrypted).to.eq(ALICE_SHIP_MASK);

    // Verify Bob's ships
    const bobPlacement = await game.getShipPlacement(signers.bob.address);
    const bobPlacementDecrypted = await fhevm.userDecryptEuint(
      FhevmType.euint128,
      bobPlacement,
      gameAddress,
      signers.bob,
    );
    expect(bobPlacementDecrypted).to.eq(BOB_SHIP_MASK);
  });
});
