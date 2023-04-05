# Etheriot Games Pathfinder Genesis NFT(ERC721A) Contract

- Contract Address:
    0xbfD74758DCC14DB68848e5d455D5e37Ce41CC9B0
- Etherscan:
    https://etherscan.io/token/0xbfD74758DCC14DB68848e5d455D5e37Ce41CC9B0#code
- OpenSea:
    https://opensea.io/collection/pathfindergenesis
- Mint website:
    https://mint.etheriot.xyz/
- Official website:
    https://www.etheriot.xyz/

Etheriot Games - New wave of web3 entertainment.

Pathfinders Are Official Genesis NFT Of Galaxarian Odyssey Game A 32 Person PvP Battle Royale. Genesis Mint Allows You To Pick Up Weapons, Earn $HCASH And Loads Of Other Benefits.

## Project installation

Clone down this repository. You will need `node` and `yarn`(or You can use `npm` instead of) installed globally on your machine.

### Get the code and dependencies:

    git clone https://github.com/ClusterH/Pathfinder-Genesis-NFT-Contract.git
    cd Pathfinder-Genesis-NFT-Contract
    yarn

## Pre-requirements and config

### Update .env file with real info:

    COLLECTION_BASE_URI=ipfs://__CID___/

    NETWORK_TESTNET_URL=https://goerli.infura.io/v3/abc123abc123abc123abc123abc123ab
    NETWORK_TESTNET_PRIVATE_KEY=0xabc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abc1

    NETWORK_MAINNET_URL=https://mainnet.infura.io/v3/abc123abc123abc123abc123abc123ab
    NETWORK_MAINNET_PRIVATE_KEY=0xabc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abc1

    GAS_REPORTER_COIN_MARKET_CAP_API_KEY=00000000-0000-0000-0000-000000000000

    BLOCK_EXPLORER_API_KEY=ABC123ABC123ABC123ABC123ABC123ABC1

### Update `config/CollectionConfig.ts` file

    tokenSymbol: <Your Token Symbol>
    hiddenMetadataUri: <Your unrevealed NFT metadata URI> (Note: It can be updated later from etherscan interface.)
    contractAddress: <Your contract address once deployed to handle mintphases>

## Scripts Instruction

Run the scripts below to deploy the contract, handle Mint phase.

### Rename Contract before deploy:

    yarn rename-contract <Your Name>

- It will update main sol file name, `config/CollectionConfig.ts` cotractName, tokenName and generate typechain again.

### Deploy Contract:

    yarn deploy --network testnet  (It will deploy the contract to testnet you configured in env)
    yarn deploy --network mainnet (It will deploy the contract to mainnet you configured in env)

- Note: Don't forgot update config/CollectionConfig.ts contract address with new one after deploy success.

### Verify Contract:

    yarn verify --network testnet <contract address>
    yarn verify --network mainnet <contract address>

### Pause

    yarn pause-sale --network testnet
    yarn pause-sale --network mainet

### Reveal

    yarn reveal --network testnet
    yarn reveal --network mainnet

- Note: Before run this script, Please update baseTokenURI in env/COLLECTION_BASE_URI with real.

### Whitelist Open, Generate/Update Merkle Tree

    yarn whitelist-open --network testnet
    yarn whitelist-open --network mainnet

- Note:
  - Before run this script, You need to update /config/whitelist.json file with real/updated data.
  - This script will generate merkle proof list under /merkleProofs/proofList.json automatically.
  - This script will update merkle root in the contract, and update mint phase to whitelist if not settled yet.
  - Whenever need to update merkle root, run this script again.

### Airdrop

    yarn reveal --network testnet
    yarn reveal --network mainnet

- Note: Before run this script, You need to update /config/airdroplist.ts file airdropAddresses and airdropAmounts with real.

### Public Sale Open

    yarn public-sale-open --network testnet
    yarn public-sale-open --network mainnet
