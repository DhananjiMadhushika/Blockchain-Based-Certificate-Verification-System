# Blockchain-Based Certificate Verification System

A decentralized application (DApp) built using **Ethereum smart contracts, Hardhat, and a web-based frontend** to securely issue and verify academic/professional certificates. This project leverages blockchain technology to ensure certificates are **tamper-proof, transparent, and easily verifiable** by anyone.

---

## 🚀 Features
- **Blockchain-backed verification**: Certificates are stored and validated on Ethereum.
- **Smart contract implementation**: Written in Solidity for secure certificate management.
- **Frontend interface**: User-friendly web app for issuing and verifying certificates.
- **Hardhat integration**: For contract deployment, testing, and local blockchain simulation.
- **Secure & transparent**: Eliminates forgery and manual verification delays.

---

## 🛠️ Tech Stack
- Blockchain: Ethereum, Solidity
- Framework: Hardhat
- Frontend: HTML, JavaScript
- Backend: Node.js, Express
- Tools: MetaMask, Hardhat Ignition

---

## 📂 Project Structure

```
├── contracts/              # Solidity smart contracts 
├── frontend/               # Web-based frontend (HTML, JS) 
├── ignition/modules/       # Hardhat deployment modules 
├── scripts/                # Deployment & utility scripts 
├── test/                   # Smart contract tests 
├── server.js               # Backend server (Node.js/Express) 
├── hardhat.config.js       # Hardhat configuration 
├── package.json            # Dependencies and scripts 
└── contract-address.json   # Deployed contract addresses
```

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js (>=16.x)
- npm or yarn
- Hardhat
- MetaMask (for interacting with the DApp)

### Steps
1. **Clone the repository**
   ```bash
   git clone https://github.com/DhananjiMadhushika/Blockchain-Based-Certificate-Verification-System.git
   cd Blockchain-Based-Certificate-Verification-System
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```
   
3. **Run local blockchain (Hardhat node)**
   ```bash
   npx hardhat node
   ```

4. **Deploy contracts**
   ```bash
   npx hardhat ignition deploy ./ignition/modules/Lock.js
   ```

5. **Start backend server**
   ```bash
   node server.js
   ```

6. **Open Frontend**

- Navigate to the `frontend/` directory.
- Open `index.html` in your browser.
- Connect MetaMask to the local blockchain.

---

## 🧪 Testing
Run smart contract tests:

```bash
npx hardhat test
```
---

## 📖 Usage
- Certificate Issuance: Authorized institutions can issue certificates via the frontend.
- Verification: Anyone can verify authenticity by entering the certificate ID, which queries the blockchain.
- Transparency: All issued certificates are immutable and publicly verifiable.

---
