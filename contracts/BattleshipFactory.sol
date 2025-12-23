// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./BattleshipGame.sol";

/// @title Factory contract for creating Battleship game instances
/// @notice Allows players to create and join Battleship games
contract BattleshipFactory {
    /// @notice Emitted when a new game is created
    /// @param gameAddress The address of the created game contract
    /// @param creator The address of the player who created the game
    /// @param boardSize The size of the game board (e.g., 3 for 3x3, 10 for 10x10)
    /// @param shipCount The number of ships in the game
    event GameCreated(address indexed gameAddress, address indexed creator, uint8 boardSize, uint8 shipCount);

    /// @notice Array of all created game addresses
    address[] public games;

    /// @notice Mapping from game address to game info
    mapping(address => GameInfo) public gameInfo;

    /// @notice Structure to store basic game information
    /// @dev Packed to save gas: 2 addresses (40 bytes) + 2 uint8 (2 bytes) + 1 bool (1 byte) = 43 bytes
    struct GameInfo {
        address creator;
        address opponent;
        uint8 boardSize;
        uint8 shipCount;
        bool isActive;
    }

    /// @notice Creates a new Battleship game
    /// @param boardSize The size of the board (must be between 3 and 10)
    /// @param shipCount The number of ships (must be at least 2 and reasonable for board size)
    /// @return gameAddress The address of the newly created game contract
    function createGame(uint8 boardSize, uint8 shipCount) external returns (address gameAddress) {
        require(boardSize >= 3 && boardSize <= 10, "Board size must be between 3 and 10");
        require(shipCount >= 2, "Must have at least 2 ships");
        require(shipCount <= boardSize * boardSize / 2, "Too many ships for board size");

        BattleshipGame newGame = new BattleshipGame(msg.sender, boardSize, shipCount);
        gameAddress = address(newGame);

        games.push(gameAddress);
        gameInfo[gameAddress] = GameInfo({
            creator: msg.sender,
            opponent: address(0),
            boardSize: boardSize,
            shipCount: shipCount,
            isActive: true
        });

        emit GameCreated(gameAddress, msg.sender, boardSize, shipCount);
    }

    /// @notice Gets the total number of games created
    /// @return The number of games
    function getGameCount() external view returns (uint256) {
        return games.length;
    }
}

