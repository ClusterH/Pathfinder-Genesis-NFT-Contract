import { airdropAddresses, airdropAmounts } from '../config/airdroplist'
import CollectionConfig from '../config/CollectionConfig'
import NftContractProvider from '../lib/NftContractProvider'

async function main() {
  // Check configuration
  if (CollectionConfig.airdropAddresses.length < 1) {
    throw new Error('\x1b[31merror\x1b[0m ' + 'The airdropList is empty, please add some addresses to the configuration.')
  }

  if (CollectionConfig.airdropAmounts.length < 1) {
    throw new Error(
      '\x1b[31merror\x1b[0m ' + 'The airdropAmounts is empty, please add the amounts to match with addressList to the configuration.',
    )
  }

  if (CollectionConfig.airdropAddresses.length !== CollectionConfig.airdropAmounts.length) {
    throw new Error('\x1b[31merror\x1b[0m ' + 'The airdropList should have same length with amountList.')
  }

  // Attach to deployed contract
  const contract = await NftContractProvider.getContract()

  // Start airdrop sale
  await (await contract.mintForAddress(airdropAddresses, airdropAmounts)).wait()

  console.log('Airdrop has been succeed!')
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
