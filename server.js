const express = require('express');
const { ethers } = require('ethers');
const crypto = require('crypto');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');
const FormData = require('form-data');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('frontend'));

// Multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Load contract
let contractAddress, contractABI;
try {
    const addressData = JSON.parse(fs.readFileSync('./contract-address.json', 'utf8'));
    contractAddress = addressData.address;
    const artifact = JSON.parse(fs.readFileSync('./artifacts/contracts/CertificateRegistry.sol/CertificateRegistry.json', 'utf8'));
    contractABI = artifact.abi;
} catch (error) {
    console.error('❌ Contract not deployed! Run: npm run deploy');
    process.exit(1);
}

// FIXED: Connect to Sepolia testnet instead of local node
const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(contractAddress, contractABI, wallet);

// Pinata IPFS configuration
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;
const PINATA_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';

// Upload file to IPFS via Pinata
async function uploadToIPFS(filePath, fileName) {
    try {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath));
        
        const metadata = JSON.stringify({
            name: fileName,
        });
        formData.append('pinataMetadata', metadata);
        
        const response = await axios.post(PINATA_URL, formData, {
            maxBodyLength: 'Infinity',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
                'pinata_api_key': PINATA_API_KEY,
                'pinata_secret_api_key': PINATA_SECRET_KEY
            }
        });
        
        return response.data.IpfsHash;
    } catch (error) {
        console.error('IPFS upload error:', error);
        throw error;
    }
}

// Generate certificate hash
function generateCertificateHash(data) {
    const certData = JSON.stringify({
        recipientName: data.recipientName,
        courseName: data.courseName,
        issueDate: data.issueDate,
        certificateId: data.certificateId
    });
    return crypto.createHash('sha256').update(certData).digest('hex');
}

// Generate certificate ID
function generateCertificateId() {
    return 'CERT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

// Get contract info (for MetaMask)
app.get('/api/contract-info', (req, res) => {
    res.json({
        address: contractAddress,
        abi: contractABI
    });
});

// Issue certificate with file upload
app.post('/api/certificates/issue', upload.single('certificateFile'), async (req, res) => {
    try {
        const { recipientName, courseName, recipientEmail } = req.body;
        
        if (!recipientName || !courseName) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const certificateId = generateCertificateId();
        const issueDate = new Date().toISOString();
        
        const certificateData = {
            certificateId,
            recipientName,
            courseName,
            issueDate,
            recipientEmail
        };
        
        const dataHash = generateCertificateHash(certificateData);
        
        let ipfsHash = '';
        
        // Upload file to IPFS if provided
        if (req.file) {
            console.log('📤 Uploading to IPFS...');
            ipfsHash = await uploadToIPFS(req.file.path, `${certificateId}.pdf`);
            console.log('✅ IPFS Hash:', ipfsHash);
            
            // Clean up uploaded file
            fs.unlinkSync(req.file.path);
        } else {
            // Generate simple certificate data as JSON and upload
            const certJSON = JSON.stringify(certificateData, null, 2);
            const tempPath = `uploads/${certificateId}.json`;
            fs.writeFileSync(tempPath, certJSON);
            ipfsHash = await uploadToIPFS(tempPath, `${certificateId}.json`);
            fs.unlinkSync(tempPath);
        }
        
        res.json({
            success: true,
            certificateId,
            ipfsHash,
            dataHash,
            certificateData,
            message: 'Use MetaMask to complete issuance on blockchain'
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Verify certificate - IMPROVED ERROR HANDLING
app.get('/api/certificates/:id', async (req, res) => {
    try {
        const certificateId = req.params.id;
        
        console.log('🔍 Verifying certificate:', certificateId);
        
        const cert = await contract.getCertificate(certificateId);
        
        // Check if certificate exists by checking recipientName (more reliable than dataHash)
        if (!cert.recipientName || cert.recipientName === '') {
            console.log('❌ Certificate not found');
            return res.status(404).json({ 
                error: 'Certificate not found',
                message: 'This certificate ID does not exist on the blockchain'
            });
        }
        
        console.log('✅ Certificate found:', cert.recipientName);
        
        res.json({
            certificateId,
            recipientName: cert.recipientName,
            courseName: cert.courseName,
            issueDate: new Date(Number(cert.issueDate) * 1000).toISOString(),
            issuer: cert.issuer,
            isValid: cert.isValid,
            ipfsHash: cert.ipfsHash,
            dataHash: cert.dataHash,
            ipfsUrl: `https://gateway.pinata.cloud/ipfs/${cert.ipfsHash}`
        });
        
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ 
            error: 'Verification failed',
            message: error.message 
        });
    }
});

// Get certificate from IPFS
app.get('/api/certificates/:id/file', async (req, res) => {
    try {
        const certificateId = req.params.id;
        const cert = await contract.getCertificate(certificateId);
        
        if (!cert.ipfsHash) {
            return res.status(404).json({ error: 'No file found' });
        }
        
        res.redirect(`https://gateway.pinata.cloud/ipfs/${cert.ipfsHash}`);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
    ✅ Server running!
    📍 Open browser: http://localhost:${PORT}
    📜 Contract: ${contractAddress}
    🌐 Network: Sepolia Testnet
    🌐 IPFS: ${PINATA_API_KEY ? 'Configured ✅' : 'Not configured ⚠️'}
    `);
});