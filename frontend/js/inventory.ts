import {
    fetchMe,
    logout,
    getInventory,
    checkStockAlerts,
    stockIn,
    stockOut,
    getSuppliers
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
                this.loadSuppliers()
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

        // Add event listeners for edit buttons
        this.filteredProducts.forEach(product => {
            const editBtn = document.getElementById(`edit-${product.id}`);
            editBtn?.addEventListener('click', () => this.handleEditProduct(product.id));
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
                    <button id="edit-${product.id}" class="btn-small btn-edit">Adjust</button>
                </td>
            </tr>
        `;
    }

    private handleEditProduct(productId: number): void {
        const product = this.products.find(p => p.id === productId);
        if (product) {
            console.log('[v0] Edit product:', product);
            // Could open a modal for editing min stock level, etc.
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
