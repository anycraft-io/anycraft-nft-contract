import {getSecureRandomBytes, KeyPair, keyPairFromSeed} from '@ton/crypto';
import {NetworkProvider} from '@ton/blueprint';
import fs from 'fs';

export async function run(provider: NetworkProvider) {
    const seed = await getSecureRandomBytes(32);
    const keyPair: KeyPair = keyPairFromSeed(Buffer.from(seed));
    const key = {
        seedHex: seed.toString('hex'),
        secretKeyHex: keyPair.secretKey.toString('hex'),
        publicKeyHex: keyPair.publicKey.toString('hex'),
    }
    const keyJson = JSON.stringify(key, null, 2)
    console.log(keyJson)
    fs.writeFileSync('./scripts/key.json', keyJson, {});
}
