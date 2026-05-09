"use strict";
const API_BASE = '/routes/api.php';
const USER_HOME = '/user';
const ADMIN_HOME = '/admin';
const requestedNext = new URLSearchParams(window.location.search).get('next') || '';

function routeByRole(role) {
    return role === 'admin' ? ADMIN_HOME : USER_HOME;
}

function getNextPathForRole(role) {
    if (!requestedNext || !requestedNext.startsWith('/')) {
        return null;
    }
    if (role === 'admin' && requestedNext.startsWith('/admin')) {
        return requestedNext;
    }
    if (role !== 'admin' && requestedNext.startsWith('/user')) {
        return requestedNext;
    }
    return null;
}

function routeAfterAuth(role) {
    return getNextPathForRole(role) || routeByRole(role);
}

// Handle Login/Register
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

// Role selection handlers
const roleCustomer = document.getElementById('roleCustomer');
const roleMerchant = document.getElementById('roleMerchant');
const customerFields = document.getElementById('customerFields');
const merchantFields = document.getElementById('merchantFields');

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
fetch(`${API_BASE}?action=me`)
    .then((res) => {
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
    })
    .then((result) => {
        if (result.success) {
            window.location.href = routeAfterAuth(result.user?.role);
        }
    })
    .catch((error) => {
        console.error('Auth check error:', error);
        // Not logged in, that's fine
    });

// Login handler
// Login handler - updated to show the actual error
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('loginUser').value;
        const password = document.getElementById('loginPass').value;
        
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        
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
            
            // Get the response as text first
            const textResponse = await response.text();
            console.log('Raw response:', textResponse);
            
            // Try to parse as JSON
            try {
                const result = JSON.parse(textResponse);
                if (result.success) {
                    const role = result.user?.role;
                    window.location.href = routeAfterAuth(role);
                } else {
                    alert(result.message || 'Login failed');
                }
            } catch (jsonError) {
                console.error('Failed to parse JSON. Response was:', textResponse);
                alert('Server error. Check console for details.');
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

// Register handler
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const role = roleMerchant?.checked ? 'seller' : 'customer';
        const username = document.getElementById('registerUser').value;
        const password = document.getElementById('registerPass').value;
        const email = document.getElementById('registerEmail')?.value || '';
        const phone = document.getElementById('registerPhone')?.value || '';
        
        // Additional fields based on role
        const apiSecret = role === 'seller'
            ? document.getElementById('merchantSecret')?.value || null
            : null;
        
        const payload = {
            username,
            password,
            email: email || undefined,
            phone: phone || undefined,
            role
        };
        
        if (apiSecret) {
            payload.api_secret = apiSecret;
        }
        
        const submitBtn = document.getElementById('submitBtn');
        
        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Creating account...';
            }
            
            // FIXED: Added the missing fetch call here
            const response = await fetch(`${API_BASE}?action=register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
            
            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('Non-JSON response:', text.substring(0, 200));
                throw new Error('Server returned HTML instead of JSON');
            }
            
            const result = await response.json();
            
            if (result.success) {
                alert('Account created successfully!');
                if (result.user?.role) {
                    window.location.href = routeAfterAuth(result.user.role);
                } else {
                    // Redirect to login page after registration
                    window.location.href = '/login.html';
                }
            } else {
                alert(result.message || 'Registration failed.');
            }
        } catch (error) {
            console.error('Register Error:', error);
            alert('Unable to register right now. Please try again. Error: ' + error.message);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create my account';
            }
        }
    });
}