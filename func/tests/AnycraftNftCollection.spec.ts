import {Blockchain, SandboxContract, TreasuryContract} from '@ton/sandbox';
import {Cell, toNano} from '@ton/core';
import {AnycraftNftCollection, nftMessageToCell} from '../wrappers/AnycraftNftCollection';
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
    let user: SandboxContract<TreasuryContract>;
    let nftCollection: SandboxContract<AnycraftNftCollection>;
    let anycraftKeyPair: KeyPair;
    let fee = toNano('0.05');

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        const seed = await getSecureRandomBytes(32);
        anycraftKeyPair = keyPairFromSeed(seed);

        deployer = await blockchain.treasury('deployer');
        admin = await blockchain.treasury('admin');
        user = await blockchain.treasury('user');

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
                        royaltyFactor: 0,
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
        // blockchain and nftCollection are ready to use
    });

    it('should mint nft', async () => {
        const nextItemIndex = (await nftCollection.getCollectionData()).next_item_index;
        const toSign = nftMessageToCell('1.json', user.address, nextItemIndex, toNano('0.01'));

        const signature = sign(toSign.hash(), anycraftKeyPair.secretKey);

        const mintResult = await nftCollection.sendDeployNft(user.getSender(), toNano('0.07'), signature, toSign);

        expect(mintResult.transactions).toHaveTransaction({
            from: user.address,
            to: nftCollection.address,
            success: true,
        });
    });

    it('should not mint nft because wrong signature', async () => {
        const nextItemIndex = (await nftCollection.getCollectionData()).next_item_index;
        const toSign = nftMessageToCell('1.json', user.address, nextItemIndex, toNano('0.01'));

        const seed = await getSecureRandomBytes(32);
        const wrongKeypair = keyPairFromSeed(seed);
        const signature = sign(toSign.hash(), wrongKeypair.secretKey);

        const mintResult = await nftCollection.sendDeployNft(user.getSender(), toNano('0.07'), signature, toSign);

        expect(mintResult.transactions).toHaveTransaction({
            from: user.address,
            to: nftCollection.address,
            exitCode: 35,
            success: false,
        });
    });

    it('should not mint nft because value lower than fee', async () => {
        const nextItemIndex = (await nftCollection.getCollectionData()).next_item_index;
        const toSign = nftMessageToCell('1.json', user.address, nextItemIndex, toNano('0.01'));

        const signature = sign(toSign.hash(), anycraftKeyPair.secretKey);

        const mintResult = await nftCollection.sendDeployNft(user.getSender(), toNano('0.03'), signature, toSign);

        expect(mintResult.transactions).toHaveTransaction({
            from: user.address,
            to: nftCollection.address,
            success: false,
            exitCode: 46,
        });
    });

    it('should not mint nft because msg_value - fee < amount (to nft)', async () => {
        const nextItemIndex = (await nftCollection.getCollectionData()).next_item_index;
        const toSign = nftMessageToCell('1.json', user.address, nextItemIndex, toNano('0.04'));

        const signature = sign(toSign.hash(), anycraftKeyPair.secretKey);

        const mintResult = await nftCollection.sendDeployNft(user.getSender(), toNano('0.07'), signature, toSign);

        expect(mintResult.transactions).toHaveTransaction({
            from: user.address,
            to: nftCollection.address,
            success: false,
            exitCode: 48,
        });
    });

    it('should send fees to owner', async () => {
        const nextItemIndex = (await nftCollection.getCollectionData()).next_item_index;
        const toSign = nftMessageToCell('1.json', user.address, nextItemIndex, toNano('0.01'));

        const signature = sign(toSign.hash(), anycraftKeyPair.secretKey);

        const mintResult = await nftCollection.sendDeployNft(user.getSender(), toNano('0.07'), signature, toSign);

        expect(mintResult.transactions).toHaveTransaction({
            from: nftCollection.address,
            to: deployer.address,
            success: true,
            value: fee,
        });
    });

    it('should change fee', async () => {
        const changeFeeResult = await nftCollection.sendChangeFee(deployer.getSender(), toNano('0.1'));

        expect(changeFeeResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: nftCollection.address,
            success: true,
        });

        const newFee = (await nftCollection.getMintFee()).fee;
        expect(newFee).toEqual(toNano('0.1'));
    });

    it('should change public key', async () => {
        const seed = await getSecureRandomBytes(32);
        const newKeypair = keyPairFromSeed(seed);
        const txResult = await nftCollection.sendChangePublicKey(deployer.getSender(), newKeypair.publicKey);

        expect(txResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: nftCollection.address,
            success: true,
        });

        function bufferToBigInt(buffer: Buffer): bigint {
            return BigInt('0x' + buffer.toString('hex'));
        }

        const newPublicKey = (await nftCollection.getAnycraftPublicKey()).fee;
        expect(newPublicKey).toEqual(bufferToBigInt(newKeypair.publicKey));
    });

    it('should change owner', async () => {
        const txResult = await nftCollection.sendChangeMianOwner(deployer.getSender(), user.address);

        expect(txResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: nftCollection.address,
            success: true,
        });

        const newOwner = (await nftCollection.getCollectionData()).owner_address;
        expect(newOwner).toEqualAddress(user.address);
    });
});
