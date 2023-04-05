import CollectionConfigInterface from '../lib/CollectionConfigInterface'
import * as Marketplaces from '../lib/Marketplaces'
import * as Networks from '../lib/Networks'
import { airdropAddresses, airdropAmounts } from './airdroplist'
import whitelistAddresses from './whitelist.json'

const CollectionConfig: CollectionConfigInterface = {
  testnet: Networks.ethereumTestnet,
  mainnet: Networks.ethereumMainnet,
  // The contract name can be updated using the following command:
  // yarn rename-contract NEW_CONTRACT_NAME
  // Please DO NOT change it manually!
  contractName: 'PathfinderGenesis',
  tokenName: 'PathfinderGenesis',
  tokenSymbol: 'PATHY',
  mintPrice: 0.009,
  maxMintPerWalletWLPhase: 5,
  maxMintPerWalletPBPhase: 10,
  maxSupply: 5555,
  hiddenMetadataUri: 'ipfs://bafybeiezzrxeanwmgafiujqysasilna4gktqqyh2yyk6a2r4acsl573ycm/unreveal.json',
  contractAddress: '0xbfD74758DCC14DB68848e5d455D5e37Ce41CC9B0',
  marketplaceIdentifier: 'pathfinder-genesis-token',
  marketplaceConfig: Marketplaces.openSea,
  whitelistAddresses,
  airdropAddresses,
  airdropAmounts,
}

export default CollectionConfig
