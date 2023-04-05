export default interface MarketplaceConfigInterface {
  name: string
  generateCollectionUrl: (marketplaceIdentifier: string, isMainnet: boolean) => string
}
