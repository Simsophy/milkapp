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
| CUSTOMER DASHBOARD
|--------------------------------------------------------------------------
*/
async function enforceCustomerDashboard() {

    const user = await getCurrentUser();

    if (!user) {
        window.location.href = '/login';
        return null;
    }

    // Admin & seller go to admin dashboard
    if (user.role === 'admin' || user.role === 'seller') {
        window.location.href = '/admin';
        return null;
    }

    markAdminOnlyNav(user.role);

    return user;
}

/*
|--------------------------------------------------------------------------
| GENERAL USER OR ADMIN
|--------------------------------------------------------------------------
*/
async function enforceUserOrAdmin() {

    const user = await getCurrentUser();

    if (!user) {
        window.location.href = '/login';
        return null;
    }

    markAdminOnlyNav(user.role);

    return user;
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