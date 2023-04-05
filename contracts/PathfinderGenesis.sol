// SPDX-License-Identifier: MIT

// ------------------------------------------------------------------------
// *      ____  ___  ________  _____________   ______  __________  _____
// *     / __ \/   |/_  __/ / / / ____/  _/ | / / __ \/ ____/ __ \/ ___/
// *    / /_/ / /| | / / / /_/ / /_   / //  |/ / / / / __/ / /_/ /\__ \
// *   / ____/ ___ |/ / / __  / __/ _/ // /|  / /_/ / /___/ _, _/___/ /
// *  /_/   /_/  |_/_/ /_/ /_/_/   /___/_/ |_/_____/_____/_/ |_|/____/
// *
// ------------------------------------------------------------------------

pragma solidity >=0.8.0 <0.9.0;

import 'erc721a/contracts/extensions/ERC721AQueryable.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/cryptography/MerkleProof.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '@openzeppelin/contracts/utils/Strings.sol';
import 'operator-filter-registry/src/DefaultOperatorFilterer.sol';

contract PathfinderGenesis is ERC721AQueryable, Ownable, ReentrancyGuard, DefaultOperatorFilterer {
  // ------------------------------------------------------------------------
  // * Libs
  // ------------------------------------------------------------------------

  using Strings for uint256;

  // ------------------------------------------------------------------------
  // * Types
  // ------------------------------------------------------------------------

  enum MintPhase {
    PAUSED,
    WHITELIST_MINT,
    PUBLIC_MINT
  }

  // ------------------------------------------------------------------------
  // * Storage
  // ------------------------------------------------------------------------

  uint256 public constant MINT_PRICE = 0.009 ether;
  uint256 public constant MAX_MINT_PER_WALLET_WL_PHASE = 5;
  uint256 public constant MAX_MINT_PER_WALLET_PUBLIC_PHASE = 10;
  uint256 public maxSupply = 5555;

  string public baseTokenURI = '';
  string public baseExtension = '.json';
  string public hiddenMetadataUri;

  MintPhase public mintPhase = MintPhase.PAUSED;
  bool public revealed = false;

  bytes32 public merkleRoot;

  mapping(address => mapping(MintPhase => uint256)) public balancePerType;

  // ------------------------------------------------------------------------
  // * Events
  // ------------------------------------------------------------------------
  event LogMintPhaseSet(MintPhase phase);
  event LogWhitelistMint(address indexed _minter, uint256 _mintAmount);
  event LogPublicMint(address indexed _minter, uint256 _mintAmount);

  constructor(string memory _tokenName, string memory _tokenSymbol, string memory _hiddenMetadataUri) ERC721A(_tokenName, _tokenSymbol) {
    setHiddenMetadataUri(_hiddenMetadataUri);
  }

  // ------------------------------------------------------------------------
  // * Modifiers
  // ------------------------------------------------------------------------

  modifier mintCompliance(uint256 _mintAmount, MintPhase _phase) {
    require(mintPhase != MintPhase.PAUSED, 'Mint paused!');
    require(
      _mintAmount > 0 &&
        balancePerType[_msgSender()][_phase] + _mintAmount <=
        (_phase == MintPhase.WHITELIST_MINT ? MAX_MINT_PER_WALLET_WL_PHASE : MAX_MINT_PER_WALLET_PUBLIC_PHASE),
      'Invalid or Exceed amount!'
    );
    require(totalSupply() + _mintAmount <= maxSupply, 'Max supply exceeded!');
    _;
  }

  modifier mintPriceCompliance(uint256 _mintAmount) {
    require(msg.value >= MINT_PRICE * _mintAmount, 'Insufficient funds!');
    if (msg.value > MINT_PRICE * _mintAmount) {
      (bool rs, ) = payable(_msgSender()).call{value: msg.value - MINT_PRICE * _mintAmount}('');
      require(rs, 'Refund Transfer failed');
    }
    _;
  }

  // ------------------------------------------------------------------------
  // * Mint
  // ------------------------------------------------------------------------

  function whitelistMint(
    uint256 _mintAmount,
    bytes32[] calldata _merkleProof
  ) public payable mintCompliance(_mintAmount, MintPhase.WHITELIST_MINT) mintPriceCompliance(_mintAmount) {
    // Verify whitelist requirements
    require(mintPhase == MintPhase.WHITELIST_MINT, 'Whitelist mint is not enabled!');
    bytes32 leaf = keccak256(abi.encodePacked(_msgSender()));
    require(MerkleProof.verify(_merkleProof, merkleRoot, leaf), 'Invalid proof!');

    _safeMint(_msgSender(), _mintAmount);
    balancePerType[_msgSender()][MintPhase.WHITELIST_MINT] += _mintAmount;

    emit LogWhitelistMint(_msgSender(), _mintAmount);
  }

  function mint(
    uint256 _mintAmount
  ) public payable mintCompliance(_mintAmount, MintPhase.PUBLIC_MINT) mintPriceCompliance(_mintAmount) {
    require(mintPhase == MintPhase.PUBLIC_MINT, 'Public mint is not enabled yet!');

    _safeMint(_msgSender(), _mintAmount);
    balancePerType[_msgSender()][MintPhase.PUBLIC_MINT] += _mintAmount;

    emit LogPublicMint(_msgSender(), _mintAmount);
  }

  // ------------------------------------------------------------------------
  // * Frontend view helpers
  // ------------------------------------------------------------------------

  function tokenURI(uint256 _tokenId) public view virtual override(ERC721A, IERC721A) returns (string memory) {
    require(_exists(_tokenId), 'URI query for nonexistent token');

    if (revealed == false) {
      return hiddenMetadataUri;
    }

    string memory currentBaseURI = _baseURI();
    return bytes(currentBaseURI).length > 0 ? string(abi.encodePacked(currentBaseURI, _tokenId.toString(), baseExtension)) : '';
  }

  // ------------------------------------------------------------------------
  // * Admin Functions
  // ------------------------------------------------------------------------

  function setRevealed(bool _state) external onlyOwner {
    revealed = _state;
  }

  function setHiddenMetadataUri(string memory _hiddenMetadataUri) public onlyOwner {
    hiddenMetadataUri = _hiddenMetadataUri;
  }

  function setBaseTokenURI(string calldata baseTokenURI_) external onlyOwner {
    baseTokenURI = baseTokenURI_;
  }

  function setMintPhase(MintPhase _phase) external onlyOwner {
    mintPhase = _phase;
    emit LogMintPhaseSet(mintPhase);
  }

  function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
    merkleRoot = _merkleRoot;
  }

  function setMaxSupply(uint256 _quantity) external onlyOwner {
    require(totalSupply() + _quantity <= maxSupply, 'Exceed amount to cut supply');

    maxSupply -= _quantity;
  }

  function mintForAddress(address[] memory _recipients, uint256[] memory _amount) public onlyOwner nonReentrant {
    require(_recipients.length == _amount.length, 'Different length with amounts');

    for (uint256 i = 0; i < _amount.length; i++) {
      require(totalSupply() + _amount[i] <= maxSupply, 'Out of stock');
      _safeMint(_recipients[i], _amount[i]);
    }
  }

  function withdraw() external onlyOwner nonReentrant {
    (bool os, ) = payable(owner()).call{value: address(this).balance}('');
    require(os, 'Transfer failed');
  }

  // ------------------------------------------------------------------------
  // * Operator Filterer Overrides
  // ------------------------------------------------------------------------

  function transferFrom(address from, address to, uint256 tokenId) public payable override(ERC721A, IERC721A) onlyAllowedOperator(from) {
    super.transferFrom(from, to, tokenId);
  }

  function safeTransferFrom(address from, address to, uint256 tokenId) public payable override(ERC721A, IERC721A) onlyAllowedOperator(from) {
    super.safeTransferFrom(from, to, tokenId);
  }

  function safeTransferFrom(
    address from,
    address to,
    uint256 tokenId,
    bytes memory data
  ) public payable override(ERC721A, IERC721A) onlyAllowedOperator(from) {
    super.safeTransferFrom(from, to, tokenId, data);
  }

  // ------------------------------------------------------------------------
  // * Internal Overrides
  // ------------------------------------------------------------------------

  function _baseURI() internal view virtual override(ERC721A) returns (string memory) {
    return baseTokenURI;
  }

  function _startTokenId() internal view virtual override returns (uint256) {
    return 1;
  }

  // ------------------------------------------------------------------------
  // * External Fallback in case someone sends ETH to the contract
  // ------------------------------------------------------------------------

  receive() external payable {}
}
