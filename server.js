require("dotenv").config();
var path = require("path");
var express = require("express");
var bodyParser = require("body-parser");
const { ethers } = require("ethers");
const { signMetaTxRequest } = require("./src/signer.js");
const fs = require("fs");
const { readFileSync, writeFileSync } = require("fs");
const provider = ethers.getDefaultProvider(process.env.AVAXFUJI_RPC);

var app = express();

async function getInstance(name, lib = false) {
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  let abiPath = "./artifacts/contracts/" + (lib ? "lib/" : "");
  abiPath += name + ".sol/" + name + ".json";

  const abi = JSON.parse(readFileSync(abiPath))["abi"];

  const address = JSON.parse(readFileSync("src/addresses.json"))[name];
  if (!address) throw new Error(`Contract ${name} not found in deploy.json`);

  return new ethers.Contract(address, abi, signer);
}

async function signTx(account, functionName, tokenId, amount) {
  const forwarder = await getInstance("MinimalForwarder", true);
  const erc1155 = await getInstance("GameNFT");

  const { PRIVATE_KEY: private_key } = process.env;
  const signer = new ethers.Wallet(private_key, provider);
  const from = new ethers.Wallet(private_key).address;
  console.log(
    `Signing transaction to mint 1 token of id 1 to ${account} as ${from}...`
  );
  const data = erc1155.interface.encodeFunctionData(functionName, [
    account,
    tokenId,
    amount,
    0xff,
  ]);
  const result = await signMetaTxRequest(signer, forwarder, {
    to: erc1155.address,
    from,
    data,
  });

  const signed = JSON.stringify(result, null, 2);
  writeFileSync("tmp/request.json", signed);
  return signed;
}

app.use("/", express.static(path.join(__dirname, "public")));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/mint", async function (req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.send(await signTx(req.query.account, "mint", 1, 1));
});

app.listen(30001);

console.log("Server started: http://localhost:30001/");
