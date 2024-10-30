import {getSecureRandomBytes} from '@ton/crypto';
import {NetworkProvider} from '@ton/blueprint';
import fs from 'fs';

export async function run(provider: NetworkProvider) {
    const seed = await getSecureRandomBytes(32);
    const data = JSON.stringify({seed: seed.toJSON().data});
    console.log(data);

    fs.writeFileSync('./scripts/seed.json', data, {});
}
