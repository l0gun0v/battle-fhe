'use client';

import { useReadContracts, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import BattleshipGameArtifact from '@/lib/abi/BattleshipGame.json';

const GAME_ABI = BattleshipGameArtifact.abi;

export enum GameState {
    WaitingForOpponent = 0,
    WaitingForPlacements = 1,
    InProgress = 2,
    Finished = 3
}

export function useGameContract(contractAddress: string) {
    const { address: userAddress } = useAccount();
    const { writeContract, data: writeHash, isPending, reset: resetWrite } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: writeHash });

    const { data: results, refetch: resultsRefetch, isLoading: isLoadingResults, isFetching: isFetchingResults } = useReadContracts({
        contracts: [
            { address: contractAddress as `0x${string}`, abi: GAME_ABI, functionName: 'gameState' },
            { address: contractAddress as `0x${string}`, abi: GAME_ABI, functionName: 'boardSize' },
            { address: contractAddress as `0x${string}`, abi: GAME_ABI, functionName: 'shipCount' },
            { address: contractAddress as `0x${string}`, abi: GAME_ABI, functionName: 'player1' },
            { address: contractAddress as `0x${string}`, abi: GAME_ABI, functionName: 'player2' },
            { address: contractAddress as `0x${string}`, abi: GAME_ABI, functionName: 'currentTurn' },
            { address: contractAddress as `0x${string}`, abi: GAME_ABI, functionName: 'winner' },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ] as any,
        query: {
            refetchInterval: 2500, // Keep constant polling for core state to avoid complex hoisting issues
            enabled: !!contractAddress
        }
    });

    const gameState = results?.[0]?.result as GameState;
    const player1 = results?.[3]?.result as string;
    const player2 = results?.[4]?.result as string;
    const isPlayer1 = userAddress?.toLowerCase() === player1?.toLowerCase();
    const isPlayer2 = userAddress?.toLowerCase() === player2?.toLowerCase();
    const isParticipant = isPlayer1 || isPlayer2;
    const opponentAddress = isPlayer1 ? player2 : (isPlayer2 ? player1 : undefined);

    // Separate hook for player specific data
    const { data: playerResults, refetch: playerResultsRefetch, isLoading: isLoadingPlayers, isFetching: isFetchingPlayers } = useReadContracts({
        contracts: [
            { address: contractAddress as `0x${string}`, abi: GAME_ABI, functionName: 'players', args: userAddress ? [userAddress] : undefined },
            { address: contractAddress as `0x${string}`, abi: GAME_ABI, functionName: 'players', args: opponentAddress ? [opponentAddress] : undefined },
            { address: contractAddress as `0x${string}`, abi: GAME_ABI, functionName: 'getHitsMask', args: opponentAddress ? [opponentAddress] : undefined },
            { address: contractAddress as `0x${string}`, abi: GAME_ABI, functionName: 'getMoveMask', args: opponentAddress ? [opponentAddress] : undefined },
            { address: contractAddress as `0x${string}`, abi: GAME_ABI, functionName: 'getHitsMask', args: userAddress ? [userAddress] : undefined },
            { address: contractAddress as `0x${string}`, abi: GAME_ABI, functionName: 'getMoveMask', args: userAddress ? [userAddress] : undefined },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ] as any,
        query: {
            enabled: !!contractAddress && isParticipant,
            refetchInterval: gameState === GameState.Finished ? undefined : 2500
        }
    });

    const boardSize = Number(results?.[1]?.result || 5);
    const shipCount = Number(results?.[2]?.result || 0);
    const currentTurn = results?.[5]?.result as string;
    const winnerHandle = results?.[6]?.result;

    const userPlayerData = playerResults?.[0]?.result;
    const opponentPlayerData = playerResults?.[1]?.result;
    const oppHitsMask = playerResults?.[2]?.result;
    const oppMoveMask = playerResults?.[3]?.result;
    const myHitsMask = playerResults?.[4]?.result;
    const myMoveMask = playerResults?.[5]?.result;

    const hasUserPlacedShips = userPlayerData && Array.isArray(userPlayerData) ? (userPlayerData[3] as boolean) : undefined;
    const hasOpponentPlacedShips = opponentPlayerData && Array.isArray(opponentPlayerData) ? (opponentPlayerData[3] as boolean) : undefined;

    const isInitialLoading = isLoadingResults || isLoadingPlayers;
    const isFetching = isFetchingResults || isFetchingPlayers;

    // --- ACTIONS ---

    const joinGame = () => {
        writeContract({
            address: contractAddress as `0x${string}`,
            abi: GAME_ABI,
            functionName: 'joinGame',
        });
    };

    const placeShips = (handleHex: string, proofHex: string) => {
        writeContract({
            address: contractAddress as `0x${string}`,
            abi: GAME_ABI,
            functionName: 'placeShips',
            args: [handleHex, proofHex]
        });
    };

    const makeMove = (index: number) => {
        writeContract({
            address: contractAddress as `0x${string}`,
            abi: GAME_ABI,
            functionName: 'makeMove',
            args: [index]
        });
    };

    const finishGame = () => {
        writeContract({
            address: contractAddress as `0x${string}`,
            abi: GAME_ABI,
            functionName: 'finishGame',
            args: []
        });
    };

    const refetch = () => {
        resultsRefetch();
        playerResultsRefetch();
    };

    return {
        // State
        gameState: gameState as GameState,
        boardSize: Number(boardSize || 5),
        shipCount: Number(shipCount || 0),
        currentTurn: currentTurn as string,
        isParticipant,
        isPlayer1,
        isPlayer2,
        userAddress,
        player1,
        player2,
        opponentAddress: opponentAddress as string | undefined,
        hasUserPlacedShips,
        hasOpponentPlacedShips,
        oppHitsMask,
        oppMoveMask,
        myHitsMask,
        myMoveMask,
        userPlayerData,
        winnerHandle,
        isInitialLoading,
        isFetching,

        // Transaction State
        isPending,
        isConfirming,
        isConfirmed,
        writeHash,

        // Actions
        joinGame,
        placeShips,
        makeMove,
        finishGame,
        resetWrite,
        refetch
    };
}
