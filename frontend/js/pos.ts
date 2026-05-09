import {
    fetchMe,
    fetchProducts,
    logout,
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    createOrder,
    generatePaymentQR,
    confirmPayment
} from './api.js';
import { MilkProduct, Cart, CartResponse, OrderResponse } from './types.js';

class POSSystem {
    private products: MilkProduct[] = [];
    private cart: Cart = { items: [], total_amount: 0 };
    private isLoading = false;
    private currentOrderId: number | null = null;

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

            this.applyRoleAccess(auth.user?.role || '');

            this.bindEvents();
            await this.loadProducts();
            await this.loadCart();
        } catch (error) {
            console.error('[v0] POS Init Error:', error);
            window.location.href = 'login.html';
        }
    }

    private bindEvents(): void {
        // Search functionality
        const searchBox = document.getElementById('searchBox') as HTMLInputElement;
        searchBox?.addEventListener('input', () => this.filterProducts());

        // Cart actions
        const clearCartBtn = document.getElementById('clearCartBtn') as HTMLButtonElement;
        clearCartBtn?.addEventListener('click', () => this.handleClearCart());

        const checkoutBtn = document.getElementById('checkoutBtn') as HTMLButtonElement;
        checkoutBtn?.addEventListener('click', () => this.showCheckoutModal());

        // Modal actions
        const cancelOrderBtn = document.getElementById('cancelOrderBtn') as HTMLButtonElement;
        cancelOrderBtn?.addEventListener('click', () => this.closeCheckoutModal());

        const confirmOrderBtn = document.getElementById('confirmOrderBtn') as HTMLButtonElement;
        confirmOrderBtn?.addEventListener('click', () => this.handleConfirmOrder());

        // Logout
        const logoutBtn = document.getElementById('logoutBtn') as HTMLButtonElement;
        logoutBtn?.addEventListener('click', async () => {
            await logout();
            window.location.href = 'login.html';
        });
    }

    private applyRoleAccess(role: string): void {
        document.querySelectorAll<HTMLElement>('.admin-only').forEach((el) => {
            el.style.display = role === 'admin' ? '' : 'none';
        });
    }

    private async loadProducts(): Promise<void> {
        try {
            const response = await fetchProducts();
            if (response.success) {
                this.products = response.data;
                this.renderProducts();
            }
        } catch (error) {
            console.error('[v0] Load Products Error:', error);
            this.showAlert('Failed to load products', 'error');
        }
    }

    private async loadCart(): Promise<void> {
        try {
            const response = await getCart();
            if (response.success) {
                this.cart = response.data;
                this.renderCart();
            }
        } catch (error) {
            console.error('[v0] Load Cart Error:', error);
        }
    }

    private renderProducts(): void {
        const container = document.getElementById('productsContainer');
        if (!container) return;

        container.innerHTML = this.products
            .map(product => this.createProductCard(product))
            .join('');

        // Add event listeners to "Add to Cart" buttons
        this.products.forEach(product => {
            const btn = document.getElementById(`add-${product.id}`) as HTMLButtonElement;
            btn?.addEventListener('click', () => this.handleAddToCart(product.id));
        });
    }

    private createProductCard(product: MilkProduct): string {
        const stock = product.stock || 0;
        const stockStatus = stock === 0 ? 'out' : stock <= 5 ? 'low' : 'available';
        const stockBadgeClass = `stock-${stockStatus}`;
        const stockLabel = stock === 0 ? 'Out of Stock' : stock <= 5 ? `Low Stock (${stock})` : `In Stock (${stock})`;
        const isDisabled = stock === 0;

        return `
            <div class="product-card">
                <div class="product-image">🥛</div>
                <div class="product-name">${product.name}</div>
                <div class="product-price">$${(product.price || 0).toFixed(2)}</div>
                <div class="product-stock">
                    <span class="stock-badge ${stockBadgeClass}">${stockLabel}</span>
                </div>
                <button 
                    id="add-${product.id}"
                    class="btn-add" 
                    ${isDisabled ? 'disabled' : ''}
                >
                    Add to Cart
                </button>
            </div>
        `;
    }

    private async handleAddToCart(productId: number): Promise<void> {
        if (this.isLoading) return;

        try {
            this.isLoading = true;
            const response = await addToCart(productId, 1);

            if (response.success) {
                this.cart = response.data;
                this.renderCart();
                this.showAlert(`Product added to cart!`, 'success');
            } else {
                this.showAlert(response.message || 'Failed to add product', 'error');
            }
        } catch (error) {
            console.error('[v0] Add to Cart Error:', error);
            this.showAlert('Failed to add product to cart', 'error');
        } finally {
            this.isLoading = false;
        }
    }

    private renderCart(): void {
        const container = document.getElementById('cartItemsContainer');
        if (!container) return;

        if (this.cart.items.length === 0) {
            container.innerHTML = '<div class="cart-empty">Your cart is empty</div>';
            this.updateCheckoutButton();
            return;
        }

        container.innerHTML = this.cart.items
            .map(item => this.createCartItemRow(item))
            .join('');

        // Add event listeners
        this.cart.items.forEach(item => {
            const qtyInput = document.getElementById(`qty-${item.product_id}`) as HTMLInputElement;
            qtyInput?.addEventListener('change', () => this.handleUpdateQuantity(item.product_id, qtyInput.value));

            const removeBtn = document.getElementById(`remove-${item.product_id}`) as HTMLButtonElement;
            removeBtn?.addEventListener('click', () => this.handleRemoveFromCart(item.product_id));
        });

        this.updateCartSummary();
        this.updateCheckoutButton();
    }

    private createCartItemRow(item: any): string {
        const product = this.products.find(p => p.id === item.product_id);
        const productName = product?.name || 'Unknown Product';

        return `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${productName}</div>
                    <div class="cart-item-price">$${(item.unit_price).toFixed(2)} x ${item.quantity} = $${(item.subtotal).toFixed(2)}</div>
                </div>
                <div class="cart-item-controls">
                    <input 
                        type="number" 
                        id="qty-${item.product_id}"
                        class="qty-input" 
                        min="1" 
                        value="${item.quantity}"
                    >
                    <button id="remove-${item.product_id}" class="btn-remove">Remove</button>
                </div>
            </div>
        `;
    }

    private async handleUpdateQuantity(productId: number, quantity: string): Promise<void> {
        const qty = parseInt(quantity, 10);
        if (isNaN(qty) || qty < 1) {
            this.showAlert('Invalid quantity', 'error');
            this.renderCart();
            return;
        }

        try {
            const response = await updateCartItem(productId, qty);
            if (response.success) {
                this.cart = response.data;
                this.renderCart();
            } else {
                this.showAlert(response.message || 'Failed to update cart', 'error');
                this.renderCart();
            }
        } catch (error) {
            console.error('[v0] Update Quantity Error:', error);
            this.showAlert('Failed to update quantity', 'error');
            this.renderCart();
        }
    }

    private async handleRemoveFromCart(productId: number): Promise<void> {
        try {
            const response = await removeFromCart(productId);
            if (response.success) {
                this.cart = response.data;
                this.renderCart();
                this.showAlert('Item removed from cart', 'success');
            }
        } catch (error) {
            console.error('[v0] Remove from Cart Error:', error);
            this.showAlert('Failed to remove item', 'error');
        }
    }

    private async handleClearCart(): Promise<void> {
        if (!confirm('Are you sure you want to clear the cart?')) return;

        try {
            const response = await clearCart();
            if (response.success) {
                this.cart = response.data;
                this.renderCart();
                this.showAlert('Cart cleared', 'success');
            }
        } catch (error) {
            console.error('[v0] Clear Cart Error:', error);
            this.showAlert('Failed to clear cart', 'error');
        }
    }

    private showCheckoutModal(): void {
        if (this.cart.items.length === 0) {
            this.showAlert('Cart is empty', 'warning');
            return;
        }

        const modal = document.getElementById('checkoutModal');
        const summaryContainer = document.getElementById('orderSummary');
        const totalInput = document.getElementById('orderTotal') as HTMLInputElement;

        if (summaryContainer) {
            summaryContainer.innerHTML = this.cart.items
                .map(item => {
                    const product = this.products.find(p => p.id === item.product_id);
                    return `
                        <div style="padding: 0.5rem 0; border-bottom: 1px solid rgba(0,0,0,0.1);">
                            <strong>${product?.name || 'Unknown'}</strong><br>
                            ${item.quantity} x $${item.unit_price.toFixed(2)} = <strong>$${item.subtotal.toFixed(2)}</strong>
                        </div>
                    `;
                })
                .join('');
        }

        if (totalInput) {
            totalInput.value = `$${this.cart.total_amount.toFixed(2)}`;
        }

        modal?.classList.add('active');
    }

    private closeCheckoutModal(): void {
        const modal = document.getElementById('checkoutModal');
        modal?.classList.remove('active');
    }

    private async handleConfirmOrder(): Promise<void> {
        if (this.isLoading) return;

        try {
            this.isLoading = true;
            const notesInput = document.getElementById('orderNotes') as HTMLTextAreaElement;
            const notes = notesInput?.value || '';

            const response = await createOrder(notes);

            if (response.success) {
                this.currentOrderId = response.data.id;
                this.closeCheckoutModal();
                this.cart = { items: [], total_amount: 0 };
            } else {
                this.showAlert(response.message || 'Failed to create order', 'error');
            }
        } catch (error) {
            console.error('[v0] Confirm Order Error:', error);
            this.showAlert('Failed to create order', 'error');
        } finally {
            this.isLoading = false;
        }
    }

  

    private filterProducts(): void {
        const searchBox = document.getElementById('searchBox') as HTMLInputElement;
        const query = (searchBox?.value || '').toLowerCase();

        const filtered = this.products.filter(p =>
            p.name.toLowerCase().includes(query) ||
            p.category?.toLowerCase().includes(query)
        );

        const container = document.getElementById('productsContainer');
        if (!container) return;

        if (filtered.length === 0) {
            container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-muted);">No products found</div>';
            return;
        }

        container.innerHTML = filtered
            .map(product => this.createProductCard(product))
            .join('');

        filtered.forEach(product => {
            const btn = document.getElementById(`add-${product.id}`) as HTMLButtonElement;
            btn?.addEventListener('click', () => this.handleAddToCart(product.id));
        });
    }

    private updateCartSummary(): void {
        const subtotal = this.cart.total_amount;
        const total = this.cart.total_amount; // No tax/shipping for now

        const subtotalEl = document.getElementById('subtotal');
        const totalEl = document.getElementById('totalAmount');

        if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
        if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
    }

    private updateCheckoutButton(): void {
        const btn = document.getElementById('checkoutBtn') as HTMLButtonElement;
        if (btn) {
            btn.disabled = this.cart.items.length === 0;
        }
    }

    private showAlert(message: string, type: 'success' | 'error' | 'warning'): void {
        const container = document.getElementById('alertContainer');
        if (!container) return;

        const alertEl = document.createElement('div');
        alertEl.className = `alert alert-${type}`;
        alertEl.textContent = message;

        container.innerHTML = '';
        container.appendChild(alertEl);

        setTimeout(() => {
            alertEl.remove();
        }, 4000);
    }
}

// Initialize POS System
new POSSystem();
