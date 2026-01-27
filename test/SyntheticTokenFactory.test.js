const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SyntheticTokenFactory", function () {
  let owner;
  let user;
  let other;

  let factory;

  const NAME = "Synthetic USD";
  const SYMBOL = "sUSD";
  const AMOUNT = ethers.utils.parseEther("100");

  beforeEach(async function () {
    [owner, user, other] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("SyntheticTokenFactory");
    factory = await Factory.deploy();
    await factory.deployed();
  });

  describe("createSynthetic()", function () {
    it("reverts when name is empty", async function () {
      await expect(
        factory.createSyntheticToken("", SYMBOL)
      ).to.be.reverted;
    });

    it("reverts when symbol is empty", async function () {
      await expect(
        factory.createSyntheticToken(NAME, "")
      ).to.be.reverted;
    });

    it("reverts when creating token with duplicate symbol", async function () {
      await factory.createSyntheticToken(NAME, SYMBOL);

      await expect(
        factory.createSyntheticToken("Another USD", SYMBOL)
      ).to.be.reverted;
    });

    it("normalizes symbol to uppercase", async function () {
      const tx = await factory.createSyntheticToken("Synthetic USD", "sUsd");
      const receipt = await tx.wait();
    
      const event = receipt.events.find(e => e.event === "SyntheticTokenCreated");
      const tokenAddress = event.args.token;
    
      const token = await ethers.getContractAt("SyntheticToken", tokenAddress);
    
      expect(await token.symbol()).to.equal("SUSD");
    });

    it("treats symbols as case-insensitive (sUSD vs susd)", async function () {
      await factory.createSyntheticToken("Synthetic USD", "sUSD");
        
      await expect(
        factory.createSyntheticToken("Synthetic USD Copy", "susd")
      ).to.be.reverted;
    });

    it("reverts when creating token with duplicate name", async function () {
      await factory.createSyntheticToken("Synthetic USD", "sUSD");
    
      await expect(
        factory.createSyntheticToken("Synthetic USD", "sEUR")
      ).to.be.reverted;
    });

    it("creates a synthetic token", async function () {
      const tx = await factory.createSyntheticToken(NAME, SYMBOL);
      const receipt = await tx.wait();

      const event = receipt.events.find(e => e.event === "SyntheticTokenCreated");
      const tokenAddress = event.args.token;

      expect(tokenAddress).to.properAddress;
      expect(await factory.isSyntheticToken(tokenAddress)).to.equal(true);
    });

    it("increments synthetics count", async function () {
      await factory.createSyntheticToken(NAME, SYMBOL);
      await factory.createSyntheticToken("Synthetic EUR", "sEUR");

      expect(await factory.syntheticTokensCount()).to.equal(2);
    });

    it("sets factory as token owner", async function () {
      const tx = await factory.createSyntheticToken(NAME, SYMBOL);
      const receipt = await tx.wait();
      const tokenAddress = receipt.events.find(
        e => e.event === "SyntheticTokenCreated"
      ).args.token;

      const token = await ethers.getContractAt("SyntheticToken", tokenAddress);
      expect(await token.owner()).to.equal(owner.address);
    });

    it("emits SyntheticTokenCreated event", async function () {
      const tx = await factory.createSyntheticToken(NAME, SYMBOL);
      const receipt = await tx.wait();

      const event = receipt.events.find(
        e => e.event === "SyntheticTokenCreated"
      );

      expect(event).to.not.be.undefined;

      const tokenAddress = event.args[0];
      const creator = event.args[1];
      const name = event.args[2];
      const symbol = event.args[3];

      expect(tokenAddress).to.properAddress;
      expect(creator).to.equal(owner.address);
      expect(name).to.equal(NAME);
      expect(symbol).to.equal(SYMBOL);
    });

    it("only owner can create synthetic", async function () {
      await expect(
        factory.connect(user).createSyntheticToken(NAME, SYMBOL)
      ).to.be.reverted;
    });
  });
});
