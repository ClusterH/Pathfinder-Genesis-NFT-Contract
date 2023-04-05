import chai, { expect } from 'chai'
import ChaiAsPromised from 'chai-as-promised'
import { BigNumber, utils } from 'ethers'
import { ethers } from 'hardhat'
import { MerkleTree } from 'merkletreejs'
import keccak256 from 'keccak256'
import CollectionConfig from './../config/CollectionConfig'
import ContractArguments from '../config/ContractArguments'
import { NftContractType } from '../lib/NftContractProvider'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import MintPhase from '../lib/MintPhaseInterface'

chai.use(ChaiAsPromised)

const whitelistAddresses = [
  // Hardhat test addresses...
  '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
  '0xdD2FD4581271e230360230F9337D5c0430Bf44C0',
]

function getPrice(mintAmount: number) {
  return utils.parseEther(CollectionConfig.mintPrice.toString()).mul(mintAmount)
}

describe(CollectionConfig.contractName, function () {
  let owner!: SignerWithAddress
  let whitelistedUser!: SignerWithAddress
  let holder!: SignerWithAddress
  let externalUser!: SignerWithAddress
  let contract!: NftContractType

  before(async function () {
    ;[owner, whitelistedUser, holder, externalUser] = await ethers.getSigners()
  })

  it('Contract deployment', async function () {
    const Contract = await ethers.getContractFactory(CollectionConfig.contractName)
    contract = (await Contract.deploy(...ContractArguments)) as NftContractType

    await contract.deployed()
  })

  it('Check initial data', async function () {
    expect(await contract.name()).to.equal(CollectionConfig.tokenName)
    expect(await contract.symbol()).to.equal(CollectionConfig.tokenSymbol)
    expect(await contract.hiddenMetadataUri()).to.equal(CollectionConfig.hiddenMetadataUri)

    expect(await contract.mintPhase()).to.equal(MintPhase.PAUSED)
    expect(await contract.revealed()).to.equal(false)

    await expect(contract.tokenURI(1)).to.be.revertedWith('URI query for nonexistent token')
  })

  it('Before any sale', async function () {
    // Nobody should be able to mint from a paused contract
    await expect(contract.connect(whitelistedUser).mint(1, { value: getPrice(1) })).to.be.revertedWith('Mint paused!')
    await expect(contract.connect(whitelistedUser).whitelistMint(1, [], { value: getPrice(1) })).to.be.revertedWith('Mint paused!')
    await expect(contract.connect(holder).mint(1, { value: getPrice(1) })).to.be.revertedWith('Mint paused!')
    await expect(contract.connect(holder).whitelistMint(1, [], { value: getPrice(1) })).to.be.revertedWith('Mint paused!')
    await expect(contract.connect(owner).mint(1, { value: getPrice(1) })).to.be.revertedWith('Mint paused!')
    await expect(contract.connect(owner).whitelistMint(1, [], { value: getPrice(1) })).to.be.revertedWith('Mint paused!')

    // Check balances
    expect(await contract.balanceOf(await owner.getAddress())).to.equal(0)
    expect(await contract.balanceOf(await whitelistedUser.getAddress())).to.equal(0)
    expect(await contract.balanceOf(await holder.getAddress())).to.equal(0)
    expect(await contract.balanceOf(await externalUser.getAddress())).to.equal(0)
  })

  it('Whitelist sale', async function () {
    // Check Whitelist sale is open
    await contract.setMintPhase(MintPhase.PUBLIC_MINT)
    await expect(contract.connect(whitelistedUser).whitelistMint(1, [], { value: getPrice(1) })).to.be.revertedWith(
      'Whitelist mint is not enabled!',
    )

    await contract.setMintPhase(MintPhase.WHITELIST_MINT)

    // Build MerkleTree
    const leafNodes = whitelistAddresses.map((addr) => keccak256(addr))
    const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true })
    const rootHash = merkleTree.getRoot()

    // Update the root hash
    await (await contract.setMerkleRoot('0x' + rootHash.toString('hex'))).wait()

    // Pretending to be someone else
    await expect(
      contract.connect(holder).whitelistMint(1, merkleTree.getHexProof(keccak256(await whitelistedUser.getAddress())), {
        value: getPrice(1),
      }),
    ).to.be.revertedWith('Invalid proof!')
    // Sending an invalid proof
    await expect(
      contract.connect(holder).whitelistMint(1, merkleTree.getHexProof(keccak256(await holder.getAddress())), { value: getPrice(1) }),
    ).to.be.revertedWith('Invalid proof!')
    // Sending no proof at all
    await expect(contract.connect(holder).whitelistMint(1, [], { value: getPrice(1) })).to.be.revertedWith('Invalid proof!')

    await contract
      .connect(whitelistedUser)
      .whitelistMint(1, merkleTree.getHexProof(keccak256(await whitelistedUser.getAddress())), { value: getPrice(1) })

    // Sending an invalid mint amount
    await expect(
      contract
        .connect(whitelistedUser)
        .whitelistMint(
          (await contract.MAX_MINT_PER_WALLET_WL_PHASE()).add(1),
          merkleTree.getHexProof(keccak256(await whitelistedUser.getAddress())),
          { value: getPrice((await contract.MAX_MINT_PER_WALLET_WL_PHASE()).add(1).toNumber()) },
        ),
    ).to.be.revertedWith('Invalid or Exceed amount!')

    const balance = await contract.balanceOf(await whitelistedUser.getAddress())
    const mintAmount = (await contract.MAX_MINT_PER_WALLET_WL_PHASE()).sub(balance).add(1)
    await expect(
      contract.connect(whitelistedUser).whitelistMint(mintAmount, merkleTree.getHexProof(keccak256(await whitelistedUser.getAddress())), {
        value: getPrice(Number(utils.formatUnits(mintAmount, 0))),
      }),
    ).to.be.revertedWith('Invalid or Exceed amount!')

    // Sending insufficient funds
    await expect(
      contract.connect(whitelistedUser).whitelistMint(1, merkleTree.getHexProof(keccak256(await whitelistedUser.getAddress())), {
        value: getPrice(1).sub(1),
      }),
    ).to.be.rejectedWith(Error, 'Insufficient funds!')

    // Pause whitelist sale
    await contract.setMintPhase(MintPhase.PAUSED)

    // Check balances
    expect(await contract.balanceOf(await owner.getAddress())).to.equal(0)
    expect(await contract.balanceOf(await whitelistedUser.getAddress())).to.equal(1)
    expect(await contract.balanceOf(await holder.getAddress())).to.equal(0)
    expect(await contract.balanceOf(await externalUser.getAddress())).to.equal(0)
  })

  it('Public sale)', async function () {
    // Check Mint Phase is Public
    await contract.setMintPhase(MintPhase.WHITELIST_MINT)
    await expect(contract.connect(holder).mint(1, { value: getPrice(1) })).to.be.revertedWith('Public mint is not enabled yet!')

    await contract.setMintPhase(MintPhase.PUBLIC_MINT)

    await contract.connect(holder).mint(2, { value: getPrice(2) })
    await contract.connect(whitelistedUser).mint(1, { value: getPrice(1) })
    // Sending insufficient funds
    await expect(contract.connect(holder).mint(1, { value: getPrice(1).sub(1) })).to.be.rejectedWith(Error, 'Insufficient funds!')
    // Sending an invalid mint amount
    await expect(
      contract.connect(whitelistedUser).mint((await contract.MAX_MINT_PER_WALLET_PUBLIC_PHASE()).add(1), {
        value: getPrice((await contract.MAX_MINT_PER_WALLET_PUBLIC_PHASE()).add(1).toNumber()),
      }),
    ).to.be.revertedWith('Invalid or Exceed amount!')

    const balance = await contract.balanceOf(await holder.getAddress())
    const mintAmount = (await contract.MAX_MINT_PER_WALLET_PUBLIC_PHASE()).sub(balance).add(1)
    await expect(
      contract.connect(holder).mint(mintAmount, {
        value: getPrice(Number(utils.formatUnits(mintAmount, 0))),
      }),
    ).to.be.revertedWith('Invalid or Exceed amount!')

    // Sending a whitelist mint transaction
    await expect(contract.connect(whitelistedUser).whitelistMint(1, [], { value: getPrice(1) })).to.be.rejectedWith(
      Error,
      'Whitelist mint is not enabled!',
    )

    // Pause public sale
    await contract.setMintPhase(MintPhase.PAUSED)
  })

  it('Owner only functions', async function () {
    await expect(contract.connect(externalUser).setRevealed(false)).to.be.revertedWith('Ownable: caller is not the owner')
    await expect(contract.connect(externalUser).setHiddenMetadataUri('INVALID_URI')).to.be.revertedWith('Ownable: caller is not the owner')
    await expect(contract.connect(externalUser).setBaseTokenURI('INVALID_URI')).to.be.revertedWith('Ownable: caller is not the owner')
    await expect(contract.connect(externalUser).setMintPhase(MintPhase.PAUSED)).to.be.revertedWith('Ownable: caller is not the owner')
    await expect(
      contract.connect(externalUser).setMerkleRoot('0x0000000000000000000000000000000000000000000000000000000000000000'),
    ).to.be.revertedWith('Ownable: caller is not the owner')
    await expect(contract.connect(externalUser).setMaxSupply(8888)).to.be.revertedWith('Ownable: caller is not the owner')
    await expect(contract.connect(externalUser).withdraw()).to.be.revertedWith('Ownable: caller is not the owner')
  })

  it('Wallet of owner', async function () {
    expect(await contract.tokensOfOwner(await owner.getAddress())).deep.equal([])
    expect(await contract.tokensOfOwner(await whitelistedUser.getAddress())).deep.equal([BigNumber.from(1), BigNumber.from(4)])
    expect(await contract.tokensOfOwner(await holder.getAddress())).deep.equal([BigNumber.from(2), BigNumber.from(3)])
    expect(await contract.tokensOfOwner(await externalUser.getAddress())).deep.equal([])
  })

  it('Supply checks (long)', async function () {
    if (process.env.EXTENDED_TESTS === undefined) {
      this.skip()
    }

    const alreadyMinted = 6
    const maxMintAmountPerTx = 10
    const iterations = Math.floor((CollectionConfig.maxSupply - alreadyMinted) / maxMintAmountPerTx)
    const expectedTotalSupply = iterations * maxMintAmountPerTx + alreadyMinted
    const lastMintAmount = CollectionConfig.maxSupply - expectedTotalSupply
    expect(await contract.totalSupply()).to.equal(alreadyMinted)

    await contract.setMintPhase(MintPhase.PUBLIC_MINT)

    await Promise.all(
      [...Array(iterations).keys()].map(
        async () => await contract.connect(whitelistedUser).mint(maxMintAmountPerTx, { value: getPrice(maxMintAmountPerTx) }),
      ),
    )

    // Try to mint over max supply (before sold-out)
    await expect(contract.connect(holder).mint(lastMintAmount + 1, { value: getPrice(lastMintAmount + 1) })).to.be.revertedWith(
      'Max supply exceeded!',
    )
    await expect(contract.connect(holder).mint(lastMintAmount + 2, { value: getPrice(lastMintAmount + 2) })).to.be.revertedWith(
      'Max supply exceeded!',
    )

    expect(await contract.totalSupply()).to.equal(expectedTotalSupply)

    // Mint last tokens with owner address and test walletOfOwner(...)
    await contract.connect(owner).mint(lastMintAmount, { value: getPrice(lastMintAmount) })
    const expectedWalletOfOwner = [BigNumber.from(1)]
    for (const i of [...Array(lastMintAmount).keys()].reverse()) {
      expectedWalletOfOwner.push(BigNumber.from(CollectionConfig.maxSupply - i))
    }
    expect(
      await contract.tokensOfOwner(await owner.getAddress(), {
        // Set gas limit to the maximum value since this function should be used off-chain only and it would fail otherwise...
        gasLimit: BigNumber.from('0xffffffffffffffff'),
      }),
    ).deep.equal(expectedWalletOfOwner)

    // Try to mint over max supply (after sold-out)
    await expect(contract.connect(whitelistedUser).mint(1, { value: getPrice(1) })).to.be.revertedWith('Max supply exceeded!')

    expect(await contract.totalSupply()).to.equal(CollectionConfig.maxSupply)
  })

  it('Token URI generation', async function () {
    const baseTokenURI = 'ipfs://QmdPmuDatjpuUgPy8aUZu4VYZzWp6YSgwSHgBw3g1pmxyx/'
    const baseExtension = '.json'
    const totalSupply = await contract.totalSupply()

    expect(await contract.tokenURI(1)).to.equal(CollectionConfig.hiddenMetadataUri)

    // Reveal collection
    await contract.setBaseTokenURI(baseTokenURI)
    await contract.setRevealed(true)

    // ERC721A uses token IDs starting from 0 internally...
    await expect(contract.tokenURI(0)).to.be.revertedWith('URI query for nonexistent token')

    // Testing first and last minted tokens
    expect(await contract.tokenURI(1)).to.equal(`${baseTokenURI}1${baseExtension}`)
    expect(await contract.tokenURI(totalSupply)).to.equal(`${baseTokenURI}${totalSupply}${baseExtension}`)
  })
})
