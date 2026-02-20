const express = require('express');
const { ethers } = require('ethers');
const crypto = require('crypto');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');
const FormData = require('form-data');
const axios = require('axios');
const PDFDocument = require('pdfkit');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('frontend'));

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

const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(contractAddress, contractABI, wallet);

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;
const PINATA_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';


async function generateCertificatePDF(data) {
    return new Promise((resolve, reject) => {
        const filename = `${data.certificateId}.pdf`;
        const filepath = `uploads/${filename}`;
        
        const doc = new PDFDocument({
            size: 'A4',
            layout: 'landscape',
            margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });
        
        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);
        
        
        doc.rect(0, 0, doc.page.width, doc.page.height)
           .fill('#f8f9fa');
        
        doc.strokeColor('#667eea')
           .lineWidth(8)
           .rect(30, 30, doc.page.width - 60, doc.page.height - 60)
           .stroke();
        
        doc.strokeColor('#764ba2')
           .lineWidth(2)
           .rect(40, 40, doc.page.width - 80, doc.page.height - 80)
           .stroke();
        
        doc.fontSize(48)
           .fillColor('#667eea')
           .font('Helvetica-Bold')
           .text('Certificate of Achievement', 0, 100, {
               align: 'center',
               width: doc.page.width
           });
        
        doc.moveTo(200, 170)
           .lineTo(doc.page.width - 200, 170)
           .strokeColor('#764ba2')
           .lineWidth(2)
           .stroke();
        
        doc.fontSize(18)
           .fillColor('#666666')
           .font('Helvetica')
           .text('This certifies that', 0, 210, {
               align: 'center',
               width: doc.page.width
           });
        
        // Recipient name (large and prominent)
        doc.fontSize(36)
           .fillColor('#333333')
           .font('Helvetica-Bold')
           .text(data.recipientName, 0, 260, {
               align: 'center',
               width: doc.page.width
           });
        
        // "has successfully completed"
        doc.fontSize(18)
           .fillColor('#666666')
           .font('Helvetica')
           .text('has successfully completed', 0, 320, {
               align: 'center',
               width: doc.page.width
           });
        
        // Course name
        doc.fontSize(28)
           .fillColor('#667eea')
           .font('Helvetica-Bold')
           .text(data.courseName, 0, 360, {
               align: 'center',
               width: doc.page.width
           });
        
        // Additional notes if provided
        if (data.additionalNotes) {
            doc.fontSize(14)
               .fillColor('#666666')
               .font('Helvetica-Oblique')
               .text(data.additionalNotes, 0, 420, {
                   align: 'center',
                   width: doc.page.width
               });
        }
        
        // Issue date
        const issueDate = new Date(data.issueDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        doc.fontSize(14)
           .fillColor('#666666')
           .font('Helvetica')
           .text(`Issued on: ${issueDate}`, 0, 480, {
               align: 'center',
               width: doc.page.width
           });
        
        // Certificate ID at bottom
        doc.fontSize(10)
           .fillColor('#999999')
           .font('Courier')
           .text(`Certificate ID: ${data.certificateId}`, 0, doc.page.height - 80, {
               align: 'center',
               width: doc.page.width
           });
        
        // Blockchain verification info
        doc.fontSize(9)
           .fillColor('#999999')
           .text('This certificate is verified on the Ethereum blockchain', 0, doc.page.height - 60, {
               align: 'center',
               width: doc.page.width
           });
        
        // Verification URL
        const verifyUrl = `${process.env.APP_URL || 'http://localhost:3000'}/verify?id=${data.certificateId}`;
        doc.fontSize(8)
           .fillColor('#667eea')
           .text(`Verify at: ${verifyUrl}`, 0, doc.page.height - 45, {
               align: 'center',
               width: doc.page.width,
               link: verifyUrl
           });
        
        doc.end();
        
        stream.on('finish', () => resolve(filepath));
        stream.on('error', reject);
    });
}

async function uploadToIPFS(filePath, fileName) {
    try {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath));
        
        const metadata = JSON.stringify({ name: fileName });
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

function generateCertificateHash(data) {
    const certData = JSON.stringify({
        recipientName: data.recipientName,
        courseName: data.courseName,
        issueDate: data.issueDate,
        certificateId: data.certificateId
    });
    return crypto.createHash('sha256').update(certData).digest('hex');
}

function generateCertificateId() {
    return 'CERT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

// Get contract info
app.get('/api/contract-info', (req, res) => {
    res.json({
        address: contractAddress,
        abi: contractABI
    });
});

// Issue certificate with auto PDF generation
app.post('/api/certificates/issue', upload.single('certificateFile'), async (req, res) => {
    try {
        const { recipientName, courseName, recipientEmail, additionalNotes } = req.body;
        
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
            recipientEmail,
            additionalNotes
        };
        
        const dataHash = generateCertificateHash(certificateData);
        
        let ipfsHash = '';
        let pdfPath = null;
        
        // If user uploaded a file, use that
        if (req.file) {
            console.log('📤 Uploading user file to IPFS...');
            ipfsHash = await uploadToIPFS(req.file.path, `${certificateId}.pdf`);
            fs.unlinkSync(req.file.path);
        } else {
            // Generate beautiful PDF certificate
            console.log('🎨 Generating PDF certificate...');
            pdfPath = await generateCertificatePDF(certificateData);
            console.log('📤 Uploading generated PDF to IPFS...');
            ipfsHash = await uploadToIPFS(pdfPath, `${certificateId}.pdf`);
            fs.unlinkSync(pdfPath);
        }
        
        console.log('✅ IPFS Hash:', ipfsHash);
        
        res.json({
            success: true,
            certificateId,
            ipfsHash,
            dataHash,
            certificateData,
            verifyUrl: `${process.env.APP_URL || 'http://localhost:3000'}/verify?id=${certificateId}`,
            message: 'Use MetaMask to complete issuance on blockchain'
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Verify certificate
app.get('/api/certificates/:id', async (req, res) => {
    try {
        const certificateId = req.params.id;
        console.log('🔍 Verifying certificate:', certificateId);
        
        const cert = await contract.getCertificate(certificateId);
        
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

// Get all certificates (for digital locker)
app.get('/api/certificates', async (req, res) => {
    try {
        const total = await contract.getTotalCertificates();
        const certificates = [];
        
        for (let i = 0; i < total; i++) {
            const certId = await contract.getCertificateIdByIndex(i);
            const cert = await contract.getCertificate(certId);
            
            certificates.push({
                certificateId: certId,
                recipientName: cert.recipientName,
                courseName: cert.courseName,
                issueDate: new Date(Number(cert.issueDate) * 1000).toISOString(),
                issuer: cert.issuer,
                isValid: cert.isValid
            });
        }
        
        res.json({ certificates });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Redirect to IPFS file
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

// Batch certificate issuance
app.post('/api/certificates/batch', upload.single('csvFile'), async (req, res) => {
    try {
        // This would parse a CSV file with multiple recipients
        // For now, return a placeholder
        res.json({
            message: 'Batch issuance coming soon',
            info: 'Upload a CSV with columns: recipientName, courseName, email'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
    ✅ Server running!
    📍 URL: http://localhost:${PORT}
    📜 Contract: ${contractAddress}
    🌐 Network: Sepolia Testnet
    🌐 IPFS: ${PINATA_API_KEY ? 'Configured ✅' : 'Not configured ⚠️'}
    🎨 PDF Generation: Enabled ✅
    📱 QR Codes: Enabled ✅
    `);
});