import {Address, toNano} from '@ton/core';
import {NetworkProvider} from '@ton/blueprint';
import {AnycraftNftCollection, nftMessageToCell} from '../wrappers/AnycraftNftCollection';
import key from './key.json';
import {keyPairFromSeed, sign} from '@ton/crypto';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const enteredAddress = await ui.input('Nft Collection Address: ');
    const nftItemMeta = await ui.input('Meta json: ');
    const collectionAddress = Address.parse(enteredAddress);
    const nftCollection = provider.open(AnycraftNftCollection.createFromAddress(collectionAddress));

    const nextItemIndex = (await nftCollection.getCollectionData()).nextItemIndex;
    const nftItemCell = nftMessageToCell(nftItemMeta, provider.sender().address!, nextItemIndex, toNano('0.05'));

    const seed = Buffer.from(key.seedHex, "hex");
    const keyPair = keyPairFromSeed(seed);
    const signature = sign(nftItemCell.hash(), keyPair.secretKey);

    await nftCollection.sendDeployNft(provider.sender(), toNano('0.1'), signature, nftItemCell);
}
