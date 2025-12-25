import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useFhevm } from '@/hooks/use-fhevm';

interface ShipPlacementProps {
    selectedCount: number;
    requiredCount: number;
    onConfirm: () => void;
    isPending: boolean;
    isConfirming: boolean;
    hasUserPlaced: boolean;
    hasOpponentPlaced: boolean;
    isInitialLoading: boolean;
    isFetching: boolean;
}

export function ShipPlacement({
    selectedCount,
    requiredCount,
    onConfirm,
    isPending,
    isConfirming,
    hasUserPlaced,
    hasOpponentPlaced,
    isInitialLoading,
    isFetching
}: ShipPlacementProps) {
    const { data: fhevm, isLoading: isFhevmLoading, error: fhevmError } = useFhevm();

    if (hasUserPlaced) {
        return (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-5">
                <p className="text-green-800 font-medium mb-2 text-center">
                    ✓ Your ships have been placed!
                </p>
                <p className="text-green-700 text-sm text-center">
                    {hasOpponentPlaced
                        ? 'Both players ready! Game starting...'
                        : 'Waiting for opponent to place their ships...'}
                </p>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-5">
            <p className="text-blue-800 font-medium mb-3 text-center">
                Selected {selectedCount} of {requiredCount} ships
                {selectedCount >= requiredCount && (
                    <span className="block text-sm text-green-600 mt-1">✓ All ships placed! Ready to confirm.</span>
                )}
            </p>

            {isFhevmLoading && <p className="text-xs text-blue-600 mb-2 text-center">Initializing encryption...</p>}
            {fhevmError && <p className="text-xs text-red-600 mb-2 text-center">Error: {fhevmError.message}</p>}

            <Button
                onClick={onConfirm}
                disabled={isPending || isConfirming || selectedCount !== requiredCount || !fhevm || isInitialLoading}
                size="lg"
                className="w-full"
            >
                {(isConfirming || isPending || isInitialLoading || isFetching) && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
                Place Ships
            </Button>
        </div>
    );
}
