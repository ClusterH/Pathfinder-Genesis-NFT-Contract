import MintPhase from '../lib/MintPhaseInterface'
import NftContractProvider from '../lib/NftContractProvider'

async function main() {
  // Attach to deployed contract
  const contract = await NftContractProvider.getContract()

  // Pause the contract (if needed)
  if ((await contract.mintPhase()) !== MintPhase.PAUSED) {
    console.log('Pausing the contract...')

    await (await contract.setMintPhase(MintPhase.PAUSED)).wait()
  }

  console.log('Sale is now paused!')
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
