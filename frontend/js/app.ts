import { fetchMe, fetchProducts, logout } from './api.js';
import { MilkProduct } from './types.js';

type StockFilter = 'all' | 'in' | 'out';
type Language = 'en' | 'kh';

interface CartItem {
    product: MilkProduct;
    qty: number;
}

class ProductDashboard {
    private products: MilkProduct[] = [];
    private stockFilter: StockFilter = 'all';
    private categoryFilter = 'all';
    private language: Language = 'en';
    private cart: Map<number, CartItem> = new Map();

    constructor() {
        this.init();
    }

    private async init(): Promise<void> {
        try {
            const auth = await fetchMe();
            if (!auth.success) {
                window.location.href = 'login.html';
                return;
            }
        } catch {
            window.location.href = 'login.html';
            return;
        }

        this.bindEvents();
        this.updateLanguage();
        await this.loadProducts();
    }

    private bindEvents(): void {
        const stockFilterElement = document.getElementById('stockFilter') as HTMLSelectElement | null;
        const categoryFilterElement = document.getElementById('categoryFilter') as HTMLSelectElement | null;
        const languageSelect = document.getElementById('languageSelect') as HTMLSelectElement | null;
        const logoutBtn = document.getElementById('logoutBtn') as HTMLButtonElement | null;
        const settingsBtn = document.getElementById('settingsBtn') as HTMLButtonElement | null;
        const printReceiptBtn = document.getElementById('printReceiptBtn') as HTMLButtonElement | null;
        const clearCartBtn = document.getElementById('clearCartBtn') as HTMLButtonElement | null;

        stockFilterElement?.addEventListener('change', () => {
            this.stockFilter = stockFilterElement.value as StockFilter;
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

    private async loadProducts(): Promise<void> {
        const container = document.getElementById('milkProductGrid');
        try {
            const response = await fetchProducts();
            if (!response.success) {
                throw new Error(response.message || 'Unable to load products');
            }

            this.products = response.data;
            this.populateCategoryFilter();
            this.render();
        } catch (error) {
            console.error('Load products error:', error);
            if (container) {
                container.innerHTML = '<div class="alert alert-danger mb-0">Failed to load products.</div>';
            }
        }
    }

    private populateCategoryFilter(): void {
        const categoryFilterElement = document.getElementById('categoryFilter') as HTMLSelectElement | null;
        if (!categoryFilterElement) return;

        const unique = Array.from(new Set(this.products.map((p) => p.category))).sort();
        categoryFilterElement.innerHTML = `
            <option value="all">${this.language === 'kh' ? 'ទាំងអស់' : 'All'}</option>
            ${unique.map((cat) => `<option value="${cat}">${cat}</option>`).join('')}
        `;
    }

    private getFilteredProducts(): MilkProduct[] {
        let list = [...this.products];

        if (this.categoryFilter !== 'all') {
            list = list.filter((p) => p.category === this.categoryFilter);
        }

        if (this.stockFilter === 'in') {
            list = list.filter((p) => (p.stock ?? 0) > 0);
        } else if (this.stockFilter === 'out') {
            list = list.filter((p) => (p.stock ?? 0) <= 0);
        }

        return list;
    }

    private updateSummary(filteredProducts: MilkProduct[]): void {
        const summary = document.getElementById('stockSummary');
        if (!summary) return;

        const outOfStock = this.products.filter((p) => (p.stock ?? 0) <= 0).length;
        summary.textContent = this.language === 'kh'
            ? `បង្ហាញផលិតផល ${filteredProducts.length} • អស់ពីស្តុក: ${outOfStock}`
            : `Showing ${filteredProducts.length} products • Out of stock: ${outOfStock}`;
    }

    private updateLanguage(): void {
        const dictionary: Record<Language, Record<string, string>> = {
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

        const stockFilterElement = document.getElementById('stockFilter') as HTMLSelectElement | null;
        if (stockFilterElement) {
            const optionMap: Array<{ value: StockFilter; key: string }> = [
                { value: 'all', key: 'allProducts' },
                { value: 'in', key: 'inStock' },
                { value: 'out', key: 'outStock' }
            ];

            optionMap.forEach(({ value, key }) => {
                const option = stockFilterElement.querySelector(`option[value="${value}"]`);
                if (option && textMap[key]) option.textContent = textMap[key];
            });
        }

        this.populateCategoryFilter();
    }

    private addToCart(product: MilkProduct): void {
        const stock = product.stock ?? 0;
        if (stock <= 0) return;

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

    private changeCartQty(productId: number, delta: number): void {
        const item = this.cart.get(productId);
        if (!item) return;

        const nextQty = item.qty + delta;
        if (nextQty <= 0) {
            this.cart.delete(productId);
        } else {
            const maxStock = item.product.stock ?? 0;
            item.qty = Math.min(nextQty, maxStock);
            this.cart.set(productId, item);
        }

        this.renderCart();
    }

    private renderCart(): void {
        const cartItems = document.getElementById('cartItems');
        const cartTotal = document.getElementById('cartTotal');
        if (!cartItems || !cartTotal) return;

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

        cartItems.querySelectorAll<HTMLButtonElement>('[data-cart-action]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const id = Number(btn.getAttribute('data-id'));
                const action = btn.getAttribute('data-cart-action');
                if (!id || !action) return;
                this.changeCartQty(id, action === 'inc' ? 1 : -1);
            });
        });
    }

    private render(): void {
        const container = document.getElementById('milkProductGrid');
        if (!container) return;

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

        container.querySelectorAll<HTMLButtonElement>('[data-add-to-cart]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const productId = Number(btn.getAttribute('data-add-to-cart'));
                const product = this.products.find((item) => item.id === productId);
                if (!product) return;
                this.addToCart(product);
            });
        });
    }
}

new ProductDashboard();