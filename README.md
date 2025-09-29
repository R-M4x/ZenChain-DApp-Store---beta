# Zenchain store beta

# 🛒 ZenChain DApp Store - beta
Web3 Dapp that can be used for NFT marketplace or any digital or phyisical products.

### **Setup guide**

### **1. Local Development**
```bash
# Clone and setup
git clone <your-repo>
cd zenchain-dapp-store-final

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your private key

# Get test tokens
# Visit: https://faucet.zenchain.io

# Compile and deploy
npm run compile
npm run deploy

# Start local server
npm run serve
```

### **2. Smart Contract Deployment**
```bash
# Deploy with all categories
npm run deploy

```
zenchain-dapp-store-final/
├── index.html               
├── style.css                
├── app.js                  
├── contracts/
│   └── ZenChainStore.sol   # Smart contract with categories
├── scripts/
│   └── deploy.js           
├── package.json            
└── README.md               
```

