const API_BASE = '/api';

let currentTab = 'login';

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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
            errorEl.textContent = data.error ?? 'Something went wrong';
            errorEl.classList.remove('hidden');
            return;
        }

        localStorage.setItem('sw_token', data.token);
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
    document.getElementById('authModal').classList.add('hidden');
    document.getElementById('authUserEmail').textContent = email;
}

function logout() {
    localStorage.removeItem('sw_token');
    localStorage.removeItem('sw_email');
    document.getElementById('authModal').classList.remove('hidden');
    document.getElementById('authEmail').value = '';
    document.getElementById('authPassword').value = '';
}

// On page load — skip the modal if already logged in
(function init() {
    const token = localStorage.getItem('sw_token');
    const email = localStorage.getItem('sw_email');
    if (token && email) {
        showApp(email);
    }
})();
