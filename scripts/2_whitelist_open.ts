import { MerkleTree } from 'merkletreejs'
import keccak256 from 'keccak256'
import fs from 'fs'
import CollectionConfig from './../config/CollectionConfig'
import NftContractProvider from '../lib/NftContractProvider'
import MintPhase from '../lib/MintPhaseInterface'

async function main() {
  // Check configuration
  if (CollectionConfig.whitelistAddresses.length < 1) {
    throw new Error('\x1b[31merror\x1b[0m ' + 'The whitelist is empty, please add some addresses to the configuration.')
  }

  // Build the Merkle Tree
  const leafNodes = CollectionConfig.whitelistAddresses.map((addr) => keccak256(addr))
  const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true })
  const rootHash = '0x' + merkleTree.getRoot().toString('hex')

  // Attach to deployed contract
  const contract = await NftContractProvider.getContract()
  // Update root hash (if changed)
  if ((await contract.merkleRoot()) !== rootHash) {
    console.log(`Updating the root hash to: ${rootHash}`)

    await (await contract.setMerkleRoot(rootHash)).wait()
  }

  const merkleProofList = CollectionConfig.whitelistAddresses.reduce(
    (prev, address) => ({ ...prev, [address]: merkleTree.getHexProof(keccak256(address)) }),
    {},
  )

  fs.writeFileSync(`merkleProofs/proofList.json`, JSON.stringify(merkleProofList, null, 2))

  // Enable whitelist sale (if needed)
  if ((await contract.mintPhase()) !== MintPhase.WHITELIST_MINT) {
    console.log('Enabling whitelist sale...')

    await (await contract.setMintPhase(MintPhase.WHITELIST_MINT)).wait()
  }

  console.log('Whitelist sale has been enabled!')
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
