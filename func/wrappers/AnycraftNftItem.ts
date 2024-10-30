import {Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode} from '@ton/core';

export type NftItemConfig = {};

export function nftItemConfigToCell(config: NftItemConfig): Cell {
    return beginCell().endCell();
}

export class AnycraftNftItem implements Contract {

    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {
    }

    static createFromAddress(address: Address) {
        return new AnycraftNftItem(address);
    }

    static createFromConfig(config: NftItemConfig, code: Cell, workchain = 0) {
        const data = nftItemConfigToCell(config);
        const init = {code, data};
        return new AnycraftNftItem(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
