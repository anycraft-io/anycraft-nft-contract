import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { AnycraftNftCollection } from '../wrappers/AnycraftNftCollection';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('AnycraftNftCollection', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('AnycraftNftCollection');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let anycraftNftCollection: SandboxContract<AnycraftNftCollection>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        anycraftNftCollection = blockchain.openContract(AnycraftNftCollection.createFromConfig({}, code));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await anycraftNftCollection.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: anycraftNftCollection.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and anycraftNftCollection are ready to use
    });
});
