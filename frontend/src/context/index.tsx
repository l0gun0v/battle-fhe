
'use client'

import { wagmiAdapter, projectId } from '@/config/wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createAppKit } from '@reown/appkit/react'
import { sepolia } from '@reown/appkit/networks'
import React, { type ReactNode } from 'react'
import { cookieToInitialState, WagmiProvider, type Config } from 'wagmi'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 0,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            staleTime: 1000 * 60 * 5,
        }
    }
})

if (!projectId) {
    throw new Error('Project ID is not defined')
}

createAppKit({
    adapters: [wagmiAdapter],
    projectId,
    networks: [sepolia],
    defaultNetwork: sepolia,
    metadata: {
        name: 'Battleship FHE',
        description: 'Battleship game with FHE',
        url: 'https://battleship-fhe.vercel.app', 
        icons: ['https://avatars.githubusercontent.com/u/179229932']
    },
    features: {
        analytics: true
    }
})

export default function ContextProvider({
    children,
    cookiesString
}: {
    children: ReactNode
    cookiesString: string | null
}) {
    const initialState = cookieToInitialState(
        wagmiAdapter.wagmiConfig as Config,
        cookiesString
    )

    return (
        <WagmiProvider
            config={wagmiAdapter.wagmiConfig as Config}
            initialState={initialState}
        >
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </WagmiProvider>
    )
}
