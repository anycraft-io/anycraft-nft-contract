import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type AnycraftNftCollectionConfig = {};

export function anycraftNftCollectionConfigToCell(config: AnycraftNftCollectionConfig): Cell {
    return beginCell().endCell();
}

export class AnycraftNftCollection implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new AnycraftNftCollection(address);
    }

    static createFromConfig(config: AnycraftNftCollectionConfig, code: Cell, workchain = 0) {
        const data = anycraftNftCollectionConfigToCell(config);
        const init = { code, data };
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
