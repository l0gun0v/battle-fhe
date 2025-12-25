
import GameBoard from '@/components/game-board'
import Link from 'next/link'
import { ArrowLeft, Gamepad2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function GamePage({
    params,
}: {
    params: Promise<{ address: string }>
}) {
    const { address } = await params

    return (
        <main className="min-h-screen p-3 md:p-4 max-w-6xl mx-auto">
            <div className="mb-2 md:mb-3">
                <Link href="/">
                    <Button variant="ghost" className="mb-1 md:mb-2 text-xs md:text-sm">
                        <ArrowLeft className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                        Back to Lobby
                    </Button>
                </Link>
                <div className="flex items-center gap-2 md:gap-3">
                    <div className="bg-white/90 backdrop-blur-sm p-1.5 md:p-2 rounded-xl shadow-lg border border-blue-200">
                        <Gamepad2 className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent">
                            Game Room
                        </h1>
                        <p className="text-blue-600/80 text-xs mt-0.5 font-mono">
                            {address.slice(0, 10)}...{address.slice(-8)}
                        </p>
                    </div>
                </div>
            </div>
            <GameBoard contractAddress={address} />
        </main>
    )
}
