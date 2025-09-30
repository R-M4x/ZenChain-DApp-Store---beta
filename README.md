# 🛒 ZenChain DApp Store - beta
Web3 Dapp that can be used for NFT marketplace or any digital or phyisical products.

### **Setup guide**

```bash
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

### **Folder arrangement** ###
```
zenchain-dapp-store/
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
Owner: R_lvl4x = _x._y._z
