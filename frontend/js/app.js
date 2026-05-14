import { fetchMe, fetchProducts, logout } from './api.js';

class UserDashboard {
    constructor() {
        this.products = [];
        this.cart = new Map();
        this.selectedCategory = 'all';
        this.language = 'en';
        this.init();
    }

    async init() {
        try {
            const auth = await fetchMe();
            if (!auth.success) {
                window.location.href = '/login.html';
                return;
            }
        } catch {
            window.location.href = '/login.html';
            return;
        }

        // Load products
        await this.loadProducts();
        
        // Setup event listeners
        this.setupCategoryTabs();
        this.setupLogout();
        this.updateLanguage();
    }
    async loadProducts() {
        try {
            const response = await fetchProducts();
            if (!response.success) {
                throw new Error(response.message || 'Unable to load products');
            }
            this.products = response.data || [];
            this.renderProducts();
        } catch (error) {
            console.error('Load products error:', error);
            const container = document.getElementById('productGrid');
            if (container) {
                container.innerHTML = `<div class="alert">Failed to load products: ${error.message}</div>`;
            }
        }
    }

    setupCategoryTabs() {
        const tabs = document.querySelectorAll('.cat-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs
                tabs.forEach(t => t.classList.remove('active'));
                // Add active class to clicked tab
                tab.classList.add('active');
                // Update selected category
                this.selectedCategory = tab.getAttribute('data-cat');
                // Re-render products
                this.renderProducts();
            });
        });
    }

    filterProductsByCategory() {
        if (this.selectedCategory === 'all') {
            return this.products;
        }
        return this.products.filter(p => p.category === this.selectedCategory);
    }

    renderProducts() {
        const container = document.getElementById('productGrid');
        if (!container) return;

        const filtered = this.filterProductsByCategory();

        if (filtered.length === 0) {
            container.innerHTML = '<div class="empty-state">No products in this category</div>';
            return;
        }

        container.innerHTML = filtered.map(product => {
            const stock = parseInt(product.stock) || 0;
            const inStock = stock > 0;
            return `
                <div class="product-card">
                    <div class="product-image">
                        <img src="${product.image_url}" alt="${product.name}" onerror="this.src='/assets/placeholder.png'">
                    </div>
                    <div class="product-info">
                        <h3>${product.name}</h3>
                        <p class="category">${product.category}</p>
                        <div class="price">$${parseFloat(product.price).toFixed(2)}</div>
                        <div class="stock-info">
                            Stock: ${stock}
                        </div>
                        <button class="btn-add-cart" data-product-id="${product.id}" ${!inStock ? 'disabled' : ''}>
                            ${inStock ? 'Add to Cart' : 'Out of Stock'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners to add to cart buttons
        container.querySelectorAll('.btn-add-cart').forEach(btn => {
            btn.addEventListener('click', () => {
                const productId = parseInt(btn.getAttribute('data-product-id'));
                const product = this.products.find(p => p.id === productId);
                if (product) {
                    this.addToCart(product);
                }
            });
        });
    }

    addToCart(product) {
        const productId = product.id;
        if (this.cart.has(productId)) {
            const item = this.cart.get(productId);
            item.quantity++;
            this.cart.set(productId, item);
        } else {
            this.cart.set(productId, {
                ...product,
                quantity: 1
            });
        }
        this.renderCart();
    }

    removeFromCart(productId) {
        this.cart.delete(productId);
        this.renderCart();
    }

    updateQuantity(productId, quantity) {
        if (quantity <= 0) {
            this.removeFromCart(productId);
        } else {
            const item = this.cart.get(productId);
            if (item) {
                item.quantity = quantity;
                this.cart.set(productId, item);
                this.renderCart();
            }
        }
    }

    renderCart() {
        const container = document.getElementById('cartItems');
        if (!container) return;

        if (this.cart.size === 0) {
            container.innerHTML = '<p class="empty-cart">Cart is empty</p>';
            this.updateTotals();
            return;
        }

        const items = Array.from(this.cart.values());
        container.innerHTML = items.map(item => `
            <div class="cart-item">
                <div class="item-info">
                    <h4>${item.name}</h4>
                    <p>$${parseFloat(item.price).toFixed(2)} x ${item.quantity}</p>
                </div>
                <div class="item-controls">
                    <button class="qty-btn" data-action="minus" data-product-id="${item.id}">−</button>
                    <input type="number" value="${item.quantity}" min="1" data-product-id="${item.id}" class="qty-input">
                    <button class="qty-btn" data-action="plus" data-product-id="${item.id}">+</button>
                    <button class="remove-btn" data-product-id="${item.id}">🗑</button>
                </div>
            </div>
        `).join('');

        // Add event listeners
        container.querySelectorAll('.qty-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = parseInt(btn.getAttribute('data-product-id'));
                const item = this.cart.get(productId);
                if (item) {
                    const action = btn.getAttribute('data-action');
                    const newQty = action === 'plus' ? item.quantity + 1 : item.quantity - 1;
                    this.updateQuantity(productId, newQty);
                }
            });
        });

        container.querySelectorAll('.qty-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const productId = parseInt(input.getAttribute('data-product-id'));
                const qty = parseInt(input.value) || 0;
                this.updateQuantity(productId, qty);
            });
        });

        container.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const productId = parseInt(btn.getAttribute('data-product-id'));
                this.removeFromCart(productId);
            });
        });

        this.updateTotals();
    }

    updateTotals() {
        let subtotal = 0;
        this.cart.forEach(item => {
            subtotal += parseFloat(item.price) * item.quantity;
        });

        const tax = subtotal * 0.10;
        const total = subtotal + tax;

        const subtotalEl = document.getElementById('subtotal');
        const taxEl = document.getElementById('taxAmt');
        const totalEl = document.getElementById('grandTotal');

        if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
        if (taxEl) taxEl.textContent = `$${tax.toFixed(2)}`;
        if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
    }

    setupLogout() {
        // Find logout link in navbar
        const logoutLinks = document.querySelectorAll('a[href="/login"]');
        logoutLinks.forEach(link => {
            link.addEventListener('click', async (e) => {
                e.preventDefault();
                await logout();
                window.location.href = '/login.html';
            });
        });
    }

    updateLanguage() {
        // Translation dictionary
        const translations = {
            en: {
                selectMilk: 'Select Fresh Milk',
                selectSub: 'Build your order by selecting products below',
                catAll: '🥛 All',
                catFresh: '🌿 Fresh',
                catFlavored: '🍫 Flavored',
                catYogurt: '🫙 Yogurt',
                catCheese: '🧀 Cheese',
                catButter: '🧈 Butter',
                receiptTitle: 'Official Receipt',
                newOrder: 'New Order',
                cartEmpty: 'Cart is empty',
                subtotal: 'Subtotal',
                tax: 'Tax (10%)',
                total: 'Total',
                btnPrint: '🖨️ PRINT RECEIPT'
            },
            kh: {
                selectMilk: 'ជ្រើសរើសទឹកដោះគោស្វាង',
                selectSub: 'សាងសង់ការបញ្ជាទិញរបស់អ្នកដោយជ្រើសរើសផលិតផលខាងក្រោម',
                catAll: '🥛 ទាំងអស់',
                catFresh: '🌿 ស្រស់',
                catFlavored: '🍫 ម្ហូប',
                catYogurt: '🫙 យូហ្គើត',
                catCheese: '🧀 ឈីស',
                catButter: '🧈 ប៊ូតូ',
                receiptTitle: 'ការទទួលយករបាយការណ៍',
                newOrder: 'ការបញ្ជាទិញថ្មី',
                cartEmpty: 'រទុក់ទឹកគឺទទេ',
                subtotal: 'សរុបយ៉ាង',
                tax: 'ពន្ធ (១០%)',
                total: 'សរុប',
                btnPrint: '🖨️ បោះពុម្ព'
            }
        };

        // Update all elements with data-i18n
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const text = translations[this.language]?.[key] || key;
            el.textContent = text;
        });
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new UserDashboard());
} else {
    new UserDashboard();
}
