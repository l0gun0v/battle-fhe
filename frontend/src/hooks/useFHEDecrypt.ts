'use client';

import { useCallback } from 'react';
import { useAccount, useConnectorClient } from 'wagmi';
import { clientToSigner } from '@/lib/wagmi-etheres-adapter';
import { useFhevm } from './use-fhevm';

const SIGNATURE_DURATION = '1'; // 1 day for better UX, or keep '100' if you want long retention

interface CachePayload {
    signature: string;
    startTimeStamp: string;
    durationDays: string;
    cachedUserAddress: string;
    chainId: number;
    privateKey: string;
    publicKey: string;
}

interface FhevmInstance {
    generateKeypair: () => { publicKey: string; privateKey: string };
    createEIP712: (publicKey: string, contractAddresses: string[], startTime: string, duration: string) => { domain: unknown; types: unknown; message: unknown };
    userDecrypt: (
        handles: { handle: string; contractAddress: string }[],
        privateKey: string,
        publicKey: string,
        signature: string,
        contractAddresses: string[],
        userAddress: string,
        startTime: string,
        duration: string
    ) => Promise<unknown>;
}

export function useFHEDecrypt(contractAddress: string) {
    const { address: userAddress, chainId } = useAccount();
    const { data: connectorClient } = useConnectorClient();
    const { data: fhevm } = useFhevm();

    // Helper to get or create signature with robust caching
    const getSignature = useCallback(async (
        fhevmInstance: FhevmInstance,
        signer: unknown, // simpler than typing Signer for now, or just suppress logic inside if needed
        contractAddresses: string[],
        forceRefresh: boolean = false
    ) => {
        if (!userAddress || !chainId) throw new Error('User not connected');

        const storageKey = `fhevm_sig_${contractAddress}_${userAddress.toLowerCase()}_${chainId}`;
        const now = Math.floor(Date.now() / 1000);

        // Try reading from cache
        if (!forceRefresh) {
            try {
                const cached = localStorage.getItem(storageKey);
                if (cached) {
                    const parsed: CachePayload = JSON.parse(cached);

                    // Validate cache integrity
                    if (
                        parsed.cachedUserAddress.toLowerCase() === userAddress.toLowerCase() &&
                        parsed.chainId === chainId &&
                        // Check expiry
                        (now - parseInt(parsed.startTimeStamp) < parseInt(parsed.durationDays) * 86400)
                    ) {
                        return {
                            signature: parsed.signature,
                            startTimeStamp: parsed.startTimeStamp,
                            durationDays: parsed.durationDays,
                            keypair: { publicKey: parsed.publicKey, privateKey: parsed.privateKey }
                        };
                    }
                }
            } catch (e) {
                console.warn('Failed to parse cached signature', e);
                localStorage.removeItem(storageKey);
            }
        }

        // Create new signature
        const startTimeStamp = now.toString();
        const durationDays = SIGNATURE_DURATION;



        const keypair = fhevmInstance.generateKeypair();
        const eip712 = fhevmInstance.createEIP712(
            keypair.publicKey,
            contractAddresses,
            startTimeStamp,
            durationDays
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const signature = await (signer as any).signTypedData(
            eip712.domain,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { UserDecryptRequestVerification: (eip712.types as any).UserDecryptRequestVerification },
            eip712.message
        );

        // Cache everything
        const cachePayload: CachePayload & { privateKey: string, publicKey: string } = {
            signature,
            startTimeStamp,
            durationDays,
            cachedUserAddress: userAddress,
            chainId,
            privateKey: keypair.privateKey,
            publicKey: keypair.publicKey
        };

        localStorage.setItem(storageKey, JSON.stringify(cachePayload));

        return {
            signature,
            startTimeStamp,
            durationDays,
            keypair // Return the keypair associated with this signature
        };
    }, [userAddress, chainId, contractAddress]);
    // Wait, the linter COMPLAINED about missing dependency. 
    // Ah, I am using `contractAddress` (singular) in the `storageKey` construction which comes from the HOOK scope.
    // The explicit argument is `contractAddresses` (plural).
    // So `contractAddress` (singular) IS a dependency!

    // Retry with correct content:



    const decryptHandles = useCallback(async (
        handles: { value: bigint | string | unknown, name: string }[],
        contractAddress: string
    ) => {
        if (!fhevm || !connectorClient || !userAddress) return null;

        const signer = clientToSigner(connectorClient);
        const fhevmInstance = fhevm as unknown as FhevmInstance;
        const contractAddresses = [contractAddress];

        // Filter out invalid or zero handles to avoid SDK errors or useless requests
        const validHandles = handles.filter(h => h.value !== undefined && h.value !== null && h.value !== 0n && h.value !== '0x0' && h.value !== '');
        if (validHandles.length === 0) return {};

        // Normalization helper
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const norm = (v: any): string => {
            let hex = '';
            if (typeof v === 'bigint') hex = `0x${v.toString(16).padStart(64, '0')}`;
            else if (typeof v === 'string') hex = v.startsWith('0x') ? v : `0x${v}`;
            else hex = String(v);

            // Additional check: if it's a 32-byte zero handle, it's uninitialized
            if (hex === '0x' + '0'.repeat(64)) return '';
            return hex;
        };

        const handleContractPairs = validHandles
            .map(h => ({ handle: norm(h.value), name: h.name }))
            .filter(h => h.handle !== '' && h.handle !== '0x0')
            .map(h => ({ handle: h.handle, contractAddress }));

        if (handleContractPairs.length === 0) return {};

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const performDecrypt = async (currentAuth: any) => {
            const res = await fhevmInstance.userDecrypt(
                handleContractPairs,
                currentAuth.keypair.privateKey,
                currentAuth.keypair.publicKey,
                currentAuth.signature.replace('0x', ''),
                contractAddresses,
                userAddress,
                currentAuth.startTimeStamp,
                currentAuth.durationDays
            );

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const namedResult: Record<string, any> = {};

            if (res && typeof res === 'object' && !Array.isArray(res)) {
                // Handle as object (keyed by handle) - observed in ocp-fhe
                validHandles.forEach(h => {
                    const key = norm(h.value);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    namedResult[h.name] = (res as Record<string, any>)[key];
                });
            } else if (Array.isArray(res)) {
                // Handle as array (by index)
                validHandles.forEach((h, i) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    namedResult[h.name] = (res as any[])[i];
                });
            } else {
                // Single value (if requested only one)
                if (validHandles.length === 1) {
                    namedResult[validHandles[0].name] = res;
                }
            }

            return namedResult;
        };

        try {
            let auth = await getSignature(fhevmInstance, signer, contractAddresses, false);
            try {
                return await performDecrypt(auth);
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                if (msg.includes('authorized') || msg.includes('signature')) {
                    console.warn('Decryption authorized failed. Refreshing signature...');
                    auth = await getSignature(fhevmInstance, signer, contractAddresses, true);
                    return await performDecrypt(auth);
                }
                throw err;
            }
        } catch (error) {
            console.error('Decryption failed:', error);
            throw error;
        }
    }, [fhevm, connectorClient, userAddress, getSignature]);

    return {
        decryptHandles
    };
}
