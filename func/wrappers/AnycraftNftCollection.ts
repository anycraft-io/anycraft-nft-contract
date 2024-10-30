import {Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode} from '@ton/core';
import {encodeOffChainContent} from "./help/content";

export type RoyaltyParams = {
    royaltyFactor: number;
    royaltyBase: number;
    royaltyAddress: Address;
};

export type AnycraftNftCollectionConfig = {
    ownerAddress: Address;
    nextItemIndex: number;
    adminContractAddress: Address;
    collectionContent: string;
    commonContent: string;
    nftItemCode: Cell;
    royaltyParams: RoyaltyParams;
    anycraftPublicKey: Buffer;
    fee: bigint;
};

export function buildAnycraftNftCollectionContentCell(collectionContent: string, commonContent: string): Cell {
    let contentCell = beginCell();

    let encodedCollectionContent = encodeOffChainContent(collectionContent);

    let commonContentCell = beginCell();
    commonContentCell.storeBuffer(Buffer.from(commonContent));

    contentCell.storeRef(encodedCollectionContent);
    contentCell.storeRef(commonContentCell.asCell());

    return contentCell.endCell();
}

export function anycraftNftCollectionConfigToCell(config: AnycraftNftCollectionConfig): Cell {
    return beginCell()
        .storeAddress(config.ownerAddress)
        .storeUint(config.nextItemIndex, 64)
        .storeBuffer(config.anycraftPublicKey)
        .storeAddress(config.adminContractAddress)
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
}
