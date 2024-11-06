import {Address, toNano} from '@ton/core';
import {NetworkProvider} from '@ton/blueprint';
import {AnycraftNftCollection} from '../wrappers/AnycraftNftCollection';

export async function run(provider: NetworkProvider) {
    const contractAddress = await provider.ui().input('Nft Collection Address: ');
    const nftCollectionContract = AnycraftNftCollection.createFromAddress(Address.parse(contractAddress));
    const nftCollection = provider.open(nftCollectionContract);

    const choice = await provider.ui().input(
        'Choose what you want:\n' +
        '1 Change minting fee\n'
    );

    switch (choice) {
        case '1':
            await changeMintingFee(provider)
            break
        default:
            console.log("Unexpected value " + choice);
    }

    async function changeMintingFee(provider: NetworkProvider) {
        const feeTon = await provider.ui().input('Fee in TON: ');
        await nftCollection.sendChangeFee(provider.sender(), toNano(feeTon));
    }
}
