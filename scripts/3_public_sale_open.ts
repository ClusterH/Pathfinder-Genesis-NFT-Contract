import MintPhase from '../lib/MintPhaseInterface'
import NftContractProvider from '../lib/NftContractProvider'

async function main() {
  // Attach to deployed contract
  const contract = await NftContractProvider.getContract()

  if ((await contract.mintPhase()) !== MintPhase.PUBLIC_MINT) {
    console.log('Enabling public sale...')

    await (await contract.setMintPhase(MintPhase.PUBLIC_MINT)).wait()
  }

  console.log('Public sale is now open!')
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
