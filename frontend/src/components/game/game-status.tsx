import { GameState } from '@/hooks/useGameContract';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Eye } from 'lucide-react';

interface GameStatusProps {
    gameState: GameState;
    currentTurn: string;
    userAddress: string;
    isParticipant: boolean;
    isPending: boolean;
    isConfirming: boolean;
    isInitialLoading: boolean;
    isFetching: boolean;
    allOpponentShipsHit: boolean;
    allMyShipsHit: boolean;
    winner: string | null;
    player1: string;
    player2: string;
    showMyBoard: boolean;
    setShowMyBoard: (show: boolean) => void;
    onRefresh: () => void;
    onJoin: () => void;
}

export function GameStatus({
    gameState,
    currentTurn,
    userAddress,
    isParticipant,
    isPending,
    isConfirming,
    isInitialLoading,
    isFetching,
    allOpponentShipsHit,
    allMyShipsHit,
    winner,
    player1,
    player2,
    showMyBoard,
    setShowMyBoard,
    onRefresh,
    onJoin
}: GameStatusProps) {

    const getStatusColor = (state: number) => {
        switch (state) {
            case GameState.WaitingForOpponent: return 'from-amber-500 to-orange-500';
            case GameState.WaitingForPlacements: return 'from-blue-500 to-cyan-500';
            case GameState.InProgress: return 'from-green-500 to-emerald-500';
            case GameState.Finished: return 'from-purple-500 to-pink-500';
            default: return 'from-gray-500 to-gray-600';
        }
    };

    const getStatusText = (state: number) => {
        switch (state) {
            case GameState.WaitingForOpponent: return 'Waiting for Opponent';
            case GameState.WaitingForPlacements: return 'Place Your Ships';
            case GameState.InProgress: return 'Game In Progress';
            case GameState.Finished: return 'Game Finished';
            default: return 'Unknown';
        }
    };

    const isMyTurn = currentTurn === userAddress;

    return (
        <div className="space-y-4">
            {/* Status Header */}
            <div className="bg-white/90 backdrop-blur-sm border-2 border-blue-200 rounded-xl p-3 shadow-lg">
                <div className="flex flex-col md:flex-row justify-between items-center gap-3">
                    <div className="flex items-center gap-3">
                        <div className={`bg-gradient-to-r ${getStatusColor(Number(gameState))} p-2 rounded-lg`}>
                            <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                        </div>
                        <div>
                            <div className="text-sm text-blue-600 font-medium">Game Status</div>
                            <div className="text-lg font-bold text-blue-900">{getStatusText(Number(gameState))}</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Turn Indicator */}
                        {gameState === GameState.InProgress && (
                            <div className={`px-4 py-2 rounded-lg font-semibold text-sm ${allOpponentShipsHit ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white animate-pulse shadow-green-200 shadow-lg' :
                                allMyShipsHit ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white animate-bounce shadow-red-200 shadow-lg' :
                                    isMyTurn ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' :
                                        'bg-blue-100 text-blue-700'
                                }`}>
                                {allOpponentShipsHit ? '🏆 SUBMIT YOUR WIN' :
                                    allMyShipsHit ? '⚠️ OPPONENT CAN WIN!' :
                                        isMyTurn ? '🎯 YOUR TURN' : '⏳ OPPONENT TURN'}
                            </div>
                        )}

                        {/* Controls */}
                        {isParticipant && gameState === GameState.InProgress && (
                            <>
                                <Button
                                    variant={showMyBoard ? "default" : "outline"}
                                    size="sm"
                                    onMouseEnter={() => setShowMyBoard(true)}
                                    onMouseLeave={() => setShowMyBoard(false)}
                                    disabled={isPending || isConfirming || isInitialLoading}
                                >
                                    <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                    onClick={onRefresh}
                                    variant="outline"
                                    size="sm"
                                    disabled={isPending || isConfirming || isInitialLoading || isFetching}
                                >
                                    {(isPending || isConfirming || isInitialLoading || isFetching) ? <Loader2 className="animate-spin h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Player Info Panel */}
            <div className="bg-white/90 backdrop-blur-sm border-2 border-blue-200 rounded-xl p-3 shadow-lg">
                <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                        <div className="text-xs text-blue-600 font-medium uppercase tracking-wider mb-1">Player 1</div>
                        <div className={`text-sm font-mono truncate px-2 py-1 rounded bg-blue-50 border border-blue-100 ${player1 === userAddress ? 'text-blue-700 font-bold border-blue-300' : 'text-blue-900'}`}>
                            {player1?.slice(0, 10)}...{player1?.slice(-8)}
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-xs text-blue-600 font-medium uppercase tracking-wider mb-1">Player 2</div>
                        <div className={`text-sm font-mono truncate px-2 py-1 rounded bg-blue-50 border border-blue-100 ${player2 === userAddress ? 'text-blue-700 font-bold border-blue-300' : 'text-blue-900'}`}>
                            {player2 ? `${player2.slice(0, 10)}...${player2.slice(-8)}` : 'Waiting...'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Loading Winner State */}
            {gameState === GameState.Finished && !winner && (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 text-center animate-pulse">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">Calculating Final Results...</p>
                    <p className="text-slate-400 text-xs mt-1">Decrypting winner information from the blockchain</p>
                </div>
            )}

            {/* Final Announcement */}
            {gameState === GameState.Finished && winner && (
                <div className={`rounded-xl p-6 shadow-xl border-2 text-center animate-in fade-in zoom-in duration-500 ${winner.toLowerCase() === userAddress.toLowerCase()
                    ? 'bg-gradient-to-br from-yellow-400 via-orange-400 to-amber-500 border-yellow-200'
                    : 'bg-gradient-to-br from-slate-600 to-slate-800 border-slate-500'
                    }`}>
                    {winner.toLowerCase() === userAddress.toLowerCase() && <div className="text-5xl mb-3 animate-bounce">🏆</div>}
                    <h2 className="text-2xl font-black text-white drop-shadow-md mb-2">
                        {winner.toLowerCase() === userAddress.toLowerCase() ? 'DIVINE VICTORY' : 'GAME OVER'}
                    </h2>
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 inline-block">
                        <p className="text-white font-bold text-sm uppercase tracking-[0.2em] mb-1">The Winner Is</p>
                        <p className="text-white text-xl font-mono break-all">{winner}</p>
                    </div>
                    {winner.toLowerCase() === userAddress.toLowerCase() ? (
                        <p className="mt-4 text-white text-3xl font-black italic drop-shadow-lg">YOU WON! 🎉</p>
                    ) : (
                        <p className="mt-4 text-slate-300 text-2xl font-bold italic">Better luck next time! ⚓</p>
                    )}
                </div>
            )}

            {/* Join Prompt */}
            {!isParticipant && gameState === GameState.WaitingForOpponent && (
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-6 text-center">
                    <p className="text-blue-800 font-medium mb-4">Join this game to start playing!</p>
                    <Button onClick={onJoin} disabled={isPending || isConfirming || isInitialLoading} size="lg">
                        {(isConfirming || isInitialLoading) ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                        Join Game
                    </Button>
                </div>
            )}
        </div>
    );
}
