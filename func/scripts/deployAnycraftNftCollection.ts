import { toNano } from '@ton/core';
import { AnycraftNftCollection } from '../wrappers/AnycraftNftCollection';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const nftCollectionCode = await compile('AnycraftNftCollection');
    const nftCollectionConfig = {};
    const nftCollectionContract = AnycraftNftCollection.createFromConfig(nftCollectionConfig, nftCollectionCode);
    const anycraftNftCollection = provider.open(nftCollectionContract);

    await anycraftNftCollection.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(anycraftNftCollection.address);

    // run methods on `anycraftNftCollection`
}
