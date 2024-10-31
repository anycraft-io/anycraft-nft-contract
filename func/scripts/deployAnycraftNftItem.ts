import {Address, toNano} from '@ton/core';
import {NetworkProvider} from '@ton/blueprint';
import {AnycraftNftCollection, nftMessageToCell} from '../wrappers/AnycraftNftCollection';
import key from './key.json';
import {keyPairFromSeed, sign} from '@ton/crypto';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const nftCollection = provider.open(
        AnycraftNftCollection.createFromAddress(Address.parse(await ui.input('Nft Collection Address: '))),
    );

    const nextItemIndex = (await nftCollection.getCollectionData()).next_item_index;
    const toSign = nftMessageToCell('test_item.json', provider.sender().address!, nextItemIndex, toNano('0.01'));

    const seed = Buffer.from(key.seedHex, "hex");
    const keyPair = keyPairFromSeed(seed);
    const signature = sign(toSign.hash(), keyPair.secretKey);

    await nftCollection.sendDeployNft(provider.sender(), toNano('0.07'), signature, toSign);
}
