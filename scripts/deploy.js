const hre = require("hardhat");

async function main() {
    console.log("Deploying CertificateRegistry contract...");
    
    // Get the contract factory
    const CertificateRegistry = await hre.ethers.getContractFactory("CertificateRegistry");
    
    // Deploy the contract
    const certificateRegistry = await CertificateRegistry.deploy();
    
    await certificateRegistry.waitForDeployment();
    
    const address = await certificateRegistry.getAddress();
    console.log("CertificateRegistry deployed to:", address);
    
    // Save the contract address for later use
    const fs = require('fs');
    const contractInfo = {
        address: address,
        network: hre.network.name,
        deployedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(
        './contract-address.json',
        JSON.stringify(contractInfo, null, 2)
    );
    
    console.log("Contract info saved to contract-address.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });