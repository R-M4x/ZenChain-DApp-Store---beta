// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ZenChainStore {
    // Contract owner
    address public owner;

    // Product structure
    struct Product {
        uint256 id;
        string name;
        uint256 price; // Price in wei (ZTC)
        uint256 stock;
        bool active;
        string category;
        string metadataURI;
    }

    // Purchase structure
    struct Purchase {
        uint256 productId;
        address buyer;
        uint256 quantity;
        uint256 totalPrice;
        uint256 timestamp;
    }

    // State variables
    mapping(uint256 => Product) public products;
    mapping(uint256 => Purchase) public purchases;
    mapping(address => uint256[]) public userPurchases;

    uint256 public nextProductId = 1;
    uint256 public nextPurchaseId = 1;

    // Simple reentrancy guard
    bool private locked = false;

    // Events
    event ProductAdded(uint256 indexed productId, string name, uint256 price);
    event ProductUpdated(uint256 indexed productId, string name, uint256 price, uint256 stock);
    event ProductPurchased(
        uint256 indexed purchaseId,
        uint256 indexed productId,
        address indexed buyer,
        uint256 quantity,
        uint256 totalPrice
    );
    event StockUpdated(uint256 indexed productId, uint256 newStock);
    event ProductDeactivated(uint256 indexed productId);

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier productExists(uint256 _productId) {
        require(products[_productId].id != 0, "Product does not exist");
        _;
    }

    modifier productActive(uint256 _productId) {
        require(products[_productId].active, "Product is not active");
        _;
    }

    modifier nonReentrant() {
        require(!locked, "Reentrant call");
        locked = true;
        _;
        locked = false;
    }

    constructor() {
        owner = msg.sender;
    }

    // Owner functions
    function addProduct(
        string memory _name,
        uint256 _price,
        uint256 _stock,
        string memory _category,
        string memory _metadataURI
    ) external onlyOwner {
        uint256 productId = nextProductId++;

        products[productId] = Product({
            id: productId,
            name: _name,
            price: _price,
            stock: _stock,
            active: true,
            category: _category,
            metadataURI: _metadataURI
        });

        emit ProductAdded(productId, _name, _price);
    }

    function updateProduct(
        uint256 _productId,
        string memory _name,
        uint256 _price,
        uint256 _stock,
        string memory _metadataURI
    ) external onlyOwner productExists(_productId) {
        Product storage product = products[_productId];
        product.name = _name;
        product.price = _price;
        product.stock = _stock;
        product.metadataURI = _metadataURI;

        emit ProductUpdated(_productId, _name, _price, _stock);
    }

    function updateStock(uint256 _productId, uint256 _newStock) 
        external 
        onlyOwner 
        productExists(_productId) 
    {
        products[_productId].stock = _newStock;
        emit StockUpdated(_productId, _newStock);
    }

    function deactivateProduct(uint256 _productId) 
        external 
        onlyOwner 
        productExists(_productId) 
    {
        products[_productId].active = false;
        emit ProductDeactivated(_productId);
    }

    // Purchase function
    function purchaseWithZTC(uint256 _productId, uint256 _quantity)
        external
        payable
        nonReentrant
        productExists(_productId)
        productActive(_productId)
    {
        Product storage product = products[_productId];
        require(_quantity > 0, "Quantity must be greater than 0");
        require(product.stock >= _quantity, "Insufficient stock");

        uint256 totalPrice = product.price * _quantity;
        require(msg.value >= totalPrice, "Insufficient payment");

        // Update stock
        product.stock -= _quantity;

        // Record purchase
        uint256 purchaseId = nextPurchaseId++;
        purchases[purchaseId] = Purchase({
            productId: _productId,
            buyer: msg.sender,
            quantity: _quantity,
            totalPrice: totalPrice,
            timestamp: block.timestamp
        });

        userPurchases[msg.sender].push(purchaseId);

        // Refund excess payment
        if (msg.value > totalPrice) {
            payable(msg.sender).transfer(msg.value - totalPrice);
        }

        emit ProductPurchased(purchaseId, _productId, msg.sender, _quantity, totalPrice);
    }

    // View functions
    function getProduct(uint256 _productId) 
        external 
        view 
        productExists(_productId) 
        returns (Product memory) 
    {
        return products[_productId];
    }

    function getActiveProducts() external view returns (Product[] memory) {
        uint256 activeCount = 0;

        // Count active products
        for (uint256 i = 1; i < nextProductId; i++) {
            if (products[i].active) {
                activeCount++;
            }
        }

        Product[] memory activeProducts = new Product[](activeCount);
        uint256 currentIndex = 0;

        // Fill active products array
        for (uint256 i = 1; i < nextProductId; i++) {
            if (products[i].active) {
                activeProducts[currentIndex] = products[i];
                currentIndex++;
            }
        }

        return activeProducts;
    }

    function getUserPurchases(address _user) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return userPurchases[_user];
    }

    function getPurchase(uint256 _purchaseId) 
        external 
        view 
        returns (Purchase memory) 
    {
        return purchases[_purchaseId];
    }

    // Withdraw function
    function withdrawZTC() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ZTC to withdraw");
        payable(owner).transfer(balance);
    }

    // Transfer ownership
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid address");
        owner = _newOwner;
    }

    // Emergency withdraw
    function emergencyWithdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
}