import {
    fetchMe,
    logout,
    getInventory,
    checkStockAlerts,
    stockIn,
    stockOut,
    getSuppliers,
    getStockLogs
} from './api.js';
import { MilkProduct, StockAlert, Supplier } from './types.js';

interface InventoryProduct extends MilkProduct {
    min_stock_level?: number;
    reorder_quantity?: number;
    default_supplier_id?: number;
}

class InventoryDashboard {
    private products: InventoryProduct[] = [];
    private alerts: StockAlert[] = [];
    private suppliers: Supplier[] = [];
    private filteredProducts: InventoryProduct[] = [];

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

            this.bindEvents();
            await Promise.all([
                this.loadInventory(),
                this.loadAlerts(),
                this.loadSuppliers(),
                this.loadStockLogs()
            ]);
            this.renderInventory();
            this.updateStats();
        } catch (error) {
            console.error('[v0] Init Error:', error);
            window.location.href = 'login.html';
        }
    }

    private bindEvents(): void {
        // Logout
        const logoutBtn = document.getElementById('logoutBtn') as HTMLButtonElement;
        logoutBtn?.addEventListener('click', async () => {
            await logout();
            window.location.href = 'login.html';
        });

        // Create Product
        const createProductBtn = document.getElementById('createProductBtn') as HTMLButtonElement;
        createProductBtn?.addEventListener('click', () => this.showCreateProductModal());

        const closeCreateProductBtn = document.getElementById('closeCreateProductBtn') as HTMLButtonElement;
        closeCreateProductBtn?.addEventListener('click', () => this.closeCreateProductModal());

        const createProductForm = document.getElementById('createProductForm') as HTMLFormElement;
        createProductForm?.addEventListener('submit', (e) => this.handleCreateProduct(e));

        // Stock In Modal
        const stockInBtn = document.getElementById('stockInBtn') as HTMLButtonElement;
        stockInBtn?.addEventListener('click', () => this.showStockInModal());

        const closeStockInBtn = document.getElementById('closeStockInBtn') as HTMLButtonElement;
        closeStockInBtn?.addEventListener('click', () => this.closeStockInModal());

        const stockInForm = document.getElementById('stockInForm') as HTMLFormElement;
        stockInForm?.addEventListener('submit', (e) => this.handleStockIn(e));

        // Stock Out Modal
        const stockOutBtn = document.getElementById('stockOutBtn') as HTMLButtonElement;
        stockOutBtn?.addEventListener('click', () => this.showStockOutModal());

        const closeStockOutBtn = document.getElementById('closeStockOutBtn') as HTMLButtonElement;
        closeStockOutBtn?.addEventListener('click', () => this.closeStockOutModal());

        const stockOutForm = document.getElementById('stockOutForm') as HTMLFormElement;
        stockOutForm?.addEventListener('submit', (e) => this.handleStockOut(e));

        // Edit Product Modal
        const closeEditProductBtn = document.getElementById('closeEditProductBtn') as HTMLButtonElement;
        closeEditProductBtn?.addEventListener('click', () => this.closeEditProductModal());

        const editProductForm = document.getElementById('editProductForm') as HTMLFormElement;
        editProductForm?.addEventListener('submit', (e) => this.handleEditProduct(e));

        // Filters
        const searchInput = document.getElementById('searchInput') as HTMLInputElement;
        searchInput?.addEventListener('input', () => this.applyFilters());

        const categoryFilter = document.getElementById('categoryFilter') as HTMLSelectElement;
        categoryFilter?.addEventListener('change', () => this.applyFilters());

        const stockFilter = document.getElementById('stockFilter') as HTMLSelectElement;
        stockFilter?.addEventListener('change', () => this.applyFilters());
    }

    private async loadInventory(): Promise<void> {
        try {
            const response = await getInventory();
            if (response.success) {
                this.products = response.data;
                this.filteredProducts = [...this.products];
            }
        } catch (error) {
            console.error('[v0] Load Inventory Error:', error);
            this.showAlert('Failed to load inventory', 'error');
        }
    }

    private async loadAlerts(): Promise<void> {
        try {
            const response = await checkStockAlerts();
            if (response.success) {
                this.alerts = response.data;
                this.renderAlerts();
            }
        } catch (error) {
            console.error('[v0] Load Alerts Error:', error);
        }
    }

    private async loadSuppliers(): Promise<void> {
        try {
            const response = await getSuppliers();
            if (response.success) {
                this.suppliers = response.data;
                this.populateSupplierSelect();
            }
        } catch (error) {
            console.error('[v0] Load Suppliers Error:', error);
        }
    }

    private renderAlerts(): void {
        const container = document.getElementById('alertsContainer');
        if (!container) return;

        const criticalAlerts = this.alerts.filter(a => a.current_stock === 0);
        const lowAlerts = this.alerts.filter(a => a.current_stock > 0 && a.is_low_stock);

        if (criticalAlerts.length === 0 && lowAlerts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">✅</div>
                    <p>All items are in stock</p>
                </div>
            `;
            return;
        }

        const alertsHTML = [
            ...criticalAlerts.map(alert => this.createAlertCard(alert, 'critical')),
            ...lowAlerts.map(alert => this.createAlertCard(alert, 'low'))
        ].join('');

        container.innerHTML = alertsHTML;
    }

    private createAlertCard(alert: StockAlert, severity: 'critical' | 'low'): string {
        const percentage = (alert.current_stock / alert.min_stock_level) * 100;
        const severityLabel = severity === 'critical' ? 'OUT OF STOCK' : 'LOW STOCK';

        return `
            <div class="alert-card ${severity === 'critical' ? 'critical' : ''}">
                <div class="alert-title">${alert.product_name}</div>
                <div class="alert-content">
                    ${severityLabel}: ${alert.current_stock} / ${alert.min_stock_level}
                    <br>
                    <small>Reorder: ${alert.reorder_quantity} units</small>
                </div>
                <div class="alert-bar">
                    <div class="alert-progress" style="width: ${Math.min(percentage, 100)}%"></div>
                </div>
            </div>
        `;
    }

    private renderInventory(): void {
        const tbody = document.getElementById('inventoryTable');
        if (!tbody) return;

        if (this.filteredProducts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2rem;">
                        <div class="empty-state">
                            <div class="empty-state-icon">📦</div>
                            <p>No products found</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.filteredProducts
            .map(product => this.createProductRow(product))
            .join('');

        // Add event listeners for action buttons
        const actionButtons = tbody.querySelectorAll('button[data-action]');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const action = btn.getAttribute('data-action');
                const id = btn.getAttribute('data-id');
                
                if (action === 'edit' && id) {
                    this.openEditProductModal(parseInt(id));
                } else if (action === 'delete' && id) {
                    this.deleteProduct(parseInt(id));
                }
            });
        });
    }

    private createProductRow(product: InventoryProduct): string {
        const stock = product.stock || 0;
        const minLevel = product.min_stock_level || 5;
        const price = product.price || 0;

        let statusClass = 'status-available';
        let statusLabel = 'Available';

        if (stock === 0) {
            statusClass = 'status-critical';
            statusLabel = 'Out of Stock';
        } else if (stock <= minLevel) {
            statusClass = 'status-low';
            statusLabel = 'Low Stock';
        }

        return `
            <tr>
                <td class="product-cell">${product.name}</td>
                <td>${product.category || '-'}</td>
                <td class="price-cell">$${price.toFixed(2)}</td>
                <td class="stock-cell">${stock}</td>
                <td class="stock-cell">${minLevel}</td>
                <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                <td class="actions-cell">
                    <button type="button" class="btn-small btn-edit" data-action="edit" data-id="${product.id}">✏ Edit</button>
                    <button type="button" class="btn-small btn-edit" data-action="delete" data-id="${product.id}" style="background: #ef4444;">🗑 Delete</button>
                </td>
            </tr>
        `;
    }

    private showCreateProductModal(): void {
        const modal = document.getElementById('createProductModal');
        modal?.classList.add('active');
    }

    private closeCreateProductModal(): void {
        const modal = document.getElementById('createProductModal');
        modal?.classList.remove('active');
        const form = document.getElementById('createProductForm') as HTMLFormElement;
        form?.reset();
    }

    private closeEditProductModal(): void {
        const modal = document.getElementById('editProductModal');
        modal?.classList.remove('active');
        const form = document.getElementById('editProductForm') as HTMLFormElement;
        form?.reset();
    }

    private openEditProductModal(productId: number): void {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        const idInput = document.getElementById('editProductId') as HTMLInputElement;
        const nameInput = document.getElementById('editProductName') as HTMLInputElement;
        const categoryInput = document.getElementById('editProductCategory') as HTMLSelectElement;
        const priceInput = document.getElementById('editProductPrice') as HTMLInputElement;
        const stockInput = document.getElementById('editProductStock') as HTMLInputElement;
        const descInput = document.getElementById('editProductDescription') as HTMLTextAreaElement;

        idInput.value = String(product.id);
        nameInput.value = product.name;
        categoryInput.value = product.category || '';
        priceInput.value = String(product.price || 0);
        stockInput.value = String(product.stock || 0);
        descInput.value = product.description || '';

        const modal = document.getElementById('editProductModal');
        modal?.classList.add('active');
    }

    private async handleCreateProduct(e: Event): Promise<void> {
        e.preventDefault();

        const nameInput = document.getElementById('newProductName') as HTMLInputElement;
        const categoryInput = document.getElementById('newProductCategory') as HTMLSelectElement;
        const priceInput = document.getElementById('newProductPrice') as HTMLInputElement;
        const stockInput = document.getElementById('newProductStock') as HTMLInputElement;
        const descInput = document.getElementById('newProductDescription') as HTMLTextAreaElement;

        if (!nameInput.value || !categoryInput.value || !priceInput.value || stockInput.value === '') {
            this.showAlert('Please fill in all required fields', 'error');
            return;
        }

        try {
            const response = await fetch('/routes/api.php?action=products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    name: nameInput.value,
                    category: categoryInput.value,
                    price: parseFloat(priceInput.value),
                    stock: parseInt(stockInput.value),
                    description: descInput.value
                })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Failed to create product');
            }

            this.showAlert('✓ Product created successfully!', 'success');
            this.closeCreateProductModal();
            await this.loadInventory();
            this.renderInventory();
            this.updateStats();

        } catch (error) {
            this.showAlert(`Failed to create product: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }

    private async handleEditProduct(e: Event): Promise<void> {
        e.preventDefault();

        const idInput = document.getElementById('editProductId') as HTMLInputElement;
        const nameInput = document.getElementById('editProductName') as HTMLInputElement;
        const categoryInput = document.getElementById('editProductCategory') as HTMLSelectElement;
        const priceInput = document.getElementById('editProductPrice') as HTMLInputElement;
        const stockInput = document.getElementById('editProductStock') as HTMLInputElement;
        const descInput = document.getElementById('editProductDescription') as HTMLTextAreaElement;

        if (!nameInput.value || !categoryInput.value || !priceInput.value || stockInput.value === '') {
            this.showAlert('Please fill in all required fields', 'error');
            return;
        }

        const productId = parseInt(idInput.value);

        try {
            const response = await fetch(`/routes/api.php?action=product&id=${productId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    name: nameInput.value,
                    category: categoryInput.value,
                    price: parseFloat(priceInput.value),
                    stock: parseInt(stockInput.value),
                    description: descInput.value
                })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Failed to update product');
            }

            this.showAlert('✓ Product updated successfully!', 'success');
            this.closeEditProductModal();
            await this.loadInventory();
            this.renderInventory();
            this.updateStats();

        } catch (error) {
            this.showAlert(`Failed to update product: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }

    private async deleteProduct(productId: number): Promise<void> {
        if (!confirm('Are you sure you want to delete this product?')) {
            return;
        }

        try {
            const response = await fetch(`/routes/api.php?action=product&id=${productId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Failed to delete product');
            }

            this.showAlert('✓ Product deleted successfully!', 'success');
            await this.loadInventory();
            this.renderInventory();
            this.updateStats();

        } catch (error) {
            this.showAlert(`Failed to delete product: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }

    private applyFilters(): void {
        const searchInput = document.getElementById('searchInput') as HTMLInputElement;
        const categoryFilter = document.getElementById('categoryFilter') as HTMLSelectElement;
        const stockFilter = document.getElementById('stockFilter') as HTMLSelectElement;

        const search = (searchInput?.value || '').toLowerCase();
        const category = categoryFilter?.value || '';
        const stockLevel = stockFilter?.value || '';

        this.filteredProducts = this.products.filter(product => {
            // Search filter
            if (search && !product.name.toLowerCase().includes(search)) {
                return false;
            }

            // Category filter
            if (category && product.category !== category) {
                return false;
            }

            // Stock level filter
            const stock = product.stock || 0;
            const minLevel = product.min_stock_level || 5;

            if (stockLevel === 'critical' && stock !== 0) {
                return false;
            }
            if (stockLevel === 'low' && (stock === 0 || stock > minLevel)) {
                return false;
            }
            if (stockLevel === 'available' && stock <= minLevel) {
                return false;
            }

            return true;
        });

        this.renderInventory();
    }

    private showStockInModal(): void {
        this.populateProductSelect('productSelect');
        const modal = document.getElementById('stockInModal');
        modal?.classList.add('active');
    }

    private closeStockInModal(): void {
        const modal = document.getElementById('stockInModal');
        modal?.classList.remove('active');
        const form = document.getElementById('stockInForm') as HTMLFormElement;
        form?.reset();
    }

    private showStockOutModal(): void {
        this.populateProductSelect('productSelectOut');
        const modal = document.getElementById('stockOutModal');
        modal?.classList.add('active');
    }

    private closeStockOutModal(): void {
        const modal = document.getElementById('stockOutModal');
        modal?.classList.remove('active');
        const form = document.getElementById('stockOutForm') as HTMLFormElement;
        form?.reset();
    }

    private populateProductSelect(selectId: string): void {
        const select = document.getElementById(selectId) as HTMLSelectElement;
        if (!select) return;

        const options = this.products
            .map(p => `<option value="${p.id}">${p.name} (Stock: ${p.stock || 0})</option>`)
            .join('');

        select.innerHTML = '<option value="">Select a product...</option>' + options;
    }

    private populateSupplierSelect(): void {
        const select = document.getElementById('supplierSelect') as HTMLSelectElement;
        if (!select) return;

        const options = this.suppliers
            .map(s => `<option value="${s.id}">${s.name}</option>`)
            .join('');

        select.innerHTML = '<option value="">Select supplier...</option>' + options;
    }

    private async handleStockIn(e: Event): Promise<void> {
        e.preventDefault();

        const productId = parseInt((document.getElementById('productSelect') as HTMLSelectElement).value, 10);
        const quantity = parseInt((document.getElementById('quantityInput') as HTMLInputElement).value, 10);
        const supplierId = (document.getElementById('supplierSelect') as HTMLSelectElement).value || undefined;
        const notes = (document.getElementById('notesInput') as HTMLTextAreaElement).value;

        if (!productId || !quantity || quantity <= 0) {
            this.showAlert('Please fill in all required fields', 'error');
            return;
        }

        try {
            const response = await stockIn(productId, quantity, supplierId ? parseInt(supplierId, 10) : undefined, notes);

            if (response.success) {
                this.showAlert(`Stock added successfully!`, 'success');
                this.closeStockInModal();
                await this.loadInventory();
                await this.loadAlerts();
                this.renderInventory();
                this.updateStats();
            } else {
                this.showAlert(response.message || 'Failed to add stock', 'error');
            }
        } catch (error) {
            console.error('[v0] Stock In Error:', error);
            this.showAlert('Failed to add stock', 'error');
        }
    }

    private async handleStockOut(e: Event): Promise<void> {
        e.preventDefault();

        const productId = parseInt((document.getElementById('productSelectOut') as HTMLSelectElement).value, 10);
        const quantity = parseInt((document.getElementById('quantityInputOut') as HTMLInputElement).value, 10);
        const reason = (document.getElementById('reasonInputOut') as HTMLTextAreaElement).value;

        if (!productId || !quantity || quantity <= 0) {
            this.showAlert('Please fill in all required fields', 'error');
            return;
        }

        try {
            const response = await stockOut(productId, quantity, reason);

            if (response.success) {
                this.showAlert(`Stock removed successfully!`, 'success');
                this.closeStockOutModal();
                await this.loadInventory();
                await this.loadAlerts();
                this.renderInventory();
                this.updateStats();
            } else {
                this.showAlert(response.message || 'Failed to remove stock', 'error');
            }
        } catch (error) {
            console.error('[v0] Stock Out Error:', error);
            this.showAlert('Failed to remove stock', 'error');
        }
    }

    private async loadStockLogs(): Promise<void> {
        try {
            const response = await getStockLogs();
            if (response.success) {
                this.renderStockLogs(response.data);
            }
        } catch (error) {
            console.error('[v0] Load Stock Logs Error:', error);
        }
    }

    private renderStockLogs(logs: any[]): void {
        const tbody = document.getElementById('stockLogTable');
        if (!tbody) return;

        if (!logs || logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;">No logs available</td></tr>';
            return;
        }

        tbody.innerHTML = logs.map(log => `
            <tr>
                <td>${new Date(log.created_at).toLocaleString()}</td>
                <td>${log.product_name}</td>
                <td><span class="status-badge ${log.type === 'IN' ? 'status-available' : 'status-critical'}">${log.type}</span></td>
                <td>${log.quantity}</td>
                <td>${log.reference_type || '-'}</td>
                <td>${log.notes || '-'}</td>
            </tr>
        `).join('');
    }

    private updateStats(): void {
        const totalProducts = this.products.length;
        const lowStockCount = this.alerts.length;
        const totalValue = this.products.reduce((sum, p) => sum + ((p.stock || 0) * (p.price || 0)), 0);

        const totalProductsEl = document.getElementById('totalProducts');
        const lowStockCountEl = document.getElementById('lowStockCount');
        const totalValueEl = document.getElementById('totalValue');

        if (totalProductsEl) totalProductsEl.textContent = totalProducts.toString();
        if (lowStockCountEl) lowStockCountEl.textContent = lowStockCount.toString();
        if (totalValueEl) totalValueEl.textContent = `$${totalValue.toFixed(2)}`;
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

// Initialize Inventory Dashboard
new InventoryDashboard();
