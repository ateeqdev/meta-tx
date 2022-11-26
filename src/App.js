import * as React from "react";
import "./App.css";
import { ethers } from "ethers";
import { GameNFTAbi } from "./GameNFT.js";
import { ForwarderAbi } from "./Forwarder.js";
import addrs from "./addresses.json";

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { balance: 0 };
  }

  async fetchBalance() {
    if (typeof window.ethereum !== "undefined") {
      //ethereum is usable get reference to the contract
      await this.requestAccount();
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      const GameNFT = new ethers.Contract(
        addrs["GameNFT"],
        GameNFTAbi,
        provider
      );

      //try to get the balance in the contract
      try {
        let data = await GameNFT.balanceOf(await signer.getAddress(), 1);
        data = data.toString();
        this.setState({ balance: data });
        console.log("Data: ", data);
      } catch (e) {
        console.log("Err: ", e);
      }
    }
  }

  async claimNewMint(apiEndpoint) {
    if (typeof window.ethereum !== "undefined") {
      //ethereum is usable, get reference to the contract
      await this.requestAccount();
      const provider = new ethers.providers.Web3Provider(window.ethereum);

      //signer needed for transaction that changes state
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      console.log(address);

      const forwarder = new ethers.Contract(
        addrs["MinimalForwarder"],
        ForwarderAbi,
        signer
      );
      fetch("http://localhost:30001/" + apiEndpoint + "?account=" + address, {
        method: "get",
        dataType: "json",
        headers: {
          Accept: "application/json",
        },
      }).then(async (result) => {
        result = await result.json();
        await this.relay(forwarder, result.request, result.signature);
        this.fetchBalance();
      });
      //preform transaction
    }
  }

  async requestAccount() {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    console.log("requesting account");
  }

  async relay(forwarder, request, signature) {
    console.log(request, signature);
    // Validate request on the forwarder contract
    const valid = await forwarder.verify(request, signature);
    if (!valid) throw new Error(`Invalid request`);
    console.log("valid", valid);

    // Send meta-tx through relayer to the forwarder contract
    const gasLimit = (parseInt(request.gas) + 50000).toString();
    return await forwarder.execute(request, signature, { gasLimit });
  }

  render() {
    let dApp = (
      <div>
        <h1>You Own {this.state.balance} Tokens of ID 1</h1>
        <button onClick={() => this.fetchBalance()}>Refresh Balance</button>
        <hr />
        <button
          onClick={() => {
            this.claimNewMint("mint");
          }}
        >
          Mint a new token
        </button>
      </div>
    );

    const isMetaMaskInstalled = typeof window.ethereum !== "undefined";

    if (!isMetaMaskInstalled) {
      dApp = (
        <a
          target="_blank"
          rel="noreferrer"
          href="https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn?hl=en"
        >
          <button>Install MetaMask First</button>{" "}
        </a>
      );
    }
    return dApp;
  }
}
