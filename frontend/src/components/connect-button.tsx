
'use client';

import { useAccount } from 'wagmi'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'

export default function ConnectButton() {
    const { isConnected, isConnecting } = useAccount()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <Button size="lg" disabled className="min-w-[140px]">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
            </Button>
        )
    }

    if (isConnected) {
        return (
            <div className="[&_w3m-button]:!rounded-lg [&_w3m-button]:!shadow-lg">
                <appkit-button />
            </div>
        )
    }

    return (
        <div className="[&_w3m-button]:!rounded-lg [&_w3m-button]:!shadow-lg [&_w3m-button]:!min-w-[140px]">
            {isConnecting && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                </div>
            )}
            <appkit-button />
        </div>
    )
}
