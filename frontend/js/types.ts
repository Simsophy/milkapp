export interface MilkProduct {
    id: number;
    name: string;
    image?: string;
    category: string;
    price?: number;
    stock?: number;
    image_url?: string | null;
    isFeatured?: boolean; // For the blue highlighted card
}

export interface ProductApiResponse {
    success: boolean;
    data: MilkProduct[];
    message?: string;
}

export interface AuthUser {
    id: number;
    username: string;
    role: string;
}

export interface MeApiResponse {
    success: boolean;
    user?: AuthUser;
    message?: string;
}

export interface AuthActionResponse {
    success: boolean;
    message?: string;
}


export interface QRGenerateResponse {
    success: boolean;
    message?: string;
    data: {
        order_id: string;
        qr_code?: string;
        qr_token?: string;
        amount: number;
        currency: string;
    };
}

export interface QRVerifyResponse {
    success: boolean;
    message?: string;
    data: {
        valid: boolean;
        already_paid: boolean;
        amount: number;
      
      
    };
}

export interface PaymentConfirmResponse {
    success: boolean;
    message?: string;
    data: {
        transaction_id?: string;
        order_id: string;
        amount: number;
        status: string;
    };
}

export interface TransactionStatusResponse {
    success: boolean;
    message?: string;
    data: {
        transaction_id: string;
        status: string;
        amount: number;
        currency: string;
        created_at?: string;
        completed_at?: string;
    };
}



export interface TransactionsResponse {
    success: boolean;
    message?: string;
   
}

// POS System Types

export interface CartItem {
    product_id: number;
    quantity: number;
    unit_price: number;
    subtotal: number;
}

export interface Cart {
    items: CartItem[];
    total_amount: number;
}

export interface CartResponse {
    success: boolean;
    message?: string;
    data: Cart;
}

export interface OrderItem {
    id: number;
    order_id: number;
    product_id: number;
    quantity: number;
    unit_price: number;
    subtotal: number;
    created_at: string;
}

export interface Order {
    id: number;
    user_id?: number;
    total_amount: number;
    status: 'pending' | 'paid' | 'completed' | 'cancelled';
    payment_method?: string;
   
    notes?: string;
    items?: OrderItem[];
    created_at: string;
    updated_at: string;
}

export interface OrderResponse {
    success: boolean;
    message?: string;
    data: Order;
}

export interface OrdersResponse {
    success: boolean;
    message?: string;
    data: Order[];
}

export interface StockLog {
    id: number;
    product_id: number;
    type: 'IN' | 'OUT';
    quantity: number;
    reference_type?: string;
    reference_id?: number;
    notes?: string;
    created_by?: number;
    created_at: string;
}

export interface StockLogsResponse {
    success: boolean;
    message?: string;
    data: StockLog[];
}

export interface Supplier {
    id: number;
    name: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface SuppliersResponse {
    success: boolean;
    message?: string;
    data: Supplier[];
}

export interface ProductStockSettings {
    id: number;
    product_id: number;
    min_stock_level: number;
    reorder_quantity: number;
    default_supplier_id?: number;
    created_at: string;
    updated_at: string;
}

export interface StockAlert {
    product_id: number;
    product_name: string;
    current_stock: number;
    min_stock_level: number;
    is_low_stock: boolean;
    reorder_quantity: number;
}

export interface StockAlertsResponse {
    success: boolean;
    message?: string;
    data: StockAlert[];
}
