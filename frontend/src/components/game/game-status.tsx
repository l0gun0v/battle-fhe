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
