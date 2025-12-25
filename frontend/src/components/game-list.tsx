
'use client'

import { useReadContract, useReadContracts, useAccount } from 'wagmi'
import { FACTORY_ADDRESS } from '@/lib/constants'
import BattleshipFactoryArtifact from '@/lib/abi/BattleshipFactory.json'
import BattleshipGameArtifact from '@/lib/abi/BattleshipGame.json'
import { useState, useEffect, useMemo } from 'react'
import { readContract } from '@wagmi/core'
import { config } from '@/config/wagmi'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Gamepad2, ExternalLink, Loader2, User, Globe } from 'lucide-react'
import { GameState } from '@/hooks/useGameContract'

const FACTORY_ABI = BattleshipFactoryArtifact.abi
const GAME_ABI = BattleshipGameArtifact.abi

export default function GameList() {
    const { data: gameCount, isLoading } = useReadContract({
        address: FACTORY_ADDRESS as `0x${string}`,
        abi: FACTORY_ABI,
        functionName: 'getGameCount',
        query: {
            refetchInterval: 6000
        }
    })

    const [gameAddresses, setGameAddresses] = useState<string[]>([])
    const [isLoadingAddresses, setIsLoadingAddresses] = useState(false)
    const { address: userAddress } = useAccount()

    useEffect(() => {
        const fetchAddresses = async () => {
            if (!gameCount) return
            setIsLoadingAddresses(true)
            try {
                const count = Number(gameCount)
                const promises = []
                for (let i = count - 1; i >= Math.max(0, count - 10); i--) {
                    promises.push(
                        readContract(config, {
                            address: FACTORY_ADDRESS as `0x${string}`,
                            abi: FACTORY_ABI,
                            functionName: 'games',
                            args: [BigInt(i)],
                        })
                    )
                }
                const results = await Promise.all(promises)
                setGameAddresses(results as string[])
            } catch (error) {
                console.error('Error fetching addresses:', error)
            } finally {
                setIsLoadingAddresses(false)
            }
        }
        fetchAddresses()
    }, [gameCount])

    // Fetch details for all discovered games
    const { data: detailsResults, isLoading: isLoadingDetails } = useReadContracts({
        contracts: gameAddresses.flatMap(address => [
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { address: address as `0x${string}`, abi: GAME_ABI as any, functionName: 'gameState' },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { address: address as `0x${string}`, abi: GAME_ABI as any, functionName: 'player1' },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { address: address as `0x${string}`, abi: GAME_ABI as any, functionName: 'player2' },
        ]),
        query: {
            enabled: gameAddresses.length > 0,
            refetchInterval: 6000
        }
    })

    const processedGames = useMemo(() => {
        if (!detailsResults || detailsResults.length === 0) return []

        return gameAddresses.map((address, i) => {
            const baseIdx = i * 3
            return {
                address,
                gameState: detailsResults[baseIdx]?.result as GameState,
                player1: detailsResults[baseIdx + 1]?.result as string,
                player2: detailsResults[baseIdx + 2]?.result as string,
            }
        })
    }, [gameAddresses, detailsResults])

    const myGames = useMemo(() => {
        if (!userAddress) return []
        return processedGames.filter(g =>
            g.player1?.toLowerCase() === userAddress.toLowerCase() ||
            g.player2?.toLowerCase() === userAddress.toLowerCase()
        )
    }, [processedGames, userAddress])

    const availableGames = useMemo(() => {
        return processedGames.filter(g =>
            g.gameState === GameState.WaitingForOpponent &&
            (!userAddress || (g.player1?.toLowerCase() !== userAddress.toLowerCase()))
        )
    }, [processedGames, userAddress])

    if (isLoading || isLoadingAddresses || (gameAddresses.length > 0 && isLoadingDetails)) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    if (!gameCount || Number(gameCount) === 0) {
        return (
            <div className="text-center p-12 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200">
                <Gamepad2 className="h-12 w-12 mx-auto mb-4 text-blue-400" />
                <p className="text-blue-700 font-medium text-lg">No games found</p>
                <p className="text-blue-600 text-sm mt-2">Create one to get started!</p>
            </div>
        )
    }

    const GameCard = ({ game, isMyGame }: { game: typeof processedGames[0], isMyGame: boolean }) => (
        <div
            className="group bg-gradient-to-br from-white to-blue-50/50 border-2 border-blue-200 p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-blue-400"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-2 rounded-lg">
                    <Gamepad2 className="h-5 w-5 text-white" />
                </div>
                <div className="text-xs font-mono text-blue-600 bg-blue-100 px-2 py-1 rounded">
                    #{game.address.slice(0, 6)}...{game.address.slice(-4)}
                </div>
            </div>
            <h3 className="font-bold text-blue-900 mb-1">Battleship Game</h3>
            <p className="text-sm text-blue-600 mb-4">
                {game.gameState === GameState.WaitingForOpponent ? 'Waiting for opponent' :
                    game.gameState === GameState.WaitingForPlacements ? 'Placing ships' :
                        game.gameState === GameState.InProgress ? 'Game in progress' : 'Finished'}
            </p>
            <Link href={`/game/${game.address}`} className="block">
                <Button
                    variant={isMyGame ? "default" : "secondary"}
                    className="w-full group-hover:shadow-lg transition-all"
                >
                    {isMyGame ? 'Continue Game' : 'Join Game'}
                    <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
            </Link>
        </div>
    )

    return (
        <div className="space-y-12">
            {/* My Games Section */}
            {userAddress && (
                <section>
                    <div className="flex items-center gap-2 mb-6 border-b-2 border-blue-100 pb-2">
                        <User className="h-5 w-5 text-blue-600" />
                        <h2 className="text-xl font-extrabold text-blue-900 tracking-tight">MY GAMES</h2>
                        <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">{myGames.length}</span>
                    </div>
                    {myGames.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {myGames.map((game) => <GameCard key={game.address} game={game} isMyGame={true} />)}
                        </div>
                    ) : (
                        <p className="text-blue-500 italic p-4 bg-blue-50/50 rounded-lg border border-dashed border-blue-200">You haven&apos;t joined any games yet.</p>
                    )}
                </section>
            )}

            {/* Available Games Section */}
            <section>
                <div className="flex items-center gap-2 mb-6 border-b-2 border-blue-100 pb-2">
                    <Globe className="h-5 w-5 text-blue-600" />
                    <h2 className="text-xl font-extrabold text-blue-900 tracking-tight">AVAILABLE GAMES</h2>
                    <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">{availableGames.length}</span>
                </div>
                {availableGames.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {availableGames.map((game) => <GameCard key={game.address} game={game} isMyGame={false} />)}
                    </div>
                ) : (
                    <div className="text-center p-8 bg-blue-50/30 rounded-xl border border-dashed border-blue-200">
                        <p className="text-blue-600">No available games to join.</p>
                    </div>
                )}
            </section>
        </div>
    )
}
