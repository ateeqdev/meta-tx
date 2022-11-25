const { expect } = require("chai");
const { ethers } = require("hardhat");
const { signMetaTxRequest } = require("../src/signer.js");

var owner,
  users = [],
  tokenId = 0,
  forwarder,
  current = 0,
  amount = 1,
  balances = [],
  gameNFT;

const deployTokens = async function () {
  [owner, ...users] = await ethers.getSigners();
  const forwarder_ = await ethers.getContractFactory("MinimalForwarder");
  const gameNFT_ = await ethers.getContractFactory("GameNFT");

  forwarder = await forwarder_.deploy();
  gameNFT = await gameNFT_.deploy(forwarder.address);
};

const verifyForwarder = async function () {
  expect(await gameNFT.isTrustedForwarder(forwarder.address)).to.be.true;
};

const verifyRights = async function () {
  expect(await gameNFT.owner()).to.be.equal(owner.address);
};

const signTokenMint = async function (by = owner) {
  let args = [users[current].address, tokenId, amount, 0xff];
  const data = gameNFT.interface.encodeFunctionData("mint", args);
  const result = await signMetaTxRequest(by, forwarder, {
    to: gameNFT.address,
    from: by.address,
    data: data,
  });
  return result;
};

const verifyURI = async function () {
  const uri_ = "newuri.com";
  await gameNFT.setURI(uri_ + "/");
  expect(await gameNFT.uri(1)).to.be.equal(uri_ + "/1.json");
};

const testMintingByUser = async function () {
  const uAddr = users[current].address;

  await expect(
    gameNFT
      .connect(users[current])
      .mint(users[current].address, tokenId, amount, 0xff)
  ).to.be.revertedWith("Ownable: caller is not the owner");

  let tokensOwnedBefore = parseFloat(
    ethers.utils.formatUnits(await gameNFT.balanceOf(uAddr, tokenId), 0)
  );
  await relayTx(await signTokenMint(users[current]), users[current]);
  let tokensOwnedAfter = parseFloat(
    ethers.utils.formatUnits(await gameNFT.balanceOf(uAddr, tokenId), 0)
  );

  //An end user tried to propogate transaction signed by herself.
  //Expect no change in her tokens balance. i.e. transaction did not succeed
  expect(tokensOwnedAfter).to.be.equal(tokensOwnedBefore);
};

const formatBalance = async function (balance, decimals, index) {
  const tmp = parseFloat(ethers.utils.formatUnits(balance, decimals));
  balances[index] = balances[index] ? tmp - balances[index] : tmp;
};

const checkBalanceChange = async function (expectChange = 0) {
  const amount_back = amount;
  if (expectChange == 0) balances = {};
  else if (expectChange == -1) amount = 0;

  const provider = ethers.provider;
  const oAddr = owner.address;
  const uAddr = users[current].address;

  formatBalance(await provider.getBalance(oAddr), 18, "ethM");
  formatBalance(await provider.getBalance(uAddr), 18, "ethU");
  formatBalance(await gameNFT.balanceOf(uAddr, tokenId), 0, "e1155");

  if (expectChange != 0) {
    expect(balances.ethM).to.be.equal(0.0);
    // expect(balances.ethU).to.be.lessThan(0);
    expect(balances.e1155).to.be.equal(amount);
  }

  if (expectChange == -1) {
    amount = amount_back;
  }
};

const relayTx = async function (req, relayer) {
  // Validate request on the forwarder contract
  const valid = await forwarder.verify(req.request, req.signature);
  expect(valid).to.be.true;

  // Send meta-tx through relayer to the forwarder contract
  const gasLimit = (parseInt(req.request.gas) + 50000).toString();
  return await forwarder
    .connect(relayer)
    .execute(req.request, req.signature, { gasLimit });
};

const mintByowner = async function () {
  tokenId++;
  const uAddr = users[current].address;
  await checkBalanceChange(0, 0);
  await gameNFT.mint(uAddr, tokenId, amount, 0xff);
  await checkBalanceChange(0, 1);
};

const relayTxSignedByOwner = async function () {
  tokenId++;
  const uAddr = users[current].address;
  await checkBalanceChange(0, 0);
  await relayTx(await signTokenMint(owner), users[current]);
  await checkBalanceChange(0, 1);
};

describe("Minting NFT assets through fron-end relayer", async function () {
  it("should deploy token contract", deployTokens);
  it("should verify the forwarder", verifyForwarder);
  it("should verify minter and owner", verifyRights);
  it("should verify URI", verifyURI);
  it("should not allow minting by end user", testMintingByUser);
  it("Should mint from owner's account", mintByowner);
  it(
    "Should allow gasless mint signed by owner's account, relayed by a user",
    relayTxSignedByOwner
  );
});
