import {
    fetchMe,
    fetchProducts,
    logout,
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    createOrder
} from './api.js';

class POSSystem {
    constructor() {
        this.products = [];
        this.cart = { items: [], total_amount: 0 };
        this.isLoading = false;
        this.currentOrderId = null;
        this.init();
    }

    async init() {
        try {
            const auth = await fetchMe();
            if (!auth.success) {
                window.location.href = '../login.html';
                return;
            }

            this.applyRoleAccess(auth.user?.role || '');
            this.bindEvents();
            await this.loadProducts();
            await this.loadCart();
        } catch (error) {
            console.error('POS Init Error:', error);
            window.location.href = '../login.html';
        }
    }

    bindEvents() {
        const searchBox = document.getElementById('searchBox');
        searchBox?.addEventListener('input', () => this.filterProducts());

        const clearCartBtn = document.getElementById('clearCartBtn');
        clearCartBtn?.addEventListener('click', () => this.handleClearCart());

        const checkoutBtn = document.getElementById('checkoutBtn');
        checkoutBtn?.addEventListener('click', () => this.showCheckoutModal());

        const cancelOrderBtn = document.getElementById('cancelOrderBtn');
        cancelOrderBtn?.addEventListener('click', () => this.closeCheckoutModal());

        const confirmOrderBtn = document.getElementById('confirmOrderBtn');
        confirmOrderBtn?.addEventListener('click', () => this.handleConfirmOrder());

        const logoutBtn = document.getElementById('logoutBtn');
        logoutBtn?.addEventListener('click', async () => {
            await logout();
            window.location.href = '../login.html';
        });
    }

    applyRoleAccess(role) {
        document.querySelectorAll('.admin-only').forEach((el) => {
            el.style.display = role === 'admin' ? '' : 'none';
        });
    }

    async loadProducts() {
        try {
            const response = await fetchProducts();
            if (response.success) {
                this.products = response.data;
                this.renderProducts();
            }
        } catch (error) {
            console.error('Load Products Error:', error);
            this.showAlert('Failed to load products', 'error');
        }
    }

    async loadCart() {
        try {
            const response = await getCart();
            if (response.success) {
                this.cart = response.data;
                this.renderCart();
            }
        } catch (error) {
            console.error('Load Cart Error:', error);
        }
    }

    renderProducts() {
        const container = document.getElementById('productsContainer');
        if (!container) return;

        container.innerHTML = this.products
            .map(product => this.createProductCard(product))
            .join('');

        this.products.forEach(product => {
            const btn = document.getElementById(`add-${product.id}`);
            btn?.addEventListener('click', () => this.handleAddToCart(product.id));
        });
    }

    createProductCard(product) {
        const stock = parseInt(product.stock) || 0;
        const stockStatus = stock === 0 ? 'out' : stock <= 5 ? 'low' : 'available';
        const stockBadgeClass = `stock-${stockStatus}`;
        const stockLabel = stock === 0 ? 'Out of Stock' : stock <= 5 ? `Low Stock (${stock})` : `In Stock (${stock})`;
        const isDisabled = stock === 0;

        // Use product.image_url if available, else default milk emoji
        const imgHtml = product.image_url 
            ? `<img src="${product.image_url}" style="width:100%; height:100%; object-fit:cover; border-radius:12px;">`
            : '🥛';

        return `
            <div class="product-card">
                <div class="product-image">${imgHtml}</div>
                <div class="product-name">${product.name}</div>
                <div class="product-price">$${parseFloat(product.price).toFixed(2)}</div>
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

    async handleAddToCart(productId) {
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
            console.error('Add to Cart Error:', error);
            this.showAlert('Failed to add product to cart', 'error');
        } finally {
            this.isLoading = false;
        }
    }

    renderCart() {
        const container = document.getElementById('cartItemsContainer');
        if (!container) return;

        if (!this.cart.items || this.cart.items.length === 0) {
            container.innerHTML = '<div class="cart-empty">Your cart is empty</div>';
            this.updateCartSummary();
            this.updateCheckoutButton();
            return;
        }

        container.innerHTML = this.cart.items
            .map(item => this.createCartItemRow(item))
            .join('');

        this.cart.items.forEach(item => {
            const qtyInput = document.getElementById(`qty-${item.product_id}`);
            qtyInput?.addEventListener('change', () => this.handleUpdateQuantity(item.product_id, qtyInput.value));

            const removeBtn = document.getElementById(`remove-${item.product_id}`);
            removeBtn?.addEventListener('click', () => this.handleRemoveFromCart(item.product_id));
        });

        this.updateCartSummary();
        this.updateCheckoutButton();
    }

    createCartItemRow(item) {
        const product = this.products.find(p => p.id == item.product_id);
        const productName = product ? product.name : 'Unknown Product';

        return `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${productName}</div>
                    <div class="cart-item-price">$${parseFloat(item.unit_price).toFixed(2)} x ${item.quantity} = $${parseFloat(item.subtotal).toFixed(2)}</div>
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

    async handleUpdateQuantity(productId, quantity) {
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
            console.error('Update Quantity Error:', error);
            this.showAlert('Failed to update quantity', 'error');
            this.renderCart();
        }
    }

    async handleRemoveFromCart(productId) {
        try {
            const response = await removeFromCart(productId);
            if (response.success) {
                this.cart = response.data;
                this.renderCart();
                this.showAlert('Item removed from cart', 'success');
            }
        } catch (error) {
            console.error('Remove from Cart Error:', error);
            this.showAlert('Failed to remove item', 'error');
        }
    }

    async handleClearCart() {
        if (!confirm('Are you sure you want to clear the cart?')) return;

        try {
            const response = await clearCart();
            if (response.success) {
                this.cart = response.data;
                this.renderCart();
                this.showAlert('Cart cleared', 'success');
            }
        } catch (error) {
            console.error('Clear Cart Error:', error);
            this.showAlert('Failed to clear cart', 'error');
        }
    }

    showCheckoutModal() {
        if (!this.cart.items || this.cart.items.length === 0) {
            this.showAlert('Cart is empty', 'warning');
            return;
        }

        const modal = document.getElementById('checkoutModal');
        const summaryContainer = document.getElementById('orderSummary');
        const totalInput = document.getElementById('orderTotal');

        if (summaryContainer) {
            summaryContainer.innerHTML = this.cart.items
                .map(item => {
                    const product = this.products.find(p => p.id == item.product_id);
                    return `
                        <div style="padding: 0.5rem 0; border-bottom: 1px solid rgba(0,0,0,0.1);">
                            <strong>${product ? product.name : 'Unknown'}</strong><br>
                            ${item.quantity} x $${parseFloat(item.unit_price).toFixed(2)} = <strong>$${parseFloat(item.subtotal).toFixed(2)}</strong>
                        </div>
                    `;
                })
                .join('');
        }

        if (totalInput) {
            totalInput.value = `$${parseFloat(this.cart.total_amount).toFixed(2)}`;
        }

        modal?.classList.add('active');
    }

    closeCheckoutModal() {
        const modal = document.getElementById('checkoutModal');
        modal?.classList.remove('active');
    }

    async handleConfirmOrder() {
        if (this.isLoading) return;

        try {
            this.isLoading = true;
            const notesInput = document.getElementById('orderNotes');
            const notes = notesInput?.value || '';

            const response = await createOrder(notes);

            if (response.success) {
                this.currentOrderId = response.data.id;
                this.closeCheckoutModal();
                this.cart = { items: [], total_amount: 0 };
                this.renderCart();
                this.showAlert('Order created successfully!', 'success');
                // Refresh stock levels
                await this.loadProducts();
            } else {
                this.showAlert(response.message || 'Failed to create order', 'error');
            }
        } catch (error) {
            console.error('Confirm Order Error:', error);
            this.showAlert('Failed to create order', 'error');
        } finally {
            this.isLoading = false;
        }
    }

    filterProducts() {
        const searchBox = document.getElementById('searchBox');
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
            const btn = document.getElementById(`add-${product.id}`);
            btn?.addEventListener('click', () => this.handleAddToCart(product.id));
        });
    }

    updateCartSummary() {
        const total = parseFloat(this.cart.total_amount) || 0;

        const subtotalEl = document.getElementById('subtotal');
        const totalEl = document.getElementById('totalAmount');

        if (subtotalEl) subtotalEl.textContent = `$${total.toFixed(2)}`;
        if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
    }

    updateCheckoutButton() {
        const btn = document.getElementById('checkoutBtn');
        if (btn) {
            btn.disabled = !this.cart.items || this.cart.items.length === 0;
        }
    }

    showAlert(message, type) {
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

new POSSystem();
