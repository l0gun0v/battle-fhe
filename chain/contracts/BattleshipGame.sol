// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint128, externalEuint128, ebool, eaddress} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Battleship game contract with encrypted ship placements
/// @notice Implements a turn-based Battleship game using FHE for private ship positions
contract BattleshipGame is ZamaEthereumConfig {
    /// @notice Game states
    enum GameState {
        WaitingForOpponent,
        WaitingForPlacements,
        InProgress,
        Finished
    }

    /// @notice Player information
    struct Player {
        euint128 shipPlacement; // Encrypted bitmask of ship positions
        euint128 moveMask; // Encrypted bitmask of all cells that have been attacked (hits + misses)
        euint128 hitsMask; // Encrypted bitmask of cells that were actually hit (only hits)
        bool hasPlacedShips;
    }

    /// @notice Game configuration
    uint8 public immutable boardSize;
    uint8 public immutable shipCount;
    uint128 public maxCells;
    /// @notice Game state
    GameState public gameState;
    address public player1;
    address public player2;
    address public currentTurn;
    eaddress public winner;

    /// @notice Player data
    mapping(address => Player) public players;


    /// @notice Emitted when a player places their ships
    /// @param player The address of the player who placed ships
    event ShipsPlaced(address indexed player);

    /// @notice Emitted when a player makes a move
    /// @param player The address of the player who made the move
    /// @param cell The cell index that was targeted
    event MoveMade(address indexed player, uint8 cell);

    /// @notice Emitted when the game ends
    /// @param winner The address of the winning player
    event GameFinished(eaddress indexed winner);

    /// @notice Constructor to initialize the game
    /// @param _player1 The address of the first player (game creator)
    /// @param _boardSize The size of the board (e.g., 3 for 3x3)
    /// @param _shipCount The number of ships in the game
    constructor(address _player1, uint8 _boardSize, uint8 _shipCount) {
        require(_boardSize >= 3 && _boardSize <= 10, "Invalid board size");
        require(_shipCount >= 2, "Must have at least 2 ships");
        require(_shipCount <= _boardSize * _boardSize / 2, "Too many ships");

        maxCells = uint128(boardSize) * uint128(boardSize);
        player1 = _player1;
        boardSize = _boardSize;
        shipCount = _shipCount;
        gameState = GameState.WaitingForOpponent;
    }

    /// @notice Allows the second player to join the game
    function joinGame() external {
        require(gameState == GameState.WaitingForOpponent, "Game not accepting players");
        require(msg.sender != player1, "Cannot join as opponent of yourself");
        require(player2 == address(0), "Opponent already joined");

        player2 = msg.sender;
        gameState = GameState.WaitingForPlacements;
    }

    /// @notice Allows a player to submit their encrypted ship placement
    /// @param encryptedPlacement The encrypted bitmask representing ship positions
    /// @param inputProof The proof for the encrypted input
    function placeShips(externalEuint128 encryptedPlacement, bytes calldata inputProof) external {
        require(gameState == GameState.WaitingForPlacements, "Not in placement phase");
        require(msg.sender == player1 || msg.sender == player2, "Not a player in this game");
        require(!players[msg.sender].hasPlacedShips, "Ships already placed");

        euint128 placement = FHE.fromExternal(encryptedPlacement, inputProof);
        players[msg.sender].shipPlacement = placement;
        players[msg.sender].hasPlacedShips = true;
        players[msg.sender].moveMask = FHE.asEuint128(0);
        players[msg.sender].hitsMask = FHE.asEuint128(0);

        FHE.allowThis(placement);
        FHE.allow(placement, msg.sender);

        FHE.allowThis(players[msg.sender].moveMask);
        FHE.allow(players[msg.sender].moveMask, player1);
        FHE.allow(players[msg.sender].moveMask, player2);

        FHE.allowThis(players[msg.sender].hitsMask);
        FHE.allow(players[msg.sender].hitsMask, player1);
        FHE.allow(players[msg.sender].hitsMask, player2);

        emit ShipsPlaced(msg.sender);

        // Check if both players have placed ships
        if (players[player1].hasPlacedShips && players[player2].hasPlacedShips) {
            gameState = GameState.InProgress;
            currentTurn = player1; // Player 1 goes first
        }
    }

    /// @notice Makes a move by targeting a specific cell
    /// @param targetCell The cell index to target (0 to boardSize*boardSize - 1)
    /// @return isHit Encrypted boolean indicating if it was a hit (1) or miss (0)
    function makeMove(
        uint8 targetCell
    ) external returns (ebool isHit) {
        require(gameState == GameState.InProgress, "Game not in progress");
        require(msg.sender == currentTurn, "Not your turn");
        
        uint128 boardMaxCells = uint128(boardSize) * uint128(boardSize);
        require(targetCell < boardMaxCells, "Invalid cell index");

        // Get opponent (optimized: single ternary instead of separate variable)
        address opponent = msg.sender == player1 ? player2 : player1;
        Player storage opponentPlayer = players[opponent];

        uint128 bitPosition = uint128(1) << targetCell;
        euint128 encryptedBitPosition = FHE.asEuint128(bitPosition);
        euint128 bitResult = FHE.and(opponentPlayer.shipPlacement, encryptedBitPosition);
        
        // Check if the result is non-zero (meaning bit is set = hit)
        isHit = FHE.ne(bitResult, FHE.asEuint128(0));

        opponentPlayer.moveMask = FHE.or(opponentPlayer.moveMask, encryptedBitPosition);
        
        opponentPlayer.hitsMask = FHE.select(
            isHit,
            FHE.or(opponentPlayer.hitsMask, encryptedBitPosition),
            opponentPlayer.hitsMask
        );


        FHE.allowThis(isHit);
        FHE.allow(isHit, msg.sender);
        FHE.allow(isHit, opponent);
        

        FHE.allowThis(opponentPlayer.moveMask);
        FHE.allow(opponentPlayer.moveMask, msg.sender);
        FHE.allow(opponentPlayer.moveMask, opponent);
        
        FHE.allowThis(opponentPlayer.hitsMask);
        FHE.allow(opponentPlayer.hitsMask, msg.sender);
        FHE.allow(opponentPlayer.hitsMask, opponent);
        
        emit MoveMade(msg.sender, targetCell);

        // Switch turns
        currentTurn = opponent;
    }

    /// @notice Manually finish the game (verifies winner actually won)
    /// @dev The caller must provide proof that all opponent ships have been hit.
    ///      The contract verifies this by checking: (hitsMask & shipPlacement) == shipPlacement
    function finishGame() external {
        require(gameState == GameState.InProgress, "Game not in progress");
        require(msg.sender == player1 || msg.sender == player2, "Invalid winner address");

        // Get the opponent (the player who lost)
        address opponent = msg.sender == player1 ? player2 : player1;
        Player storage opponentPlayer = players[opponent];

        // Verify that all opponent ships have been hit
        // Check: (hitsMask & shipPlacement) == shipPlacement
        // This means all ship positions are in the hits mask (all ships were hit)
        euint128 intersection = FHE.and(opponentPlayer.hitsMask, opponentPlayer.shipPlacement);
        ebool allShipsHit = FHE.eq(intersection, opponentPlayer.shipPlacement);

        // Convert the boolean result to euint128 (1 if true, 0 if false)
        winner = FHE.select(
            allShipsHit,
            FHE.asEaddress(msg.sender),
            FHE.asEaddress(opponent)
        );

        FHE.allowThis(winner);
        FHE.allow(winner, msg.sender);
        FHE.allow(winner, opponent);


        gameState = GameState.Finished;
        emit GameFinished(winner);
    }

    /// @notice Gets the encrypted ship placement for a player
    /// @param player The address of the player
    /// @return The encrypted ship placement bitmask
    function getShipPlacement(address player) external view returns (euint128) {
        return players[player].shipPlacement;
    }

    /// @notice Gets the encrypted move mask for a player
    /// @param player The address of the player
    /// @return The encrypted move mask bitmask
    /// @dev The move mask shows which cells have been targeted on this player's board (hits + misses).
    function getMoveMask(address player) external view returns (euint128) {
        return players[player].moveMask;
    }

    /// @notice Gets the encrypted hits mask for a player
    /// @param player The address of the player
    /// @return The encrypted hits mask bitmask
    /// @dev The hits mask shows which cells were actually hit (only hits, not misses).
    function getHitsMask(address player) external view returns (euint128) {
        return players[player].hitsMask;
    }

}

