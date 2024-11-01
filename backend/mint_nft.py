from tonutils.client import TonapiClient
from pytoniq_core import Address, Cell, begin_cell
from tonutils.utils import to_nano
from nacl.signing import SigningKey
import asyncio
import base64

# TODO: use admin_config.nft_collection_address
COLLECTION_ADDRESS = ""

# TODO: use security_config.TON_CONSOLE_API_KEY
API_KEY = ''

# TODO: use user.wallet
USER_WALLET = ''

# TODO: use security_config.NFT_KEY_SEED
KEY_SEED_HEX = ''

client = TonapiClient(api_key=API_KEY, is_testnet=False)


async def build_mint_tx():
    next_item_index = await get_nft_index()

    nft_cell = build_nft_info_cell(
        content='item.json',  # TODO: use {nft.key}.json
        owner_address=USER_WALLET,
        index=next_item_index,
        amount=to_nano(0.01)
    )

    nft_cell_signature = sign_cell(nft_cell)

    tx_boc = await build_tx(nft_cell, nft_cell_signature)
    tx_boc_base64 = base64.b64encode(tx_boc).decode('utf-8')
    nft_address_cell = await get_nft_address(next_item_index)

    print(tx_boc_base64)
    print(nft_address_cell)


async def build_tx(nft_cell, nft_cell_signature):
    tx = (begin_cell()
          .store_uint(1, 32)
          .store_uint(0, 64)
          .store_bytes(nft_cell_signature)
          .store_ref(nft_cell)
          .end_cell())
    return tx.to_boc(hash_crc32=True)


def sign_cell(nft_cell):
    seed = bytes.fromhex(KEY_SEED_HEX)
    signing_key = SigningKey(seed)
    message_hash = nft_cell.hash
    return signing_key.sign(message_hash).signature


async def get_nft_index():
    result = await client.run_get_method(COLLECTION_ADDRESS, "get_collection_data")
    decoded_result = result["decoded"]
    return int(decoded_result["next_item_index"])


async def get_nft_address(index):
    result = await client.run_get_method(COLLECTION_ADDRESS, "get_nft_address_by_index", [index])
    return result["decoded"]["address"]


def build_nft_info_cell(content: str, owner_address: str, index: int, amount: int) -> Cell:
    nft_content = (begin_cell()
                   .store_bytes(content.encode())
                   .end_cell())

    nft_message = (begin_cell()
                   .store_address(Address(owner_address))
                   .store_ref(nft_content)
                   .end_cell())

    return (begin_cell()
            .store_uint(index, 64)
            .store_coins(amount)
            .store_ref(nft_message)
            .end_cell())


def extract_tx_hash_from_boc(boc):
    boc_bytes = base64.b64decode(boc)
    cell = Cell.from_boc(boc_bytes)[0]
    tx_hash = cell.hash.hex()
    print(tx_hash)


async def main():
    await build_mint_tx()


asyncio.run(main())
