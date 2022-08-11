pragma solidity ^0.5.16;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SimpleERC20 is ERC20 {

    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        
    }
}