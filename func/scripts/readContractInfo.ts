import {Address} from '@ton/core';
import {NetworkProvider} from '@ton/blueprint';
import {AnycraftNftCollection} from '../wrappers/AnycraftNftCollection';
import {fromNano} from "@ton/core/src/utils/convert";

export async function run(provider: NetworkProvider) {
    const contractAddress = await provider.ui().input('Nft Collection Address: ');
    const nftCollectionContract = AnycraftNftCollection.createFromAddress(Address.parse(contractAddress));
    const nftCollection = provider.open(nftCollectionContract);

    const collectionInfo = await nftCollection.getCollectionData();
    const nextItemIndex = collectionInfo.nextItemIndex;
    const ownerAddress = collectionInfo.ownerAddress;
    const mintFeeNanos = (await nftCollection.getMintFee()).fee
    const mintFee = fromNano(mintFeeNanos)
    const publicKey = (await nftCollection.getAnycraftPublicKey()).publicKey

    console.log(`nextItemIndex: ${nextItemIndex}`);
    console.log(`ownerAddress: ${ownerAddress}`);
    console.log(`mintFee: ${mintFee}`);
    console.log(`publicKey: ${publicKey}`);
}
