const { ethers } = require('ethers');
const fs = require('fs');
require('dotenv').config();

async function debugContract() {
    console.log('🔍 Debugging Certificate System...\n');
    
    try {
        // Load contract info
        const addressData = JSON.parse(fs.readFileSync('./contract-address.json', 'utf8'));
        const contractAddress = addressData.address;
        
        const artifact = JSON.parse(fs.readFileSync('./artifacts/contracts/CertificateRegistry.sol/CertificateRegistry.json', 'utf8'));
        const contractABI = artifact.abi;
        
        console.log('📜 Contract Address:', contractAddress);
        console.log('🌐 Network:', addressData.network);
        console.log('📅 Deployed At:', addressData.deployedAt);
        console.log('');
        
        // Connect to Sepolia
        const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        const contract = new ethers.Contract(contractAddress, contractABI, wallet);
        
        // Check wallet balance
        const balance = await provider.getBalance(wallet.address);
        console.log('💰 Wallet Address:', wallet.address);
        console.log('💵 Sepolia ETH Balance:', ethers.formatEther(balance), 'ETH');
        
        if (parseFloat(ethers.formatEther(balance)) < 0.001) {
            console.log('⚠️  WARNING: Low balance! Get test ETH from: https://www.alchemy.com/faucets/ethereum-sepolia');
        }
        console.log('');
        
        // Check if contract is deployed
        const code = await provider.getCode(contractAddress);
        if (code === '0x') {
            console.log('❌ ERROR: Contract not deployed at this address!');
            return;
        }
        console.log('✅ Contract is deployed');
        console.log('');
        
        // Check total certificates
        const totalCerts = await contract.getTotalCertificates();
        console.log('📊 Total Certificates Issued:', totalCerts.toString());
        console.log('');
        
        // List all certificates
        if (totalCerts > 0) {
            console.log('📋 Certificate List:');
            for (let i = 0; i < totalCerts; i++) {
                const certId = await contract.getCertificateIdByIndex(i);
                const cert = await contract.getCertificate(certId);
                console.log(`\n  ${i + 1}. Certificate ID: ${certId}`);
                console.log(`     Recipient: ${cert.recipientName}`);
                console.log(`     Course: ${cert.courseName}`);
                console.log(`     Valid: ${cert.isValid}`);
                console.log(`     IPFS: ${cert.ipfsHash}`);
            }
        } else {
            console.log('📋 No certificates found on blockchain yet');
        }
        
        console.log('\n');
        
        // Try to verify the specific certificate
        const testCertId = 'CERT-1769313370917-QUZLLP';
        console.log(`🔍 Checking specific certificate: ${testCertId}`);
        try {
            const cert = await contract.getCertificate(testCertId);
            if (cert.dataHash && cert.dataHash !== '' && cert.dataHash !== '0x') {
                console.log('✅ Certificate FOUND!');
                console.log('   Recipient:', cert.recipientName);
                console.log('   Course:', cert.courseName);
                console.log('   Valid:', cert.isValid);
            } else {
                console.log('❌ Certificate NOT FOUND on blockchain');
                console.log('   This means the transaction was not completed successfully');
            }
        } catch (error) {
            console.log('❌ Certificate NOT FOUND on blockchain');
            console.log('   Error:', error.message);
        }
        
        console.log('\n✅ Debug complete!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

debugContract();