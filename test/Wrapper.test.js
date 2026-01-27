const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Wrapper", function () {
  let owner;
  let user;
  let other;

  let token;
  let wrapper;

  const TOKENS_PER_NFT = ethers.utils.parseUnits("100", 18);

  beforeEach(async function () {
    [owner, user, other] = await ethers.getSigners();

    const SyntheticToken = await ethers.getContractFactory("SyntheticToken");
    token = await SyntheticToken.deploy(
      "Synthetic USD",
      "sUSD",
      owner.address
    );
    await token.deployed();

    await token.mint(user.address, TOKENS_PER_NFT);

    const Wrapper = await ethers.getContractFactory("Wrapper");
    wrapper = await Wrapper.deploy(token.address, TOKENS_PER_NFT);
    await wrapper.deployed();

    await token.connect(user).approve(wrapper.address, TOKENS_PER_NFT);
  });

  describe("constructor", function () {
    it("reverts if token address is zero", async function () {
      const Wrapper = await ethers.getContractFactory("Wrapper");

      await expect(
        Wrapper.deploy(ethers.constants.AddressZero, TOKENS_PER_NFT)
      ).to.be.reverted;
    });
  });

  describe("setTokensPerNFT()", function () {
    it("allows owner to update tokensPerNFT", async function () {
      const newAmount = ethers.utils.parseUnits("200", 18);

      await wrapper.connect(owner).setTokensPerNFT(newAmount);

      expect(await wrapper.tokensPerNFT()).to.equal(newAmount);
    });

    it("reverts if called by non-owner", async function () {
      const newAmount = ethers.utils.parseUnits("200", 18);

      await expect(
        wrapper.connect(user).setTokensPerNFT(newAmount)
      ).to.be.reverted;
    });

    it("reverts if newAmount is zero", async function () {
      await expect(
        wrapper.connect(owner).setTokensPerNFT(0)
      ).to.be.reverted;
    });
  });

  describe("wrap()", function () {
    it("transfers tokens and mints NFT", async function () {
      await wrapper.connect(user).wrap();

      expect(await token.balanceOf(wrapper.address)).to.equal(TOKENS_PER_NFT);
      expect(await token.balanceOf(user.address)).to.equal(0);

      expect(await wrapper.ownerOf(1)).to.equal(user.address);
    });

    it("emits Wrapped event", async function () {
      await expect(wrapper.connect(user).wrap())
        .to.emit(wrapper, "Wrapped")
        .withArgs(user.address, user.address, 1, TOKENS_PER_NFT);
    });

    it("reverts wrap after tokensPerNFT is increased and balance becomes insufficient", async function () {
      const higherAmount = TOKENS_PER_NFT.mul(2);
      await wrapper.connect(owner).setTokensPerNFT(higherAmount);
      
      await expect(
        wrapper.connect(user).wrap()
      ).to.be.reverted;
    });
  });

   describe("wrapTo()", function () {
      it("emits Wrapped event with payer and recipient", async function () {
      await expect(wrapper.connect(user).wrapTo(other.address))
      .to.emit(wrapper, "Wrapped")
      .withArgs(
        user.address,      
        other.address,     
        1,                 
        TOKENS_PER_NFT
      );
    });

      it("reverts for zero address recipient", async function () {
      await expect(
        wrapper.connect(user).wrapTo(ethers.constants.AddressZero)
      ).to.be.reverted;
    });

      it("mints NFT to recipient, not payer", async function () {
      await wrapper.connect(user).wrapTo(other.address);

      expect(await wrapper.ownerOf(1)).to.equal(other.address);
      expect(await token.balanceOf(user.address)).to.equal(0);
    });

      it("payer pays tokens, recipient balance unchanged", async function () {
      const before = await token.balanceOf(other.address);

      await wrapper.connect(user).wrapTo(other.address);

      expect(await token.balanceOf(other.address)).to.equal(before);
      expect(await token.balanceOf(wrapper.address)).to.equal(TOKENS_PER_NFT);
    });

      it("reverts unwrap if called by non-owner", async function () {
        await wrapper.connect(user).wrap();
      
        await expect(
          wrapper.connect(other).unwrap(1)
        ).to.be.reverted;
      });
   });

  describe("unwrap()", function () {
    beforeEach(async function () {
      await wrapper.connect(user).wrap();
    });

    it("burns NFT and returns tokens", async function () {
      await wrapper.connect(user).unwrap(1);

      expect(await token.balanceOf(user.address)).to.equal(TOKENS_PER_NFT);
      expect(await token.balanceOf(wrapper.address)).to.equal(0);

      await expect(wrapper.ownerOf(1)).to.be.reverted;
    });

    it("emits Unwrapped event", async function () {
      await expect(wrapper.connect(user).unwrap(1))
        .to.emit(wrapper, "Unwrapped")
        .withArgs(user.address, 1, TOKENS_PER_NFT);
    });

    it("reverts if called by non-owner", async function () {
      await expect(
        wrapper.connect(other).unwrap(1)
      ).to.be.reverted;
    });
  });
});
