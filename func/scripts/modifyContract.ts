import {Address, toNano} from '@ton/core';
import {NetworkProvider} from '@ton/blueprint';
import {AnycraftNftCollection} from '../wrappers/AnycraftNftCollection';

export async function run(provider: NetworkProvider) {
    const contractAddress = await provider.ui().input('Nft Collection Address: ');
    const nftCollectionContract = AnycraftNftCollection.createFromAddress(Address.parse(contractAddress));
    const nftCollection = provider.open(nftCollectionContract);

    const choice = await provider.ui().input(
        'Choose what you want:\n' +
        '1 Change minting fee\n' +
        '2 Change content\n'
    );

    switch (choice) {
        case '1':
            await changeMintingFee(provider)
            break
        case '2':
            await changeCollectionContent(provider)
            break
        default:
            console.log("Unexpected value " + choice);
    }

    async function changeMintingFee(provider: NetworkProvider) {
        const feeTon = await provider.ui().input('Fee in TON: ');
        await nftCollection.sendChangeFee(provider.sender(), toNano(feeTon));
    }

    async function changeCollectionContent(provider: NetworkProvider) {
        const metaUrl = await provider.ui().input('Collection meta url: ');
        const commonUrl = await provider.ui().input('Common url: ');
        const royaltyFactor = await provider.ui().input('Royalty factor: ');
        const royaltyBase = await provider.ui().input('Royalty base: ');
        const royaltyAddress = await provider.ui().input('Royalty address: ');

        const content = {
            collectionContent: metaUrl,
            commonContent: commonUrl,
            royaltyFactor: parseInt(royaltyFactor),
            royaltyBase: parseInt(royaltyBase),
            royaltyAddress: Address.parse(royaltyAddress)
        }
        await nftCollection.sendChangeContent(provider.sender(), content);
    }
}
