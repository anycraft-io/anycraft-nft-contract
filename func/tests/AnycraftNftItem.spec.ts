import {Blockchain, SandboxContract, TreasuryContract} from '@ton/sandbox';
import {Cell, toNano} from '@ton/core';
import {AnycraftNftItem} from '../wrappers/AnycraftNftItem';
import '@ton/test-utils';
import {compile} from '@ton/blueprint';

describe('NftItem', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('AnycraftNftItem');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let nftItem: SandboxContract<AnycraftNftItem>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        nftItem = blockchain.openContract(AnycraftNftItem.createFromConfig({}, code));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await nftItem.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: nftItem.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and nftItem are ready to use
    });
});
