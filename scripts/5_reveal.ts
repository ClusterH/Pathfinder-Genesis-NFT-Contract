import NftContractProvider from '../lib/NftContractProvider'

async function main() {
  if (undefined === process.env.COLLECTION_BASE_URI || process.env.COLLECTION_BASE_URI === 'ipfs://__CID___/') {
    throw '\x1b[31merror\x1b[0m ' + 'Please add the baseTokenURI to the ENV configuration before running this command.'
  }

  // Attach to deployed contract
  const contract = await NftContractProvider.getContract()

  // Update URI prefix (if changed)
  if ((await contract.baseTokenURI()) !== process.env.COLLECTION_BASE_URI) {
    console.log(`Updating the URI to: ${process.env.COLLECTION_BASE_URI}`)

    await (await contract.setBaseTokenURI(process.env.COLLECTION_BASE_URI)).wait()
  }

  // Revealing the collection (if needed)
  if (!(await contract.revealed())) {
    console.log('Revealing the collection...')

    await (await contract.setRevealed(true)).wait()
  }

  console.log('Your collection is now revealed!')
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
