
'use client';
import { useQuery } from '@tanstack/react-query';
import { usePublicClient, useAccount } from 'wagmi';
import { clientToEthersTransport } from '@/lib/wagmi-etheres-adapter';

const sepoliaChainId = Number(process.env.NEXT_PUBLIC_SEPOLIA_CHAIN_ID);

if (!process.env.NEXT_PUBLIC_SEPOLIA_CHAIN_ID || isNaN(sepoliaChainId)) {
    throw new Error('NEXT_PUBLIC_SEPOLIA_CHAIN_ID is not defined or invalid')
}

export function useFhevm() {
    const { address, chainId } = useAccount();

    const client = usePublicClient({
        chainId: sepoliaChainId,
    });

    return useQuery({
        queryKey: ['fhevm', address, chainId],
        queryFn: async () => {
            if (!address || !chainId || !client) {
                throw new Error('Address or chainId is not available');
            }
            if (chainId !== sepoliaChainId) {
                throw new Error('FHEVM is only available on Sepolia testnet');
            }

            if (typeof global === 'undefined') {
                (globalThis as unknown as { global: unknown }).global = globalThis;
                (window as unknown as { global: unknown }).global = globalThis;
            }

            // Dynamically import SDK after polyfill is set
            const { createInstance, initSDK, SepoliaConfig } = await import('@zama-fhe/relayer-sdk/web');

            await initSDK();

            const network = clientToEthersTransport(client);

            return await createInstance({
                ...SepoliaConfig,
                network,
            });
        },
        enabled: !!address && !!chainId && !!client && chainId === sepoliaChainId,
        staleTime: Infinity,
    });
}
