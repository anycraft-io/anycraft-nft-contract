import {Blockchain, SandboxContract, SendMessageResult, TreasuryContract} from '@ton/sandbox';
import {Address, Cell, toNano} from '@ton/core';
import {AnycraftNftCollection, nftMessageToCell} from '../wrappers/AnycraftNftCollection';
import '@ton/test-utils';
import {compile} from '@ton/blueprint';
import {
    getSecureRandomBytes,
    getSecureRandomNumber,
    KeyPair,
    keyPairFromSeed,
    newSecurePassphrase,
    sign
} from '@ton/crypto';
import {equal} from "node:assert";

describe('AnycraftNftCollection', () => {
    let code: Cell;
    let nftItemCode: Cell;

    beforeAll(async () => {
        code = await compile('AnycraftNftCollection');
        nftItemCode = await compile('AnycraftNftItem');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let user: SandboxContract<TreasuryContract>;
    let nftCollection: SandboxContract<AnycraftNftCollection>;
    let anycraftKeyPair: KeyPair;
    let fee = toNano('0.45');

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        const seed = await getSecureRandomBytes(32);
        anycraftKeyPair = keyPairFromSeed(seed);

        deployer = await blockchain.treasury('deployer');
        user = await blockchain.treasury('user');
        const nftRoot = 'https://anycraft-public.s3.eu-north-1.amazonaws.com/nft';

        nftCollection = blockchain.openContract(
            AnycraftNftCollection.createFromConfig(
                {
                    anycraftPublicKey: anycraftKeyPair.publicKey,
                    ownerAddress: deployer.address,
                    collectionContent: nftRoot + `${nftRoot}/assets/collection.json`,
                    commonContent: `${nftRoot}/items/`,
                    nextItemIndex: 0,
                    royaltyParams: {
                        royaltyFactor: 5,
                        royaltyBase: 100,
                        royaltyAddress: deployer.address,
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
        const nftCell = await newNftCell();

        const mintResult = await mint(nftCell);

        assertSuccess(mintResult, user.address)
    });

    it('mint should increase next item index', async () => {
        const nextItemIndex = (await nftCollection.getCollectionData()).nextItemIndex;
        const nftCell = await newNftCell();

        await mint(nftCell);
        const nextItemIndexAfterMint = (await nftCollection.getCollectionData()).nextItemIndex;

        expect(nextItemIndexAfterMint).toEqual(nextItemIndex + 1)
    });

    it('should not mint nft because wrong signature', async () => {
        const nftCell = await newNftCell();
        const seed = await getSecureRandomBytes(32);
        const wrongKeypair = keyPairFromSeed(seed);
        const signature = sign(nftCell.hash(), wrongKeypair.secretKey);

        const mintResult = await nftCollection.sendDeployNft(user.getSender(), toNano('0.5'), signature, nftCell);

        assertError(mintResult, 35, user.address)
    });

    it('should not mint nft because value lower than fee', async () => {
        const nftCell = await newNftCell();

        const mintResult = await mint(nftCell, '0.449');

        assertError(mintResult, 46, user.address)
    });

    it('should not mint nft because msg_value - fee < amount (to nft)', async () => {
        const nftCell = await newNftCell('0.051');

        const mintResult = await mint(nftCell);

        assertError(mintResult, 48, user.address)
    });

    it('should not mint duplicate', async () => {
        const nftCell = await newNftCell();

        await mint(nftCell);
        const nextItemIndex = (await nftCollection.getCollectionData()).nextItemIndex;
        await mint(nftCell);
        const nextItemIndexAfterMint = (await nftCollection.getCollectionData()).nextItemIndex;


        expect(nextItemIndexAfterMint).toEqual(nextItemIndex)
    });

    it('should send fees to owner', async () => {
        const nftCell = await newNftCell();

        const mintResult = await mint(nftCell);

        expect(mintResult.transactions).toHaveTransaction({
            from: nftCollection.address,
            to: deployer.address,
            success: true,
            value: fee,
        });
    });

    it('should change fee', async () => {
        const newFee = '0.99';
        const changeFeeResult = await nftCollection.sendChangeFee(deployer.getSender(), toNano(newFee));

        assertSuccess(changeFeeResult, deployer.address)

        const actualFee = (await nftCollection.getMintFee()).fee;
        expect(actualFee).toEqual(toNano(newFee));
    });

    it('should not change fee because of not owner', async () => {
        const changeFeeResult = await nftCollection.sendChangeFee(user.getSender(), toNano('1'));

        assertError(changeFeeResult, 401, user.address)
    });

    it('should not mint nft because value lower than new fee', async () => {
        const newFee = '0.99';
        const nftCell = await newNftCell();

        await nftCollection.sendChangeFee(deployer.getSender(), toNano(newFee));
        const mintResult = await mint(nftCell, '0.9');

        assertError(mintResult, 46, user.address)
    });

    it('should change public key', async () => {
        const seed = await getSecureRandomBytes(32);
        const newKeypair = keyPairFromSeed(seed);
        const txResult = await nftCollection.sendChangePublicKey(deployer.getSender(), newKeypair.publicKey);

        assertSuccess(txResult, deployer.address)

        function bufferToBigInt(buffer: Buffer): bigint {
            return BigInt('0x' + buffer.toString('hex'));
        }

        const newPublicKey = (await nftCollection.getAnycraftPublicKey()).publicKey;
        expect(newPublicKey).toEqual(bufferToBigInt(newKeypair.publicKey));
    });

    it('should not change public key because of not owner', async () => {
        const seed = await getSecureRandomBytes(32);
        const newKeypair = keyPairFromSeed(seed);

        const txResult = await nftCollection.sendChangePublicKey(user.getSender(), newKeypair.publicKey);

        assertError(txResult, 401, user.address)
    });

    it('should mint using new public key', async () => {
        const seed = await getSecureRandomBytes(32);
        const newKeypair = keyPairFromSeed(seed);
        const nftCell = await newNftCell();
        const signature = sign(nftCell.hash(), newKeypair.secretKey);

        await nftCollection.sendChangePublicKey(deployer.getSender(), newKeypair.publicKey);
        const mintResult = await nftCollection.sendDeployNft(user.getSender(), toNano('0.5'), signature, nftCell);

        assertSuccess(mintResult, user.address)
    });

    it('should change owner', async () => {
        const txResult = await nftCollection.sendChangeOwner(deployer.getSender(), user.address);

        assertSuccess(txResult, deployer.address)

        const newOwner = (await nftCollection.getCollectionData()).ownerAddress;
        expect(newOwner).toEqualAddress(user.address);
    });

    it('should not change owner because of sender is not owner', async () => {
        const txResult = await nftCollection.sendChangeOwner(user.getSender(), user.address);

        assertError(txResult, 401, user.address)
    });

    it('should change content', async () => {
        const content = await newRandomContent()

        const txResult = await nftCollection.sendChangeContent(deployer.getSender(), content);

        assertSuccess(txResult, deployer.address)
    });

    it('should not change content because of not owner', async () => {
        const content = await newRandomContent()

        const txResult = await nftCollection.sendChangeContent(user.getSender(), content);

        assertError(txResult, 401, user.address)
    });

    it('should withdraw', async () => {
        const txResult = await nftCollection.sendWithdraw(deployer.getSender());

        assertSuccess(txResult, deployer.address)
    });

    it('should not withdraw because of not owner', async () => {
        const txResult = await nftCollection.sendWithdraw(user.getSender());

        assertError(txResult, 401, user.address)
    });

    function assertSuccess(txResult: SendMessageResult, from: Address) {
        expect(txResult.transactions).toHaveTransaction({
            from: from,
            to: nftCollection.address,
            success: true,
        });
    }

    function assertError(txResult: SendMessageResult, exitCode: number, from: Address) {
        expect(txResult.transactions).toHaveTransaction({
            from: from,
            to: nftCollection.address,
            success: false,
            exitCode: exitCode,
        });
    }

    async function newRandomContent() {
        return {
            collectionContent: await newSecurePassphrase(),
            commonContent: await newSecurePassphrase(),
            royaltyFactor: await getSecureRandomNumber(0, 100),
            royaltyBase: 100,
            royaltyAddress: (await blockchain.treasury('royaltyOwner')).address
        }
    }

    async function newNftCell(networkFee: string = '0.05') {
        const nextItemIndex = (await nftCollection.getCollectionData()).nextItemIndex;
        return nftMessageToCell('1.json', user.address, nextItemIndex, toNano(networkFee));
    }

    function mint(nftCell: Cell, mintFee: string = '0.5') {
        const signature = sign(nftCell.hash(), anycraftKeyPair.secretKey);
        return nftCollection.sendDeployNft(user.getSender(), toNano(mintFee), signature, nftCell);
    }

});
