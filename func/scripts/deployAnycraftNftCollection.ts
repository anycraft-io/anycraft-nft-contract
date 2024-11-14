import {toNano} from '@ton/core';
import {AnycraftNftCollection} from '../wrappers/AnycraftNftCollection';
import {compile, NetworkProvider} from '@ton/blueprint';
import {keyPairFromSeed} from '@ton/crypto';
import key from './key.json';

export async function run(provider: NetworkProvider) {
    const seed = Buffer.from(key.seedHex, "hex");
    const anycraftKeyPair = keyPairFromSeed(seed);

    const root = 'https://public.anycraft.io';
    const nftDir = 'testnet' == provider.network() ? 'nft-stage' : 'nft'
    const nftCollection = provider.open(
        AnycraftNftCollection.createFromConfig(
            {
                ownerAddress: provider.sender().address!,
                nextItemIndex: 0,
                collectionContent: `${root}/${nftDir}/assets/collection.json`,
                commonContent: `${root}/${nftDir}/items/`,
                nftItemCode: await compile('AnycraftNftItem'),
                royaltyParams: {
                    royaltyFactor: 5,
                    royaltyBase: 100,
                    royaltyAddress: provider.sender().address!,
                },
                anycraftPublicKey: anycraftKeyPair.publicKey,
                fee: toNano('0.05'),
            },
            await compile('AnycraftNftCollection'),
        ),
    );

    await nftCollection.sendDeploy(provider.sender(), toNano('0.45'));

    await provider.waitForDeploy(nftCollection.address);
}
