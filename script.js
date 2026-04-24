// --- API SYNC ---
function getAuthToken() {
    return localStorage.getItem('sw_token');
}

async function apiFetch(path, options = {}) {
    const token = getAuthToken();
    return fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
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

async function loadTransactions() {
    if (!getAuthToken()) return;
    try {
        const res = await apiFetch('/expenses');
        if (!res.ok) return;
        const data = await res.json();
        transactions = data.map(mapServerExpense);
        updateSummary();
        renderTransactions();
        updateExpenseChart();
        if (currentFilter === 'income') renderIncomeView();
        else if (currentFilter === 'expense') renderExpenseView();
        else if (currentFilter === 'history') renderHistoryView();
    } catch (err) {
        console.error('Failed to load transactions:', err);
    }
}

// --- DATA & STATE ---
// In-memory state (Single session as per guidelines)
let transactions = [];
let currentCurrency = 'USD';
let familyMembers = []; // State for explicitly added family members
let currentFilter = 'all'; // Current sidebar filter view

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
const form = document.getElementById('transactionForm');
const dateInput = document.getElementById('date');
const transactionList = document.getElementById('transactionList');
const emptyState = document.getElementById('emptyState');
const transactionCount = document.getElementById('transactionCount');
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
const incomeTransactionCount = document.getElementById('incomeTransactionCount');
const incomeEmptyState = document.getElementById('incomeEmptyState');
const incomeTransactionList = document.getElementById('incomeTransactionList');

// Expense View Elements
const expenseViewTotal = document.getElementById('expenseViewTotal');
const expenseViewCount = document.getElementById('expenseViewCount');
const expenseViewAverage = document.getElementById('expenseViewAverage');
const expenseTransactionCount = document.getElementById('expenseTransactionCount');
const expenseEmptyState = document.getElementById('expenseEmptyState');
const expenseTransactionList = document.getElementById('expenseTransactionList');
const expenseCanvas = document.getElementById('expenseChartExpenseView');
const expenseCtx = expenseCanvas.getContext('2d');
const expenseChartLegend = document.getElementById('expenseChartLegend');
const expenseChartTotalValue = document.getElementById('expenseChartTotalValue');
const topExpenseCategories = document.getElementById('topExpenseCategories');

// History View Elements
const historySearch = document.getElementById('historySearch');
const historyTypeFilter = document.getElementById('historyTypeFilter');
const historyCategoryFilter = document.getElementById('historyCategoryFilter');
const historySortBy = document.getElementById('historySortBy');
const historyTransactionCount = document.getElementById('historyTransactionCount');
const historyEmptyState = document.getElementById('historyEmptyState');
const historyTransactionList = document.getElementById('historyTransactionList');

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
const addPersonForm = document.getElementById('addPersonForm');
const newPersonName = document.getElementById('newPersonName');
const managedMembersList = document.getElementById('managedMembersList');
const noMembersState = document.getElementById('noMembersState');
const familyMemberSelect = document.getElementById('familyMember');

// --- INITIALIZATION ---
function init() {
    // Initialize Currency Selector
    initializeCurrencySelector();

    // Initialize Modern Date Picker (Flatpickr)
    flatpickr("#date", {
        defaultDate: "today",
        dateFormat: "Y-m-d",
        disableMobile: true // Ensures the custom modern UI shows on mobile devices instead of native pickers
    });

    // Event Listeners
    currencyButton.addEventListener('click', () => {
        openCurrencyModal();
    });

    form.addEventListener('submit', addTransaction);

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

    addPersonForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = newPersonName.value.trim();
        if(name && !familyMembers.includes(name)) {
            familyMembers.push(name);
            newPersonName.value = '';
            renderManageMembers();
            updateFamilyMemberSelect();
        }
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
    historySearch.addEventListener('input', filterHistoryTransactions);
    historyTypeFilter.addEventListener('change', filterHistoryTransactions);
    historyCategoryFilter.addEventListener('change', filterHistoryTransactions);
    historySortBy.addEventListener('change', filterHistoryTransactions);

    // Initialize views
    updateSummary();
    renderTransactions();

    // Load persisted transactions from server if logged in
    loadTransactions();
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
    currentCurrencyEl.textContent = currency;
    currencySymbolSpan.textContent = getCurrencySymbol(currency);
    
    // Update all currency displays
    updateSummary();
    renderTransactions();
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
            li.innerHTML = `
                <span class="text-sm font-medium text-slate-700">${member}</span>
                <button class="text-rose-500 hover:text-rose-700 transition-colors" onclick="removeMember('${member}')">
                    <i class="ph ph-trash text-sm"></i>
                </button>
            `;
            managedMembersList.appendChild(li);
        });
    }
}

function removeMember(name) {
    familyMembers = familyMembers.filter(member => member !== name);
    renderManageMembers();
    updateFamilyMemberSelect();
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

// --- TRANSACTION HANDLING ---
async function addTransaction(e) {
    e.preventDefault();

    const type = form.type.value;
    const amount = parseFloat(form.amount.value);
    const category = form.category.value;
    const date = form.date.value;
    const familyMember = form.familyMember.value || '';
    const note = form.note.value || '';

    if (!(type && amount && category && date)) return;

    let transaction;

    if (getAuthToken()) {
        try {
            const res = await apiFetch('/expenses', {
                method: 'POST',
                body: JSON.stringify({ type, amount, category, date, familyMember, note, currency: currentCurrency }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                console.error('Failed to save transaction:', err.error ?? res.status);
                return;
            }
            transaction = mapServerExpense(await res.json());
        } catch (err) {
            console.error('Network error saving transaction:', err);
            return;
        }
    } else {
        transaction = { id: String(Date.now()), type, amount, category, date, familyMember, note, currency: currentCurrency };
    }

    transactions.unshift(transaction);

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
    flatpickr("#date").setDate("today");

    // Update UI
    updateSummary();
    renderTransactions();
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
    // Toggle visibility of category option groups
    if (type === 'expense') {
        expenseCategories.parentElement.style.display = 'block';
        incomeCategories.parentElement.style.display = 'none';
    } else {
        expenseCategories.parentElement.style.display = 'none';
        incomeCategories.parentElement.style.display = 'block';
    }
}

async function deleteTransaction(id) {
    if (getAuthToken()) {
        try {
            const res = await apiFetch(`/expenses/${id}`, { method: 'DELETE' });
            if (!res.ok && res.status !== 404) {
                console.error('Failed to delete transaction, status:', res.status);
                return;
            }
        } catch (err) {
            console.error('Network error deleting transaction:', err);
            return;
        }
    }

    transactions = transactions.filter(transaction => transaction.id !== id);
    updateSummary();
    renderTransactions();
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

// --- CALCULATIONS ---
function calculateSummary() {
    let income = 0;
    let expenses = 0;
    
    transactions.forEach(transaction => {
        if (transaction.type === 'income') {
            income += transaction.amount;
        } else {
            expenses += transaction.amount;
        }
    });
    
    return {
        income,
        expenses,
        balance: income - expenses
    };
}

function calculateIncomeSummary() {
    const incomeTransactions = transactions.filter(t => t.type === 'income');
    
    const total = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
    const count = incomeTransactions.length;
    const average = count > 0 ? total / count : 0;
    
    return { total, count, average };
}

function calculateExpenseSummary() {
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    
    const total = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
    const count = expenseTransactions.length;
    const average = count > 0 ? total / count : 0;
    
    return { total, count, average };
}

function calculateExpenseByCategory() {
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    const categoryTotals = {};
    
    expenseTransactions.forEach(transaction => {
        if (!categoryTotals[transaction.category]) {
            categoryTotals[transaction.category] = 0;
        }
        categoryTotals[transaction.category] += transaction.amount;
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

// --- UI RENDERING ---
function updateSummary() {
    const summary = calculateSummary();
    const symbol = getCurrencySymbol(currentCurrency);
    
    totalBalanceEl.textContent = `${symbol}${summary.balance.toFixed(2)}`;
    totalIncomeEl.textContent = `+${symbol}${summary.income.toFixed(2)}`;
    totalExpenseEl.textContent = `-${symbol}${summary.expenses.toFixed(2)}`;
}

function renderTransactions() {
    if (transactions.length === 0) {
        emptyState.style.display = 'flex';
        transactionList.innerHTML = '';
        transactionCount.textContent = '0 items';
        return;
    }
    
    emptyState.style.display = 'none';
    transactionList.innerHTML = '';
    
    // Show only the most recent 10 transactions on dashboard
    const recentTransactions = transactions.slice(0, 10);
    
    recentTransactions.forEach(transaction => {
        const li = document.createElement('li');
        li.className = 'bg-slate-50 rounded-lg p-4 flex items-center justify-between hover:bg-slate-100 transition-colors animate-fade-in';
        
        const typeIcon = transaction.type === 'income' ? 'ph-trend-up' : 'ph-trend-down';
        const typeColor = transaction.type === 'income' ? 'text-emerald-600' : 'text-rose-600';
        const bgColor = transaction.type === 'income' ? 'bg-emerald-100' : 'bg-rose-100';
        
        li.innerHTML = `
            <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="${bgColor} p-2 rounded-lg flex-shrink-0">
                    <i class="ph ${typeIcon} ${typeColor}"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                        <p class="font-medium text-slate-800 truncate">${transaction.category}</p>
                        ${transaction.familyMember ? `<span class="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">${transaction.familyMember}</span>` : ''}
                    </div>
                    <div class="flex items-center gap-2 text-xs text-slate-500">
                        <span>${formatDate(transaction.date)}</span>
                        ${transaction.note ? `<span>•</span><span class="truncate">${transaction.note}</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-3">
                <div class="text-right">
                    <p class="${typeColor} font-semibold">${transaction.type === 'income' ? '+' : '-'}${getCurrencySymbol(transaction.currency)}${transaction.amount.toFixed(2)}</p>
                    <p class="text-xs text-slate-400">${transaction.currency}</p>
                </div>
                <button class="text-slate-400 hover:text-rose-600 transition-colors" onclick="deleteTransaction('${transaction.id}')">
                    <i class="ph ph-trash text-sm"></i>
                </button>
            </div>
        `;

        transactionList.appendChild(li);
    });
    
    transactionCount.textContent = `${transactions.length} item${transactions.length !== 1 ? 's' : ''}`;
}

function renderIncomeView() {
    const { total, count, average } = calculateIncomeSummary();
    const symbol = getCurrencySymbol(currentCurrency);
    
    incomeViewTotal.textContent = `${symbol}${total.toFixed(2)}`;
    incomeViewCount.textContent = count;
    incomeViewAverage.textContent = `${symbol}${average.toFixed(2)}`;
    
    const incomeTransactions = transactions.filter(t => t.type === 'income');
    
    if (incomeTransactions.length === 0) {
        incomeEmptyState.style.display = 'flex';
        incomeTransactionList.innerHTML = '';
        incomeTransactionCount.textContent = '0 items';
        return;
    }
    
    incomeEmptyState.style.display = 'none';
    incomeTransactionList.innerHTML = '';
    
    incomeTransactions.forEach(transaction => {
        const li = document.createElement('li');
        li.className = 'bg-slate-50 rounded-lg p-4 flex items-center justify-between hover:bg-slate-100 transition-colors animate-fade-in';
        
        li.innerHTML = `
            <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="bg-emerald-100 p-2 rounded-lg flex-shrink-0">
                    <i class="ph ${categoryIcons[transaction.category] || categoryIcons['Other']} text-emerald-600"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                        <p class="font-medium text-slate-800 truncate">${transaction.category}</p>
                        ${transaction.familyMember ? `<span class="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">${transaction.familyMember}</span>` : ''}
                    </div>
                    <div class="flex items-center gap-2 text-xs text-slate-500">
                        <span>${formatDate(transaction.date)}</span>
                        ${transaction.note ? `<span>•</span><span class="truncate">${transaction.note}</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-3">
                <div class="text-right">
                    <p class="text-emerald-600 font-semibold">+${getCurrencySymbol(transaction.currency)}${transaction.amount.toFixed(2)}</p>
                    <p class="text-xs text-slate-400">${transaction.currency}</p>
                </div>
                <button class="text-slate-400 hover:text-rose-600 transition-colors" onclick="deleteTransaction('${transaction.id}')">
                    <i class="ph ph-trash text-sm"></i>
                </button>
            </div>
        `;

        incomeTransactionList.appendChild(li);
    });
    
    incomeTransactionCount.textContent = `${incomeTransactions.length} item${incomeTransactions.length !== 1 ? 's' : ''}`;
}

function renderExpenseView() {
    const { total, count, average } = calculateExpenseSummary();
    const symbol = getCurrencySymbol(currentCurrency);
    
    expenseViewTotal.textContent = `${symbol}${total.toFixed(2)}`;
    expenseViewCount.textContent = count;
    expenseViewAverage.textContent = `${symbol}${average.toFixed(2)}`;
    
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    
    if (expenseTransactions.length === 0) {
        expenseEmptyState.style.display = 'flex';
        expenseTransactionList.innerHTML = '';
        expenseTransactionCount.textContent = '0 items';
        topExpenseCategories.innerHTML = '<p class="text-center text-slate-500 text-sm">No expenses to analyze yet.</p>';
        renderExpenseChart([], 0);
        return;
    }
    
    expenseEmptyState.style.display = 'none';
    expenseTransactionList.innerHTML = '';
    
    expenseTransactions.forEach(transaction => {
        const li = document.createElement('li');
        li.className = 'bg-slate-50 rounded-lg p-4 flex items-center justify-between hover:bg-slate-100 transition-colors animate-fade-in';
        
        li.innerHTML = `
            <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="bg-rose-100 p-2 rounded-lg flex-shrink-0">
                    <i class="ph ${categoryIcons[transaction.category] || categoryIcons['Other']} text-rose-600"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                        <p class="font-medium text-slate-800 truncate">${transaction.category}</p>
                        ${transaction.familyMember ? `<span class="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">${transaction.familyMember}</span>` : ''}
                    </div>
                    <div class="flex items-center gap-2 text-xs text-slate-500">
                        <span>${formatDate(transaction.date)}</span>
                        ${transaction.note ? `<span>•</span><span class="truncate">${transaction.note}</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-3">
                <div class="text-right">
                    <p class="text-rose-600 font-semibold">-${getCurrencySymbol(transaction.currency)}${transaction.amount.toFixed(2)}</p>
                    <p class="text-xs text-slate-400">${transaction.currency}</p>
                </div>
                <button class="text-slate-400 hover:text-rose-600 transition-colors" onclick="deleteTransaction('${transaction.id}')">
                    <i class="ph ph-trash text-sm"></i>
                </button>
            </div>
        `;

        expenseTransactionList.appendChild(li);
    });
    
    expenseTransactionCount.textContent = `${expenseTransactions.length} item${expenseTransactions.length !== 1 ? 's' : ''}`;
    
    // Update expense breakdown and chart
    const { data: categoryData, total: expenseTotal } = calculateExpenseByCategory();
    renderTopExpenseCategories(categoryData, expenseTotal);
    renderExpenseChart(categoryData, expenseTotal);
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
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between p-3 bg-slate-50 rounded-lg';
        
        const colorIndex = categoryData.findIndex(c => c.category === item.category);
        const color = chartColors[colorIndex % chartColors.length];
        
        div.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-3 h-3 rounded-full" style="background-color: ${color}"></div>
                <div>
                    <p class="font-medium text-slate-800">${item.category}</p>
                    <p class="text-xs text-slate-500">${item.percentage.toFixed(1)}% of total</p>
                </div>
            </div>
            <div class="text-right">
                <p class="font-semibold text-slate-800">${symbol}${item.amount.toFixed(2)}</p>
                <p class="text-xs text-slate-500">${item.amount.toFixed(1)}% of all expenses</p>
            </div>
        `;
        
        topExpenseCategories.appendChild(div);
    });
}

function updateExpenseChart() {
    const { data, total } = calculateExpenseByCategory();
    renderExpenseChart(data, total);
}

function renderExpenseChart(categoryData, total) {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    chartLegend.innerHTML = '';
    
    if (categoryData.length === 0) {
        chartCenterText.querySelector('span:last-child').textContent = '$0.00';
        return;
    }
    
    // Set canvas size
    const size = Math.min(canvas.width, canvas.height);
    const centerX = size / 2;
    const centerY = size / 2;
    const innerRadius = size * 0.3;
    const outerRadius = size * 0.45;
    
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
        legendItem.innerHTML = `
            <div class="w-3 h-3 rounded-full" style="background-color: ${color}"></div>
            <div class="flex-1">
                <p class="font-medium text-slate-700 text-xs">${item.category}</p>
                <p class="text-slate-500 text-xs">${item.percentage.toFixed(1)}%</p>
            </div>
        `;
        chartLegend.appendChild(legendItem);
        
        currentAngle += sliceAngle;
    });
    
    // Update center text
    chartTotalValue.textContent = `${getCurrencySymbol(currentCurrency)}${total.toFixed(2)}`;
}

function renderHistoryView(filteredTransactions = null) {
    const transactionsToRender = filteredTransactions || transactions;
    
    // Update category filter options
    updateHistoryCategoryFilter();
    
    if (transactionsToRender.length === 0) {
        historyEmptyState.style.display = 'flex';
        historyTransactionList.innerHTML = '';
        historyTransactionCount.textContent = '0 items';
        return;
    }
    
    historyEmptyState.style.display = 'none';
    historyTransactionList.innerHTML = '';
    
    transactionsToRender.forEach(transaction => {
        const li = document.createElement('li');
        li.className = 'bg-slate-50 rounded-lg p-4 flex items-center justify-between hover:bg-slate-100 transition-colors';
        
        const typeIcon = transaction.type === 'income' ? 'ph-trend-up' : 'ph-trend-down';
        const typeColor = transaction.type === 'income' ? 'text-emerald-600' : 'text-rose-600';
        const bgColor = transaction.type === 'income' ? 'bg-emerald-100' : 'bg-rose-100';
        
        li.innerHTML = `
            <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="${bgColor} p-2 rounded-lg flex-shrink-0">
                    <i class="ph ${typeIcon} ${typeColor}"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                        <p class="font-medium text-slate-800 truncate">${transaction.category}</p>
                        <span class="text-xs ${transaction.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'} px-1.5 py-0.5 rounded-full">${transaction.type}</span>
                        ${transaction.familyMember ? `<span class="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">${transaction.familyMember}</span>` : ''}
                    </div>
                    <div class="flex items-center gap-2 text-xs text-slate-500">
                        <span>${formatDate(transaction.date)}</span>
                        ${transaction.note ? `<span>•</span><span class="truncate">${transaction.note}</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-3">
                <div class="text-right">
                    <p class="${typeColor} font-semibold">${transaction.type === 'income' ? '+' : '-'}${getCurrencySymbol(transaction.currency)}${transaction.amount.toFixed(2)}</p>
                    <p class="text-xs text-slate-400">${transaction.currency}</p>
                </div>
                <button class="text-slate-400 hover:text-rose-600 transition-colors" onclick="deleteTransaction('${transaction.id}')">
                    <i class="ph ph-trash text-sm"></i>
                </button>
            </div>
        `;

        historyTransactionList.appendChild(li);
    });
    
    historyTransactionCount.textContent = `${transactionsToRender.length} item${transactionsToRender.length !== 1 ? 's' : ''}`;
}

function filterHistoryTransactions() {
    const searchTerm = historySearch.value.trim().toLowerCase();
    const typeFilter = historyTypeFilter.value;
    const categoryFilter = historyCategoryFilter.value;
    const sortBy = historySortBy.value;
    
    let filtered = transactions;
    
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
            filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
            break;
        case 'date-asc':
            filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
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
    // Get unique categories from transactions
    const categories = new Set();
    transactions.forEach(t => categories.add(t.category));
    
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
        default:
            dashboardView.classList.remove('hidden');
            break;
    }
}

// --- HELPER FUNCTIONS ---
function formatDate(dateString) {
    const options = { month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// --- START THE APP ---
document.addEventListener('DOMContentLoaded', init);