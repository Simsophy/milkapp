// Use 'var' or window check to allow re-declaration across different files
if (typeof ROLE_API === 'undefined') {
    var ROLE_API = '/routes/api.php?action=me';
}

async function getCurrentUser() {
    try {
        const res = await fetch(ROLE_API, {
            credentials: 'include'
        });

        if (!res.ok) return null;

        const payload = await res.json();
        return payload.success ? payload.user : null;

    } catch {
        return null;
    }
}

/*
|--------------------------------------------------------------------------
| SHOW/HIDE ADMIN ELEMENTS
|--------------------------------------------------------------------------
*/
function markAdminOnlyNav(role) {
    document.querySelectorAll('.admin-only').forEach((el) => {
        el.style.display =
            (role === 'admin' || role === 'seller')
                ? ''
                : 'none';
    });
}

/*
|--------------------------------------------------------------------------
| ADMIN-ONLY ACCESS
|--------------------------------------------------------------------------
*/
async function enforceAdminOnly() {

    const user = await getCurrentUser();

    if (!user) {
        window.location.href = '/login';
        return null;
    }

    // Only admin can access
    if (user.role !== 'admin') {
        window.location.href = '/index.html';
        return null;
    }

    markAdminOnlyNav(user.role);

    return user;
}

/*
|--------------------------------------------------------------------------
| ADMIN + SELLER ACCESS
|--------------------------------------------------------------------------
*/
async function enforceAdminDashboard() {

    const user = await getCurrentUser();

    if (!user) {
        window.location.href = '/login';
        return null;
    }

    // Only admin & seller can access admin dashboard
    if (user.role !== 'admin' && user.role !== 'seller') {
        window.location.href = '/index.html';
        return null;
    }

    markAdminOnlyNav(user.role);

    return user;
}

/*
|--------------------------------------------------------------------------
| CUSTOMER DASHBOARD (User pages - NO login required)
|--------------------------------------------------------------------------
*/
async function enforceCustomerDashboard() {

    const user = await getCurrentUser();

    // If user is authenticated as admin/seller, redirect them to admin dashboard
    if (user && (user.role === 'admin' || user.role === 'seller')) {
        window.location.href = '/admin';
        return null;
    }

    // Mark admin nav items if user is authenticated
    if (user) {
        markAdminOnlyNav(user.role);
    }

    // Allow unauthenticated users to view customer pages
    // Return user object if authenticated, or null if not (but don't redirect)
    return user || null;
}

/*
|--------------------------------------------------------------------------
| GENERAL USER OR ADMIN (User pages - NO login required)
|--------------------------------------------------------------------------
*/
async function enforceUserOrAdmin() {

    const user = await getCurrentUser();

    // Mark admin nav items if user is authenticated
    if (user) {
        markAdminOnlyNav(user.role);
    }

    // Allow both authenticated and unauthenticated users
    // Return user object if authenticated, or null if not (but don't redirect)
    return user || null;
}

/*
|--------------------------------------------------------------------------
| API BASE
|--------------------------------------------------------------------------
*/
if (typeof API_BASE === 'undefined') {
    var API_BASE = '/routes/api.php';
}

/*
|--------------------------------------------------------------------------
| LOGOUT
|--------------------------------------------------------------------------
*/
function setupLogoutButton() {

    const logoutBtn = document.querySelector('.nav-logout');

    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', async (e) => {

        e.preventDefault();

        await fetch(`${API_BASE}?action=logout`, {
            credentials: 'include'
        });

        window.location.href = '/login';
    });
}

window.addEventListener('DOMContentLoaded', () => {
    setupLogoutButton();
});