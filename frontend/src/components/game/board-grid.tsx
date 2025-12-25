import { GameState } from '@/hooks/useGameContract';

interface BoardGridProps {
    gameState: GameState;
    size: number;
    hits: Set<number>;
    misses: Set<number>;
    ships: Set<number>; 
    selectedCells: number[]; 
    onCellClick: (index: number) => void;
    isMyBoard: boolean;
    isMyTurn: boolean;
    isInitialLoading: boolean;
    isInteractionsBlocked: boolean;
    title: string;
}

export function BoardGrid({
    gameState,
    size,
    hits,
    misses,
    ships,
    selectedCells,
    onCellClick,
    isMyBoard,
    isMyTurn,
    isInitialLoading,
    isInteractionsBlocked,
    title
}: BoardGridProps) {
    const totalCells = size * size;

    return (
        <div className="bg-white/90 backdrop-blur-sm border-2 border-blue-200 rounded-xl p-3 shadow-lg">
            <h3 className="text-lg font-bold text-blue-900 mb-3 text-center">{title}</h3>
            <div className="w-full flex justify-center">
                <div
                    className="grid gap-1 mx-auto"
                    style={{
                        gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
                        width: '100%',
                        maxWidth: 'min(90vw, calc(100vh - 550px), 550px)',
                        aspectRatio: '1 / 1'
                    }}
                >
                    {Array.from({ length: totalCells }).map((_, i) => {
                        const canInteract =
                            !isInteractionsBlocked && (
                                (gameState === GameState.WaitingForPlacements && isMyBoard) ||
                                (gameState === GameState.InProgress && !isMyBoard && isMyTurn && !hits.has(i) && !misses.has(i))
                            );

                        const getCellContent = (index: number) => {
                            if (isMyBoard) {
                                if (hits.has(index)) {
                                    return '💥';
                                } else if (misses.has(index)) {
                                    return '❌';
                                } else if (ships.has(index) || (gameState === GameState.WaitingForPlacements && selectedCells.includes(index))) {
                                    return '🚢';
                                }
                            } else {
                                if (hits.has(index)) {
                                    return '💥';
                                } else if (misses.has(index)) {
                                    return '❌';
                                }
                            }
                            return '';
                        };

                        const cellContent = getCellContent(i);

                        return (
                            <button
                                key={i}
                                onClick={() => canInteract && onCellClick(i)}
                                disabled={!canInteract}
                                className={`aspect-square border-2 rounded-lg flex items-center justify-center font-semibold text-sm transition-all duration-200
                                    ${hits.has(i) ? 'bg-gradient-to-br from-red-500 to-red-600 text-white border-red-600' :
                                        misses.has(i) ? 'bg-gray-300 text-gray-600 border-gray-400' :
                                            (ships.has(i) || (gameState === GameState.WaitingForPlacements && selectedCells.includes(i))) ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white border-blue-600' :
                                                'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-300 text-blue-700'}
                                    ${canInteract ? 'hover:bg-blue-100 hover:border-blue-400 hover:scale-105 cursor-pointer' : 'cursor-default'}
                                    ${isInitialLoading ? 'opacity-50 grayscale' : ''}
                                `}
                            >
                                {cellContent}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
