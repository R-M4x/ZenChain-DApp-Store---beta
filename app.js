console.log('🚀 ZenChain DApp Store Loading...');

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
    products: [], // Will be loaded from smart contract
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
    chainId: 8408, // 0x20D8 in decimal
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
    address: '0xBc3A065e47499227A1596CC64c7f417536654a82', // YOUR DEPLOYED CONTRACT
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

// Notification System
class NotificationSystem {
    constructor() {
        this.container = this.createContainer();
        this.notifications = [];
        this.maxNotifications = 5;
    }

    createContainer() {
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
        return container;
    }

    show(message, type = 'success', duration = 4000) {
        if (this.notifications.length >= this.maxNotifications) {
            const oldestNotification = this.notifications[0];
            this.hide(oldestNotification);
        }

        const notification = this.createNotification(message, type);
        this.container.appendChild(notification);
        this.notifications.push(notification);

        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        const timeoutId = setTimeout(() => this.hide(notification), duration);
        notification.timeoutId = timeoutId;

        return notification;
    }

    createNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;

        const icon = this.getIcon(type);
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${icon}</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="notifications.hide(this.parentNode.parentNode)">&times;</button>
            </div>
        `;

        return notification;
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

    hide(notification) {
        if (notification && notification.parentNode) {
            notification.classList.remove('show');
            notification.classList.add('hide');

            if (notification.timeoutId) {
                clearTimeout(notification.timeoutId);
            }

            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }

                const index = this.notifications.indexOf(notification);
                if (index > -1) {
                    this.notifications.splice(index, 1);
                }
            }, 300);
        }
    }

    clear() {
        this.notifications.forEach(notification => this.hide(notification));
    }
}

const notifications = new NotificationSystem();

// Fallback Products - THESE SHOULD ALWAYS LOAD
function loadFallbackProducts() {
    console.log('Loading fallback products...');

    appState.products = [
        // Gift Cards
        {
            id: 1,
            name: 'ZenChain Gift Card - 10 ZTC',
            price: '10',
            category: 'digital',
            image: '💳',
            description: 'Digital gift card worth 10 ZTC tokens',
            type: 'digital',
            delivery: 'Instant',
            stock: 100,
            badge: 'Popular',
            popularity: 95
        },
        {
            id: 2,
            name: 'ZenChain Gift Card - 25 ZTC',
            price: '25',
            category: 'digital',
            image: '💎',
            description: 'Premium gift card worth 25 ZTC tokens',
            type: 'digital',
            delivery: 'Instant',
            stock: 50,
            badge: 'Best Value',
            popularity: 90
        },
        {
            id: 3,
            name: 'Amazon Gift Card - $25',
            price: '30',
            category: 'digital',
            image: '🎁',
            description: 'Digital Amazon gift card worth $25 USD',
            type: 'digital',
            delivery: 'Instant',
            stock: 25,
            popularity: 85
        },
        {
            id: 4,
            name: 'Steam Gift Card - $20',
            price: '24',
            category: 'digital',
            image: '🎮',
            description: 'Steam platform gift card for gaming purchases',
            type: 'digital',
            delivery: 'Instant',
            stock: 40,
            popularity: 80
        },

        // NFTs
        {
            id: 5,
            name: 'ZenChain Genesis NFT',
            price: '50',
            category: 'nft',
            image: '🖼️',
            description: 'Exclusive genesis collection NFT with unique artwork',
            type: 'digital',
            delivery: 'Instant',
            stock: 10,
            badge: 'Limited Edition',
            popularity: 98
        },
        {
            id: 6,
            name: 'Crypto Punk Style Avatar',
            price: '35',
            category: 'nft',
            image: '👤',
            description: 'Pixel art avatar NFT for your digital identity',
            type: 'digital',
            delivery: 'Instant',
            stock: 25,
            popularity: 75
        },

        // Gaming
        {
            id: 7,
            name: 'Gaming Mouse RGB Pro',
            price: '45',
            category: 'gaming',
            image: '🖱️',
            description: 'High-precision gaming mouse with RGB lighting',
            type: 'physical',
            delivery: '3-5 days',
            stock: 15,
            popularity: 85
        },
        {
            id: 8,
            name: 'Mechanical Keyboard',
            price: '85',
            category: 'gaming',
            image: '⌨️',
            description: 'RGB mechanical keyboard with cherry switches',
            type: 'physical',
            delivery: '3-5 days',
            stock: 12,
            badge: 'Pro Gaming',
            popularity: 90
        },

        // Apparel
        {
            id: 9,
            name: 'ZenChain Premium Hoodie',
            price: '45',
            category: 'apparel',
            image: '👕',
            description: 'Premium quality hoodie with ZenChain branding',
            type: 'physical',
            delivery: '3-5 days',
            stock: 30,
            popularity: 82
        },
        {
            id: 10,
            name: 'Crypto T-Shirt Collection',
            price: '25',
            category: 'apparel',
            image: '👔',
            description: 'Stylish t-shirt with blockchain-themed designs',
            type: 'physical',
            delivery: '3-5 days',
            stock: 50,
            popularity: 75
        },

        // Accessories
        {
            id: 11,
            name: 'Hardware Wallet',
            price: '120',
            category: 'accessories',
            image: '🔐',
            description: 'Secure hardware wallet for crypto storage',
            type: 'physical',
            delivery: '3-5 days',
            stock: 8,
            badge: 'Security',
            popularity: 95
        },
        {
            id: 12,
            name: 'ZenChain Coffee Mug',
            price: '15',
            category: 'accessories',
            image: '☕',
            description: 'High-quality ceramic mug with ZenChain logo',
            type: 'physical',
            delivery: '3-5 days',
            stock: 60,
            popularity: 65
        }
    ];

    console.log('Loaded', appState.products.length, 'fallback products');
    renderProducts();
}

// Product Display Functions
function renderProducts() {
    console.log('Rendering products...');

    const container = document.getElementById('products-container');
    if (!container) {
        console.error('Products container not found!');
        return;
    }

    let filteredProducts = applyFilters([...appState.products]);
    console.log('Filtered products:', filteredProducts.length);

    if (filteredProducts.length === 0) {
        container.innerHTML = '<div class="no-products">No products found matching your criteria.</div>';
        return;
    }

    container.innerHTML = filteredProducts.map(product => {
        const isEmoji = !product.image.includes('.') && !product.image.includes('/');
        const isOutOfStock = product.stock === 0;

        return `
        <div class="product-card" data-product-id="${product.id}">
            <div class="product-image-container">
                ${isEmoji ? 
                    `<span class="product-image emoji">${product.image}</span>` : 
                    `<img class="product-image" src="${product.image}" alt="${product.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                     <span class="product-image emoji" style="display:none">📦</span>`
                }
                ${product.badge ? `<div class="product-badge">${product.badge}</div>` : ''}
                ${isOutOfStock ? `<div class="product-badge" style="background: #ff4757;">Out of Stock</div>` : ''}
            </div>

            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <p class="product-description">${product.description}</p>

                <div class="product-price-row">
                    <span class="product-price">${product.price} ZTC</span>
                    <span class="delivery-badge">${product.delivery}</span>
                </div>

                <div class="product-stock">
                    Stock: ${product.stock} available
                </div>

                <div class="product-actions">
                    <button class="quick-add" 
                            onclick="addToCart(${product.id}, 1)" 
                            ${isOutOfStock ? 'disabled' : ''}>
                        ${isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                    <button class="wishlist-btn" onclick="toggleWishlist(${product.id})">
                        ${isInWishlist(product.id) ? '❤️' : '🤍'}
                    </button>
                </div>
            </div>
        </div>
        `;
    }).join('');

    console.log('Products rendered successfully');
}

function applyFilters(products) {
    let filtered = [...products];

    // Category filter
    if (appState.store.currentCategory !== 'all') {
        filtered = filtered.filter(product => {
            return product.category === appState.store.currentCategory;
        });
    }

    // Search filter
    if (appState.store.searchTerm) {
        const searchTerm = appState.store.searchTerm.toLowerCase();
        filtered = filtered.filter(product =>
            product.name.toLowerCase().includes(searchTerm) ||
            product.description.toLowerCase().includes(searchTerm) ||
            product.category.toLowerCase().includes(searchTerm)
        );
    }

    // Sort filter
    if (appState.store.sortFilter) {
        switch (appState.store.sortFilter) {
            case 'price-low':
                filtered.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
                break;
            case 'price-high':
                filtered.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
                break;
            case 'name-az':
                filtered.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'stock':
                filtered.sort((a, b) => b.stock - a.stock);
                break;
            case 'popularity':
                filtered.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
                break;
        }
    }

    return filtered;
}

// Cart Functions - FIXED
function addToCart(productId, quantity = 1) {
    console.log('Adding to cart:', productId, 'quantity:', quantity);

    const product = appState.products.find(p => p.id === productId);
    if (!product) {
        notifications.show('Product not found', 'error');
        return;
    }

    if (product.stock < quantity) {
        notifications.show('Not enough stock available', 'warning');
        return;
    }

    const existingItem = appState.cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity += quantity;
        console.log('Updated existing cart item:', existingItem);
    } else {
        const newItem = {
            id: productId,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: quantity,
            type: product.type,
            category: product.category
        };
        appState.cart.push(newItem);
        console.log('Added new cart item:', newItem);
    }

    saveCart();
    updateCartDisplay();
    updateCartCounter();

    notifications.show(`${product.name} added to cart`, 'success');
    console.log('Cart updated:', appState.cart);
}

function removeFromCart(productId) {
    console.log('Removing from cart:', productId);

    const itemIndex = appState.cart.findIndex(item => item.id === productId);
    if (itemIndex > -1) {
        const removedItem = appState.cart.splice(itemIndex, 1)[0];
        saveCart();
        updateCartDisplay();
        updateCartCounter();
        notifications.show(`${removedItem.name} removed from cart`, 'info');
        console.log('Item removed, cart updated:', appState.cart);
    }
}

function updateCartQuantity(productId, newQuantity) {
    console.log('Updating cart quantity:', productId, 'new quantity:', newQuantity);

    const item = appState.cart.find(item => item.id === productId);
    if (!item) return;

    if (newQuantity <= 0) {
        removeFromCart(productId);
    } else {
        const product = appState.products.find(p => p.id === productId);
        if (product && newQuantity > product.stock) {
            notifications.show('Not enough stock available', 'warning');
            return;
        }

        item.quantity = newQuantity;
        saveCart();
        updateCartDisplay();
        updateCartCounter();
        console.log('Quantity updated, cart:', appState.cart);
    }
}

function clearCart() {
    console.log('Clearing cart');

    if (appState.cart.length === 0) {
        notifications.show('Cart is already empty', 'info');
        return;
    }

    appState.cart = [];
    saveCart();
    updateCartDisplay();
    updateCartCounter();
    notifications.show('Cart cleared', 'info');
}

function saveCart() {
    localStorage.setItem('zenchain_cart', JSON.stringify(appState.cart));
    console.log('Cart saved to localStorage');
}

function updateCartDisplay() {
    console.log('Updating cart display, cart items:', appState.cart.length);

    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total-amount');

    if (!cartItems) {
        console.error('Cart items container not found!');
        return;
    }

    if (appState.cart.length === 0) {
        cartItems.innerHTML = '<div class="empty-cart">Your cart is empty<br><small>Add some products to get started!</small></div>';
        if (cartTotal) cartTotal.textContent = '0.00 ZTC';
        return;
    }

    cartItems.innerHTML = appState.cart.map(item => {
        const isEmoji = !item.image.includes('.') && !item.image.includes('/');

        return `
        <div class="cart-item">
            <div class="cart-item-image ${isEmoji ? 'emoji' : ''}">
                ${isEmoji ? item.image : `<img src="${item.image}" alt="${item.name}">`}
            </div>
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">${item.price} ZTC each</div>
                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="updateCartQuantity(${item.id}, ${item.quantity - 1})">-</button>
                    <span class="quantity-display">${item.quantity}</span>
                    <button class="quantity-btn" onclick="updateCartQuantity(${item.id}, ${item.quantity + 1})">+</button>
                    <button class="cart-item-remove" onclick="removeFromCart(${item.id})">×</button>
                </div>
            </div>
        </div>
        `;
    }).join('');

    const total = appState.cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
    if (cartTotal) {
        cartTotal.textContent = total.toFixed(2) + ' ZTC';
    }

    console.log('Cart display updated with', appState.cart.length, 'items, total:', total.toFixed(2));
}

function updateCartCounter() {
    const counter = document.getElementById('cart-counter');
    if (counter) {
        const totalItems = appState.cart.reduce((sum, item) => sum + item.quantity, 0);
        counter.textContent = totalItems;
        counter.style.display = totalItems > 0 ? 'inline-block' : 'none';
        console.log('Cart counter updated:', totalItems);
    }
}

function toggleCart(forceState = null) {
    console.log('Toggling cart, current state:', appState.store.cartOpen);

    const cartPanel = document.getElementById('cart-panel');
    const cartOverlay = document.getElementById('cart-overlay');

    if (!cartPanel) {
        console.error('Cart panel not found!');
        return;
    }

    if (forceState !== null) {
        appState.store.cartOpen = forceState;
    } else {
        appState.store.cartOpen = !appState.store.cartOpen;
    }

    if (appState.store.cartOpen) {
        cartPanel.classList.add('open');
        if (cartOverlay) cartOverlay.classList.add('open');
        updateCartDisplay(); // Refresh cart contents
        console.log('Cart opened');
    } else {
        cartPanel.classList.remove('open');
        if (cartOverlay) cartOverlay.classList.remove('open');
        console.log('Cart closed');
    }
}

// FIXED CHECKOUT FUNCTIONALITY
async function checkoutCart() {
    console.log('🛒 Starting checkout process...');

    if (appState.cart.length === 0) {
        notifications.show('Your cart is empty', 'warning');
        return;
    }

    const totalAmount = appState.cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
    console.log('💰 Total checkout amount:', totalAmount, 'ZTC');

    if (!appState.wallet.connected) {
        notifications.show('Please connect your wallet to checkout', 'warning');
        // Optionally auto-open wallet connection
        connectWallet();
        return;
    }

    // Check if user has sufficient balance
    const userBalance = parseFloat(appState.wallet.balance);
    if (userBalance < totalAmount) {
        notifications.show(`Insufficient balance. You need ${totalAmount.toFixed(2)} ZTC but have ${userBalance.toFixed(4)} ZTC`, 'error');
        return;
    }

    try {
        // Show loading
        setLoading(true);

        notifications.show(`Processing checkout for ${totalAmount.toFixed(2)} ZTC...`, 'info');

        let successfulPurchases = 0;
        let failedPurchases = 0;

        // Process each item in cart
        for (const item of appState.cart) {
            try {
                console.log(`🔄 Processing item: ${item.name} x${item.quantity}`);

                if (appState.contract.instance && appState.contract.address !== '0x0000000000000000000000000000000000000000') {
                    // Real blockchain purchase
                    const success = await purchaseProductOnChain(item.id, item.quantity);
                    if (success) {
                        successfulPurchases++;
                    } else {
                        failedPurchases++;
                    }
                } else {
                    // Demo mode purchase
                    console.log(`🎭 Demo purchase: ${item.name} for ${parseFloat(item.price) * item.quantity} ZTC`);

                    // Simulate processing time
                    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

                    // Simulate 90% success rate
                    if (Math.random() > 0.1) {
                        successfulPurchases++;
                        notifications.show(`✅ Demo Purchase: ${item.name}`, 'success', 2000);
                    } else {
                        failedPurchases++;
                        notifications.show(`❌ Demo Purchase Failed: ${item.name}`, 'error', 2000);
                    }
                }
            } catch (error) {
                console.error(`❌ Error purchasing ${item.name}:`, error);
                failedPurchases++;
            }
        }

        // Show results
        if (successfulPurchases > 0) {
            // Clear successfully purchased items
            if (failedPurchases === 0) {
                clearCart();
                toggleCart(false); // Close cart
            }

            notifications.show(
                `🎉 Successfully purchased ${successfulPurchases} item${successfulPurchases > 1 ? 's' : ''}!${failedPurchases > 0 ? ` (${failedPurchases} failed)` : ''}`, 
                'success', 
                5000
            );
        } else {
            notifications.show('❌ No items were purchased. Please try again.', 'error');
        }

        // Update wallet balance
        if (appState.wallet.connected) {
            await updateWalletBalance();
        }

    } catch (error) {
        console.error('❌ Checkout failed:', error);
        notifications.show('Checkout failed: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
}

async function purchaseProductOnChain(productId, quantity) {
    if (!appState.contract.instance) return false;

    try {
        // Find product
        const product = appState.products.find(p => p.id === productId);
        if (!product) return false;

        const totalPrice = ethers.parseEther((parseFloat(product.price) * quantity).toString());

        // Execute purchase
        const tx = await appState.contract.instance.purchaseWithZTC(productId, quantity, {
            value: totalPrice
        });

        console.log('📡 Transaction submitted:', tx.hash);

        // Wait for confirmation
        const receipt = await tx.wait();

        if (receipt.status === 1) {
            console.log('✅ Purchase successful:', receipt.hash);
            return true;
        } else {
            console.log('❌ Transaction failed');
            return false;
        }

    } catch (error) {
        console.error('❌ Blockchain purchase failed:', error);

        if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
            notifications.show('Transaction cancelled by user', 'warning');
        } else {
            notifications.show('Purchase failed: ' + (error.reason || error.message), 'error');
        }

        return false;
    }
}

// Category Functions
function setCategory(category) {
    console.log('Setting category:', category);
    appState.store.currentCategory = category;

    // Update active category button
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const activeBtn = document.querySelector(`[data-category="${category}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    renderProducts();
}

// Search Functions
function handleSearch() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        appState.store.searchTerm = searchInput.value;
        renderProducts();
        console.log('Search updated:', appState.store.searchTerm);
    }
}

function handleSortChange() {
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        appState.store.sortFilter = sortSelect.value;
        renderProducts();
        console.log('Sort updated:', appState.store.sortFilter);
    }
}

// Wishlist Functions
function toggleWishlist(productId) {
    let wishlist = JSON.parse(localStorage.getItem('zenchain_wishlist') || '[]');
    const index = wishlist.indexOf(productId);

    if (index > -1) {
        wishlist.splice(index, 1);
        notifications.show('Removed from wishlist', 'info');
    } else {
        wishlist.push(productId);
        notifications.show('Added to wishlist', 'success');
    }

    localStorage.setItem('zenchain_wishlist', JSON.stringify(wishlist));
    renderProducts(); // Re-render to update heart icons
}

function isInWishlist(productId) {
    const wishlist = JSON.parse(localStorage.getItem('zenchain_wishlist') || '[]');
    return wishlist.includes(productId);
}

// Loading Functions
function setLoading(loading) {
    appState.isLoading = loading;

    const loader = document.getElementById('loading-indicator');
    if (loader) {
        loader.style.display = loading ? 'flex' : 'none';
    }
}

// Web3 Wallet Functions
async function connectWallet() {
    try {
        console.log('🔗 Attempting to connect wallet...');

        if (!window.ethereum) {
            notifications.show('Please install MetaMask to use this store!', 'error');
            return false;
        }

        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts',
        });

        if (accounts.length === 0) {
            notifications.show('Please connect your wallet', 'warning');
            return false;
        }

        console.log('✅ Wallet accounts received:', accounts);

        // Create provider and signer
        appState.wallet.provider = new ethers.BrowserProvider(window.ethereum);
        appState.wallet.signer = await appState.wallet.provider.getSigner();
        appState.wallet.address = accounts[0];

        console.log('✅ Provider and signer created');

        // Get network information
        const network = await appState.wallet.provider.getNetwork();
        appState.wallet.chainId = Number(network.chainId);

        console.log('✅ Network info:', network, 'Chain ID:', appState.wallet.chainId);

        // Check if we're on ZenChain Testnet
        if (appState.wallet.chainId !== ZENCHAIN_CONFIG.chainId) {
            console.log('⚠️ Wrong network, switching to ZenChain...');
            await switchToZenChain();
        }

        // Get balance
        await updateWalletBalance();

        // Try to initialize contract
        await initializeContract();

        // Update wallet state
        appState.wallet.connected = true;

        // Update UI
        updateWalletDisplay();

        // Save connection state
        localStorage.setItem('zenchain_wallet_connected', 'true');

        notifications.show('Wallet connected successfully! 🎉', 'success');
        console.log('✅ Wallet connected successfully:', appState.wallet.address);

        return true;

    } catch (error) {
        console.error('❌ Error connecting wallet:', error);
        notifications.show('Failed to connect wallet: ' + error.message, 'error');
        return false;
    }
}

async function disconnectWallet() {
    try {
        console.log('🔌 Disconnecting wallet...');

        // Clear wallet state
        appState.wallet = {
            connected: false,
            address: null,
            balance: '0',
            provider: null,
            signer: null,
            chainId: null
        };

        // Clear contract
        appState.contract.instance = null;

        // Update UI
        updateWalletDisplay();

        // Clear local storage
        localStorage.removeItem('zenchain_wallet_connected');

        notifications.show('Wallet disconnected successfully', 'info');
        console.log('✅ Wallet disconnected');

    } catch (error) {
        console.error('❌ Error disconnecting wallet:', error);
        notifications.show('Error disconnecting wallet: ' + error.message, 'error');
    }
}

async function switchToZenChain() {
    try {
        console.log('🔄 Switching to ZenChain Testnet...');

        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: ZENCHAIN_CONFIG.chainIdHex }],
        });

        // Update chain ID after switching
        const network = await appState.wallet.provider.getNetwork();
        appState.wallet.chainId = Number(network.chainId);

        console.log('✅ Switched to ZenChain successfully');
        return true;
    } catch (switchError) {
        // If network doesn't exist, add it
        if (switchError.code === 4902) {
            try {
                console.log('➕ Adding ZenChain network...');

                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: ZENCHAIN_CONFIG.chainIdHex,
                        chainName: ZENCHAIN_CONFIG.chainName,
                        nativeCurrency: ZENCHAIN_CONFIG.nativeCurrency,
                        rpcUrls: ZENCHAIN_CONFIG.rpcUrls,
                        blockExplorerUrls: ZENCHAIN_CONFIG.blockExplorerUrls
                    }],
                });

                // Update chain ID after adding
                const network = await appState.wallet.provider.getNetwork();
                appState.wallet.chainId = Number(network.chainId);

                console.log('✅ ZenChain network added successfully');
                return true;
            } catch (addError) {
                console.error('❌ Error adding ZenChain network:', addError);
                notifications.show('Failed to add ZenChain network', 'error');
                return false;
            }
        } else {
            console.error('❌ Error switching to ZenChain:', switchError);
            notifications.show('Please switch to ZenChain Testnet manually', 'warning');
            return false;
        }
    }
}

async function updateWalletBalance() {
    if (!appState.wallet.provider || !appState.wallet.address) return;

    try {
        const balance = await appState.wallet.provider.getBalance(appState.wallet.address);
        appState.wallet.balance = ethers.formatEther(balance);
        console.log('✅ Wallet balance updated:', appState.wallet.balance, 'ZTC');
        updateWalletDisplay();
    } catch (error) {
        console.error('❌ Error updating balance:', error);
    }
}

async function initializeContract() {
    if (!appState.wallet.signer || !CONTRACT_CONFIG.address || CONTRACT_CONFIG.address === '0x0000000000000000000000000000000000000000') {
        console.log('⚠️ Contract not deployed yet or wallet not connected');
        return;
    }

    try {
        appState.contract.instance = new ethers.Contract(
            CONTRACT_CONFIG.address,
            CONTRACT_CONFIG.abi,
            appState.wallet.signer
        );

        appState.contract.address = CONTRACT_CONFIG.address;

        console.log('✅ Contract initialized:', CONTRACT_CONFIG.address);

    } catch (error) {
        console.error('❌ Error initializing contract:', error);
        notifications.show('Contract initialization failed: ' + error.message, 'error');
    }
}

function updateWalletDisplay() {
    console.log('🔄 Updating wallet display, connected:', appState.wallet.connected);

    const walletConnected = document.getElementById('wallet-connected');
    const walletDisconnected = document.getElementById('wallet-disconnected');
    const walletAddress = document.getElementById('wallet-address');
    const walletBalance = document.getElementById('wallet-balance');

    if (appState.wallet.connected) {
        console.log('✅ Showing connected wallet state');

        // Show connected state
        if (walletConnected) {
            walletConnected.style.display = 'flex';
        }
        if (walletDisconnected) {
            walletDisconnected.style.display = 'none';
        }

        // Update wallet info
        if (walletAddress && appState.wallet.address) {
            const shortAddress = `${appState.wallet.address.substring(0, 4)}...${appState.wallet.address.substring(38)}`;
            walletAddress.textContent = shortAddress;
        }
        if (walletBalance) {
            walletBalance.textContent = `${parseFloat(appState.wallet.balance).toFixed(4)} ZTC`;
        }
    } else {
        console.log('❌ Showing disconnected wallet state');

        // Show disconnected state
        if (walletConnected) {
            walletConnected.style.display = 'none';
        }
        if (walletDisconnected) {
            walletDisconnected.style.display = 'flex';
        }
    }
}

// Initialize Event Listeners
function initializeEventListeners() {
    console.log('🎛️ Initializing event listeners...');

    // Connect Wallet Button
    const connectBtn = document.getElementById('connect-wallet');
    if (connectBtn) {
        connectBtn.addEventListener('click', connectWallet);
        console.log('✅ Connect button listener added');
    }

    // Disconnect Wallet Button
    const disconnectBtn = document.getElementById('disconnect-wallet');
    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', disconnectWallet);
        console.log('✅ Disconnect button listener added');
    }

    // Cart Toggle Button
    const cartToggle = document.getElementById('cart-toggle');
    if (cartToggle) {
        cartToggle.addEventListener('click', () => toggleCart());
        console.log('✅ Cart toggle listener added');
    }

    // Cart Close Button
    const cartClose = document.getElementById('cart-close');
    if (cartClose) {
        cartClose.addEventListener('click', () => toggleCart(false));
        console.log('✅ Cart close listener added');
    }

    // Clear Cart Button
    const clearCartBtn = document.getElementById('clear-cart');
    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', clearCart);
        console.log('✅ Clear cart listener added');
    }

    // Checkout Button - FIXED
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', checkoutCart);
        console.log('✅ Checkout button listener added');
    } else {
        console.error('❌ Checkout button not found!');
    }

    // Search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
        console.log('✅ Search input listener added');
    }

    // Sort select
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', handleSortChange);
        console.log('✅ Sort select listener added');
    }

    // Category buttons
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('category-btn')) {
            const category = e.target.getAttribute('data-category');
            if (category) {
                setCategory(category);
            }
        }
    });

    // Cart overlay click
    const cartOverlay = document.getElementById('cart-overlay');
    if (cartOverlay) {
        cartOverlay.addEventListener('click', () => toggleCart(false));
        console.log('✅ Cart overlay listener added');
    }

    console.log('✅ Event listeners initialized successfully');
}

// Initialize App
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 ZenChain DApp Store initializing...');

    if (typeof ethers === 'undefined') {
        console.error('❌ Ethers.js not loaded');
        notifications.show('Failed to load Web3 library. Please refresh the page.', 'error');
        return;
    }

    console.log('✅ Ethers.js loaded successfully');

    // Initialize UI
    initializeEventListeners();
    updateWalletDisplay();
    updateCartDisplay();
    updateCartCounter();

    // Load products (fallback first)
    loadFallbackProducts();

    // Auto-connect wallet if previously connected
    const wasConnected = localStorage.getItem('zenchain_wallet_connected');
    if (wasConnected && window.ethereum) {
        console.log('🔄 Auto-connecting previously connected wallet...');
        setTimeout(() => {
            connectWallet();
        }, 1000);
    }

    console.log('✅ ZenChain DApp Store initialized successfully');
    notifications.show('Welcome to ZenChain Store! 🛒', 'success', 3000);
});

console.log('✅ ZenChain DApp Store script loaded successfully');