import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { StakingRewards } from "../typechain-types";


let stakingRewards: StakingRewards
let owner: SignerWithAddress
let alice: SignerWithAddress

describe("StakingRewards", function () {
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

  const HUNDRED_ETH = ethers.utils.parseEther("100")
  const ONE_ETH = ethers.utils.parseEther("1")

  it("should manage StakingRewards lifecycle", async () => {
    [owner, alice] = await ethers.getSigners();

    // deploy contracts
    const SimpleERC20 = await ethers.getContractFactory("SimpleERC20");
    const erc20Staking = await SimpleERC20.deploy("LP Token", "LP");
    const erc20Rewards = await SimpleERC20.deploy("Wrapped ETH", "WETH");

    const StakingRewards = await ethers.getContractFactory("StakingRewards");
    stakingRewards = await StakingRewards.deploy(owner.address, owner.address, erc20Rewards.address, erc20Staking.address)

    // setup ERC20
    await erc20Staking.mint(owner.address, HUNDRED_ETH)
    await erc20Staking.mint(alice.address, HUNDRED_ETH)

    await erc20Rewards.mint(owner.address, HUNDRED_ETH)

    // begin the rewards period
    await erc20Rewards.transfer(stakingRewards.address, HUNDRED_ETH)
    await stakingRewards.notifyRewardAmount(HUNDRED_ETH)

    console.log("after notifyRewardAmount")
    await log()

    // stake
    await erc20Staking.approve(stakingRewards.address, HUNDRED_ETH)
    await stakingRewards.stake(HUNDRED_ETH)

    console.log("after stake")
    await log()

    // fast forward halfway
    await time.increase(60 * 60 * 24 * 7 / 2)

    console.log("after increasing time by half the rewardsDuration")
    await log()

    // have alice stake 100 LP Token
    await erc20Staking.connect(alice).approve(stakingRewards.address, HUNDRED_ETH)
    await stakingRewards.connect(alice).stake(HUNDRED_ETH)

    console.log("after alice stakes")
    await log()

    // increase time to 3/4 through the reward period
    await time.increase(60 * 60 * 24 * 7 / 4)

    console.log("after 3/4ths done")
    await log()

    // increase time to the end of the period
    const periodFinish = await stakingRewards.periodFinish()
    await time.increaseTo(periodFinish)

    console.log("after reached periodFinish")
    await log()

    // both exit
    await stakingRewards.exit()
    await stakingRewards.connect(alice).exit()

    console.log("after exit")
    await log()

    console.log("owner balance WETH", await (await erc20Rewards.balanceOf(owner.address)).div(ONE_ETH))
    console.log("alice balance WETH", await (await erc20Rewards.balanceOf(alice.address)).div(ONE_ETH))

  })

  const log = async () => {
    console.log("rewardPerTokenStored         ", Number(await (await stakingRewards.rewardPerTokenStored()).toString()) / 1e18)
    console.log("lastTimeRewardApplicable     ", await (await stakingRewards.lastTimeRewardApplicable()).toString())
    console.log("lastUpdateTime               ", await (await stakingRewards.lastUpdateTime()).toString())
    console.log("rewardRate                   ", await (await stakingRewards.rewardRate()).toString())
    console.log("rewardPerToken               ", Number(await (await stakingRewards.rewardPerToken()).toString()) / 1e18)
    console.log("totalSupply                  ", await (await stakingRewards.totalSupply()).div(ONE_ETH).toString())
    console.log("owner earned                 ", await (await stakingRewards.earned(owner.address)).div(ONE_ETH).toString())
    console.log("alice earned                 ", await (await stakingRewards.earned(alice.address)).div(ONE_ETH).toString())
    console.log("owner userRewardPerTokenPaid ", Number(await (await stakingRewards.userRewardPerTokenPaid(owner.address)).toString()) / 1e18)
    console.log("alice userRewardPerTokenPaid ", Number(await (await stakingRewards.userRewardPerTokenPaid(alice.address)).toString()) / 1e18)

    console.log("\n")
  }
});
