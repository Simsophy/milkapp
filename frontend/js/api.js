const API_BASE = '/routes/api.php';
async function requestJson(action, method = 'GET', body) {
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
    return response.json();
}
// AUTH
export const fetchMe = () => requestJson('me');
export const login = (username, password) => requestJson('login', 'POST', { username, password });
export const register = (payload) => requestJson('register', 'POST', payload);
export const logout = () => requestJson('logout');
// PRODUCTS
export const fetchProducts = () => requestJson('products');
// PAYMENTS
export const generatePaymentQR = (amount, description, orderId) => requestJson('generate-qr', 'POST', {
    amount,
    description,
    order_id: orderId
});
export const scanAndVerifyQR = (qrData) => requestJson('verify-qr', 'POST', {
    qr_data: qrData
});
export const confirmPayment = (qrToken, orderId, amount) => requestJson('confirm-payment', 'POST', {
    qr_token: qrToken,
    order_id: orderId,
    amount
});
export const getTransactionStatus = (transactionId) => requestJson('transaction-status', 'POST', {
    transaction_id: transactionId
});
export const getMyTransactions = () => requestJson('my-transactions');
