
'use client'

import ConnectButton from '@/components/connect-button'
import GameList from '@/components/game-list'
import CreateGame from '@/components/create-game'
import { useAccount } from 'wagmi'
import { Ship } from 'lucide-react'

export default function Home() {
  const { isConnected } = useAccount()

  return (
    <main className="min-h-screen p-6 md:p-8 lg:p-12 max-w-6xl mx-auto space-y-10 bg-transparent">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-blue-200">
            <Ship className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent">
              Battleship FHE
            </h1>
            <p className="text-blue-600/80 text-sm mt-1">Fully Homomorphic Encryption Battleship</p>
          </div>
        </div>
        <ConnectButton />
      </div>

      <div className="space-y-10">
        <section className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-blue-200 p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-blue-900 flex items-center gap-2">
            <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-cyan-400 rounded-full"></div>
            Lobby
          </h2>
          {isConnected ? (
            <CreateGame />
          ) : (
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 p-6 rounded-xl shadow-md">
              <p className="text-amber-800 font-medium flex items-center gap-2">
                <span className="text-xl">🔒</span>
                Please connect your wallet to create or play games.
              </p>
            </div>
          )}
        </section>

        <section className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-blue-200 p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-blue-900 flex items-center gap-2">
            <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-cyan-400 rounded-full"></div>
            Available Games
          </h2>
          <GameList />
        </section>
      </div>
    </main>
  )
}
