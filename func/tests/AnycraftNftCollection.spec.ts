import {Blockchain, SandboxContract, TreasuryContract} from '@ton/sandbox';
import {Cell, toNano} from '@ton/core';
import {AnycraftNftCollection} from '../wrappers/AnycraftNftCollection';
import '@ton/test-utils';
import {compile} from '@ton/blueprint';
import {getSecureRandomBytes, KeyPair, keyPairFromSeed, sign} from '@ton/crypto';

describe('AnycraftNftCollection', () => {
    let code: Cell;
    let nftItemCode: Cell;

    beforeAll(async () => {
        code = await compile('AnycraftNftCollection');
        nftItemCode = await compile('AnycraftNftItem');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let admin: SandboxContract<TreasuryContract>;
    let nftCollection: SandboxContract<AnycraftNftCollection>;
    let anycraftKeyPair: KeyPair;
    let fee = toNano('0.05');

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        const seed = await getSecureRandomBytes(32);
        anycraftKeyPair = keyPairFromSeed(seed);

        deployer = await blockchain.treasury('deployer');
        admin = await blockchain.treasury('admin');

        nftCollection = blockchain.openContract(
            AnycraftNftCollection.createFromConfig(
                {
                    adminContractAddress: admin.address,
                    anycraftPublicKey: anycraftKeyPair.publicKey,
                    ownerAddress: deployer.address,
                    collectionContent: 'https://anycraft-public.s3.eu-north-1.amazonaws.com/nft/collection.json',
                    commonContent: 'https://anycraft-public.s3.eu-north-1.amazonaws.com/nft/items/',
                    nextItemIndex: 0,
                    royaltyParams: {
                        royaltyFactor: 5,
                        royaltyBase: 100,
                        royaltyAddress: admin.address,
                    },
                    nftItemCode,
                    fee,
                },
                code,
            ),
        );

        const deployResult = await nftCollection.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: nftCollection.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and anycraftNftCollection are ready to use
    });
});
