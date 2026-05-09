import { fetchMe, fetchProducts, logout } from './api.js';
class ProductDashboard {
    constructor() {
        this.products = [];
        this.stockFilter = 'all';
        this.categoryFilter = 'all';
        this.language = 'en';
        this.cart = new Map();
        this.init();
    }
    async init() {
        try {
            const auth = await fetchMe();
            if (!auth.success) {
                window.location.href = 'login.html';
                return;
            }
        }
        catch {
            window.location.href = 'login.html';
            return;
        }
        this.bindEvents();
        this.updateLanguage();
        await this.loadProducts();
    }
    bindEvents() {
        const stockFilterElement = document.getElementById('stockFilter');
        const categoryFilterElement = document.getElementById('categoryFilter');
        const languageSelect = document.getElementById('languageSelect');
        const logoutBtn = document.getElementById('logoutBtn');
        const settingsBtn = document.getElementById('settingsBtn');
        const printReceiptBtn = document.getElementById('printReceiptBtn');
        const clearCartBtn = document.getElementById('clearCartBtn');
        stockFilterElement?.addEventListener('change', () => {
            this.stockFilter = stockFilterElement.value;
            this.render();
        });
        categoryFilterElement?.addEventListener('change', () => {
            this.categoryFilter = categoryFilterElement.value;
            this.render();
        });
        languageSelect?.addEventListener('change', () => {
            this.language = languageSelect.value === 'kh' ? 'kh' : 'en';
            this.updateLanguage();
            this.render();
            this.renderCart();
        });
        settingsBtn?.addEventListener('click', () => {
            alert(this.language === 'kh' ? 'ការកំណត់នឹងមកដល់ឆាប់ៗនេះ' : 'Settings will be available soon.');
        });
        logoutBtn?.addEventListener('click', async () => {
            await logout();
            window.location.href = 'login.html';
        });
        printReceiptBtn?.addEventListener('click', () => {
            window.print();
        });
        clearCartBtn?.addEventListener('click', () => {
            this.cart.clear();
            this.renderCart();
        });
    }
    async loadProducts() {
        const container = document.getElementById('milkProductGrid');
        try {
            const response = await fetchProducts();
            if (!response.success) {
                throw new Error(response.message || 'Unable to load products');
            }
            this.products = response.data;
            this.populateCategoryFilter();
            this.render();
        }
        catch (error) {
            console.error('Load products error:', error);
            if (container) {
                container.innerHTML = '<div class="alert alert-danger mb-0">Failed to load products.</div>';
            }
        }
    }
    populateCategoryFilter() {
        const categoryFilterElement = document.getElementById('categoryFilter');
        if (!categoryFilterElement)
            return;
        const unique = Array.from(new Set(this.products.map((p) => p.category))).sort();
        categoryFilterElement.innerHTML = `
            <option value="all">${this.language === 'kh' ? 'ទាំងអស់' : 'All'}</option>
            ${unique.map((cat) => `<option value="${cat}">${cat}</option>`).join('')}
        `;
    }
    getFilteredProducts() {
        let list = [...this.products];
        if (this.categoryFilter !== 'all') {
            list = list.filter((p) => p.category === this.categoryFilter);
        }
        if (this.stockFilter === 'in') {
            list = list.filter((p) => (p.stock ?? 0) > 0);
        }
        else if (this.stockFilter === 'out') {
            list = list.filter((p) => (p.stock ?? 0) <= 0);
        }
        return list;
    }
    updateSummary(filteredProducts) {
        const summary = document.getElementById('stockSummary');
        if (!summary)
            return;
        const outOfStock = this.products.filter((p) => (p.stock ?? 0) <= 0).length;
        summary.textContent = this.language === 'kh'
            ? `បង្ហាញផលិតផល ${filteredProducts.length} • អស់ពីស្តុក: ${outOfStock}`
            : `Showing ${filteredProducts.length} products • Out of stock: ${outOfStock}`;
    }
    updateLanguage() {
        const dictionary = {
            en: {
                product: 'Product',
                language: 'Language',
                setting: 'Setting',
                logout: 'Logout',
                stockFilter: 'Stock Filter',
                allProducts: 'All Products',
                inStock: 'In Stock',
                outStock: 'Out of Stock',
                category: 'Category'
            },
            kh: {
                product: 'ផលិតផល',
                language: 'ភាសា',
                setting: 'ការកំណត់',
                logout: 'ចាកចេញ',
                stockFilter: 'តម្រងស្តុក',
                allProducts: 'ផលិតផលទាំងអស់',
                inStock: 'មានស្តុក',
                outStock: 'អស់ស្តុក',
                category: 'ប្រភេទ'
            }
        };
        const textMap = dictionary[this.language];
        document.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.getAttribute('data-i18n') || '';
            if (textMap[key]) {
                el.textContent = textMap[key];
            }
        });
        const stockFilterElement = document.getElementById('stockFilter');
        if (stockFilterElement) {
            const optionMap = [
                { value: 'all', key: 'allProducts' },
                { value: 'in', key: 'inStock' },
                { value: 'out', key: 'outStock' }
            ];
            optionMap.forEach(({ value, key }) => {
                const option = stockFilterElement.querySelector(`option[value="${value}"]`);
                if (option && textMap[key])
                    option.textContent = textMap[key];
            });
        }
        this.populateCategoryFilter();
    }
    addToCart(product) {
        const stock = product.stock ?? 0;
        if (stock <= 0)
            return;
        const existing = this.cart.get(product.id);
        const currentQty = existing?.qty ?? 0;
        if (currentQty >= stock) {
            alert(this.language === 'kh' ? 'គ្មានស្តុកបន្ថែមទៀតទេ។' : 'No more stock available.');
            return;
        }
        this.cart.set(product.id, {
            product,
            qty: currentQty + 1
        });
        this.renderCart();
    }
    changeCartQty(productId, delta) {
        const item = this.cart.get(productId);
        if (!item)
            return;
        const nextQty = item.qty + delta;
        if (nextQty <= 0) {
            this.cart.delete(productId);
        }
        else {
            const maxStock = item.product.stock ?? 0;
            item.qty = Math.min(nextQty, maxStock);
            this.cart.set(productId, item);
        }
        this.renderCart();
    }
    renderCart() {
        const cartItems = document.getElementById('cartItems');
        const cartTotal = document.getElementById('cartTotal');
        if (!cartItems || !cartTotal)
            return;
        const items = Array.from(this.cart.values());
        if (items.length === 0) {
            cartItems.textContent = this.language === 'kh' ? 'មិនទាន់មានទំនិញនៅក្នុងកន្ត្រក។' : 'No items selected yet.';
            cartTotal.textContent = '$0.00';
            return;
        }
        let total = 0;
        cartItems.innerHTML = items.map((item) => {
            const unitPrice = Number(item.product.price ?? 0);
            const lineTotal = unitPrice * item.qty;
            total += lineTotal;
            return `
                <div class="border rounded p-2 mb-2 bg-light">
                    <div class="fw-semibold">${item.product.name}</div>
                    <div class="small text-muted">$${unitPrice.toFixed(2)} × ${item.qty} = $${lineTotal.toFixed(2)}</div>
                    <div class="mt-2 d-flex gap-1">
                        <button class="btn btn-sm btn-outline-secondary" data-cart-action="dec" data-id="${item.product.id}">-</button>
                        <button class="btn btn-sm btn-outline-secondary" data-cart-action="inc" data-id="${item.product.id}">+</button>
                    </div>
                </div>
            `;
        }).join('');
        cartTotal.textContent = `$${total.toFixed(2)}`;
        cartItems.querySelectorAll('[data-cart-action]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const id = Number(btn.getAttribute('data-id'));
                const action = btn.getAttribute('data-cart-action');
                if (!id || !action)
                    return;
                this.changeCartQty(id, action === 'inc' ? 1 : -1);
            });
        });
    }
    render() {
        const container = document.getElementById('milkProductGrid');
        if (!container)
            return;
        const productsToShow = this.getFilteredProducts();
        this.updateSummary(productsToShow);
        if (productsToShow.length === 0) {
            container.innerHTML = `<div class="col-12"><div class="alert alert-warning mb-0">${this.language === 'kh' ? 'មិនមានផលិតផលសម្រាប់តម្រងនេះទេ។' : 'No products in this filter.'}</div></div>`;
            return;
        }
        container.innerHTML = productsToShow.map((p) => {
            const stock = p.stock ?? 0;
            const inStock = stock > 0;
            return `
                <div class="col-md-6 col-xl-4">
                    <div class="product-card h-100 p-3 ${inStock ? '' : 'out-of-stock'}">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h3 class="h6 mb-0">${p.name}</h3>
                            <span class="badge ${inStock ? 'bg-success' : 'bg-secondary'}">
                                ${inStock
                ? `${this.language === 'kh' ? 'ស្តុក' : 'Stock'}: ${stock}`
                : this.language === 'kh' ? 'អស់ស្តុក' : 'Out'}
                            </span>
                        </div>
                        <div class="small text-muted mb-1">${this.language === 'kh' ? 'ប្រភេទ' : 'Category'}: ${p.category}</div>
                        <div class="price mb-3">$${Number(p.price ?? 0).toFixed(2)}</div>
                        <button class="btn btn-primary btn-sm w-100" data-add-to-cart="${p.id}" ${inStock ? '' : 'disabled'}>
                            ${this.language === 'kh' ? 'បន្ថែមទៅកន្ត្រក' : 'Add to Cart'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        container.querySelectorAll('[data-add-to-cart]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const productId = Number(btn.getAttribute('data-add-to-cart'));
                const product = this.products.find((item) => item.id === productId);
                if (!product)
                    return;
                this.addToCart(product);
            });
        });
    }
}
new ProductDashboard();
