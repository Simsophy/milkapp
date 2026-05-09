const API_BASE = '/routes/api.php';

function routeByRole(role?: string): string {
    // Map roles to their home pages
    if (role === 'seller') {
        return '/admin'; // Seller/admin goes to dashboard
    }
    return '/user'; // Buyer/user goes to user dashboard
}

function routeAfterAuth(role?: string): string {
    return routeByRole(role);
}

// Handle Login/Register
const loginForm = document.getElementById('loginForm') as HTMLFormElement | null;
const registerForm = document.getElementById('registerForm') as HTMLFormElement | null;

// Role selection handlers
const roleCustomer = document.getElementById('roleCustomer') as HTMLInputElement | null;
const roleMerchant = document.getElementById('roleMerchant') as HTMLInputElement | null;
const customerFields = document.getElementById('customerFields') as HTMLElement | null;
const merchantFields = document.getElementById('merchantFields') as HTMLElement | null;

function toggleRoleFields() {
    if (customerFields && merchantFields) {
        if (roleMerchant?.checked) {
            merchantFields.classList.add('active');
            customerFields.classList.remove('active');
        } else {
            customerFields.classList.add('active');
            merchantFields.classList.remove('active');
        }
    }
}

if (roleCustomer) roleCustomer.addEventListener('change', toggleRoleFields);
if (roleMerchant) roleMerchant.addEventListener('change', toggleRoleFields);

// If already logged in, redirect
fetch(`${API_BASE}?action=me`, { credentials: 'include' })
    .then(async (res) => {
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        const text = await res.text();
        try {
            return JSON.parse(text);
        } catch {
            console.error('Auth check: Server returned non-JSON:', text.substring(0, 100));
            throw new Error('Invalid JSON response');
        }
    })
    .then((result) => {
        if (result.success) {
            window.location.href = routeAfterAuth(result.user?.role);
        }
    })
    .catch((error) => {
        console.log('Auth check:', error.message || 'Not logged in');
        // Not logged in, that's fine
    });

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = (document.getElementById('loginUser') as HTMLInputElement).value;
        const password = (document.getElementById('loginPass') as HTMLInputElement).value;
        const submitBtn = loginForm.querySelector('button[type="submit"]') as HTMLButtonElement | null;

        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Logging in...';
            }

            const response = await fetch(`${API_BASE}?action=login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });

            // Get response as text first to handle non-JSON responses
            const textResponse = await response.text();
            
            // Try to parse as JSON
            let result;
            try {
                result = JSON.parse(textResponse);
            } catch {
                console.error('Login: Server returned non-JSON:', textResponse.substring(0, 200));
                alert('Server error: Invalid response format. Please check the backend.');
                return;
            }

            if (result.success) {
                const role = result.user?.role;
                window.location.href = routeAfterAuth(role);
            } else {
                alert(result.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login Error:', error);
            alert('Unable to login right now. Please try again.');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Login';
            }
        }
    });
}

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const role = roleMerchant?.checked ? 'seller' : 'customer';
        const username = (document.getElementById('registerUser') as HTMLInputElement).value;
        const password = (document.getElementById('registerPass') as HTMLInputElement).value;
        const email = (document.getElementById('registerEmail') as HTMLInputElement).value;
        const phone = (document.getElementById('registerPhone') as HTMLInputElement).value;

        const apiSecret = role === 'seller'
            ? (document.getElementById('merchantSecret') as HTMLInputElement)?.value
            : null;

        const payload: any = {
            username,
            password,
            email: email || undefined,
            phone: phone || undefined,
            role
        };

      

        try {
            const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement | null;
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Creating account...';
            }

            const response = await fetch(`${API_BASE}?action=register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            // Get response as text first to handle non-JSON responses
            const textResponse = await response.text();
            
            // Try to parse as JSON
            let result;
            try {
                result = JSON.parse(textResponse);
            } catch {
                console.error('Register: Server returned non-JSON:', textResponse.substring(0, 200));
                alert('Server error: Invalid response format. Please check the backend.');
                return;
            }

            if (result.success) {
                alert('Account created successfully!');
                const role = result.user?.role;
                window.location.href = routeAfterAuth(role);
            } else {
                alert(result.message || 'Registration failed.');
            }
        } catch (error) {
            console.error('Register Error:', error);
            alert('Unable to register right now. Please try again.');
        } finally {
            const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement | null;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create my account';
            }
        }
    });
}
