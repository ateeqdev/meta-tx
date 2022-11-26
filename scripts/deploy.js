/* eslint-disable spaced-comment */
/* eslint-disable no-console */
const fs = require("fs");
const hardhat = require("hardhat");
var args = [];

var contracts = {
  MinimalForwarder: {
    address: "",
    contract: "",
    name: "contracts/lib/MinimalForwarder.sol:MinimalForwarder",
  },
  GameNFT: {
    address: "",
    contract: "",
    name: "contracts/GameNFT.sol:GameNFT",
  },
};

async function main() {
  console.log("initializing deployments...");
  console.log(
    "To verify contracts you can execute the './scripts/verify.sh' command or run individual commands after this script finishes execution..."
  );

  fs.writeFileSync("scripts/verify.sh", "");

  await deployContract("MinimalForwarder");

  args.push({
    name: "GameNFT",
    arguments: [contracts.MinimalForwarder.address],
  });
  await deployContract("GameNFT", ...args[args.length - 1].arguments);
}

async function deployContract(contract, ...args) {
  const deployConfig = await hardhat.ethers.getContractFactory(
    contracts[contract].name
  );
  contracts[contract].contract = await deployConfig.deploy(...args, {
    gasPrice: await hardhat.ethers.provider.getGasPrice(),
  });
  contracts[contract].address = contracts[contract].contract.address;

  let verify =
    "npx hardhat verify --network " +
    process.env.HARDHAT_NETWORK +
    " " +
    contracts[contract].address;
  if (args[0]) verify += ` --constructor-args scripts/arguments/${contract}.js`;
  verify += ";\n";

  fs.appendFile("scripts/verify.sh", verify, function (err) {
    if (err) {
      return console.log(err);
    }
  });
  if (args[0])
    fs.writeFileSync(
      `scripts/arguments/${contract}.js`,
      "module.exports = " + JSON.stringify(args) + ";"
    );

  await contracts[contract].contract.deployTransaction.wait();

  console.log(contract + ": " + contracts[contract].address);
  console.log(verify);
}

/**
 * Write argument files for contracts
 */
async function writeArguments() {
  for (let index = 0; index < args.length; index++) {
    fs.writeFileSync(
      `scripts/arguments/${args[index].name}.js`,
      "module.exports = " + JSON.stringify(args[index].arguments) + ";"
    );
  }

  let addresses = {};
  for (let key in contracts) {
    addresses[key] = contracts[key].address;
  }
  fs.writeFileSync("src/addresses.json", JSON.stringify(addresses));
}

main()
  .then(() => {
    writeArguments();
  })
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
