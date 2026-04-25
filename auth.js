const API_BASE = '/api';

// Tracks whether the current session is authenticated.
// Defined here (auth.js loads before script.js) so script.js can read it.
let isLoggedIn = false;

let currentTab = 'login';
let pollInterval = null;
const POLL_INTERVAL_MS = 30000;

function switchAuthTab(tab) {
    currentTab = tab;
    const isLogin = tab === 'login';

    document.getElementById('tabLogin').className =
        'flex-1 py-1.5 text-sm font-medium rounded-md transition-all ' +
        (isLogin ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700');
    document.getElementById('tabRegister').className =
        'flex-1 py-1.5 text-sm font-medium rounded-md transition-all ' +
        (!isLogin ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700');

    document.getElementById('authSubmit').textContent = isLogin ? 'Login' : 'Create Account';
    document.getElementById('authError').classList.add('hidden');
}

async function handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const errorEl = document.getElementById('authError');
    const submitBtn = document.getElementById('authSubmit');

    errorEl.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Please wait...';

    try {
        const res = await fetch(`${API_BASE}/auth/${currentTab === 'login' ? 'login' : 'register'}`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
            errorEl.textContent = data.error ?? 'Something went wrong';
            errorEl.classList.remove('hidden');
            return;
        }

        // Token is now in an HttpOnly cookie — store only the non-secret email for UI use
        localStorage.setItem('sw_email', data.user.email);
        showApp(data.user.email);
    } catch {
        errorEl.textContent = 'Network error — is the server running?';
        errorEl.classList.remove('hidden');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = currentTab === 'login' ? 'Login' : 'Create Account';
    }
}

function showApp(email) {
    isLoggedIn = true;
    document.getElementById('authModal').classList.add('hidden');
    const emailElement = document.getElementById('authUserEmail');
    if (emailElement) {
        emailElement.textContent = email;
        emailElement.parentElement.style.display = 'block';
    }
    if (typeof loadExpenses === 'function') loadExpenses();
    clearInterval(pollInterval);
    pollInterval = setInterval(() => {
        if (typeof loadExpenses === 'function') loadExpenses();
    }, POLL_INTERVAL_MS);
}

async function logout() {
    clearInterval(pollInterval);
    pollInterval = null;
    isLoggedIn = false;

    // Clear the HttpOnly cookie server-side
    try {
        await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch {}

    localStorage.removeItem('sw_email');

    if (typeof expense !== 'undefined') {
        expense = [];
        if (typeof updateSummary === 'function') updateSummary();
        if (typeof renderExpenses === 'function') renderExpenses();
        if (typeof updateExpenseChart === 'function') updateExpenseChart();
    }
    document.getElementById('authModal').classList.remove('hidden');
    document.getElementById('authEmail').value = '';
    document.getElementById('authPassword').value = '';
}

// On page load — verify session with the server using the HttpOnly cookie.
// If valid, skip the auth modal. If not, leave it visible.
(async function init() {
    const cachedEmail = localStorage.getItem('sw_email');
    if (!cachedEmail) return;

    try {
        const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
        if (res.ok) {
            const data = await res.json();
            localStorage.setItem('sw_email', data.email);
            showApp(data.email);
        }
    } catch {}
})();
