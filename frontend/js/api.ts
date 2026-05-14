// api.ts
import {
    AuthActionResponse,
    MeApiResponse,
    ProductApiResponse,
    QRGenerateResponse,
    QRVerifyResponse,
    PaymentConfirmResponse,
    TransactionStatusResponse,
    TransactionsResponse,
    CartResponse,
    OrderResponse,
    OrdersResponse,
    StockLogsResponse,
    SuppliersResponse,
    StockAlertsResponse
} from './types.js';

const API_BASE = '/routes/api.php';

type HttpMethod = 'GET' | 'POST';

async function requestJson<T>(
    action: string,
    method: HttpMethod = 'GET',
    body?: unknown
): Promise<T> {
    const response = await fetch(`${API_BASE}?action=${action}`, {
        method,
        credentials: 'include', // ✅ IMPORTANT FIX
        headers: method === 'POST'
            ? { 'Content-Type': 'application/json' }
            : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
        throw new Error(`Request failed (${action}): ${response.status}`);
    }

    return response.json() as Promise<T>;
}

// AUTH
export const fetchMe = () => requestJson<MeApiResponse>('me');
export const login = (username: string, password: string) =>
    requestJson<AuthActionResponse>('login', 'POST', { username, password });

export const register = (payload: any) =>
    requestJson<AuthActionResponse>('register', 'POST', payload);

export const logout = () =>
    requestJson<AuthActionResponse>('logout');

// PRODUCTS
export const fetchProducts = () =>
    requestJson<ProductApiResponse>('products');

export const createProduct = (productData: {
    name: string;
    price: number;
    stock: number;
    category: string;
    description?: string;
    image_url?: string;
}) =>
    requestJson<ProductApiResponse>('products', 'POST', productData);

// PAYMENTS
export const generatePaymentQR = (amount: number, description?: string, orderId?: string) =>
    requestJson<QRGenerateResponse>('generate-qr', 'POST', {
        amount,
        description,
        order_id: orderId
    });

export const scanAndVerifyQR = (qrData: string) =>
    requestJson<QRVerifyResponse>('verify-qr', 'POST', {
        qr_data: qrData
    });

export const confirmPayment = (qrToken: string, orderId: string, amount?: number) =>
    requestJson<PaymentConfirmResponse>('confirm-payment', 'POST', {
        qr_token: qrToken,
        order_id: orderId,
        amount
    });

export const getTransactionStatus = (transactionId: string) =>
    requestJson<TransactionStatusResponse>('transaction-status', 'POST', {
        transaction_id: transactionId
    });

export const getMyTransactions = () =>
    requestJson<TransactionsResponse>('my-transactions');

// POS - CART MANAGEMENT
export const getCart = () =>
    requestJson<CartResponse>('get-cart');

export const addToCart = (productId: number, quantity: number) =>
    requestJson<CartResponse>('add-to-cart', 'POST', {
        product_id: productId,
        quantity
    });

export const updateCartItem = (productId: number, quantity: number) =>
    requestJson<CartResponse>('update-cart-item', 'POST', {
        product_id: productId,
        quantity
    });

export const removeFromCart = (productId: number) =>
    requestJson<CartResponse>('remove-from-cart', 'POST', {
        product_id: productId
    });

export const clearCart = () =>
    requestJson<CartResponse>('clear-cart', 'POST', {});

// POS - ORDER MANAGEMENT
export const createOrder = (notes?: string) =>
    requestJson<OrderResponse>('create-order', 'POST', {
        notes
    });

export const getOrders = () =>
    requestJson<OrdersResponse>('get-orders');

export const getOrderById = (orderId: number) =>
    requestJson<OrderResponse>('get-order', 'POST', {
        order_id: orderId
    });

export const updateOrderStatus = (orderId: number, status: string) =>
    requestJson<OrderResponse>('update-order-status', 'POST', {
        order_id: orderId,
        status
    });

// INVENTORY - STOCK INFORMATION
export const getInventory = () =>
    requestJson<ProductApiResponse>('get-inventory');

export const checkStockAlerts = () =>
    requestJson<StockAlertsResponse>('check-stock-alerts');

export const getProductStock = (productId: number) =>
    requestJson<any>('get-product-stock', 'POST', {
        product_id: productId
    });

// STOCK TRACKING
export const stockIn = (productId: number, quantity: number, supplierId?: number, notes?: string) =>
    requestJson<any>('stock-in', 'POST', {
        product_id: productId,
        quantity,
        supplier_id: supplierId,
        notes
    });

export const stockOut = (productId: number, quantity: number, notes?: string) =>
    requestJson<any>('stock-out', 'POST', {
        product_id: productId,
        quantity,
        notes
    });

export const getStockLogs = (productId?: number, limit: number = 50) =>
    requestJson<StockLogsResponse>('get-stock-logs', 'POST', {
        product_id: productId,
        limit
    });

export const updateProductStock = (productId: number, quantity: number, notes?: string) =>
    requestJson<any>('update-product-stock', 'POST', {
        product_id: productId,
        quantity,
        notes
    });

// SUPPLIERS
export const getSuppliers = () =>
    requestJson<SuppliersResponse>('get-suppliers');

export const createSupplier = (name: string, contactPerson?: string, phone?: string, email?: string, address?: string) =>
    requestJson<any>('create-supplier', 'POST', {
        name,
        contact_person: contactPerson,
        phone,
        email,
        address
    });

export const updateSupplier = (supplierId: number, updates: any) =>
    requestJson<any>('update-supplier', 'POST', {
        supplier_id: supplierId,
        ...updates
    });

export const deleteSupplier = (supplierId: number) =>
    requestJson<any>('delete-supplier', 'POST', {
        supplier_id: supplierId
    });
