import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Lock", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshopt in every test.
  async function deployOneYearLockFixture() {
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
    const ONE_GWEI = 1_000_000_000;

    const lockedAmount = ONE_GWEI;
    const unlockTime = (await time.latest()) + ONE_YEAR_IN_SECS;

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    const Lock = await ethers.getContractFactory("Lock");
    const lock = await Lock.deploy(unlockTime, { value: lockedAmount });

    return { lock, unlockTime, lockedAmount, owner, otherAccount };
  }

  it("should manage StakingRewards lifecycle", async () => {
    const [owner, otherAccount] = await ethers.getSigners();

    // deploy contracts
    const SimpleERC20 = await ethers.getContractFactory("SimpleERC20");
    const erc20Staking = await SimpleERC20.deploy("LP Token", "LP", 18);
    const erc20Rewards = await SimpleERC20.deploy("Wrapped ETH", "WETH", 18);

    const StakingRewards = await ethers.getContractFactory("StakingRewards");
    const stakingRewards = await StakingRewards.deploy(owner.address, owner.address, erc20Rewards.address, erc20Staking.address)

    // setup ERC20
    await erc20Staking.mint(owner.address, ethers.utils.parseEther("100"))
    await erc20Rewards.mint(owner.address, ethers.utils.parseEther("100"))

    // begin the rewards period
    await erc20Rewards.transfer(stakingRewards.address, ethers.utils.parseEther("100"))
    await stakingRewards.notifyRewardAmount(ethers.utils.parseEther("100"))

  })
});
