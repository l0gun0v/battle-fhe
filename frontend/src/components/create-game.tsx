
'use client'

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { FACTORY_ADDRESS } from '@/lib/constants'
import BattleshipFactoryArtifact from '@/lib/abi/BattleshipFactory.json'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2, Plus, Grid3x3, Ship } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useQueryClient } from '@tanstack/react-query'

const FACTORY_ABI = BattleshipFactoryArtifact.abi

export default function CreateGame() {
    const { writeContract, data: hash, isPending } = useWriteContract()
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash,
    })
    const queryClient = useQueryClient()

    const [boardSize, setBoardSize] = useState('5')
    const [shipCount, setShipCount] = useState('2')

    useEffect(() => {
        if (isSuccess) {
            toast.success('Game created successfully!')
            queryClient.invalidateQueries()
        }
    }, [isSuccess, queryClient])

    const handleCreate = async () => {
        const boardSizeNum = Number(boardSize)
        const shipCountNum = Number(shipCount)

        if (!boardSize || !shipCount || isNaN(boardSizeNum) || isNaN(shipCountNum)) {
            toast.error('Please enter valid numbers')
            return
        }

        if (boardSizeNum < 3 || boardSizeNum > 10) {
            toast.error('Board size must be between 3 and 10')
            return
        }

        if (shipCountNum < 2) {
            toast.error('Must have at least 2 ships')
            return
        }

        try {
            writeContract({
                address: FACTORY_ADDRESS as `0x${string}`,
                abi: FACTORY_ABI,
                functionName: 'createGame',
                args: [boardSizeNum, shipCountNum],
            })
        } catch (error) {
            toast.error('Failed to create game')
            console.error(error)
        }
    }

    return (
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 p-6 rounded-xl space-y-6 shadow-lg">
            <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-2 rounded-lg">
                    <Plus className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-blue-900">Create New Game</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-blue-800">
                        <Grid3x3 className="h-4 w-4" />
                        Board Size
                    </label>
                    <input
                        type="number"
                        value={boardSize}
                        onChange={(e) => setBoardSize(e.target.value)}
                        className="w-full border-2 border-blue-200 bg-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-blue-900 font-medium"
                        min={3}
                        max={10}
                        placeholder="Enter board size"
                    />
                    <p className={`text-xs ${boardSize && !isNaN(Number(boardSize)) && Number(boardSize) >= 3 && Number(boardSize) <= 10
                            ? 'text-blue-600'
                            : 'text-red-600'
                        }`}>
                        {boardSize && !isNaN(Number(boardSize))
                            ? (Number(boardSize) >= 3 && Number(boardSize) <= 10
                                ? `Size: ${boardSize}x${boardSize}`
                                : 'Enter a number between 3 and 10')
                            : 'Enter a number between 3 and 10'}
                    </p>
                </div>

                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-blue-800">
                        <Ship className="h-4 w-4" />
                        Number of Ships
                    </label>
                    <input
                        type="number"
                        value={shipCount}
                        onChange={(e) => setShipCount(e.target.value)}
                        className="w-full border-2 border-blue-200 bg-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-blue-900 font-medium"
                        min={2}
                        placeholder="Enter number of ships"
                    />
                    <p className={`text-xs ${shipCount && !isNaN(Number(shipCount)) && Number(shipCount) >= 2
                            ? 'text-blue-600'
                            : 'text-red-600'
                        }`}>
                        {shipCount && !isNaN(Number(shipCount))
                            ? (Number(shipCount) >= 2
                                ? `Place ${shipCount} ships on the board`
                                : 'Enter a number (minimum 2)')
                            : 'Enter a number (minimum 2)'}
                    </p>
                </div>
            </div>

            <Button
                onClick={handleCreate}
                disabled={
                    isPending ||
                    isConfirming ||
                    !boardSize ||
                    !shipCount ||
                    isNaN(Number(boardSize)) ||
                    isNaN(Number(shipCount)) ||
                    Number(boardSize) < 3 ||
                    Number(boardSize) > 10 ||
                    Number(shipCount) < 2
                }
                size="lg"
                className="w-full md:w-auto"
            >
                {(isPending || isConfirming) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isPending ? 'Confirming...' : isConfirming ? 'Creating Game...' : 'Create Game'}
            </Button>
        </div>
    )
}
