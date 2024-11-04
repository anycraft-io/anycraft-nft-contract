# Anycraft NFT Collection Smart Contract

## Overview

This repository contains the smart contract code for the **Anycraft NFT Collection**, designed to work with the [Anycraft](https://t.me/anycraftbot) Telegram Mini App (TMA) game. In Anycraft, users combine (craft) two items to create a new item based on a recipe. These items and recipes can be unique, if no one has crafted them before. The uniqueness of items and recipes is recorded on the TON blockchain as NFTs, ensuring exclusivity of user-generated elements.

## Implementation Details

The Anycraft NFT Collection has been implemented with several key features to ensure the uniqueness and integrity of NFTs within the collection.

### 1. No Duplicate NFTs

The contract enforces uniqueness across the collection, preventing the minting of NFTs that duplicate an existing recipe or item. Minting attempts that would create duplicates are automatically rejected by the contract.

### 2. Standardized Implementation

- The collection and item contracts are written in `Func` language, based on standard NFT contracts provided by the TON Foundation with minimal modifications.
- Key features of the standard collection contract are retained, including:
    - **Owner-controlled royalty settings**: The collection owner can adjust the royalty rate.
    - **Owner transferability**: The contract supports changing the collection’s owner address.

### 3. Mint Fee Management

- The contract allows the collection owner to set the minting fee, which is paid in addition to the TON network fee.
- During the mint process, the specified minting fee is transferred directly to the collection owner's address.
- Transactions lacking the required TON amount for both network and minting fees are rejected.

### 4. Public Minting

Any user, not just the collection owner, can mint NFTs within the collection, ensuring open participation.

### 5. Collection Integrity

- The contract includes safeguards to ensure collection integrity:
    - It prevents the minting of NFTs for non-existent items or recipes.
    - It rejects minting attempts that would duplicate an existing NFT.
- These integrity checks are built into the contract logic, rejecting minting transactions that violate uniqueness rules.

### 6. Protection Mechanism for Collection Integrity

To ensure robust security, the backend API of Anycraft assists in maintaining collection integrity by generating mint transaction data. The backend API:
- Generates transaction data, including the item contract code, metadata URL, minting fee, and signs it with a private key, producing a secure transaction signature.
- Sends the signed transaction data and signature to the TMA client, which forwards them to the collection smart contract.
- The smart contract verifies the transaction by checking the signature with an embedded public key, allowing only authorized mint transactions from the backend.

To account for any potential compromise, the contract includes functionality to update the public key used for signature verification, maintaining control over minting rights even if the backend’s private key is compromised.