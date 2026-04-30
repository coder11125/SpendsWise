// --- API SYNC ---
// Auth state is owned by auth.js (isLoggedIn). apiFetch relies on the
// HttpOnly session cookie being sent automatically via credentials:'include'.
async function apiFetch(path, options = {}) {
    return fetch(`${API_BASE}${path}`, {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            // C1: csrfToken is defined in auth.js (loads first). The server only
            // validates this header on non-GET requests, so including it always is safe.
            'x-csrf-token': csrfToken ?? '',
            ...(options.headers ?? {}),
        },
    });
}

function mapServerExpense(exp) {
    return {
        id: exp._id,
        type: exp.type,
        amount: exp.amount,
        category: exp.category,
        date: (exp.date ?? '').substring(0, 10),
        familyMember: exp.familyMember ?? '',
        note: exp.note ?? '',
        currency: exp.currency ?? 'USD',
    };
}

async function loadExpenses() {
    if (!isLoggedIn) return;
    try {
        const res = await apiFetch('/expenses');
        if (!res.ok) return;
        const data = await res.json();
        expense = data.map(mapServerExpense);
        updateSummary();
        renderExpenses();
        updateExpenseChart();
        if (currentFilter === 'income') renderIncomeView();
        else if (currentFilter === 'expense') renderExpenseView();
        else if (currentFilter === 'history') renderHistoryView();
    } catch (err) {
        console.error('Failed to load expense:', err);
    }
}

// --- DATA & STATE ---
// In-memory state (Single session as per guidelines)
let expense = [];
let currentCurrency = localStorage.getItem('sw_currency') || 'USD';
let familyMembers = []; // State for explicitly added family members
let currentFilter = 'all'; // Current sidebar filter view
let dashboardTrendRange = 'month';
let expenseTrendRange = 'month';
let budgetGoals = JSON.parse(localStorage.getItem('sw_budget_goals') || '{}');

function setFamilyMembers(members) {
    familyMembers = Array.isArray(members) ? [...members] : [];
    renderManageMembers();
    updateFamilyMemberSelect();
}

function clearFamilyMembers() {
    setFamilyMembers([]);
}

// Comprehensive list of active global currencies
const currencies = [
    "AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AUD", "AWG", "AZN", "BAM", "BBD", "BDT", "BGN", "BHD", "BIF", "BMD", "BND", "BOB", "BRL", "BSD", "BTN", "BWP", "BYN", "BZD", "CAD", "CDF", "CHF", "CLP", "CNY", "COP", "CRC", "CUP", "CVE", "CZK", "DJF", "DKK", "DOP", "DZD", "EGP", "ERN", "ETB", "EUR", "FJD", "FKP", "FOK", "GBP", "GEL", "GGP", "GHS", "GIP", "GMD", "GNF", "GTQ", "GYD", "HKD", "HNL", "HRK", "HTG", "HUF", "IDR", "ILS", "IMP", "INR", "IQD", "IRR", "ISK", "JEP", "JMD", "JOD", "JPY", "KES", "KGS", "KHR", "KID", "KMF", "KRW", "KWD", "KYD", "KZT", "LAK", "LBP", "LKR", "LRD", "LSL", "LYD", "MAD", "MDL", "MGA", "MKD", "MMK", "MNT", "MOP", "MRU", "MUR", "MVR", "MWK", "MXN", "MYR", "MZN", "NAD", "NGN", "NIO", "NOK", "NPR", "NZD", "OMR", "PAB", "PEN", "PGK", "PHP", "PKR", "PLN", "PYG", "QAR", "RON", "RSD", "RUB", "RWF", "SAR", "SBD", "SCR", "SDG", "SEK", "SGD", "SHP", "SLE", "SLL", "SOS", "SRD", "SSP", "STN", "SYP", "SZL", "THB", "TJS", "TMT", "TND", "TOP", "TRY", "TTD", "TVD", "TWD", "TZS", "UAH", "UGX", "USD", "UYU", "UZS", "VES", "VND", "VUV", "WST", "XAF", "XCD", "XDR", "XOF", "XPF", "YER", "ZAR", "ZMW", "ZWL"
];

// Chart Colors
const chartColors = [
    '#f43f5e', '#f97316', '#f59e0b', '#84cc16', 
    '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', 
    '#d946ef', '#64748b'
];

// Category Icons Map
const categoryIcons = {
    'Food & Dining': 'ph-hamburger',
    'Housing': 'ph-house',
    'Transportation': 'ph-car',
    'Utilities': 'ph-lightbulb',
    'Entertainment': 'ph-game-controller',
    'Healthcare': 'ph-first-aid',
    'Shopping': 'ph-shopping-bag',
    'Salary': 'ph-money',
    'Freelance': 'ph-laptop',
    'Investments': 'ph-chart-line-up',
    'Gifts': 'ph-gift',
    'Other': 'ph-dots-three-circle'
};

// Popular currencies for quick access
const popularCurrencies = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY", "INR", "MXN", "BRL", "RUB"];

// --- DOM ELEMENTS ---
const currencyButton = document.getElementById('currencyButton');
const currentCurrencyEl = document.getElementById('currentCurrency');
const totalBalanceEl = document.getElementById('totalBalance');
const totalIncomeEl = document.getElementById('totalIncome');
const totalExpenseEl = document.getElementById('totalExpense');
const form = document.getElementById('expenseForm');
const dateInput = document.getElementById('date');
const expenseList = document.getElementById('expenseList');
const emptyState = document.getElementById('emptyState');
const expenseCount = document.getElementById('expenseCount');
const typeRadios = document.querySelectorAll('input[name="type"]');
const categorySelect = document.getElementById('category');
const expenseCategories = document.getElementById('expenseCategories');
const incomeCategories = document.getElementById('incomeCategories');
const currencySymbolSpan = document.getElementById('currencySymbol');
const canvas = document.getElementById('expenseChart');
const ctx = canvas.getContext('2d');
const chartLegend = document.getElementById('chartLegend');
const chartTotalValue = document.getElementById('chartTotalValue');
const chartCenterText = document.getElementById('chartCenterText');
const dashboardTrendCanvas = document.getElementById('dashboardExpenseTrendChart');
const dashboardTrendCtx = dashboardTrendCanvas.getContext('2d');
const dashboardTrendLabel = document.getElementById('dashboardTrendLabel');
const dashboardTrendTotal = document.getElementById('dashboardTrendTotal');
const dashboardTrendAverage = document.getElementById('dashboardTrendAverage');
const dashboardTrendEmpty = document.getElementById('dashboardTrendEmpty');

// View Elements
const dashboardView = document.getElementById('dashboardView');
const incomeView = document.getElementById('incomeView');
const expenseView = document.getElementById('expenseView');
const historyView = document.getElementById('historyView');
const viewContents = document.querySelectorAll('.view-content');

// Income View Elements
const incomeViewTotal = document.getElementById('incomeViewTotal');
const incomeViewCount = document.getElementById('incomeViewCount');
const incomeViewAverage = document.getElementById('incomeViewAverage');
const incomeExpenseCount = document.getElementById('incomeExpenseCount');
const incomeEmptyState = document.getElementById('incomeEmptyState');
const incomeExpenseList = document.getElementById('incomeExpenseList');

// Expense View Elements
const expenseViewTotal = document.getElementById('expenseViewTotal');
const expenseViewCount = document.getElementById('expenseViewCount');
const expenseViewAverage = document.getElementById('expenseViewAverage');
const expenseEntryCount = document.getElementById('expenseEntryCount');
const expenseEmptyState = document.getElementById('expenseEmptyState');
const expenseEntryList = document.getElementById('expenseEntryList');
const expenseCanvas = document.getElementById('expenseChartExpenseView');
const expenseCtx = expenseCanvas.getContext('2d');
const expenseChartLegend = document.getElementById('expenseChartLegend');
const expenseChartTotalValue = document.getElementById('expenseChartTotalValue');
const topExpenseCategories = document.getElementById('topExpenseCategories');
const expenseTrendCanvas = document.getElementById('expenseTrendChart');
const expenseTrendCtx = expenseTrendCanvas.getContext('2d');
const expenseTrendLabel = document.getElementById('expenseTrendLabel');
const expenseTrendTotal = document.getElementById('expenseTrendTotal');
const expenseTrendAverage = document.getElementById('expenseTrendAverage');
const expenseTrendEmpty = document.getElementById('expenseTrendEmpty');

// History View Elements
const historySearch = document.getElementById('historySearch');
const historyTypeFilter = document.getElementById('historyTypeFilter');
const historyCategoryFilter = document.getElementById('historyCategoryFilter');
const historySortBy = document.getElementById('historySortBy');
const historyExpenseCount = document.getElementById('historyExpenseCount');
const historyEmptyState = document.getElementById('historyEmptyState');
const historyExpenseList = document.getElementById('historyExpenseList');

// Account View Elements
const accountView = document.getElementById('accountView');
const accountAvatar = document.getElementById('accountAvatar');
const accountEmail = document.getElementById('accountEmail');
const accountMemberSince = document.getElementById('accountMemberSince');
const accountTotalTx = document.getElementById('accountTotalTx');
const accountTotalIncome = document.getElementById('accountTotalIncome');
const accountTotalExpense = document.getElementById('accountTotalExpense');
const accountNetBalance = document.getElementById('accountNetBalance');

// Currency Modal Elements
const currencyModal = document.getElementById('currencyModal');
const closeCurrencyModalBtn = document.getElementById('closeCurrencyModalBtn');
const currencySearch = document.getElementById('currencySearch');
const popularCurrenciesEl = document.getElementById('popularCurrencies');
const allCurrenciesEl = document.getElementById('allCurrencies');

// Sidebar & Modal Elements
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const sidebarLinks = document.querySelectorAll('.sidebar-link');
const sidebarPeopleBtn = document.getElementById('sidebarPeopleBtn');
const personModal = document.getElementById('personModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const csvImportInput = document.getElementById('csvImportInput');
const importModal = document.getElementById('importModal');
const deleteAllModal = document.getElementById('deleteAllModal');
const closeDeleteAllModalBtn = document.getElementById('closeDeleteAllModalBtn');
const cancelDeleteAllBtn = document.getElementById('cancelDeleteAllBtn');
const confirmDeleteAllBtn = document.getElementById('confirmDeleteAllBtn');
const deleteAllError = document.getElementById('deleteAllError');
const addPersonForm = document.getElementById('addPersonForm');
const newPersonName = document.getElementById('newPersonName');
const managedMembersList = document.getElementById('managedMembersList');
const noMembersState = document.getElementById('noMembersState');
const familyMemberSelect = document.getElementById('familyMember');

// --- INITIALIZATION ---
function init() {
    // Initialize Currency Selector
    initializeCurrencySelector();

    // Initialize Modern Date Picker (Flatpickr) — store instance to avoid re-initializing on reset
    window.datePicker = flatpickr("#date", {
        defaultDate: "today",
        dateFormat: "Y-m-d",
        disableMobile: true // Ensures the custom modern UI shows on mobile devices instead of native pickers
    });

    // Event Listeners
    currencyButton.addEventListener('click', () => {
        openCurrencyModal();
    });

    form.addEventListener('submit', addExpense);

    updateDarkModeToggle(document.documentElement.classList.contains('dark'));

    csvImportInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const text = await file.text();
        await processImportCSV(text);
    });

    // Mobile Menu Listeners
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('-translate-x-full');
            sidebarOverlay.classList.toggle('hidden');
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.add('-translate-x-full');
            sidebarOverlay.classList.add('hidden');
        });
    }

    // Sidebar Listeners
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Update active styling
            sidebarLinks.forEach(l => l.className = 'sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors');
            e.currentTarget.className = 'sidebar-link active flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 transition-colors';
            
            const filter = e.currentTarget.dataset.filter;
            switchView(filter);
            
            // Close sidebar on mobile after clicking a link
            if (window.innerWidth < 1024) {
                sidebar.classList.add('-translate-x-full');
                sidebarOverlay.classList.add('hidden');
            }
        });
    });

    // Modal Listeners
    sidebarPeopleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        personModal.classList.remove('hidden');
        personModal.classList.add('flex');
        renderManageMembers();
    });

    closeModalBtn.addEventListener('click', () => {
        personModal.classList.add('hidden');
        personModal.classList.remove('flex');
    });

    personModal.addEventListener('click', (e) => {
        if(e.target === personModal) {
            personModal.classList.add('hidden');
            personModal.classList.remove('flex');
        }
    });

    // Delete All Modal
    closeDeleteAllModalBtn.addEventListener('click', closeDeleteAllModal);
    cancelDeleteAllBtn.addEventListener('click', closeDeleteAllModal);
    deleteAllModal.addEventListener('click', (e) => {
        if (e.target === deleteAllModal) closeDeleteAllModal();
    });
    confirmDeleteAllBtn.addEventListener('click', async () => {
        confirmDeleteAllBtn.disabled = true;
        confirmDeleteAllBtn.innerHTML = '<i class="ph ph-spinner animate-spin"></i> Deleting...';
        deleteAllError.classList.add('hidden');
        try {
            const res = await apiFetch('/expenses', { method: 'DELETE', body: JSON.stringify({ confirm: true }) });
            if (!res.ok) throw new Error('Server error');
            expense = [];
            updateSummary();
            renderExpenses();
            updateExpenseChart();
            renderAccountView();
            closeDeleteAllModal();
        } catch (err) {
            console.error('Failed to delete all expenses:', err);
            deleteAllError.textContent = 'Something went wrong. Please try again.';
            deleteAllError.classList.remove('hidden');
        } finally {
            confirmDeleteAllBtn.disabled = false;
            confirmDeleteAllBtn.innerHTML = '<i class="ph ph-trash"></i> Delete All';
        }
    });

    // Budget goals form
    document.getElementById('budgetGoalForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const category = document.getElementById('budgetCategory').value;
        const amount = parseFloat(document.getElementById('budgetAmount').value);
        if (!category || Number.isNaN(amount) || amount <= 0) return;
        budgetGoals[category] = amount;
        saveBudgetGoals();
        renderBudgetGoalsList();
        renderBudgetOverview();
        document.getElementById('budgetCategory').value = '';
        document.getElementById('budgetAmount').value = '';
        const form = document.getElementById('budgetGoalForm');
        form.classList.add('hidden');
        form.classList.remove('flex');
    });

    // Edit modal
    document.getElementById('editModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('editModal')) closeEditModal();
    });
    document.getElementById('editExpenseForm').addEventListener('submit', saveEditExpense);
    document.querySelectorAll('input[name="editType"]').forEach(radio => {
        radio.addEventListener('change', () => updateEditCategoryOptions(radio.value));
    });
    window.editDatePicker = flatpickr('#editDate', {
        dateFormat: 'Y-m-d',
        disableMobile: true,
    });

    addPersonForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = newPersonName.value.trim();
        if (!name) return;
        await addFamilyMember(name);
    });

    // Currency modal listeners
    closeCurrencyModalBtn.addEventListener('click', closeCurrencyModal);
    currencyModal.addEventListener('click', (e) => {
        if(e.target === currencyModal) {
            closeCurrencyModal();
        }
    });

    currencySearch.addEventListener('input', () => {
        const query = currencySearch.value.trim().toLowerCase();
        renderCurrencyOptions(query);
    });

    // Type radio listeners
    typeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            updateCategoryOptions(radio.value);
        });
    });

    // History view listeners
    historySearch.addEventListener('input', filterHistoryExpenses);
    historyTypeFilter.addEventListener('change', filterHistoryExpenses);
    historyCategoryFilter.addEventListener('change', filterHistoryExpenses);
    historySortBy.addEventListener('change', filterHistoryExpenses);

    document.querySelectorAll('[data-trend-controls]').forEach(group => {
        group.addEventListener('click', (e) => {
            const button = e.target.closest('[data-range]');
            if (!button) return;

            const range = button.dataset.range;
            if (group.dataset.trendControls === 'dashboard') {
                dashboardTrendRange = range;
                renderDashboardExpenseTrend();
            } else {
                expenseTrendRange = range;
                renderExpenseTrend();
            }
            updateTrendControlStyles();
        });
    });

    window.addEventListener('resize', () => {
        renderDashboardExpenseTrend();
        renderExpenseTrend();
    });

    // Initialize views
    updateSummary();
    renderExpenses();
    renderExpenseTrend();
    updateTrendControlStyles();

    // Load persisted expense from server if logged in
    loadExpenses();
    if (isLoggedIn) {
        loadFamilyMembers();
    }
}

// --- CURRENCY HANDLING ---
function getCurrencySymbol(currency) {
    // Common currency symbols
    const symbols = {
        'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'CNY': '¥', 
        'KRW': '₩', 'INR': '₹', 'BRL': 'R$', 'CAD': '$', 'AUD': '$',
        'CHF': 'CHF', 'MXN': '$', 'RUB': '₽', 'SEK': 'kr', 'NOK': 'kr',
        'DKK': 'kr', 'PLN': 'zł', 'TRY': '₺', 'ZAR': 'R', 'THB': '฿',
        'VND': '₫', 'IDR': 'Rp', 'SGD': '$', 'HKD': '$', 'NZD': '$'
    };
    
    // Return symbol if found, otherwise return the currency code
    return symbols[currency] || currency + ' ';
}

function initializeCurrencySelector() {
    // Initialize with default currency
    currentCurrencyEl.textContent = currentCurrency;
    currencySymbolSpan.textContent = getCurrencySymbol(currentCurrency);
    
    // Render the initial currency options
    renderCurrencyOptions('');
}

function renderCurrencyOptions(searchQuery = '') {
    const filteredCurrencies = currencies.filter(currency => 
        currency.toLowerCase().includes(searchQuery)
    );
    
    // Render popular currencies
    popularCurrenciesEl.innerHTML = '';
    const popularFiltered = popularCurrencies.filter(currency => 
        currency.toLowerCase().includes(searchQuery)
    );
    
    popularFiltered.forEach(currency => {
        const button = document.createElement('button');
        button.className = `currency-option ${currency === currentCurrency ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'} px-3 py-2 rounded-lg text-sm font-medium transition-all`;
        button.textContent = currency;
        button.addEventListener('click', () => selectCurrency(currency));
        popularCurrenciesEl.appendChild(button);
    });
    
    // Render all currencies
    allCurrenciesEl.innerHTML = '';
    filteredCurrencies.forEach(currency => {
        const button = document.createElement('button');
        button.className = `currency-option ${currency === currentCurrency ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'} px-2 py-1.5 rounded-lg text-xs font-medium transition-all`;
        button.textContent = currency;
        button.addEventListener('click', () => selectCurrency(currency));
        allCurrenciesEl.appendChild(button);
    });
}

function selectCurrency(currency) {
    currentCurrency = currency;
    localStorage.setItem('sw_currency', currency);
    currentCurrencyEl.textContent = currency;
    currencySymbolSpan.textContent = getCurrencySymbol(currency);
    
    // Update all currency displays
    updateSummary();
    renderExpenses();
    renderIncomeView();
    renderExpenseView();
    updateExpenseChart();
    
    closeCurrencyModal();
}

function openCurrencyModal() {
    currencyModal.classList.remove('hidden');
    currencyModal.classList.add('flex');
    currencySearch.focus();
}

function closeCurrencyModal() {
    currencyModal.classList.add('hidden');
    currencyModal.classList.remove('flex');
    currencySearch.value = '';
    renderCurrencyOptions('');
}

// --- FAMILY MEMBERS MANAGEMENT ---
async function loadFamilyMembers() {
    if (!isLoggedIn) return;

    try {
        const res = await apiFetch('/family-members');
        if (!res.ok) return;
        const data = await res.json();
        setFamilyMembers(data.familyMembers);
    } catch (err) {
        console.error('Failed to load family members:', err);
    }
}

async function addFamilyMember(name) {
    const normalizedName = name.trim();
    if (!normalizedName) return;

    if (familyMembers.some(member => member.toLowerCase() === normalizedName.toLowerCase())) {
        return;
    }

    if (isLoggedIn) {
        try {
            const res = await apiFetch('/family-members', {
                method: 'POST',
                body: JSON.stringify({ name: normalizedName }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                console.error('Failed to save family member:', err.error ?? res.status);
                return;
            }
            const data = await res.json();
            setFamilyMembers(data.familyMembers);
        } catch (err) {
            console.error('Network error saving family member:', err);
            return;
        }
    } else {
        setFamilyMembers([...familyMembers, normalizedName]);
    }

    newPersonName.value = '';
}

function renderManageMembers() {
    if (familyMembers.length === 0) {
        managedMembersList.innerHTML = '';
        noMembersState.classList.remove('hidden');
    } else {
        noMembersState.classList.add('hidden');
        managedMembersList.innerHTML = '';
        
        familyMembers.forEach(member => {
            const li = document.createElement('li');
            li.className = 'flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2';

            const span = document.createElement('span');
            span.className = 'text-sm font-medium text-slate-700';
            span.textContent = member;

            const btn = document.createElement('button');
            btn.className = 'text-rose-500 hover:text-rose-700 transition-colors';
            const trashIcon = document.createElement('i');
            trashIcon.className = 'ph ph-trash text-sm';
            btn.appendChild(trashIcon);
            btn.addEventListener('click', () => removeMember(member));

            li.appendChild(span);
            li.appendChild(btn);
            managedMembersList.appendChild(li);
        });
    }
}

async function removeMember(name) {
    if (isLoggedIn) {
        try {
            const res = await apiFetch('/family-members', {
                method: 'DELETE',
                body: JSON.stringify({ name }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                console.error('Failed to delete family member:', err.error ?? res.status);
                return;
            }
            const data = await res.json();
            setFamilyMembers(data.familyMembers);
            return;
        } catch (err) {
            console.error('Network error deleting family member:', err);
            return;
        }
    }

    setFamilyMembers(familyMembers.filter(member => member !== name));
}

function updateFamilyMemberSelect() {
    familyMemberSelect.innerHTML = '<option value="" selected>None / Myself</option>';
    
    familyMembers.forEach(member => {
        const option = document.createElement('option');
        option.value = member;
        option.textContent = member;
        familyMemberSelect.appendChild(option);
    });
}

// --- EXPENSE HANDLING ---
async function addExpense(e) {
    e.preventDefault();

    const type = form.type.value;
    const amount = parseFloat(form.amount.value);
    const category = form.category.value;
    const date = form.date.value;
    const familyMember = form.familyMember.value || '';
    const note = form.note.value || '';

    if (!type || Number.isNaN(amount) || !category || !date) return;

    let newEntry;

    if (isLoggedIn) {
        try {
            const res = await apiFetch('/expenses', {
                method: 'POST',
                body: JSON.stringify({ type, amount, category, date, familyMember, note, currency: currentCurrency }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                console.error('Failed to save expense:', err.error ?? res.status);
                return;
            }
            newEntry = mapServerExpense(await res.json());
        } catch (err) {
            console.error('Network error saving expense:', err);
            return;
        }
    } else {
        newEntry = { id: String(Date.now()), type, amount, category, date, familyMember, note, currency: currentCurrency };
    }

    expense.unshift(newEntry);

    // Reset form
    if (type === 'expense') {
        typeRadios[1].checked = true;
        updateCategoryOptions('income');
    } else {
        typeRadios[0].checked = true;
        updateCategoryOptions('expense');
    }

    form.amount.value = '';
    form.category.value = '';
    form.note.value = '';
    form.familyMember.value = '';

    // Reset date picker to today
    window.datePicker.setDate("today");

    // Update UI
    updateSummary();
    renderExpenses();
    updateExpenseChart();

    // Update current view if needed
    if (currentFilter === 'income') {
        renderIncomeView();
    } else if (currentFilter === 'expense') {
        renderExpenseView();
    } else if (currentFilter === 'history') {
        renderHistoryView();
    }
}

function updateCategoryOptions(type) {
    if (type === 'expense') {
        expenseCategories.style.display = '';
        incomeCategories.style.display = 'none';
    } else {
        expenseCategories.style.display = 'none';
        incomeCategories.style.display = '';
    }
}

async function deleteExpense(id) {
    if (isLoggedIn) {
        try {
            const res = await apiFetch(`/expenses/${id}`, { method: 'DELETE' });
            if (!res.ok && res.status !== 404) {
                console.error('Failed to delete expense, status:', res.status);
                return;
            }
        } catch (err) {
            console.error('Network error deleting expense:', err);
            return;
        }
    }

    expense = expense.filter(item => item.id !== id);
    updateSummary();
    renderExpenses();
    updateExpenseChart();

    // Update current view if needed
    if (currentFilter === 'income') {
        renderIncomeView();
    } else if (currentFilter === 'expense') {
        renderExpenseView();
    } else if (currentFilter === 'history') {
        renderHistoryView();
    }
}

// --- EDIT EXPENSE ---
let editingExpenseId = null;

function openEditModal(item) {
    editingExpenseId = item.id;

    const editTypeExpense = document.getElementById('editTypeExpense');
    const editTypeIncome = document.getElementById('editTypeIncome');
    if (item.type === 'income') {
        editTypeIncome.checked = true;
    } else {
        editTypeExpense.checked = true;
    }
    updateEditCategoryOptions(item.type);

    document.getElementById('editAmount').value = item.amount;
    document.getElementById('editCurrencySymbol').textContent = getCurrencySymbol(item.currency);
    document.getElementById('editNote').value = item.note || '';

    const editCategorySelect = document.getElementById('editCategory');
    editCategorySelect.value = item.category;

    if (window.editDatePicker) {
        window.editDatePicker.setDate(item.date);
    }

    const editFamilyMember = document.getElementById('editFamilyMember');
    editFamilyMember.innerHTML = '<option value="">None / Myself</option>';
    familyMembers.forEach(member => {
        const option = document.createElement('option');
        option.value = member;
        option.textContent = member;
        editFamilyMember.appendChild(option);
    });
    editFamilyMember.value = item.familyMember || '';

    document.getElementById('editExpenseError').classList.add('hidden');

    const editModal = document.getElementById('editModal');
    editModal.classList.remove('hidden');
    editModal.classList.add('flex');
}

function closeEditModal() {
    const editModal = document.getElementById('editModal');
    editModal.classList.add('hidden');
    editModal.classList.remove('flex');
    editingExpenseId = null;
}

function updateEditCategoryOptions(type) {
    const editExpenseCats = document.getElementById('editExpenseCategories');
    const editIncomeCats = document.getElementById('editIncomeCategories');
    if (type === 'expense') {
        editExpenseCats.style.display = '';
        editIncomeCats.style.display = 'none';
    } else {
        editExpenseCats.style.display = 'none';
        editIncomeCats.style.display = '';
    }
}

async function saveEditExpense(e) {
    e.preventDefault();
    if (!editingExpenseId) return;

    const errorEl = document.getElementById('editExpenseError');
    const btn = document.getElementById('editExpenseBtn');
    errorEl.classList.add('hidden');

    const type = document.querySelector('input[name="editType"]:checked').value;
    const amount = parseFloat(document.getElementById('editAmount').value);
    const category = document.getElementById('editCategory').value;
    const date = document.getElementById('editDate').value;
    const familyMember = document.getElementById('editFamilyMember').value || '';
    const note = document.getElementById('editNote').value || '';

    if (!type || Number.isNaN(amount) || !category || !date) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-spinner animate-spin"></i> Saving...';

    try {
        const res = await apiFetch(`/expenses/${editingExpenseId}`, {
            method: 'PUT',
            body: JSON.stringify({ type, amount, category, date, familyMember, note }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            errorEl.textContent = err.error ?? 'Failed to save changes.';
            errorEl.classList.remove('hidden');
            return;
        }
        const updated = mapServerExpense(await res.json());
        expense = expense.map(item => item.id === editingExpenseId ? updated : item);

        updateSummary();
        renderExpenses();
        updateExpenseChart();
        if (currentFilter === 'income') renderIncomeView();
        else if (currentFilter === 'expense') renderExpenseView();
        else if (currentFilter === 'history') renderHistoryView();

        closeEditModal();
    } catch (err) {
        console.error('Network error editing expense:', err);
        errorEl.textContent = 'Network error. Please try again.';
        errorEl.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="ph ph-floppy-disk"></i> Save Changes';
    }
}

// --- BUDGET GOALS ---
function toggleBudgetForm() {
    const form = document.getElementById('budgetGoalForm');
    form.classList.toggle('hidden');
    form.classList.toggle('flex');
}

function saveBudgetGoals() {
    localStorage.setItem('sw_budget_goals', JSON.stringify(budgetGoals));
}

function getCurrentMonthExpenseByCategory() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const totals = {};
    expense.forEach(item => {
        if (item.type !== 'expense') return;
        const [y, m] = item.date.split('-').map(Number);
        if (y === year && m - 1 === month) {
            totals[item.category] = (totals[item.category] || 0) + item.amount;
        }
    });
    return totals;
}

function renderBudgetOverview() {
    const card = document.getElementById('budgetOverviewCard');
    const list = document.getElementById('budgetOverviewList');
    const goals = Object.keys(budgetGoals);

    if (goals.length === 0) {
        card.classList.add('hidden');
        return;
    }

    card.classList.remove('hidden');
    list.innerHTML = '';

    const monthlySpend = getCurrentMonthExpenseByCategory();
    const symbol = getCurrencySymbol(currentCurrency);

    goals.forEach(category => {
        const limit = budgetGoals[category];
        const spent = monthlySpend[category] || 0;
        const pct = Math.min((spent / limit) * 100, 100);
        const over = spent > limit;

        let barColor, textColor;
        if (over || pct >= 90) { barColor = 'bg-rose-500'; textColor = 'text-rose-600'; }
        else if (pct >= 70)    { barColor = 'bg-amber-500'; textColor = 'text-amber-600'; }
        else                   { barColor = 'bg-emerald-500'; textColor = 'text-emerald-600'; }

        const div = document.createElement('div');
        div.className = 'bg-slate-50 rounded-xl p-4';

        const headerRow = document.createElement('div');
        headerRow.className = 'flex items-center justify-between mb-2';

        const leftSpan = document.createElement('div');
        leftSpan.className = 'flex items-center gap-2';
        const iconEl = document.createElement('i');
        iconEl.className = `ph ${categoryIcons[category] || categoryIcons['Other']} text-slate-500`;
        const catSpan = document.createElement('span');
        catSpan.className = 'text-sm font-medium text-slate-700';
        catSpan.textContent = category;
        leftSpan.appendChild(iconEl);
        leftSpan.appendChild(catSpan);

        const rightSpan = document.createElement('span');
        rightSpan.className = `text-xs font-semibold ${textColor}`;
        rightSpan.textContent = over
            ? `${symbol}${spent.toFixed(2)} / ${symbol}${limit.toFixed(2)} — over!`
            : `${symbol}${spent.toFixed(2)} / ${symbol}${limit.toFixed(2)}`;

        headerRow.appendChild(leftSpan);
        headerRow.appendChild(rightSpan);

        const barBg = document.createElement('div');
        barBg.className = 'w-full bg-slate-200 rounded-full h-1.5';
        const barFill = document.createElement('div');
        barFill.className = `${barColor} h-1.5 rounded-full transition-all duration-500`;
        barFill.style.width = `${pct}%`;
        barBg.appendChild(barFill);

        div.appendChild(headerRow);
        div.appendChild(barBg);
        list.appendChild(div);
    });
}

function renderBudgetGoalsList() {
    const list = document.getElementById('budgetGoalsList');
    const empty = document.getElementById('noBudgetGoalsState');
    if (!list) return;

    const goals = Object.keys(budgetGoals);
    list.innerHTML = '';

    if (goals.length === 0) {
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    const symbol = getCurrencySymbol(currentCurrency);

    goals.forEach(category => {
        const limit = budgetGoals[category];
        const row = document.createElement('div');
        row.className = 'flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2.5';

        const left = document.createElement('div');
        const catEl = document.createElement('p');
        catEl.className = 'text-sm font-medium text-slate-700';
        catEl.textContent = category;
        const amtEl = document.createElement('p');
        amtEl.className = 'text-xs text-slate-500';
        amtEl.textContent = `${symbol}${limit.toFixed(2)} / month`;
        left.appendChild(catEl);
        left.appendChild(amtEl);

        const btn = document.createElement('button');
        btn.className = 'text-rose-400 hover:text-rose-600 transition-colors';
        const icon = document.createElement('i');
        icon.className = 'ph ph-trash text-sm';
        btn.appendChild(icon);
        btn.addEventListener('click', () => {
            delete budgetGoals[category];
            saveBudgetGoals();
            renderBudgetGoalsList();
            renderBudgetOverview();
        });

        row.appendChild(left);
        row.appendChild(btn);
        list.appendChild(row);
    });
}

// --- CALCULATIONS ---
function calculateSummary() {
    let income = 0;
    let expenses = 0;
    
    expense.forEach(item => {
        if (item.type === 'income') {
            income += item.amount;
        } else {
            expenses += item.amount;
        }
    });
    
    return {
        income,
        expenses,
        balance: income - expenses
    };
}

function calculateIncomeSummary() {
    const incomeItems = expense.filter(t => t.type === 'income');
    
    const total = incomeItems.reduce((sum, t) => sum + t.amount, 0);
    const count = incomeItems.length;
    const average = count > 0 ? total / count : 0;
    
    return { total, count, average };
}

function calculateExpenseSummary() {
    const expenseItems = expense.filter(t => t.type === 'expense');
    
    const total = expenseItems.reduce((sum, t) => sum + t.amount, 0);
    const count = expenseItems.length;
    const average = count > 0 ? total / count : 0;
    
    return { total, count, average };
}

function calculateExpenseByCategory() {
    const expenseItems = expense.filter(t => t.type === 'expense');
    const categoryTotals = {};
    
    expenseItems.forEach(item => {
        if (!categoryTotals[item.category]) {
            categoryTotals[item.category] = 0;
        }
        categoryTotals[item.category] += item.amount;
    });
    
    const total = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);
    
    // Convert to array format for chart
    const data = Object.entries(categoryTotals).map(([category, amount]) => ({
        category,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0
    }));
    
    // Sort by amount (descending)
    data.sort((a, b) => b.amount - a.amount);
    
    return { data, total };
}

function parseLocalExpenseDate(dateString) {
    const [year, month, day] = String(dateString).split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
}

function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatMonthKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

function getTrendPeriodLabel(range) {
    switch (range) {
        case 'all':
            return 'All Time';
        case 'week':
            return 'Last 7 Days';
        case 'day':
            return 'Today';
        case 'month':
        default:
            return 'This Month';
    }
}

function calculateExpenseTrendData(range) {
    const today = startOfDay(new Date());
    const expenseItems = expense
        .filter(item => item.type === 'expense')
        .map(item => ({ ...item, parsedDate: parseLocalExpenseDate(item.date) }))
        .filter(item => item.parsedDate);

    const buckets = [];
    const bucketTotals = {};

    if (range === 'all') {
        if (expenseItems.length === 0) {
            return { points: [], total: 0, average: 0, periodLabel: getTrendPeriodLabel(range) };
        }

        const dates = expenseItems.map(item => item.parsedDate);
        let cursor = new Date(Math.min(...dates));
        const last = new Date(Math.max(...dates));
        cursor = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
        const end = new Date(last.getFullYear(), last.getMonth(), 1);

        while (cursor <= end) {
            const key = formatMonthKey(cursor);
            buckets.push({
                key,
                label: cursor.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
            });
            bucketTotals[key] = 0;
            cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
        }

        expenseItems.forEach(item => {
            const key = formatMonthKey(item.parsedDate);
            bucketTotals[key] = (bucketTotals[key] || 0) + item.amount;
        });
    } else {
        let start;
        let end;

        if (range === 'week') {
            start = addDays(today, -6);
            end = today;
        } else if (range === 'day') {
            start = today;
            end = today;
        } else {
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        }

        for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
            const key = formatDateKey(cursor);
            buckets.push({
                key,
                label: range === 'day'
                    ? 'Today'
                    : cursor.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            });
            bucketTotals[key] = 0;
        }

        expenseItems.forEach(item => {
            if (item.parsedDate < start || item.parsedDate > end) return;
            const key = formatDateKey(item.parsedDate);
            bucketTotals[key] = (bucketTotals[key] || 0) + item.amount;
        });
    }

    const points = buckets.map(bucket => ({
        ...bucket,
        amount: bucketTotals[bucket.key] || 0,
    }));
    const total = points.reduce((sum, point) => sum + point.amount, 0);
    const activeBuckets = points.filter(point => point.amount > 0).length;

    return {
        points,
        total,
        average: activeBuckets > 0 ? total / activeBuckets : 0,
        periodLabel: getTrendPeriodLabel(range),
    };
}

// --- UI RENDERING ---

// Builds a safe expense/income list row using DOM methods (no innerHTML for user data).
// Eliminates XSS via category, note, familyMember, and currency fields.
function buildItemRow(item, { useTypeIcon, showTypeBadge, iconBgClass, iconColorClass, amountColorClass, amountPrefix }) {
    const li = document.createElement('li');
    li.className = 'bg-slate-50 rounded-lg p-4 flex items-center justify-between hover:bg-slate-100 transition-colors animate-fade-in';

    // Left
    const left = document.createElement('div');
    left.className = 'flex items-center gap-3 flex-1 min-w-0';

    const iconWrap = document.createElement('div');
    iconWrap.className = `${iconBgClass} p-2 rounded-lg flex-shrink-0`;
    const iconEl = document.createElement('i');
    const iconName = useTypeIcon
        ? (item.type === 'income' ? 'ph-trend-up' : 'ph-trend-down')
        : (categoryIcons[item.category] || categoryIcons['Other']);
    iconEl.className = `ph ${iconName} ${iconColorClass}`;
    iconWrap.appendChild(iconEl);

    const textWrap = document.createElement('div');
    textWrap.className = 'flex-1 min-w-0';

    const titleRow = document.createElement('div');
    titleRow.className = 'flex items-center gap-2';

    const categoryEl = document.createElement('p');
    categoryEl.className = 'font-medium text-slate-800 truncate';
    categoryEl.textContent = item.category;
    titleRow.appendChild(categoryEl);

    if (showTypeBadge) {
        const typeBadge = document.createElement('span');
        typeBadge.className = `text-xs ${item.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'} px-1.5 py-0.5 rounded-full`;
        typeBadge.textContent = item.type;
        titleRow.appendChild(typeBadge);
    }

    if (item.familyMember) {
        const memberBadge = document.createElement('span');
        memberBadge.className = 'text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full';
        memberBadge.textContent = item.familyMember;
        titleRow.appendChild(memberBadge);
    }

    const metaRow = document.createElement('div');
    metaRow.className = 'flex items-center gap-2 text-xs text-slate-500';

    const dateEl = document.createElement('span');
    dateEl.textContent = formatDate(item.date);
    metaRow.appendChild(dateEl);

    if (item.note) {
        const dot = document.createElement('span');
        dot.textContent = '•';
        const noteEl = document.createElement('span');
        noteEl.className = 'truncate';
        noteEl.textContent = item.note;
        metaRow.appendChild(dot);
        metaRow.appendChild(noteEl);
    }

    textWrap.appendChild(titleRow);
    textWrap.appendChild(metaRow);
    left.appendChild(iconWrap);
    left.appendChild(textWrap);

    // Right
    const right = document.createElement('div');
    right.className = 'flex items-center gap-3';

    const amountWrap = document.createElement('div');
    amountWrap.className = 'text-right';

    const amountEl = document.createElement('p');
    amountEl.className = `${amountColorClass} font-semibold`;
    amountEl.textContent = `${amountPrefix}${getCurrencySymbol(item.currency)}${item.amount.toFixed(2)}`;

    const currencyEl = document.createElement('p');
    currencyEl.className = 'text-xs text-slate-400';
    currencyEl.textContent = item.currency;

    amountWrap.appendChild(amountEl);
    amountWrap.appendChild(currencyEl);

    const editBtn = document.createElement('button');
    editBtn.className = 'text-slate-400 hover:text-blue-600 transition-colors';
    const editIcon = document.createElement('i');
    editIcon.className = 'ph ph-pencil-simple text-sm';
    editBtn.appendChild(editIcon);
    editBtn.addEventListener('click', () => openEditModal(item));

    const delBtn = document.createElement('button');
    delBtn.className = 'text-slate-400 hover:text-rose-600 transition-colors';
    const trashIcon = document.createElement('i');
    trashIcon.className = 'ph ph-trash text-sm';
    delBtn.appendChild(trashIcon);
    delBtn.addEventListener('click', () => deleteExpense(item.id));

    right.appendChild(amountWrap);
    right.appendChild(editBtn);
    right.appendChild(delBtn);

    li.appendChild(left);
    li.appendChild(right);
    return li;
}

function updateSummary() {
    const summary = calculateSummary();
    const symbol = getCurrencySymbol(currentCurrency);
    
    totalBalanceEl.textContent = `${symbol}${summary.balance.toFixed(2)}`;
    totalIncomeEl.textContent = `+${symbol}${summary.income.toFixed(2)}`;
    totalExpenseEl.textContent = `-${symbol}${summary.expenses.toFixed(2)}`;
}

function renderExpenses() {
    if (expense.length === 0) {
        emptyState.style.display = 'flex';
        expenseList.innerHTML = '';
        expenseCount.textContent = '0 items';
        renderDashboardExpenseTrend();
        renderBudgetOverview();
        return;
    }
    
    emptyState.style.display = 'none';
    expenseList.innerHTML = '';
    
    // Show only the most recent 10 expense on dashboard
    const recentItems = expense.slice(0, 10);

    recentItems.forEach(item => {
        const isIncome = item.type === 'income';
        const li = buildItemRow(item, {
            useTypeIcon: true,
            showTypeBadge: false,
            iconBgClass: isIncome ? 'bg-emerald-100' : 'bg-rose-100',
            iconColorClass: isIncome ? 'text-emerald-600' : 'text-rose-600',
            amountColorClass: isIncome ? 'text-emerald-600' : 'text-rose-600',
            amountPrefix: isIncome ? '+' : '-',
        });
        expenseList.appendChild(li);
    });
    
    expenseCount.textContent = `${expense.length} item${expense.length !== 1 ? 's' : ''}`;
    renderBudgetOverview();
    renderDashboardExpenseTrend();
}

function renderIncomeView() {
    const { total, count, average } = calculateIncomeSummary();
    const symbol = getCurrencySymbol(currentCurrency);
    
    incomeViewTotal.textContent = `${symbol}${total.toFixed(2)}`;
    incomeViewCount.textContent = count;
    incomeViewAverage.textContent = `${symbol}${average.toFixed(2)}`;
    
    const incomeItems = expense.filter(t => t.type === 'income');
    
    if (incomeItems.length === 0) {
        incomeEmptyState.style.display = 'flex';
        incomeExpenseList.innerHTML = '';
        incomeExpenseCount.textContent = '0 items';
        return;
    }
    
    incomeEmptyState.style.display = 'none';
    incomeExpenseList.innerHTML = '';
    
    incomeItems.forEach(item => {
        const li = buildItemRow(item, {
            useTypeIcon: false,
            showTypeBadge: false,
            iconBgClass: 'bg-emerald-100',
            iconColorClass: 'text-emerald-600',
            amountColorClass: 'text-emerald-600',
            amountPrefix: '+',
        });
        incomeExpenseList.appendChild(li);
    });
    
    incomeExpenseCount.textContent = `${incomeItems.length} item${incomeItems.length !== 1 ? 's' : ''}`;
}

function renderExpenseView() {
    const { total, count, average } = calculateExpenseSummary();
    const symbol = getCurrencySymbol(currentCurrency);
    
    expenseViewTotal.textContent = `${symbol}${total.toFixed(2)}`;
    expenseViewCount.textContent = count;
    expenseViewAverage.textContent = `${symbol}${average.toFixed(2)}`;
    
    const expenseItems = expense.filter(t => t.type === 'expense');
    
    if (expenseItems.length === 0) {
        expenseEmptyState.style.display = 'flex';
        expenseEntryList.innerHTML = '';
        expenseEntryCount.textContent = '0 items';
        topExpenseCategories.innerHTML = '<p class="text-center text-slate-500 text-sm">No expenses to analyze yet.</p>';
        renderExpenseChart([], 0);
        renderExpenseTrend();
        return;
    }
    
    expenseEmptyState.style.display = 'none';
    expenseEntryList.innerHTML = '';
    
    expenseItems.forEach(item => {
        const li = buildItemRow(item, {
            useTypeIcon: false,
            showTypeBadge: false,
            iconBgClass: 'bg-rose-100',
            iconColorClass: 'text-rose-600',
            amountColorClass: 'text-rose-600',
            amountPrefix: '-',
        });
        expenseEntryList.appendChild(li);
    });
    
    expenseEntryCount.textContent = `${expenseItems.length} item${expenseItems.length !== 1 ? 's' : ''}`;
    
    // Update expense breakdown and chart
    const { data: categoryData, total: expenseTotal } = calculateExpenseByCategory();
    renderTopExpenseCategories(categoryData, expenseTotal);
    renderExpenseChart(categoryData, expenseTotal);
    renderExpenseTrend();
}

function renderTopExpenseCategories(categoryData, total) {
    if (categoryData.length === 0) {
        topExpenseCategories.innerHTML = '<p class="text-center text-slate-500 text-sm">No expenses to analyze yet.</p>';
        return;
    }
    
    topExpenseCategories.innerHTML = '';
    
    // Show top 5 categories
    const topCategories = categoryData.slice(0, 5);
    const symbol = getCurrencySymbol(currentCurrency);
    
    topCategories.forEach(item => {
        const colorIndex = categoryData.findIndex(c => c.category === item.category);
        const color = chartColors[colorIndex % chartColors.length];

        const div = document.createElement('div');
        div.className = 'flex items-center justify-between p-3 bg-slate-50 rounded-lg';

        const leftDiv = document.createElement('div');
        leftDiv.className = 'flex items-center gap-3';
        const dot = document.createElement('div');
        dot.className = 'w-3 h-3 rounded-full';
        dot.style.backgroundColor = color;
        const labelDiv = document.createElement('div');
        const nameP = document.createElement('p');
        nameP.className = 'font-medium text-slate-800';
        nameP.textContent = item.category;
        const pctP = document.createElement('p');
        pctP.className = 'text-xs text-slate-500';
        pctP.textContent = `${item.percentage.toFixed(1)}% of total`;
        labelDiv.appendChild(nameP);
        labelDiv.appendChild(pctP);
        leftDiv.appendChild(dot);
        leftDiv.appendChild(labelDiv);

        const rightDiv = document.createElement('div');
        rightDiv.className = 'text-right';
        const amountP = document.createElement('p');
        amountP.className = 'font-semibold text-slate-800';
        amountP.textContent = `${symbol}${item.amount.toFixed(2)}`;
        const pctAmountP = document.createElement('p');
        pctAmountP.className = 'text-xs text-slate-500';
        pctAmountP.textContent = `${item.percentage.toFixed(1)}% of all expenses`;
        rightDiv.appendChild(amountP);
        rightDiv.appendChild(pctAmountP);

        div.appendChild(leftDiv);
        div.appendChild(rightDiv);
        topExpenseCategories.appendChild(div);
    });
}

function updateExpenseChart() {
    const { data, total } = calculateExpenseByCategory();
    renderExpenseChart(data, total);
    renderDashboardExpenseTrend();
    renderExpenseTrend();
}

function renderExpenseChart(categoryData, total) {
    const dpr = window.devicePixelRatio || 1;
    const LOGICAL = 250;
    canvas.width = LOGICAL * dpr;
    canvas.height = LOGICAL * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, LOGICAL, LOGICAL);
    chartLegend.innerHTML = '';

    if (categoryData.length === 0) {
        chartCenterText.querySelector('span:last-child').textContent = '$0.00';
        return;
    }

    const centerX = LOGICAL / 2;
    const centerY = LOGICAL / 2;
    const innerRadius = LOGICAL * 0.3;
    const outerRadius = LOGICAL * 0.45;
    
    // Calculate angles
    let currentAngle = -Math.PI / 2; // Start from top
    
    // Draw segments
    categoryData.forEach((item, index) => {
        const sliceAngle = (item.percentage / 100) * 2 * Math.PI;
        const color = chartColors[index % chartColors.length];
        
        // Draw segment
        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius, currentAngle, currentAngle + sliceAngle);
        ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        
        // Draw border
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Add legend item
        const legendItem = document.createElement('div');
        legendItem.className = 'flex items-center gap-2';
        const legendDot = document.createElement('div');
        legendDot.className = 'w-3 h-3 rounded-full';
        legendDot.style.backgroundColor = color;
        const legendText = document.createElement('div');
        legendText.className = 'flex-1';
        const legendName = document.createElement('p');
        legendName.className = 'font-medium text-slate-700 text-xs';
        legendName.textContent = item.category;
        const legendPct = document.createElement('p');
        legendPct.className = 'text-slate-500 text-xs';
        legendPct.textContent = `${item.percentage.toFixed(1)}%`;
        legendText.appendChild(legendName);
        legendText.appendChild(legendPct);
        legendItem.appendChild(legendDot);
        legendItem.appendChild(legendText);
        chartLegend.appendChild(legendItem);
        
        currentAngle += sliceAngle;
    });
    
    // Update center text
    chartTotalValue.textContent = `${getCurrencySymbol(currentCurrency)}${total.toFixed(2)}`;
}

function updateTrendControlStyles() {
    document.querySelectorAll('[data-trend-controls]').forEach(group => {
        const selectedRange = group.dataset.trendControls === 'dashboard'
            ? dashboardTrendRange
            : expenseTrendRange;

        group.querySelectorAll('[data-range]').forEach(button => {
            const isActive = button.dataset.range === selectedRange;
            button.className = isActive
                ? 'trend-range-btn px-3 py-1.5 rounded-md text-xs font-semibold bg-white text-blue-700 shadow-sm transition-colors'
                : 'trend-range-btn px-3 py-1.5 rounded-md text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors';
        });
    });
}

function renderDashboardExpenseTrend() {
    renderExpenseTrendChart({
        canvas: dashboardTrendCanvas,
        ctx: dashboardTrendCtx,
        range: dashboardTrendRange,
        labelEl: dashboardTrendLabel,
        totalEl: dashboardTrendTotal,
        averageEl: dashboardTrendAverage,
        emptyEl: dashboardTrendEmpty,
    });
}

function renderExpenseTrend() {
    renderExpenseTrendChart({
        canvas: expenseTrendCanvas,
        ctx: expenseTrendCtx,
        range: expenseTrendRange,
        labelEl: expenseTrendLabel,
        totalEl: expenseTrendTotal,
        averageEl: expenseTrendAverage,
        emptyEl: expenseTrendEmpty,
    });
}

function renderExpenseTrendChart({ canvas, ctx, range, labelEl, totalEl, averageEl, emptyEl }) {
    const { points, total, average, periodLabel } = calculateExpenseTrendData(range);
    const symbol = getCurrencySymbol(currentCurrency);

    labelEl.textContent = periodLabel;
    totalEl.textContent = `${symbol}${total.toFixed(2)}`;
    averageEl.textContent = `Avg ${symbol}${average.toFixed(2)}`;
    emptyEl.classList.toggle('hidden', total > 0);

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const logicalWidth = Math.max(Math.round(rect.width || canvas.parentElement.clientWidth || 640), 320);
    const logicalHeight = Math.max(Math.round(rect.height || canvas.parentElement.clientHeight || 260), 220);
    canvas.width = logicalWidth * dpr;
    canvas.height = logicalHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, logicalWidth, logicalHeight);

    if (points.length === 0 || total === 0) {
        drawTrendEmptyState(ctx, logicalWidth, logicalHeight);
        return;
    }

    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? '#334155' : '#e2e8f0';
    const labelColor = isDark ? '#94a3b8' : '#64748b';
    const lineColor = '#e11d48';
    const fillColor = isDark ? 'rgba(225, 29, 72, 0.16)' : 'rgba(225, 29, 72, 0.12)';
    const axisLeft = 54;
    const axisRight = 18;
    const axisTop = 16;
    const axisBottom = 36;
    const chartWidth = logicalWidth - axisLeft - axisRight;
    const chartHeight = logicalHeight - axisTop - axisBottom;
    const maxAmount = Math.max(...points.map(point => point.amount));
    const yMax = maxAmount === 0 ? 1 : maxAmount * 1.15;

    ctx.font = '12px sans-serif';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= 4; i++) {
        const y = axisTop + (chartHeight / 4) * i;
        const value = yMax - (yMax / 4) * i;

        ctx.beginPath();
        ctx.moveTo(axisLeft, y);
        ctx.lineTo(logicalWidth - axisRight, y);
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = labelColor;
        ctx.textAlign = 'right';
        ctx.fillText(compactCurrencyValue(value, symbol), axisLeft - 8, y);
    }

    const xForIndex = (index) => {
        if (points.length === 1) return axisLeft + chartWidth / 2;
        return axisLeft + (chartWidth / (points.length - 1)) * index;
    };
    const yForAmount = (amount) => axisTop + chartHeight - (amount / yMax) * chartHeight;

    const coordinates = points.map((point, index) => ({
        x: xForIndex(index),
        y: yForAmount(point.amount),
        ...point,
    }));

    if (coordinates.length === 1) {
        const point = coordinates[0];
        const barWidth = Math.min(72, chartWidth * 0.35);
        ctx.fillStyle = fillColor;
        ctx.fillRect(point.x - barWidth / 2, point.y, barWidth, axisTop + chartHeight - point.y);
        ctx.fillStyle = lineColor;
        ctx.fillRect(point.x - barWidth / 2, point.y, barWidth, axisTop + chartHeight - point.y);
    } else {
        ctx.beginPath();
        coordinates.forEach((point, index) => {
            if (index === 0) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
        });
        ctx.lineTo(coordinates[coordinates.length - 1].x, axisTop + chartHeight);
        ctx.lineTo(coordinates[0].x, axisTop + chartHeight);
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();

        ctx.beginPath();
        coordinates.forEach((point, index) => {
            if (index === 0) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
        });
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();
    }

    coordinates.forEach(point => {
        if (point.amount <= 0) return;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 2;
        ctx.stroke();
    });

    drawTrendXAxisLabels(ctx, coordinates, logicalWidth, logicalHeight, axisLeft, axisRight, labelColor);
}

function drawTrendXAxisLabels(ctx, points, width, height, axisLeft, axisRight, labelColor) {
    const maxLabels = Math.min(6, points.length);
    const labelIndexes = new Set();
    if (points.length === 1) {
        labelIndexes.add(0);
    } else {
        for (let i = 0; i < maxLabels; i++) {
            labelIndexes.add(Math.round((i * (points.length - 1)) / (maxLabels - 1)));
        }
    }

    ctx.fillStyle = labelColor;
    ctx.font = '12px sans-serif';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';

    points.forEach((point, index) => {
        if (!labelIndexes.has(index)) return;
        const x = Math.min(Math.max(point.x, axisLeft), width - axisRight);
        ctx.fillText(point.label, x, height - 26);
    });
}

function drawTrendEmptyState(ctx, width, height) {
    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? '#334155' : '#e2e8f0';

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
        const y = (height / 5) * i;
        ctx.beginPath();
        ctx.moveTo(28, y);
        ctx.lineTo(width - 18, y);
        ctx.stroke();
    }
}

function compactCurrencyValue(value, symbol) {
    if (value >= 1000000) return `${symbol}${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${symbol}${(value / 1000).toFixed(1)}k`;
    return `${symbol}${value.toFixed(0)}`;
}

function renderHistoryView(filteredExpenses = null) {
    const expenseToRender = filteredExpenses || expense;
    
    // Update category filter options
    updateHistoryCategoryFilter();
    
    if (expenseToRender.length === 0) {
        historyEmptyState.style.display = 'flex';
        historyExpenseList.innerHTML = '';
        historyExpenseCount.textContent = '0 items';
        return;
    }
    
    historyEmptyState.style.display = 'none';
    historyExpenseList.innerHTML = '';
    
    expenseToRender.forEach(item => {
        const isIncome = item.type === 'income';
        const li = buildItemRow(item, {
            useTypeIcon: true,
            showTypeBadge: true,
            iconBgClass: isIncome ? 'bg-emerald-100' : 'bg-rose-100',
            iconColorClass: isIncome ? 'text-emerald-600' : 'text-rose-600',
            amountColorClass: isIncome ? 'text-emerald-600' : 'text-rose-600',
            amountPrefix: isIncome ? '+' : '-',
        });
        historyExpenseList.appendChild(li);
    });
    
    historyExpenseCount.textContent = `${expenseToRender.length} item${expenseToRender.length !== 1 ? 's' : ''}`;
}

function filterHistoryExpenses() {
    const searchTerm = historySearch.value.trim().toLowerCase();
    const typeFilter = historyTypeFilter.value;
    const categoryFilter = historyCategoryFilter.value;
    const sortBy = historySortBy.value;
    
    let filtered = expense;
    
    // Apply filters
    if (searchTerm) {
        filtered = filtered.filter(t => 
            t.category.toLowerCase().includes(searchTerm) ||
            t.note.toLowerCase().includes(searchTerm) ||
            (t.familyMember && t.familyMember.toLowerCase().includes(searchTerm))
        );
    }
    
    if (typeFilter) {
        filtered = filtered.filter(t => t.type === typeFilter);
    }
    
    if (categoryFilter) {
        filtered = filtered.filter(t => t.category === categoryFilter);
    }
    
    // Apply sorting
    switch (sortBy) {
        case 'date-desc':
            filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            break;
        case 'date-asc':
            filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            break;
        case 'amount-desc':
            filtered.sort((a, b) => b.amount - a.amount);
            break;
        case 'amount-asc':
            filtered.sort((a, b) => a.amount - b.amount);
            break;
        case 'category':
            filtered.sort((a, b) => a.category.localeCompare(b.category));
            break;
    }
    
    renderHistoryView(filtered);
}

function updateHistoryCategoryFilter() {
    // Get unique categories from expense
    const categories = new Set();
    expense.forEach(t => categories.add(t.category));
    
    // Store current selected value
    const currentValue = historyCategoryFilter.value;
    
    // Clear and repopulate
    historyCategoryFilter.innerHTML = '<option value="">All Categories</option>';
    
    Array.from(categories).sort().forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        historyCategoryFilter.appendChild(option);
    });
    
    // Restore selection if it still exists
    if (currentValue && categories.has(currentValue)) {
        historyCategoryFilter.value = currentValue;
    }
}

// --- VIEW SWITCHING ---
function switchView(filter) {
    currentFilter = filter;
    
    // Hide all views
    viewContents.forEach(view => view.classList.add('hidden'));
    
    // Show selected view
    switch (filter) {
        case 'income':
            incomeView.classList.remove('hidden');
            renderIncomeView();
            break;
        case 'expense':
            expenseView.classList.remove('hidden');
            renderExpenseView();
            break;
        case 'history':
            historyView.classList.remove('hidden');
            renderHistoryView();
            break;
        case 'account':
            accountView.classList.remove('hidden');
            renderAccountView();
            break;
        default:
            dashboardView.classList.remove('hidden');
            renderDashboardExpenseTrend();
            break;
    }
}

// --- HELPER FUNCTIONS ---
function formatDate(dateString) {
    const options = { month: 'short', day: 'numeric' };
    // Split parts to construct a local Date, avoiding the UTC→local shift that
    // causes "2026-04-26" to display as Apr 25 in negative-UTC timezones.
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(undefined, options);
}

// --- ACCOUNT VIEW ---
async function renderAccountView() {
    // Update stats from in-memory expense
    const symbol = getCurrencySymbol(currentCurrency);
    const { income, expenses, balance } = calculateSummary();
    accountTotalTx.textContent = expense.length;
    accountTotalIncome.textContent = `${symbol}${income.toFixed(2)}`;
    accountTotalExpense.textContent = `${symbol}${expenses.toFixed(2)}`;
    accountNetBalance.textContent = `${symbol}${balance.toFixed(2)}`;
    accountNetBalance.className = `font-bold ${balance >= 0 ? 'text-blue-600' : 'text-rose-600'}`;

    renderBudgetGoalsList();

    // Fetch profile from server
    try {
        const res = await apiFetch('/auth/me');
        if (!res.ok) return;
        const { email, createdAt } = await res.json();

        const initials = email ? email[0].toUpperCase() : '?';
        accountAvatar.textContent = initials;
        accountEmail.textContent = email;
        accountMemberSince.textContent = `Member since ${new Date(createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`;

        // Keep localStorage email in sync
        localStorage.setItem('sw_email', email);
        const emailElement = document.getElementById('authUserEmail');
        if (emailElement) {
            emailElement.textContent = email;
            emailElement.parentElement.style.display = 'block';
        }
    } catch (err) {
        console.error('Failed to load profile:', err);
    }
}

async function changePassword(e) {
    e.preventDefault();
    const successEl = document.getElementById('passwordSuccessMsg');
    const errorEl = document.getElementById('passwordErrorMsg');
    const btn = document.getElementById('changePasswordBtn');
    const current = document.getElementById('currentPassword').value;
    const next = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;

    successEl.classList.add('hidden');
    errorEl.classList.add('hidden');

    if (next !== confirm) {
        errorEl.textContent = 'New passwords do not match.';
        errorEl.classList.remove('hidden');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Updating…';

    try {
        const res = await apiFetch('/auth/password', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword: current, newPassword: next }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            errorEl.textContent = data.error ?? 'Failed to update password.';
            errorEl.classList.remove('hidden');
        } else {
            successEl.classList.remove('hidden');
            document.getElementById('changePasswordForm').reset();
        }
    } catch {
        errorEl.textContent = 'Network error — please try again.';
        errorEl.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="ph ph-floppy-disk"></i> Update Password';
    }
}

function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateDarkModeToggle(isDark);
}

function updateDarkModeToggle(isDark) {
    const toggle = document.getElementById('darkModeToggle');
    const thumb = document.getElementById('darkModeThumb');
    const icon = document.getElementById('themeIcon');
    if (!toggle) return;
    if (isDark) {
        toggle.classList.remove('bg-slate-200');
        toggle.classList.add('bg-blue-600');
        thumb.style.transform = 'translateX(20px)';
        toggle.setAttribute('aria-checked', 'true');
        if (icon) icon.className = 'ph ph-moon text-blue-400 text-lg';
    } else {
        toggle.classList.remove('bg-blue-600');
        toggle.classList.add('bg-slate-200');
        thumb.style.transform = 'translateX(0)';
        toggle.setAttribute('aria-checked', 'false');
        if (icon) icon.className = 'ph ph-sun text-amber-400 text-lg';
    }
}

function triggerImportCSV() {
    csvImportInput.value = '';
    csvImportInput.click();
}

async function processImportCSV(text) {
    const lines = text.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) {
        showImportResult(0, [{ row: 0, reason: 'File is empty or has no data rows.' }]);
        return;
    }
    const dataLines = lines.slice(1); // skip header
    if (dataLines.length > 1000) {
        showImportResult(0, [{ row: 0, reason: 'File exceeds the 1000-row limit. Split it into smaller files.' }]);
        return;
    }

    const rows = [];
    const clientErrors = [];

    dataLines.forEach((line, idx) => {
        const rowNum = idx + 2; // 1-based + 1 for header
        const parts = line.split(',');
        if (parts.length < 7) {
            clientErrors.push({ row: rowNum, reason: `Expected 7 columns, got ${parts.length}.` });
            return;
        }
        const [rawDate, rawType, rawCategory, rawAmount, rawCurrency, rawMember, ...noteParts] = parts;
        const amount = parseFloat(rawAmount);
        const type = rawType.trim().toLowerCase();

        if (type !== 'income' && type !== 'expense') {
            clientErrors.push({ row: rowNum, reason: `Invalid type "${rawType.trim()}". Must be "income" or "expense".` });
            return;
        }
        if (isNaN(amount) || amount < 0 || amount > 1e12) {
            clientErrors.push({ row: rowNum, reason: `Invalid amount "${rawAmount.trim()}".` });
            return;
        }
        if (!rawCategory.trim()) {
            clientErrors.push({ row: rowNum, reason: 'Category is required.' });
            return;
        }
        const parsedDate = new Date(rawDate.trim());
        if (isNaN(parsedDate.getTime())) {
            clientErrors.push({ row: rowNum, reason: `Invalid date "${rawDate.trim()}".` });
            return;
        }
        const currency = rawCurrency.trim() || currentCurrency;
        rows.push({
            _rowNum: rowNum,
            date: rawDate.trim(),
            type,
            category: rawCategory.trim(),
            amount,
            currency,
            familyMember: rawMember.trim(),
            note: noteParts.join(',').trim(),
        });
    });

    if (rows.length === 0) {
        showImportResult(0, clientErrors);
        return;
    }

    try {
        const res = await apiFetch('/expenses/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rows: rows.map(({ _rowNum, ...r }) => r) }),
        });
        const data = await res.json();
        if (!res.ok) {
            showImportResult(0, [{ row: 0, reason: data.error ?? 'Server error.' }]);
            return;
        }
        const serverSkipped = (data.skipped ?? []).map(s => ({
            row: rows[s.index]?._rowNum ?? s.index + 2,
            reason: s.reason,
        }));
        showImportResult(data.imported, [...clientErrors, ...serverSkipped]);
        if (data.imported > 0) await loadExpenses();
    } catch {
        showImportResult(0, [{ row: 0, reason: 'Network error. Please try again.' }]);
    }
}

function showImportResult(imported, skipped) {
    document.getElementById('importResultImported').textContent = imported;
    document.getElementById('importResultSkipped').textContent = skipped.length;
    const errorSection = document.getElementById('importResultErrorSection');
    const errorList = document.getElementById('importResultErrors');
    errorList.innerHTML = '';
    if (skipped.length > 0) {
        errorSection.classList.remove('hidden');
        skipped.forEach(({ row, reason }) => {
            const li = document.createElement('li');
            li.className = 'text-sm text-slate-600';
            li.textContent = row > 0 ? `Row ${row}: ${reason}` : reason;
            errorList.appendChild(li);
        });
    } else {
        errorSection.classList.add('hidden');
    }
    importModal.classList.remove('hidden');
    importModal.classList.add('flex');
}

function closeImportModal() {
    importModal.classList.add('hidden');
    importModal.classList.remove('flex');
}

function exportExpensesCSV() {
    if (expense.length === 0) {
        alert('No expense to export.');
        return;
    }
    const header = ['Date', 'Type', 'Category', 'Amount', 'Currency', 'Family Member', 'Note'];
    const rows = expense.map(t => [
        t.date,
        t.type,
        t.category,
        t.amount.toFixed(2),
        t.currency,
        t.familyMember ?? '',
        (t.note ?? '').replace(/,/g, ';'),
    ]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spendswise-expense-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

function confirmClearAllData() {
    deleteAllError.classList.add('hidden');
    deleteAllError.textContent = '';
    deleteAllModal.classList.remove('hidden');
    deleteAllModal.classList.add('flex');
}

function closeDeleteAllModal() {
    deleteAllModal.classList.add('hidden');
    deleteAllModal.classList.remove('flex');
    deleteAllError.classList.add('hidden');
    deleteAllError.textContent = '';
}

// --- AI ASSISTANT ---
let aiChatHistory = [];

function openAiChat() {
    document.getElementById('aiChatPanel').classList.remove('translate-x-full');
    document.getElementById('aiChatOverlay').classList.remove('hidden');
    document.getElementById('aiChatInput').focus();
}

function closeAiChat() {
    document.getElementById('aiChatPanel').classList.add('translate-x-full');
    document.getElementById('aiChatOverlay').classList.add('hidden');
}

function clearAiChat() {
    aiChatHistory = [];
    const container = document.getElementById('aiChatMessages');
    container.innerHTML = '';
}

function newAiChat() {
    aiChatHistory = [];
    const container = document.getElementById('aiChatMessages');
    container.innerHTML = '';
    const div = document.createElement('div');
    div.className = 'flex gap-2';
    div.innerHTML = `<div class="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5"><i class="ph-fill ph-brain text-indigo-600 text-sm"></i></div><div class="bg-slate-100 rounded-2xl rounded-tl-none px-4 py-2.5 text-sm text-slate-700 max-w-[85%]">New conversation started. What would you like to know about your finances?</div>`;
    container.appendChild(div);
}

function appendAiMessage(role, content) {
    const container = document.getElementById('aiChatMessages');
    const isUser = role === 'user';
    const div = document.createElement('div');
    div.className = isUser ? 'flex justify-end' : 'flex gap-2';

    if (isUser) {
        const bubble = document.createElement('div');
        bubble.className = 'bg-indigo-600 text-white rounded-2xl rounded-tr-none px-4 py-2.5 text-sm max-w-[85%]';
        bubble.textContent = content;
        div.appendChild(bubble);
    } else {
        const avatar = document.createElement('div');
        avatar.className = 'w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5';
        avatar.innerHTML = '<i class="ph-fill ph-brain text-indigo-600 text-sm"></i>';
        const bubble = document.createElement('div');
        bubble.className = 'bg-slate-100 rounded-2xl rounded-tl-none px-4 py-2.5 text-sm text-slate-700 max-w-[85%] whitespace-pre-wrap';
        bubble.textContent = content;
        div.appendChild(avatar);
        div.appendChild(bubble);
    }

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div;
}

async function sendAiMessage() {
    const input = document.getElementById('aiChatInput');
    const btn = document.getElementById('aiSendBtn');
    const message = input.value.trim();
    if (!message) return;

    input.value = '';
    input.disabled = true;
    btn.disabled = true;

    appendAiMessage('user', message);
    const typing = appendAiMessage('assistant', '...');

    try {
        const res = await apiFetch('/ai/chat', {
            method: 'POST',
            body: JSON.stringify({ message, history: aiChatHistory }),
        });
        const data = await res.json();
        typing.remove();

        if (!res.ok) {
            appendAiMessage('assistant', data.error ?? 'Something went wrong.');
            return;
        }

        appendAiMessage('assistant', data.reply);
        aiChatHistory.push({ role: 'user', content: message });
        aiChatHistory.push({ role: 'assistant', content: data.reply });
        if (aiChatHistory.length > 20) aiChatHistory = aiChatHistory.slice(-20);
    } catch {
        typing.remove();
        appendAiMessage('assistant', 'Network error. Please try again.');
    } finally {
        input.disabled = false;
        btn.disabled = false;
        input.focus();
    }
}

async function parseAndFillExpense() {
    const input = document.getElementById('aiParseInput');
    const btn = document.getElementById('aiParseBtn');
    const errorEl = document.getElementById('aiParseError');
    const text = input.value.trim();
    if (!text) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-circle-notch animate-spin"></i>';
    errorEl.classList.add('hidden');

    try {
        const res = await apiFetch('/ai/parse', {
            method: 'POST',
            body: JSON.stringify({ text }),
        });
        const data = await res.json();

        if (!res.ok) {
            errorEl.textContent = data.error ?? 'Could not parse. Try: "spent 450 on lunch"';
            errorEl.classList.remove('hidden');
            return;
        }

        if (data.type === 'income') {
            document.getElementById('typeIncome').checked = true;
        } else {
            document.getElementById('typeExpense').checked = true;
        }
        if (data.amount) document.getElementById('amount').value = data.amount;
        if (data.category) {
            const select = document.getElementById('category');
            const option = Array.from(select.options).find(
                (o) => o.value.toLowerCase() === data.category.toLowerCase()
            );
            if (option) select.value = option.value;
        }
        if (data.date) {
            const fp = document.getElementById('date')._flatpickr;
            if (fp) fp.setDate(data.date);
            else document.getElementById('date').value = data.date;
        }
        if (data.note) document.getElementById('note').value = data.note;

        input.value = '';
        document.getElementById('amount').focus();
    } catch {
        errorEl.textContent = 'Network error. Please try again.';
        errorEl.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="ph ph-magic-wand"></i>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('aiChatInput')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAiMessage(); }
    });
    document.getElementById('aiParseInput')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); parseAndFillExpense(); }
    });
});

// --- START THE APP ---
document.addEventListener('DOMContentLoaded', init);
