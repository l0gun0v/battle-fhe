
import {
    Config,
    GetConnectorClientReturnType,
    GetPublicClientReturnType,
} from '@wagmi/core';
import { BrowserProvider, JsonRpcSigner } from 'ethers';

export function clientToSigner(
    client: GetConnectorClientReturnType<Config, number>
) {
    const { account, chain, transport } = client;
    const network = {
        chainId: chain.id,
        name: chain.name,
        ensAddress: chain.contracts?.ensRegistry?.address,
    };
    const provider = new BrowserProvider(transport, network);
    const signer = new JsonRpcSigner(provider, account.address);
    return signer;
}

export function clientToEthersTransport(
    client: NonNullable<GetPublicClientReturnType<Config, number>>
) {
    return client.transport;
}
