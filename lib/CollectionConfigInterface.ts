import MarketplaceConfigInterface from './MarketplaceConfigInterface'
import NetworkConfigInterface from './NetworkConfigInterface'

export default interface CollectionConfigInterface {
  testnet: NetworkConfigInterface
  mainnet: NetworkConfigInterface
  contractName: string
  tokenName: string
  tokenSymbol: string
  mintPrice: number
  maxMintPerWalletWLPhase: number
  maxMintPerWalletPBPhase: number
  maxSupply: number
  hiddenMetadataUri: string
  contractAddress: string | null
  marketplaceIdentifier: string
  marketplaceConfig: MarketplaceConfigInterface
  whitelistAddresses: string[]
  airdropAddresses: string[]
  airdropAmounts: number[]
}
