// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.4;

import "./lib/ERC1155.sol";
import "./lib/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/// @title Standard ERC1155 NFT.
/// @author Ateeq.
contract GameNFT is ERC1155, Ownable {
    constructor() ERC1155("") {
        _transferOwnership(_msgSender());
    }

    function setURI(string memory newuri) public onlyOwner {
        _setURI(newuri);
    }

    /**
     * Get URI of token with given id.
     */
    function uri(
        uint256 _tokenid
    ) public view override returns (string memory) {
        return
            string(
                abi.encodePacked(
                    ERC1155.uri(_tokenid),
                    Strings.toString(_tokenid),
                    ".json"
                )
            );
    }

    function mint(
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public onlyOwner {
        _mint(to, id, amount, data);
    }

    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public onlyOwner {
        _mintBatch(to, ids, amounts, data);
    }
}
