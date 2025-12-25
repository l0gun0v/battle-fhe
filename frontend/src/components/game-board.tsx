'use client';

import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useFhevm } from '@/hooks/use-fhevm';
import { useGameContract, GameState } from '@/hooks/useGameContract';
import { useFHEDecrypt } from '@/hooks/useFHEDecrypt';

import { GameStatus } from './game/game-status';
import { BoardGrid } from './game/board-grid';
import { ShipPlacement } from './game/ship-placement';
import { Loader2 } from 'lucide-react';

export default function GameBoard({ contractAddress }: { contractAddress: string }) {
    const { data: fhevm } = useFhevm();
    const game = useGameContract(contractAddress);
    const { decryptHandles } = useFHEDecrypt(contractAddress);


    const [selectedCells, setSelectedCells] = useState<number[]>([]);
    const isDecryptingRef = useRef(false);
    const [isDecryptingLocal, setIsDecryptingLocal] = useState(false);
    const [hasInitiallyDecrypted, setHasInitiallyDecrypted] = useState(false);

    const [myShips, setMyShips] = useState<Set<number>>(new Set());
    const [myHits, setMyHits] = useState<Set<number>>(new Set());
    const [myMisses, setMyMisses] = useState<Set<number>>(new Set());

    const [oppHits, setOppHits] = useState<Set<number>>(new Set()); 
    const [oppMisses, setOppMisses] = useState<Set<number>>(new Set());
    const [allOpponentShipsHit, setAllOpponentShipsHit] = useState(false);
    const [allMyShipsHit, setAllMyShipsHit] = useState(false);
    const [winner, setWinner] = useState<string | null>(null);

    const [showMyBoard, setShowMyBoard] = useState(false);

    const lastAction = useRef<'join' | 'place' | 'move' | 'finish' | null>(null);

    useEffect(() => {
        if (game.isConfirmed && game.writeHash) {
            if (lastAction.current === 'place') {
                toast.success('Ships placed successfully!');
                setMyShips(new Set(selectedCells));
                setSelectedCells([]);
            } else if (lastAction.current === 'move') {
                toast.success('Move confirmed! Updating board...');
            } else if (lastAction.current === 'finish') {
                toast.success('Game finished! You won!');
            } else if (lastAction.current === 'join') {
                toast.success('Joined game!');
            }
            lastAction.current = null;
        }
    }, [game.isConfirmed, game.writeHash, selectedCells]);

    useEffect(() => {
        setMyShips(new Set());
        setMyHits(new Set());
        setMyMisses(new Set());
        setOppHits(new Set());
        setOppMisses(new Set());
        setAllOpponentShipsHit(false);
        setAllMyShipsHit(false);
        setWinner(null);
        setHasInitiallyDecrypted(false);
        setIsDecryptingLocal(false);
        isDecryptingRef.current = false;
        setSelectedCells([]);
    }, [contractAddress]);

  
    useEffect(() => {
        let mounted = true;

        const updateBoards = async () => {
            if (game.gameState === undefined) return;

            const isValidHandle = (h: unknown) => {
                const s = String(h || '');
                return s !== '' && s !== '0n' && s !== '0' && s !== '0x0' && !s.match(/^0x0+$/);
            };

            if (game.gameState === GameState.WaitingForOpponent) {
                setHasInitiallyDecrypted(true);
                return;
            }

            if (!game.isParticipant || !game.userAddress) {
                setHasInitiallyDecrypted(true);
                return;
            }
            if (isDecryptingRef.current || !fhevm) return;

            const myPlanHandleValue = game.userPlayerData && Array.isArray(game.userPlayerData) ? game.userPlayerData[0] : null;
            const hasPlantedShips = !!game.hasUserPlacedShips && isValidHandle(myPlanHandleValue);

            if (game.gameState === GameState.WaitingForPlacements && !hasPlantedShips) {
                setHasInitiallyDecrypted(true);
                return;
            }

            const masksReady = isValidHandle(game.oppHitsMask) && isValidHandle(game.oppMoveMask) &&
                isValidHandle(game.myHitsMask) && isValidHandle(game.myMoveMask);

            if (game.gameState === GameState.InProgress && !masksReady) {
                if (!hasPlantedShips) return;
            }

            isDecryptingRef.current = true;
            setIsDecryptingLocal(true);

            const handlesToDecrypt: { value: bigint | string | unknown, name: string }[] = [];
            const oppHitsHandle = 'oppHits';
            const oppMovesHandle = 'oppMoves';
            const myHitsHandle = 'myHits';
            const myMovesHandle = 'myMoves';
            const myPlanHandle = 'myPlan';
            const winnerHandle = 'winner';

            if ((game.gameState === GameState.InProgress || game.gameState === GameState.Finished) && masksReady) {
                handlesToDecrypt.push({ value: game.oppHitsMask, name: oppHitsHandle });
                handlesToDecrypt.push({ value: game.oppMoveMask, name: oppMovesHandle });
                handlesToDecrypt.push({ value: game.myHitsMask, name: myHitsHandle });
                handlesToDecrypt.push({ value: game.myMoveMask, name: myMovesHandle });
            }

            if (hasPlantedShips) {
                handlesToDecrypt.push({ value: myPlanHandleValue, name: myPlanHandle });
            }

            if (game.gameState === GameState.Finished && isValidHandle(game.winnerHandle)) {
                handlesToDecrypt.push({ value: game.winnerHandle, name: winnerHandle });
            }

            if (handlesToDecrypt.length === 0) {
                setHasInitiallyDecrypted(true);
                isDecryptingRef.current = false;
                setIsDecryptingLocal(false);
                return;
            }

            try {
                const results = await decryptHandles(handlesToDecrypt, contractAddress);
                if (!mounted || !results) {
                    setHasInitiallyDecrypted(true);
                    return;
                }

                const dMyShips = results[myPlanHandle];
                const dMyHits = results[myHitsHandle];
                const dMyMoves = results[myMovesHandle];
                const dOppHits = results[oppHitsHandle];
                const dOppMoves = results[oppMovesHandle];
                const dWinner = results[winnerHandle];

                const size = game.boardSize;
                const totalCells = size * size;

                const bitsToSet = (mask: bigint) => {
                    const s = new Set<number>();
                    for (let i = 0; i < totalCells; i++) {
                        if ((mask & (1n << BigInt(i))) !== 0n) s.add(i);
                    }
                    return s;
                };

                if (dMyShips !== undefined) {
                    setMyShips(bitsToSet(BigInt(dMyShips)));
                }

                const dOppMisses = BigInt(dOppMoves ?? 0n) & (~BigInt(dOppHits ?? 0n));
                const oHits = bitsToSet(BigInt(dOppHits ?? 0n));

                setOppHits(oHits);
                setOppMisses(bitsToSet(BigInt(dOppMisses)));

                const iWon = (game.shipCount ?? 0) > 0 && oHits.size >= (game.shipCount ?? 0);
                setAllOpponentShipsHit(iWon);

                const dMyMisses = BigInt(dMyMoves ?? 0n) & (~BigInt(dMyHits ?? 0n));

                setMyHits(bitsToSet(BigInt(dMyHits ?? 0n)));
                setMyMisses(bitsToSet(BigInt(dMyMisses)));

                const oppWon = (game.shipCount ?? 0) > 0 && bitsToSet(BigInt(dMyHits ?? 0n)).size >= (game.shipCount ?? 0);
                setAllMyShipsHit(oppWon);

                if (dWinner !== undefined) {
                    setWinner(dWinner as string);
                }

                setHasInitiallyDecrypted(true);
            } catch (err) {
                console.error('Board update decryption error:', err);
                setHasInitiallyDecrypted(true);
            } finally {
                isDecryptingRef.current = false;
                setIsDecryptingLocal(false);
            }
        };

        updateBoards();

        return () => {
            mounted = false;
        }
    }, [game.gameState, game.isParticipant, game.userAddress, game.opponentAddress, decryptHandles, contractAddress, game.boardSize, game.shipCount, game.oppHitsMask, game.oppMoveMask, game.myHitsMask, game.myMoveMask, game.userPlayerData, game.hasUserPlacedShips, game.winnerHandle, fhevm]);

    const isInitialLoading = game.isInitialLoading || !hasInitiallyDecrypted;
    const isInteractionsBlocked = isInitialLoading || game.isPending || game.isConfirming || allOpponentShipsHit || allMyShipsHit;


    const handleJoin = async () => {
        lastAction.current = 'join';
        await game.joinGame();
        game.refetch();
    };

    const handleCellClick = (index: number) => {
        if (isInteractionsBlocked) return;

        if (game.gameState === GameState.WaitingForPlacements) {
            if (selectedCells.includes(index)) {
                setSelectedCells(prev => prev.filter(i => i !== index));
            } else {
                if (selectedCells.length < game.shipCount) {
                    setSelectedCells([...selectedCells, index]);
                } else {
                    toast.error(`Max ${game.shipCount} ships allowed`);
                }
            }
        } else if (game.gameState === GameState.InProgress && game.currentTurn === game.userAddress) {
            if (showMyBoard) {
                toast.error("Switch to Opponent's Board to attack");
                return;
            }
            if (oppHits.has(index) || oppMisses.has(index)) {
                toast.error("Already attacked this cell");
                return;
            }
            lastAction.current = 'move';
            game.makeMove(index);
            setTimeout(() => game.refetch(), 1000);
        }
    };

    const handleSubmitPlacement = async () => {
        if (!fhevm || !game.userAddress) return;

        try {
            toast.loading("Encrypting placement...", { id: 'encrypt' });

            let placement = 0n;
            for (const idx of selectedCells) {
                placement |= (1n << BigInt(idx));
            }

            const input = fhevm.createEncryptedInput(contractAddress as `0x${string}`, game.userAddress);
            input.add128(placement);
            const encrypted = await input.encrypt();

            const handle = encrypted.handles[0];
            const proof = encrypted.inputProof;

            const toHex = (data: unknown): string => {
                if (data instanceof Uint8Array) return `0x${Array.from(data).map(b => b.toString(16).padStart(2, '0')).join('')}`;
                if (typeof data === 'string' && !data.startsWith('0x')) return `0x${data}`;
                return String(data);
            };

            toast.dismiss('encrypt');
            lastAction.current = 'place';
            game.placeShips(toHex(handle), toHex(proof));
            setTimeout(() => game.refetch(), 2000);

        } catch (e) {
            console.error(e);
            toast.error("Encryption failed");
        }
    };

    const handleFinish = () => {
        lastAction.current = 'finish';
        game.finishGame();
    }


    if (game.gameState === undefined) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="space-y-4 max-w-2xl mx-auto">
            <GameStatus
                gameState={game.gameState}
                userAddress={game.userAddress || ''}
                currentTurn={game.currentTurn}
                isParticipant={game.isParticipant ?? false}
                isPending={game.isPending}
                isConfirming={game.isConfirming}
                isInitialLoading={isInitialLoading}
                isFetching={game.isFetching || isDecryptingLocal}
                allOpponentShipsHit={allOpponentShipsHit}
                allMyShipsHit={allMyShipsHit}
                winner={winner}
                player1={game.player1}
                player2={game.player2}
                showMyBoard={showMyBoard}
                setShowMyBoard={setShowMyBoard}
                onRefresh={() => { }} 
                onJoin={handleJoin}
            />

            {game.isParticipant && (
                game.gameState === GameState.WaitingForPlacements ? (
                    <>
                        <BoardGrid
                            gameState={game.gameState}
                            size={game.boardSize}
                            hits={myHits}
                            misses={myMisses}
                            ships={myShips}
                            selectedCells={selectedCells}
                            onCellClick={handleCellClick}
                            isMyBoard={true}
                            isMyTurn={true}
                            isInitialLoading={isInitialLoading}
                            isInteractionsBlocked={isInteractionsBlocked}
                            title="Place Your Ships"
                        />
                        <ShipPlacement
                            selectedCount={selectedCells.length}
                            requiredCount={game.shipCount}
                            onConfirm={handleSubmitPlacement}
                            isPending={game.isPending}
                            isConfirming={game.isConfirming}
                            hasUserPlaced={!!game.hasUserPlacedShips}
                            hasOpponentPlaced={!!game.hasOpponentPlacedShips}
                            isInitialLoading={isInitialLoading}
                            isFetching={game.isFetching || isDecryptingLocal}
                        />
                    </>
                ) : (game.gameState === GameState.InProgress || game.gameState === GameState.Finished) ? (
                    <BoardGrid
                        gameState={game.gameState}
                        size={game.boardSize}
                        hits={showMyBoard ? myHits : oppHits}
                        misses={showMyBoard ? myMisses : oppMisses}
                        ships={showMyBoard ? myShips : new Set()}
                        selectedCells={[]}
                        onCellClick={handleCellClick}
                        isMyBoard={showMyBoard}
                        isMyTurn={game.currentTurn === game.userAddress}
                        isInitialLoading={isInitialLoading}
                        isInteractionsBlocked={isInteractionsBlocked}
                        title={showMyBoard ? (game.gameState === GameState.Finished ? "My Final Board" : "My Board") : (game.gameState === GameState.Finished ? "Opponent's Final Board" : "Opponent's Board")}
                    />
                ) : null
            )}

            {/* Relocated Submit Win Button */}
            {allOpponentShipsHit && game.gameState === GameState.InProgress && (
                <div className="flex justify-center pt-4">
                    <Button
                        onClick={handleFinish}
                        disabled={game.isPending || game.isConfirming || isInitialLoading || !!game.isFetching}
                        size="lg"
                        className="w-full bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white font-extrabold text-xl py-8 shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 active:translate-y-0"
                    >
                        {(game.isConfirming || isInitialLoading) ? <Loader2 className="animate-spin h-6 w-6 mr-3" /> : null}
                        🏆 SUBMIT WIN 🏆
                    </Button>
                </div>
            )}
        </div>
    );
}
