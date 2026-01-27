    const { expect } = require("chai");
    const { ethers } = require("hardhat");
  
    describe("test-only helpers", function () {
      it("MockStakingClaim: claim can be called", async function () {
        const MockStakingClaim = await ethers.getContractFactory(
          "MockStakingClaim"
        );
        const mock = await MockStakingClaim.deploy();
        await mock.deployed();
    
        await expect(
          mock.claim()
        ).to.not.be.reverted;
      });
    });
    