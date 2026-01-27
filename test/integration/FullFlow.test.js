const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FullFlow integration test", function () {
  let owner, user;

  let factory;
  let token;
  let wrapper;
  let staking;

  const MINT_AMOUNT = ethers.utils.parseEther("1000");
  const TOKENS_PER_NFT = ethers.utils.parseEther("100");
  const YEAR = 365 * 24 * 60 * 60;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    /* ---------------- Factory ---------------- */

    const Factory = await ethers.getContractFactory("SyntheticTokenFactory");
    factory = await Factory.deploy();
    await factory.deployed();

    const tx = await factory.createSyntheticToken("Synthetic USD", "sUSD");
    const receipt = await tx.wait();

    const syntheticAddress = receipt.events.find(
      (e) => e.event === "SyntheticTokenCreated"
    ).args.token;

    token = await ethers.getContractAt("SyntheticToken", syntheticAddress);

    /* ---------------- Mint tokens ---------------- */

    await token.connect(owner).mint(user.address, MINT_AMOUNT);

    /* ---------------- Wrapper (ERC721) ---------------- */

    const Wrapper = await ethers.getContractFactory("Wrapper");
    wrapper = await Wrapper.deploy(token.address, TOKENS_PER_NFT);
    await wrapper.deployed();

    /* ---------------- Staking (NFT staking) ---------------- */

    const Staking = await ethers.getContractFactory("Staking");
    staking = await Staking.deploy(
      wrapper.address, // NFT
      token.address    // reward token
    );
    await staking.deployed();

    /* ---------------- Approvals ---------------- */

    await token.connect(user).approve(wrapper.address, MINT_AMOUNT);
    await wrapper.connect(user).setApprovalForAll(staking.address, true);

    /* ---------------- Fund staking with rewards ---------------- */

    await token.connect(owner).mint(
      staking.address,
      ethers.utils.parseEther("100000")
    );
  });

  it("full user flow works correctly", async function () {
    /* ---------- wrap ERC20 -> NFT ---------- */

    await wrapper.connect(user).wrap();

    expect(await wrapper.balanceOf(user.address)).to.equal(1);
    expect(await token.balanceOf(user.address)).to.equal(
      MINT_AMOUNT.sub(TOKENS_PER_NFT)
    );

    /* ---------- stake NFT ---------- */

    await staking.connect(user).stake(1);

    expect(await staking.stakerOf(1)).to.equal(user.address);

    /* ---------- time passes ---------- */

    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine");

    await ethers.provider.send("evm_increaseTime", [YEAR]);
    await ethers.provider.send("evm_mine");

    /* ---------- claim rewards ---------- */

    await staking.connect(user).claim();

    const rewardBalance = await token.balanceOf(user.address);
    expect(rewardBalance).to.be.gt(
      MINT_AMOUNT.sub(TOKENS_PER_NFT)
    );

    /* ---------- unstake NFT ---------- */

    await staking.connect(user).unstake(1);

    expect(await wrapper.ownerOf(1)).to.equal(user.address);
  });
});
