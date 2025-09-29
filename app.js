console.log('🚀 ZenChain Store');

// DApp State Management
const appState = {
    wallet: {
        connected: false,
        address: null,
        balance: '0',
        provider: null,
        signer: null,
        chainId: null
    },
    contract: {
        instance: null,
        address: '0xBc3A065e47499227A1596CC64c7f417536654a82', // YOUR DEPLOYED CONTRACT
        isOwner: false
    },
    cart: JSON.parse(localStorage.getItem('zenchain_cart') || '[]'),
    products: [],
    store: {
        currentCategory: 'all',
        searchTerm: '',
        sortFilter: '',
        cartOpen: false
    },
    isLoading: false
};

// ZenChain Network Configuration
const ZENCHAIN_CONFIG = {
    chainId: 8408, // 0x20D8
    chainIdHex: '0x20D8',
    chainName: 'ZenChain Testnet',
    nativeCurrency: {
        name: 'ZenChain Token',
        symbol: 'ZTC',
        decimals: 18
    },
    rpcUrls: ['https://zenchain-testnet.api.onfinality.io/public'],
    blockExplorerUrls: ['https://zentrace.io'],
    websocketUrl: 'wss://zenchain-testnet.api.onfinality.io/public-ws'
};

// Smart Contract Configuration  
const CONTRACT_CONFIG = {
    address: '0xBc3A065e47499227A1596CC64c7f417536654a82',
    abi: [
        "function addProduct(string memory _name, uint256 _price, uint256 _stock, string memory _category, string memory _metadataURI) external",
        "function updateProduct(uint256 _productId, string memory _name, uint256 _price, uint256 _stock, string memory _metadataURI) external",
        "function updateStock(uint256 _productId, uint256 _newStock) external",
        "function deactivateProduct(uint256 _productId) external",
        "function purchaseWithZTC(uint256 _productId, uint256 _quantity) external payable",
        "function getProduct(uint256 _productId) external view returns (tuple(uint256 id, string name, uint256 price, uint256 stock, bool active, string category, string metadataURI))",
        "function getActiveProducts() external view returns (tuple(uint256 id, string name, uint256 price, uint256 stock, bool active, string category, string metadataURI)[])",
        "function getUserPurchases(address _user) external view returns (uint256[])",
        "function owner() external view returns (address)",
        "event ProductPurchased(uint256 indexed purchaseId, uint256 indexed productId, address indexed buyer, uint256 quantity, uint256 totalPrice)",
        "event ProductAdded(uint256 indexed productId, string name, uint256 price)",
        "event StockUpdated(uint256 indexed productId, uint256 newStock)"
    ]
};


const PUBLIC_PROVIDER = new ethers.JsonRpcProvider(ZENCHAIN_CONFIG.rpcUrls[0]);
const publicContract = new ethers.Contract(CONTRACT_CONFIG.address, CONTRACT_CONFIG.abi, PUBLIC_PROVIDER);

//  Notification System
class NotificationSystem {
    constructor() {
        this.container = this.createContainer();
        this.notifications = [];
        this.maxNotifications = 3;
    }

    createContainer() {
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'notification-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
        return container;
    }

    show(message, type = 'info', duration = 4000) {
        console.log(`📢 ${type.toUpperCase()}: ${message}`);

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            background: ${this.getColor(type)};
            color: white;
            padding: 1rem 1.5rem;
            margin-bottom: 0.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            max-width: 350px;
            opacity: 0;
            transform: translateX(400px);
            transition: all 0.3s ease;
            pointer-events: auto;
            font-weight: 500;
        `;

        const icon = this.getIcon(type);
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span>${icon}</span>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; margin-left: auto; font-size: 1.2rem;">×</button>
            </div>
        `;

        this.container.appendChild(notification);
        this.notifications.push(notification);

        // Show animation
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Auto-hide
        if (duration > 0) {
            setTimeout(() => {
                if (notification && notification.parentNode) {
                    notification.style.opacity = '0';
                    notification.style.transform = 'translateX(400px)';
                    setTimeout(() => {
                        if (notification && notification.parentNode) {
                            notification.parentNode.removeChild(notification);
                            this.notifications = this.notifications.filter(n => n !== notification);
                        }
                    }, 300);
                }
            }, duration);
        }
    }

    getIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    getColor(type) {
        const colors = {
            success: '#2ed573',
            error: '#ff4757',
            warning: '#ffa502',
            info: '#70a1ff'
        };
        return colors[type] || colors.info;
    }
}

const notifications = new NotificationSystem();

// Auto-refresh with balance update
let autoRefreshInterval;

function startAutoRefresh() {
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);

    console.log('🔄 Starting auto-refresh...');
    autoRefreshInterval = setInterval(async () => {
        if (appState.wallet.connected && appState.contract.instance) {
            try {
                // Refresh balance every interval
                await updateWalletBalance();
                updateWalletDisplay();

                const oldCount = appState.products.length;
                await loadProductsFromContract();
                const newCount = appState.products.length;

                if (newCount !== oldCount && newCount > 0) {
                    notifications.show(`🔄 Store updated! ${newCount} products`, 'info', 2000);
                }
            } catch (error) {
                console.log('Auto-refresh error:', error.message);
            }
        }
    }, 8000); // Every 8 seconds
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// Manual refresh button
function addRefreshButton() {
    const header = document.querySelector('.header-actions');
    if (header && !document.getElementById('refresh-products-btn')) {
        const refreshBtn = document.createElement('button');
        refreshBtn.id = 'refresh-products-btn';
        refreshBtn.className = 'refresh-btn';
        refreshBtn.innerHTML = '🔄 Refresh';

        refreshBtn.onclick = async () => {
            const originalText = refreshBtn.innerHTML;
            refreshBtn.innerHTML = '🔄 Refreshing...';
            refreshBtn.disabled = true;

            try {
                await loadProductsFromContract();
                notifications.show('✅ Products refreshed!', 'success', 2000);
            } catch (error) {
                notifications.show('❌ Refresh failed: ' + error.message, 'error');
            }

            refreshBtn.innerHTML = originalText;
            refreshBtn.disabled = false;
        };

        header.appendChild(refreshBtn);
        console.log('✅ Added manual refresh button');
    }
}

// Event listeners
function setupEventListeners() {
    if (!appState.contract.instance) return;

    console.log('🎧 Setting up event listeners...');

    appState.contract.instance.on("ProductAdded", async (productId, name, price) => {
        console.log('🆕 NEW PRODUCT:', {
            productId: productId.toString(),
            name,
            price: ethers.formatEther(price) + ' ZTC'
        });

        notifications.show(`🆕 New: ${name}`, 'info', 3000);
        setTimeout(() => loadProductsFromContract(), 2000);
    });

    appState.contract.instance.on("StockUpdated", async (productId, newStock) => {
        console.log('📦 STOCK UPDATE:', { productId: productId.toString(), newStock: newStock.toString() });
        setTimeout(() => loadProductsFromContract(), 1500);
    });

    appState.contract.instance.on("ProductPurchased", async (purchaseId, productId, buyer, quantity, totalPrice) => {
        console.log('🛒 PURCHASE:', {
            purchaseId: purchaseId.toString(),
            productId: productId.toString(),
            buyer: buyer.substring(0, 8) + '...',
            quantity: quantity.toString(),
            totalPrice: ethers.formatEther(totalPrice) + ' ZTC'
        });

        // Force balance refresh after purchase
        setTimeout(async () => {
            await updateWalletBalance();
            updateWalletDisplay();
            await loadProductsFromContract();
        }, 2000);
    });
}

// Load products
async function loadProductsFromContract() {
    console.log('🔍 Loading products...');

    if (!appState.contract.instance) {
        console.log('❌ Contract not initialized');
        appState.products = [];
        renderProducts();
        return;
    }

    try {
        const contractProducts = await appState.contract.instance.getActiveProducts();
        console.log('📦 Found', contractProducts.length, 'products');

        if (contractProducts.length === 0) {
            appState.products = [];
            renderProducts();
            return;
        }

        appState.products = contractProducts.map((product) => ({
            id: Number(product.id),
            name: product.name,
            price: ethers.formatEther(product.price),
            priceWei: product.price,
            stock: Number(product.stock),
            active: product.active,
            category: product.category,
            description: extractDescriptionFromMetadata(product.metadataURI),
            image: extractImageFromMetadata(product.metadataURI),
            type: product.category === 'digital' ? 'digital' : 'physical',
            delivery: extractDeliveryFromMetadata(product.metadataURI),
            badge: extractBadgeFromMetadata(product.metadataURI),
            popularity: 50 + Math.random() * 50
        }));

        console.log(`✅ Loaded ${appState.products.length} products`);
        renderProducts();

    } catch (error) {
        console.error('❌ Error loading products:', error);
        appState.products = [];
        renderProducts();
        notifications.show('Failed to load products', 'error');
    }
}

// Metadata extraction
function extractImageFromMetadata(metadataURI) {
    if (!metadataURI) return '🎁';

    try {
        if (metadataURI.startsWith('{') && metadataURI.endsWith('}')) {
            const metadata = JSON.parse(metadataURI);
            if (metadata.image) {
                if (metadata.image.startsWith('ipfs://')) {
                    return `https://ipfs.io/ipfs/${metadata.image.replace('ipfs://', '')}`;
                }
                return metadata.image;
            }
        }

        if (metadataURI.startsWith('ipfs://')) {
            return `https://ipfs.io/ipfs/${metadataURI.replace('ipfs://', '')}`;
        }

        if (metadataURI.startsWith('http')) {
            return metadataURI;
        }

        if (metadataURI.length <= 10) {
            return metadataURI;
        }

        return '🎁';
    } catch (error) {
        return '🎁';
    }
}

function extractDescriptionFromMetadata(metadataURI) {
    if (!metadataURI) return 'No description available';

    try {
        if (metadataURI.startsWith('{') && metadataURI.endsWith('}')) {
            const metadata = JSON.parse(metadataURI);
            return metadata.description || 'No description available';
        }
        return metadataURI.length > 100 ? metadataURI.substring(0, 100) + '...' : metadataURI;
    } catch (error) {
        return 'No description available';
    }
}

function extractDeliveryFromMetadata(metadataURI) {
    try {
        if (metadataURI && metadataURI.startsWith('{')) {
            const metadata = JSON.parse(metadataURI);
            return metadata.delivery || 'Standard';
        }
        return 'Standard';
    } catch (error) {
        return 'Standard';
    }
}

function extractBadgeFromMetadata(metadataURI) {
    try {
        if (metadataURI && metadataURI.startsWith('{')) {
            const metadata = JSON.parse(metadataURI);
            return metadata.badge || '';
        }
        return '';
    } catch (error) {
        return '';
    }
}

// Wallet connection
async function connectWallet() {
    console.log('🔗 Connecting wallet...');

    if (!window.ethereum) {
        notifications.show('MetaMask not detected', 'error');
        return false;
    }

    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

        if (accounts.length === 0) {
            notifications.show('No accounts found', 'error');
            return false;
        }

        appState.wallet.provider = new ethers.BrowserProvider(window.ethereum);
        appState.wallet.signer = await appState.wallet.provider.getSigner();
        appState.wallet.address = accounts[0];
        appState.wallet.connected = true;

        const network = await appState.wallet.provider.getNetwork();
        appState.wallet.chainId = Number(network.chainId);

        console.log('✅ Wallet connected:', appState.wallet.address);

        if (appState.wallet.chainId !== ZENCHAIN_CONFIG.chainId) {
            notifications.show('Switching to ZenChain...', 'warning');
            await switchToZenChain();
        }

        //balance updates immediately
        await updateWalletBalance();
        await initializeContract();
        updateWalletDisplay();

        setupEventListeners();
        startAutoRefresh();
        addRefreshButton();

        localStorage.setItem('zenchain_wallet_connected', 'true');
        notifications.show(`✅ Connected: ${appState.wallet.address.substring(0, 8)}...`, 'success');

        await loadProductsFromContract();

        return true;

    } catch (error) {
        console.error('❌ Wallet connection failed:', error);
        notifications.show(`Connection failed: ${error.message}`, 'error');
        return false;
    }
}

async function switchToZenChain() {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: ZENCHAIN_CONFIG.chainIdHex }],
        });
    } catch (switchError) {
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [ZENCHAIN_CONFIG],
                });
            } catch (addError) {
                console.error('Failed to add ZenChain:', addError);
                notifications.show('Failed to add ZenChain network', 'error');
            }
        }
    }
}

//balance update with forced refresh
async function updateWalletBalance() {
    if (!appState.wallet.provider || !appState.wallet.address) {
        console.log('⚠️ Cannot update balance - wallet not connected');
        return;
    }

    try {
        console.log('💰 Updating wallet balance...');
        const balance = await appState.wallet.provider.getBalance(appState.wallet.address);
        const newBalance = ethers.formatEther(balance);

        if (newBalance !== appState.wallet.balance) {
            console.log(`💰 Balance changed: ${appState.wallet.balance} → ${newBalance} ZTC`);
            appState.wallet.balance = newBalance;

            // Force UI update
            updateWalletDisplay();
        }

    } catch (error) {
        console.error('❌ Error updating balance:', error);
    }
}

async function initializeContract() {
    if (!appState.wallet.signer || !CONTRACT_CONFIG.address) return;

    try {
        appState.contract.instance = new ethers.Contract(
            CONTRACT_CONFIG.address,
            CONTRACT_CONFIG.abi,
            appState.wallet.signer
        );
        appState.contract.address = CONTRACT_CONFIG.address;

        console.log('✅ Contract initialized');

        try {
            const owner = await appState.contract.instance.owner();
            appState.contract.isOwner = owner.toLowerCase() === appState.wallet.address.toLowerCase();
        } catch (error) {
            console.log('Could not check ownership');
        }

    } catch (error) {
        console.error('Contract initialization failed:', error);
        notifications.show('Failed to initialize contract', 'error');
    }
}

// Product rendering
function renderProducts() {
    const container = document.getElementById('products-container');
    if (!container) return;

    let filteredProducts = applyFilters([...appState.products]);

    if (filteredProducts.length === 0) {
        const message = !appState.wallet.connected
            ? 'Connect your wallet to see products'
            : 'No products found';

        container.innerHTML = `
            <div class="no-products">
                <div class="no-products-icon">${!appState.wallet.connected ? '🔗' : '🛍️'}</div>
                <h3>${message}</h3>
                <p>${!appState.wallet.connected
                ? 'All products are loaded from blockchain. Connect MetaMask to browse and purchase.'
                : 'No products match your filters or none have been added yet.'}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredProducts.map(product => {
        const isImageUrl = product.image.startsWith('http') || product.image.startsWith('data:');

        return `
            <div class="product-card" data-category="${product.category}">
                <div class="product-header">
                    <div class="product-image" ${!isImageUrl ? `style="font-size: 4rem;"` : ''}>
                        ${isImageUrl
                ? `<img src="${product.image}" alt="${product.name}" onerror="this.parentElement.innerHTML='🎁'; this.parentElement.style.fontSize='4rem';">`
                : product.image
            }
                    </div>
                    ${product.badge ? `<span class="product-badge">${product.badge}</span>` : ''}
                    ${product.stock === 0 ? '<span class="sold-out-badge">SOLD OUT</span>' : ''}
                    ${product.stock <= 5 && product.stock > 0 ? '<span class="low-stock-badge">LOW STOCK</span>' : ''}
                </div>
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-description">${product.description}</p>
                    <div class="product-details">
                        <div class="product-meta">
                            <span class="product-type">${product.type}</span>
                            <span class="product-delivery">${product.delivery}</span>
                        </div>
                        <div class="product-stock">Stock: ${product.stock}</div>
                    </div>
                </div>
                <div class="product-footer">
                    <div class="product-price">
                        <div class="price-amount">${parseFloat(product.price).toFixed(2)}</div>
                        <div class="price-currency">ZTC</div>
                    </div>
                    <button class="add-to-cart-btn" onclick="addToCart(${product.id})" ${product.stock === 0 ? 'disabled' : ''}>
                        ${product.stock === 0 ? 'Sold Out' : 'Add to Cart'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function applyFilters(products) {
    let filtered = products;

    if (appState.store.currentCategory !== 'all') {
        filtered = filtered.filter(product => {
            if (appState.store.currentCategory === 'digital') {
                return ['digital', 'gift-card', 'nft'].includes(product.category);
            }
            if (appState.store.currentCategory === 'physical') {
                return ['gaming', 'apparel', 'accessories'].includes(product.category);
            }
            return product.category === appState.store.currentCategory;
        });
    }

    if (appState.store.searchTerm) {
        const term = appState.store.searchTerm.toLowerCase();
        filtered = filtered.filter(product =>
            product.name.toLowerCase().includes(term) ||
            product.description.toLowerCase().includes(term) ||
            product.category.toLowerCase().includes(term)
        );
    }

    switch (appState.store.sortFilter) {
        case 'price-low':
            filtered.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
            break;
        case 'price-high':
            filtered.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
            break;
        case 'name':
            filtered.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'popular':
            filtered.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
            break;
    }

    return filtered;
}

// Enhanced add to cart with immediate visual feedback
function addToCart(productId) {
    console.log("🛒 Adding to cart:", productId);

    if (!appState.wallet.connected) {
        notifications.show('Please connect your wallet first', 'warning');
        return;
    }

    const product = appState.products.find(p => p.id === productId);
    if (!product) {
        notifications.show('Product not found', 'error');
        return;
    }

    if (product.stock === 0) {
        notifications.show('Product is out of stock', 'error');
        return;
    }

    const existingItem = appState.cart.find(item => item.productId === productId);
    if (existingItem) {
        if (existingItem.quantity >= product.stock) {
            notifications.show('Cannot add more - insufficient stock', 'warning');
            return;
        }
        existingItem.quantity += 1;
    } else {
        appState.cart.push({
            productId: productId,
            name: product.name,
            price: product.price,
            priceWei: product.priceWei,
            quantity: 1,
            image: product.image
        });
    }

    // Immediate UI update with visual feedback
    localStorage.setItem('zenchain_cart', JSON.stringify(appState.cart));
    updateCartDisplay();
    updateCartCounter();

    // Show immediate success feedback
    notifications.show(`✅ ${product.name} added to cart!`, 'success', 2000);

    //highlight the cart button
    const cartBtn = document.getElementById('cart-toggle');
    if (cartBtn) {
        cartBtn.style.transform = 'scale(1.1)';
        cartBtn.style.backgroundColor = 'var(--primary-green)';
        setTimeout(() => {
            cartBtn.style.transform = '';
            cartBtn.style.backgroundColor = '';
        }, 300);
    }

    console.log('✅ Cart updated:', appState.cart.length, 'items');
}

async function purchaseProduct(productId, quantity = 1) {
    if (!appState.wallet.connected || !appState.contract.instance) {
        notifications.show('Please connect your wallet first', 'error');
        return false;
    }

    const product = appState.products.find(p => p.id === productId);
    if (!product) {
        notifications.show('Product not found', 'error');
        return false;
    }

    try {
        const totalPriceWei = BigInt(product.priceWei) * BigInt(quantity);

        console.log('💰 PURCHASE:', {
            product: product.name,
            quantity,
            priceZTC: product.price,
            totalZTC: ethers.formatEther(totalPriceWei),
            totalWei: totalPriceWei.toString()
        });

        notifications.show(`Processing purchase of ${product.name}...`, 'info', 0);

        const tx = await appState.contract.instance.purchaseWithZTC(productId, quantity, {
            value: totalPriceWei,
            gasLimit: 300000
        });

        notifications.show('Transaction submitted. Awaiting confirmation...', 'info', 0);
        console.log('📝 TX:', tx.hash);

        const receipt = await tx.wait();
        console.log('✅ Transaction confirmed');

        // Remove from cart
        appState.cart = appState.cart.filter(item => item.productId !== productId);
        localStorage.setItem('zenchain_cart', JSON.stringify(appState.cart));

        // Force balance and UI update after purchase
        await updateWalletBalance();
        updateWalletDisplay();
        updateCartDisplay();
        updateCartCounter();

        // Refresh products
        setTimeout(() => loadProductsFromContract(), 2000);

        notifications.show(`✅ Successfully purchased ${product.name}!`, 'success');
        return true;

    } catch (error) {
        console.error('❌ Purchase failed:', error);

        let errorMessage = 'Purchase failed';
        if (error.code === 'INSUFFICIENT_FUNDS') {
            errorMessage = 'Insufficient ZTC in wallet';
        } else if (error.message.includes('execution reverted')) {
            errorMessage = 'Transaction failed - check stock';
        } else if (error.message.includes('user rejected')) {
            errorMessage = 'Transaction cancelled';
        }

        notifications.show(errorMessage, 'error');
        return false;
    }
}

async function checkoutCart() {
    if (!appState.cart.length) {
        notifications.show('Cart is empty', 'warning');
        return;
    }

    if (!appState.wallet.connected) {
        notifications.show('Please connect your wallet first', 'error');
        return;
    }

    const checkoutBtn = document.getElementById('checkout-btn');
    const originalText = checkoutBtn.innerHTML;
    checkoutBtn.innerHTML = 'Processing...';
    checkoutBtn.disabled = true;

    try {
        for (const item of appState.cart) {
            const success = await purchaseProduct(item.productId, item.quantity);
            if (!success) {
                notifications.show(`Failed to purchase ${item.name}`, 'error');
                checkoutBtn.innerHTML = originalText;
                checkoutBtn.disabled = false;
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        notifications.show('🎉 All items purchased successfully!', 'success');

        setTimeout(() => {
            toggleCart();
        }, 2000);

    } catch (error) {
        console.error('Checkout error:', error);
        notifications.show('Checkout failed', 'error');
    }

    checkoutBtn.innerHTML = originalText;
    checkoutBtn.disabled = false;
}

function removeFromCart(productId) {
    appState.cart = appState.cart.filter(item => item.productId !== productId);
    localStorage.setItem('zenchain_cart', JSON.stringify(appState.cart));
    updateCartDisplay();
    updateCartCounter();
    notifications.show('Item removed from cart', 'info', 2000);
}

function updateCartQuantity(productId, newQuantity) {
    const item = appState.cart.find(item => item.productId === productId);
    if (!item) return;

    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }

    const product = appState.products.find(p => p.id === productId);
    if (product && newQuantity > product.stock) {
        notifications.show('Insufficient stock available', 'warning');
        return;
    }

    item.quantity = newQuantity;
    localStorage.setItem('zenchain_cart', JSON.stringify(appState.cart));
    updateCartDisplay();
    updateCartCounter();
}

// Enhanced event listeners with better cart handling
function initializeEventListeners() {
    console.log("🎛️ Setting up event listeners...");

    // Wallet connection
    const connectBtn = document.getElementById('connect-wallet-btn');
    if (connectBtn) {
        connectBtn.addEventListener('click', connectWallet);
    }

    // Category filters
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            appState.store.currentCategory = e.target.dataset.category;
            renderProducts();
        });
    });

    // Search
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            appState.store.searchTerm = e.target.value;
            renderProducts();
        });
    }

    // Sort
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            appState.store.sortFilter = e.target.value;
            renderProducts();
        });
    }

    // Enhanced cart toggle with proper state management
    const cartToggle = document.getElementById('cart-toggle');
    if (cartToggle) {
        cartToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🛒 Cart toggle clicked');
            toggleCart();
        });
    }

    // Enhanced cart close
    const cartClose = document.getElementById('cart-close');
    if (cartClose) {
        cartClose.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('❌ Cart close clicked');
            toggleCart();
        });
    }

    // Checkout
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', checkoutCart);
    }

    // Click outside cart to close
    document.addEventListener('click', (e) => {
        const cartSidebar = document.getElementById('cart-sidebar');
        const cartToggle = document.getElementById('cart-toggle');

        if (appState.store.cartOpen && cartSidebar && !cartSidebar.contains(e.target) && !cartToggle.contains(e.target)) {
            toggleCart();
        }
    });

    console.log("✅ Event listeners initialized");
}

// Enhanced wallet display with force update
function updateWalletDisplay() {
    const connectBtn = document.getElementById('connect-wallet-btn');
    const walletInfo = document.getElementById('wallet-info');
    const walletAddress = document.getElementById('wallet-address');
    const walletBalance = document.getElementById('wallet-balance');

    console.log('🔄 Updating wallet display...', {
        connected: appState.wallet.connected,
        address: appState.wallet.address,
        balance: appState.wallet.balance
    });

    if (appState.wallet.connected && appState.wallet.address) {
        if (connectBtn) connectBtn.style.display = 'none';
        if (walletInfo) {
            walletInfo.style.display = 'flex';
            if (walletAddress) {
                walletAddress.textContent = `${appState.wallet.address.substring(0, 6)}...${appState.wallet.address.substring(38)}`;
            }
            if (walletBalance) {
                const balanceText = `${parseFloat(appState.wallet.balance).toFixed(4)} ZTC`;
                walletBalance.textContent = balanceText;
                console.log('💰 Balance display updated:', balanceText);
            }
        }
    } else {
        if (connectBtn) connectBtn.style.display = 'flex';
        if (walletInfo) walletInfo.style.display = 'none';
    }
}

// Enhanced cart display with better error handling
function updateCartDisplay() {
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');

    console.log('🛒 Updating cart display...', appState.cart.length, 'items');

    if (!cartItems) {
        console.warn('Cart items element not found');
        return;
    }

    if (appState.cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <div class="empty-cart-icon">🛒</div>
                <div>Your cart is empty</div>
                <small>Add products to get started!</small>
            </div>
        `;
        if (cartTotal) cartTotal.textContent = '0.00 ZTC';
        return;
    }

    let total = 0;
    cartItems.innerHTML = appState.cart.map(item => {
        const itemTotal = parseFloat(item.price) * item.quantity;
        total += itemTotal;

        const isImageUrl = item.image && (item.image.startsWith('http') || item.image.startsWith('data:'));

        return `
            <div class="cart-item">
                <div class="cart-item-image">
                    ${isImageUrl
                ? `<img src="${item.image}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px;" onerror="this.parentElement.innerHTML='🎁';">`
                : (item.image || '🎁')
            }
                </div>
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${parseFloat(item.price).toFixed(2)} ZTC</div>
                </div>
                <div class="cart-item-quantity">
                    <button onclick="updateCartQuantity(${item.productId}, ${item.quantity - 1})" type="button">−</button>
                    <span>${item.quantity}</span>
                    <button onclick="updateCartQuantity(${item.productId}, ${item.quantity + 1})" type="button">+</button>
                </div>
                <div class="cart-item-total">${itemTotal.toFixed(2)} ZTC</div>
                <button class="remove-item" onclick="removeFromCart(${item.productId})" type="button">×</button>
            </div>
        `;
    }).join('');

    if (cartTotal) {
        cartTotal.textContent = `${total.toFixed(2)} ZTC`;
    }

    console.log('✅ Cart display updated');
}

function updateCartCounter() {
    const counter = document.getElementById('cart-counter');
    if (counter) {
        const totalItems = appState.cart.reduce((sum, item) => sum + item.quantity, 0);
        counter.textContent = totalItems;
        counter.style.display = totalItems > 0 ? 'block' : 'none';
        console.log('🔢 Cart counter updated:', totalItems);
    }
}

// Enhanced cart toggle with debugging
function toggleCart() {
    const wasOpen = appState.store.cartOpen;
    appState.store.cartOpen = !appState.store.cartOpen;

    console.log(`🛒 Cart toggle: ${wasOpen} → ${appState.store.cartOpen}`);

    const cartSidebar = document.getElementById('cart-sidebar');
    if (!cartSidebar) {
        console.error('❌ Cart sidebar element not found!');
        return;
    }

    if (appState.store.cartOpen) {
        cartSidebar.classList.add('open');
        document.body.style.overflow = 'hidden';
        console.log('✅ Cart opened');

        // Force cart update when opening
        updateCartDisplay();
    } else {
        cartSidebar.classList.remove('open');
        document.body.style.overflow = '';
        console.log('✅ Cart closed');
    }
}

// Initialize App
document.addEventListener('DOMContentLoaded', async function () {
    console.log('🚀 ZenChain Store - Complete Version Loading...');

    if (typeof ethers === 'undefined') {
        console.error('❌ Ethers.js not loaded');
        notifications.show('Web3 library failed to load', 'error');
        return;
    }

    // Initialize UI
    initializeEventListeners();
    updateWalletDisplay();
    updateCartDisplay();
    updateCartCounter();

    // Load initial products
    renderProducts();

    // Auto-connect if previously connected
    const wasConnected = localStorage.getItem('zenchain_wallet_connected');
    if (wasConnected && window.ethereum) {
        console.log('🔄 Auto-connecting wallet...');
        setTimeout(connectWallet, 1500);
    }

    console.log('✅ Store initialized successfully');

    setTimeout(() => {
        if (!appState.wallet.connected) {
            notifications.show('👋 Connect wallet to browse products', 'info', 4000);
        }
    }, 3000);
});

// Cleanup
window.addEventListener('beforeunload', () => {
    stopAutoRefresh();
    document.body.style.overflow = '';
});

// Global functions
window.addToCart = addToCart;
window.purchaseProduct = purchaseProduct;
window.checkoutCart = checkoutCart;
window.removeFromCart = removeFromCart;
window.updateCartQuantity = updateCartQuantity;
window.toggleCart = toggleCart;
window.connectWallet = connectWallet;

console.log('✅ ZenChain Store loaded with:');
console.log('   🔧 Fixed price conversion (12 ZTC = exactly 12 ZTC)');
console.log('   🛒 Complete cart & checkout system');
console.log('   🖼️ IPFS image support');
console.log('   🔄 Real-time synchronization');
console.log('   📱 Mobile responsive design');
console.log('   🎨 Enhanced notifications');
console.log('Ready for production use!');
