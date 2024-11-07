import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Dictionary,
    Sender,
    SendMode, toNano
} from '@ton/core';
import {encodeOffChainContent} from "./help/content";
import {CollectionMint, MintValue} from "./help/collectionHelpers";

export type RoyaltyParams = {
    royaltyFactor: number;
    royaltyBase: number;
    royaltyAddress: Address;
};

export type AnycraftNftCollectionConfig = {
    ownerAddress: Address;
    nextItemIndex: number;
    collectionContent: string;
    commonContent: string;
    nftItemCode: Cell;
    royaltyParams: RoyaltyParams;
    anycraftPublicKey: Buffer;
    fee: bigint;
};

export function buildAnycraftNftCollectionContentCell(collectionContent: string, commonContent: string): Cell {
    const encodedCollectionContent = encodeOffChainContent(collectionContent);
    const commonContentCell = beginCell()
        .storeBuffer(Buffer.from(commonContent))
        .asCell()

    return beginCell()
        .storeRef(encodedCollectionContent)
        .storeRef(commonContentCell)
        .endCell()
}

export function anycraftNftCollectionConfigToCell(config: AnycraftNftCollectionConfig): Cell {
    return beginCell()
        .storeAddress(config.ownerAddress)
        .storeUint(config.nextItemIndex, 64)
        .storeBuffer(config.anycraftPublicKey)
        .storeCoins(config.fee)
        .storeInt(-1, 8)
        .storeRef(buildAnycraftNftCollectionContentCell(config.collectionContent, config.commonContent))
        .storeRef(config.nftItemCode)
        .storeRef(
            beginCell()
                .storeUint(config.royaltyParams.royaltyFactor, 16)
                .storeUint(config.royaltyParams.royaltyBase, 16)
                .storeAddress(config.royaltyParams.royaltyAddress)
                .endCell(),
        )
        .endCell();
}

export function nftMessageToCell(itemContent: string, itemOwnerAddress: Address, itemIndex: number, amount: bigint) {
    const nftContent = beginCell()
        .storeBuffer(Buffer.from(itemContent))
        .endCell();

    const nftMessage = beginCell()
        .storeAddress(itemOwnerAddress)
        .storeRef(nftContent)
        .endCell();

    return beginCell()
        .storeUint(itemIndex, 64)
        .storeCoins(amount)
        .storeRef(nftMessage)
        .endCell();
}

export class AnycraftNftCollection implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {
    }

    static createFromAddress(address: Address) {
        return new AnycraftNftCollection(address);
    }

    static createFromConfig(config: AnycraftNftCollectionConfig, code: Cell, workchain = 0) {
        const data = anycraftNftCollectionConfigToCell(config);
        const init = {code, data};
        return new AnycraftNftCollection(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendDeployNft(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        signature: Buffer,
        nftMessageCell: Cell,
    ) {
        const body = beginCell()
            .storeUint(1, 32)
            .storeUint(0, 64)
            .storeBuffer(signature)
            .storeRef(nftMessageCell)
            .endCell()
        // console.log(body.toBoc().toString('base64'))

        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: body,
        });
    }

    async sendBatchDeploy(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint;
            queryId: number;
            nfts: CollectionMint[];
        },
    ) {
        if (opts.nfts.length > 200) {
            throw new Error('More than 200 items');
        }

        const dict = Dictionary.empty(Dictionary.Keys.Uint(64), MintValue);
        for (const nft of opts.nfts) {
            dict.set(nft.index, nft);
        }

        const body = beginCell()
            .storeUint(2, 32)
            .storeUint(opts.queryId, 64)
            .storeDict(dict)
            .endCell();

        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: body,
        });
    }

    async sendChangeOwner(provider: ContractProvider, via: Sender, new_main_owner: Address) {
        const body = beginCell()
            .storeUint(3, 32)
            .storeUint(0, 64)
            .storeAddress(new_main_owner)
            .endCell();

        await provider.internal(via, {
            value: toNano('0.01'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: body,
        });
    }

    async sendChangeFee(provider: ContractProvider, via: Sender, new_fee: bigint) {
        const body = beginCell()
            .storeUint(6, 32)
            .storeUint(0, 64)
            .storeCoins(new_fee)
            .endCell();

        await provider.internal(via, {
            value: toNano('0.01'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: body,
        });
    }

    async sendChangePublicKey(provider: ContractProvider, via: Sender, publicKey: Buffer) {
        const body = beginCell()
            .storeUint(7, 32)
            .storeUint(0, 64)
            .storeBuffer(publicKey)
            .endCell();

        await provider.internal(via, {
            value: toNano('0.01'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: body,
        });
    }

    async sendChangeContent(
        provider: ContractProvider,
        via: Sender,
        opts: {
            collectionContent: string;
            commonContent: string;
            royaltyFactor: number;
            royaltyBase: number;
            royaltyAddress: Address;
        },
    ) {
        let contentCell = beginCell()
            .storeRef(encodeOffChainContent(opts.collectionContent))
            .storeRef(beginCell().storeBuffer(Buffer.from(opts.commonContent)).asCell())
            .endCell();

        let royaltyData = beginCell()
            .storeUint(opts.royaltyFactor, 16)
            .storeUint(opts.royaltyBase, 16)
            .storeAddress(opts.royaltyAddress)
            .endCell();

        const body = beginCell()
            .storeUint(4, 32)
            .storeUint(0, 64)
            .storeRef(contentCell)
            .storeRef(royaltyData)
            .endCell();

        await provider.internal(via, {
            value: toNano('0.01'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: body,
        });
    }

    async sendWithdraw(provider: ContractProvider, via: Sender) {
        const body = beginCell()
            .storeUint(5, 32)
            .storeUint(0, 64)
            .endCell();

        await provider.internal(via, {
            value: toNano('0.01'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: body,
        });
    }

    async getCollectionData(provider: ContractProvider) {
        const result = await provider.get('get_collection_data', []);
        return {
            nextItemIndex: result.stack.readNumber(),
            content: result.stack.readCellOpt(),
            ownerAddress: result.stack.readAddress(),
        };
    }

    async getMintFee(provider: ContractProvider) {
        const result = await provider.get('get_mint_fee', []);
        return {
            fee: result.stack.readBigNumber(),
        };
    }

    async getAnycraftPublicKey(provider: ContractProvider) {
        const result = await provider.get('get_anycraft_public_key', []);
        return {
            publicKey: result.stack.readBigNumber(),
        };
    }
}
