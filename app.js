/* =============================================================
   SpendsWise — app.js
   ============================================================= */

// ── CATEGORIES ──
const CATEGORIES = [
  { id: 'food',      emoji: '🍔', label: 'Food' },
  { id: 'transport', emoji: '🚗', label: 'Transport' },
  { id: 'shopping',  emoji: '🛍️', label: 'Shopping' },
  { id: 'health',    emoji: '💊', label: 'Health' },
  { id: 'home',      emoji: '🏠', label: 'Home' },
  { id: 'bills',     emoji: '💡', label: 'Bills' },
  { id: 'entertain', emoji: '🎬', label: 'Fun' },
  { id: 'salary',    emoji: '💰', label: 'Salary' },
  { id: 'invest',    emoji: '📈', label: 'Invest' },
  { id: 'gift',      emoji: '🎁', label: 'Gift' },
  { id: 'travel',    emoji: '✈️', label: 'Travel' },
  { id: 'other',     emoji: '📌', label: 'Other' },
];

// ── CURRENCIES ──
const CURRENCIES = [
  { code: 'USD', symbol: '$',     name: 'US Dollar',                       flag: '🇺🇸' },
  { code: 'EUR', symbol: '€',     name: 'Euro',                            flag: '🇪🇺' },
  { code: 'GBP', symbol: '£',     name: 'British Pound',                   flag: '🇬🇧' },
  { code: 'JPY', symbol: '¥',     name: 'Japanese Yen',                    flag: '🇯🇵' },
  { code: 'CNY', symbol: '¥',     name: 'Chinese Yuan',                    flag: '🇨🇳' },
  { code: 'INR', symbol: '₹',     name: 'Indian Rupee',                    flag: '🇮🇳' },
  { code: 'CAD', symbol: 'CA$',   name: 'Canadian Dollar',                 flag: '🇨🇦' },
  { code: 'AUD', symbol: 'A$',    name: 'Australian Dollar',               flag: '🇦🇺' },
  { code: 'CHF', symbol: 'Fr',    name: 'Swiss Franc',                     flag: '🇨🇭' },
  { code: 'HKD', symbol: 'HK$',  name: 'Hong Kong Dollar',                flag: '🇭🇰' },
  { code: 'SGD', symbol: 'S$',    name: 'Singapore Dollar',                flag: '🇸🇬' },
  { code: 'SEK', symbol: 'kr',    name: 'Swedish Krona',                   flag: '🇸🇪' },
  { code: 'NOK', symbol: 'kr',    name: 'Norwegian Krone',                 flag: '🇳🇴' },
  { code: 'DKK', symbol: 'kr',    name: 'Danish Krone',                    flag: '🇩🇰' },
  { code: 'NZD', symbol: 'NZ$',  name: 'New Zealand Dollar',              flag: '🇳🇿' },
  { code: 'MXN', symbol: 'MX$',  name: 'Mexican Peso',                    flag: '🇲🇽' },
  { code: 'BRL', symbol: 'R$',   name: 'Brazilian Real',                  flag: '🇧🇷' },
  { code: 'ZAR', symbol: 'R',     name: 'South African Rand',              flag: '🇿🇦' },
  { code: 'RUB', symbol: '₽',     name: 'Russian Ruble',                   flag: '🇷🇺' },
  { code: 'TRY', symbol: '₺',     name: 'Turkish Lira',                    flag: '🇹🇷' },
  { code: 'KRW', symbol: '₩',     name: 'South Korean Won',                flag: '🇰🇷' },
  { code: 'AED', symbol: 'د.إ',  name: 'UAE Dirham',                      flag: '🇦🇪' },
  { code: 'SAR', symbol: '﷼',    name: 'Saudi Riyal',                     flag: '🇸🇦' },
  { code: 'ILS', symbol: '₪',     name: 'Israeli Shekel',                  flag: '🇮🇱' },
  { code: 'PLN', symbol: 'zł',    name: 'Polish Zloty',                    flag: '🇵🇱' },
  { code: 'THB', symbol: '฿',     name: 'Thai Baht',                       flag: '🇹🇭' },
  { code: 'IDR', symbol: 'Rp',    name: 'Indonesian Rupiah',               flag: '🇮🇩' },
  { code: 'MYR', symbol: 'RM',    name: 'Malaysian Ringgit',               flag: '🇲🇾' },
  { code: 'PHP', symbol: '₱',     name: 'Philippine Peso',                 flag: '🇵🇭' },
  { code: 'CZK', symbol: 'Kč',   name: 'Czech Koruna',                    flag: '🇨🇿' },
  { code: 'HUF', symbol: 'Ft',    name: 'Hungarian Forint',                flag: '🇭🇺' },
  { code: 'RON', symbol: 'lei',   name: 'Romanian Leu',                    flag: '🇷🇴' },
  { code: 'BGN', symbol: 'лв',    name: 'Bulgarian Lev',                   flag: '🇧🇬' },
  { code: 'HRK', symbol: 'kn',    name: 'Croatian Kuna',                   flag: '🇭🇷' },
  { code: 'ISK', symbol: 'kr',    name: 'Icelandic Króna',                 flag: '🇮🇸' },
  { code: 'CLP', symbol: 'CLP$', name: 'Chilean Peso',                    flag: '🇨🇱' },
  { code: 'COP', symbol: 'COL$', name: 'Colombian Peso',                  flag: '🇨🇴' },
  { code: 'PEN', symbol: 'S/.',   name: 'Peruvian Sol',                    flag: '🇵🇪' },
  { code: 'ARS', symbol: 'AR$',  name: 'Argentine Peso',                  flag: '🇦🇷' },
  { code: 'UYU', symbol: '$U',    name: 'Uruguayan Peso',                  flag: '🇺🇾' },
  { code: 'VES', symbol: 'Bs.S', name: 'Venezuelan Bolívar',              flag: '🇻🇪' },
  { code: 'BOB', symbol: 'Bs.',   name: 'Bolivian Boliviano',              flag: '🇧🇴' },
  { code: 'PYG', symbol: '₲',     name: 'Paraguayan Guaraní',              flag: '🇵🇾' },
  { code: 'GTQ', symbol: 'Q',     name: 'Guatemalan Quetzal',              flag: '🇬🇹' },
  { code: 'HNL', symbol: 'L',     name: 'Honduran Lempira',                flag: '🇭🇳' },
  { code: 'NIO', symbol: 'C$',   name: 'Nicaraguan Córdoba',              flag: '🇳🇮' },
  { code: 'CRC', symbol: '₡',     name: 'Costa Rican Colón',               flag: '🇨🇷' },
  { code: 'PAB', symbol: 'B/.',   name: 'Panamanian Balboa',               flag: '🇵🇦' },
  { code: 'DOP', symbol: 'RD$',  name: 'Dominican Peso',                  flag: '🇩🇴' },
  { code: 'CUP', symbol: '₱',     name: 'Cuban Peso',                      flag: '🇨🇺' },
  { code: 'JMD', symbol: 'J$',   name: 'Jamaican Dollar',                 flag: '🇯🇲' },
  { code: 'TTD', symbol: 'TT$',  name: 'Trinidad & Tobago Dollar',        flag: '🇹🇹' },
  { code: 'BBD', symbol: 'Bds$', name: 'Barbadian Dollar',                flag: '🇧🇧' },
  { code: 'BSD', symbol: 'B$',   name: 'Bahamian Dollar',                 flag: '🇧🇸' },
  { code: 'GYD', symbol: 'G$',   name: 'Guyanese Dollar',                 flag: '🇬🇾' },
  { code: 'SRD', symbol: 'Sr$',  name: 'Surinamese Dollar',               flag: '🇸🇷' },
  { code: 'NGN', symbol: '₦',     name: 'Nigerian Naira',                  flag: '🇳🇬' },
  { code: 'GHS', symbol: '₵',     name: 'Ghanaian Cedi',                   flag: '🇬🇭' },
  { code: 'KES', symbol: 'KSh',  name: 'Kenyan Shilling',                 flag: '🇰🇪' },
  { code: 'TZS', symbol: 'TSh',  name: 'Tanzanian Shilling',              flag: '🇹🇿' },
  { code: 'UGX', symbol: 'USh',  name: 'Ugandan Shilling',                flag: '🇺🇬' },
  { code: 'ETB', symbol: 'Br',    name: 'Ethiopian Birr',                  flag: '🇪🇹' },
  { code: 'EGP', symbol: 'E£',   name: 'Egyptian Pound',                  flag: '🇪🇬' },
  { code: 'MAD', symbol: 'MAD',  name: 'Moroccan Dirham',                 flag: '🇲🇦' },
  { code: 'DZD', symbol: 'DA',   name: 'Algerian Dinar',                  flag: '🇩🇿' },
  { code: 'TND', symbol: 'DT',   name: 'Tunisian Dinar',                  flag: '🇹🇳' },
  { code: 'LYD', symbol: 'LD',   name: 'Libyan Dinar',                    flag: '🇱🇾' },
  { code: 'SDG', symbol: 'SDG',  name: 'Sudanese Pound',                  flag: '🇸🇩' },
  { code: 'AOA', symbol: 'Kz',   name: 'Angolan Kwanza',                  flag: '🇦🇴' },
  { code: 'ZMW', symbol: 'ZK',   name: 'Zambian Kwacha',                  flag: '🇿🇲' },
  { code: 'MWK', symbol: 'MK',   name: 'Malawian Kwacha',                 flag: '🇲🇼' },
  { code: 'MZN', symbol: 'MT',   name: 'Mozambican Metical',              flag: '🇲🇿' },
  { code: 'BWP', symbol: 'P',     name: 'Botswanan Pula',                  flag: '🇧🇼' },
  { code: 'NAD', symbol: 'N$',   name: 'Namibian Dollar',                 flag: '🇳🇦' },
  { code: 'SZL', symbol: 'L',     name: 'Swazi Lilangeni',                 flag: '🇸🇿' },
  { code: 'LSL', symbol: 'L',     name: 'Lesotho Loti',                    flag: '🇱🇸' },
  { code: 'RWF', symbol: 'FRw',  name: 'Rwandan Franc',                   flag: '🇷🇼' },
  { code: 'BIF', symbol: 'FBu',  name: 'Burundian Franc',                 flag: '🇧🇮' },
  { code: 'DJF', symbol: 'Fdj',  name: 'Djiboutian Franc',                flag: '🇩🇯' },
  { code: 'SOS', symbol: 'Sh',    name: 'Somali Shilling',                 flag: '🇸🇴' },
  { code: 'ERN', symbol: 'Nfk',  name: 'Eritrean Nakfa',                  flag: '🇪🇷' },
  { code: 'MGA', symbol: 'Ar',   name: 'Malagasy Ariary',                 flag: '🇲🇬' },
  { code: 'MUR', symbol: 'Rs',    name: 'Mauritian Rupee',                 flag: '🇲🇺' },
  { code: 'SCR', symbol: 'Rs',    name: 'Seychellois Rupee',               flag: '🇸🇨' },
  { code: 'KMF', symbol: 'CF',   name: 'Comorian Franc',                  flag: '🇰🇲' },
  { code: 'CVE', symbol: '$',     name: 'Cape Verdean Escudo',             flag: '🇨🇻' },
  { code: 'STN', symbol: 'Db',   name: 'São Tomé Dobra',                  flag: '🇸🇹' },
  { code: 'GMD', symbol: 'D',     name: 'Gambian Dalasi',                  flag: '🇬🇲' },
  { code: 'GNF', symbol: 'FG',   name: 'Guinean Franc',                   flag: '🇬🇳' },
  { code: 'SLL', symbol: 'Le',   name: 'Sierra Leonean Leone',            flag: '🇸🇱' },
  { code: 'LRD', symbol: 'L$',   name: 'Liberian Dollar',                 flag: '🇱🇷' },
  { code: 'XOF', symbol: 'CFA',  name: 'West African CFA Franc',          flag: '🌍' },
  { code: 'XAF', symbol: 'FCFA', name: 'Central African CFA Franc',       flag: '🌍' },
  { code: 'XPF', symbol: 'CFP',  name: 'CFP Franc',                       flag: '🌊' },
  { code: 'PKR', symbol: 'Rs',    name: 'Pakistani Rupee',                 flag: '🇵🇰' },
  { code: 'BDT', symbol: '৳',     name: 'Bangladeshi Taka',                flag: '🇧🇩' },
  { code: 'LKR', symbol: 'Rs',    name: 'Sri Lankan Rupee',                flag: '🇱🇰' },
  { code: 'NPR', symbol: 'Rs',    name: 'Nepalese Rupee',                  flag: '🇳🇵' },
  { code: 'BTN', symbol: 'Nu',   name: 'Bhutanese Ngultrum',              flag: '🇧🇹' },
  { code: 'MMK', symbol: 'K',     name: 'Myanmar Kyat',                    flag: '🇲🇲' },
  { code: 'KHR', symbol: '៛',     name: 'Cambodian Riel',                  flag: '🇰🇭' },
  { code: 'LAK', symbol: '₭',     name: 'Lao Kip',                         flag: '🇱🇦' },
  { code: 'VND', symbol: '₫',     name: 'Vietnamese Dong',                 flag: '🇻🇳' },
  { code: 'TWD', symbol: 'NT$',  name: 'New Taiwan Dollar',               flag: '🇹🇼' },
  { code: 'MNT', symbol: '₮',     name: 'Mongolian Tögrög',                flag: '🇲🇳' },
  { code: 'KZT', symbol: '₸',     name: 'Kazakhstani Tenge',               flag: '🇰🇿' },
  { code: 'UZS', symbol: "so'm",  name: 'Uzbekistani Som',                 flag: '🇺🇿' },
  { code: 'TJS', symbol: 'SM',   name: 'Tajikistani Somoni',              flag: '🇹🇯' },
  { code: 'KGS', symbol: 'лв',    name: 'Kyrgyzstani Som',                 flag: '🇰🇬' },
  { code: 'TMT', symbol: 'T',     name: 'Turkmenistani Manat',             flag: '🇹🇲' },
  { code: 'AZN', symbol: '₼',     name: 'Azerbaijani Manat',               flag: '🇦🇿' },
  { code: 'AMD', symbol: '֏',     name: 'Armenian Dram',                   flag: '🇦🇲' },
  { code: 'GEL', symbol: '₾',     name: 'Georgian Lari',                   flag: '🇬🇪' },
  { code: 'MDL', symbol: 'L',     name: 'Moldovan Leu',                    flag: '🇲🇩' },
  { code: 'UAH', symbol: '₴',     name: 'Ukrainian Hryvnia',               flag: '🇺🇦' },
  { code: 'BYN', symbol: 'Br',    name: 'Belarusian Ruble',                flag: '🇧🇾' },
  { code: 'BAM', symbol: 'KM',   name: 'Bosnia-Herzegovina Mark',         flag: '🇧🇦' },
  { code: 'RSD', symbol: 'din',  name: 'Serbian Dinar',                   flag: '🇷🇸' },
  { code: 'MKD', symbol: 'ден',   name: 'Macedonian Denar',                flag: '🇲🇰' },
  { code: 'ALL', symbol: 'L',     name: 'Albanian Lek',                    flag: '🇦🇱' },
  { code: 'IQD', symbol: 'ع.د',  name: 'Iraqi Dinar',                     flag: '🇮🇶' },
  { code: 'IRR', symbol: '﷼',    name: 'Iranian Rial',                    flag: '🇮🇷' },
  { code: 'SYP', symbol: '£',     name: 'Syrian Pound',                    flag: '🇸🇾' },
  { code: 'LBP', symbol: 'ل.ل',  name: 'Lebanese Pound',                  flag: '🇱🇧' },
  { code: 'JOD', symbol: 'JD',   name: 'Jordanian Dinar',                 flag: '🇯🇴' },
  { code: 'KWD', symbol: 'KD',   name: 'Kuwaiti Dinar',                   flag: '🇰🇼' },
  { code: 'BHD', symbol: 'BD',   name: 'Bahraini Dinar',                  flag: '🇧🇭' },
  { code: 'QAR', symbol: 'QR',   name: 'Qatari Riyal',                    flag: '🇶🇦' },
  { code: 'OMR', symbol: 'OMR',  name: 'Omani Rial',                      flag: '🇴🇲' },
  { code: 'YER', symbol: '﷼',    name: 'Yemeni Rial',                     flag: '🇾🇪' },
  { code: 'AFN', symbol: '؋',     name: 'Afghan Afghani',                  flag: '🇦🇫' },
  { code: 'MVR', symbol: 'Rf',   name: 'Maldivian Rufiyaa',               flag: '🇲🇻' },
  { code: 'PGK', symbol: 'K',     name: 'Papua New Guinean Kina',          flag: '🇵🇬' },
  { code: 'FJD', symbol: 'FJ$',  name: 'Fijian Dollar',                   flag: '🇫🇯' },
  { code: 'SBD', symbol: 'SI$',  name: 'Solomon Islands Dollar',          flag: '🇸🇧' },
  { code: 'VUV', symbol: 'VT',   name: 'Vanuatu Vatu',                    flag: '🇻🇺' },
  { code: 'WST', symbol: 'WS$',  name: 'Samoan Tālā',                     flag: '🇼🇸' },
  { code: 'TOP', symbol: 'T$',   name: "Tongan Paʻanga",                  flag: '🇹🇴' },
  { code: 'KPW', symbol: '₩',     name: 'North Korean Won',                flag: '🇰🇵' },
  { code: 'CDF', symbol: 'FC',   name: 'Congolese Franc',                 flag: '🇨🇩' },
  { code: 'HTG', symbol: 'G',     name: 'Haitian Gourde',                  flag: '🇭🇹' },
  { code: 'AWG', symbol: 'Afl.', name: 'Aruban Florin',                   flag: '🇦🇼' },
  { code: 'ANG', symbol: 'NAf.', name: 'Netherlands Antillean Guilder',   flag: '🇨🇼' },
  { code: 'BMD', symbol: 'BD$',  name: 'Bermudian Dollar',                flag: '🇧🇲' },
  { code: 'KYD', symbol: 'CI$',  name: 'Cayman Islands Dollar',           flag: '🇰🇾' },
  { code: 'XCD', symbol: 'EC$',  name: 'East Caribbean Dollar',           flag: '🌎' },
  { code: 'BZD', symbol: 'BZ$',  name: 'Belize Dollar',                   flag: '🇧🇿' },
  { code: 'MOP', symbol: 'P',     name: 'Macanese Pataca',                 flag: '🇲🇴' },
  { code: 'BND', symbol: 'B$',   name: 'Brunei Dollar',                   flag: '🇧🇳' },
  { code: 'SVC', symbol: '₡',     name: 'Salvadoran Colón',                flag: '🇸🇻' },
  { code: 'ZWL', symbol: 'Z$',   name: 'Zimbabwean Dollar',               flag: '🇿🇼' },
  { code: 'MRU', symbol: 'UM',   name: 'Mauritanian Ouguiya',             flag: '🇲🇷' },
  { code: 'SSP', symbol: '£',     name: 'South Sudanese Pound',            flag: '🇸🇸' },
];

// Deduplicate by code
const CURRENCIES_UNIQUE = Array.from(new Map(CURRENCIES.map(c => [c.code, c])).values());
const CURRENCY_MAP      = Object.fromEntries(CURRENCIES_UNIQUE.map(c => [c.code, c]));
const CAT_MAP           = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

// ── STATE ──
let transactions   = JSON.parse(localStorage.getItem('ledger_txns') || '[]');
let activeFilter   = 'all';
let currentType    = 'expense';
let selectedCat    = 'other';
let viewingId      = null;
let activeCurrency = CURRENCY_MAP[localStorage.getItem('ledger_currency') || 'USD'] || CURRENCY_MAP['USD'];

// ── INIT ──
function init() {
  setDate();
  buildCatGrid();
  buildFilters();
  render();
  bindModalClose();
  updateCurrencyBtn();
  buildCurrencyList('');
  document.getElementById('curSearch').addEventListener('input', e => buildCurrencyList(e.target.value));
  document.getElementById('inputDate').value = new Date().toISOString().slice(0, 10);
}

function setDate() {
  document.getElementById('headerDate').textContent =
    new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ── CURRENCY ──
function updateCurrencyBtn() {
  document.getElementById('curBtnFlag').textContent  = activeCurrency.flag;
  document.getElementById('curBtnCode').textContent  = activeCurrency.code;
  document.getElementById('amount-prefix-sym').textContent = activeCurrency.symbol;
}

function buildCurrencyList(query) {
  const q        = query.trim().toLowerCase();
  const list     = document.getElementById('curList');
  const filtered = q
    ? CURRENCIES_UNIQUE.filter(c =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q))
    : CURRENCIES_UNIQUE;

  if (!filtered.length) {
    list.innerHTML = '<div class="cur-no-results">No currencies found</div>';
    return;
  }

  list.innerHTML = filtered.map(c => {
    const sel = c.code === activeCurrency.code;
    return `<div class="cur-item${sel ? ' selected' : ''}" onclick="selectCurrency('${c.code}')">
      <span class="ci-flag">${c.flag}</span>
      <div class="ci-info">
        <div class="ci-code">${c.code}${sel ? ' <span class="ci-check">✓</span>' : ''}</div>
        <div class="ci-name">${c.name}</div>
      </div>
      <span class="ci-symbol">${c.symbol}</span>
    </div>`;
  }).join('');
}

function selectCurrency(code) {
  activeCurrency = CURRENCY_MAP[code] || CURRENCY_MAP['USD'];
  localStorage.setItem('ledger_currency', code);
  updateCurrencyBtn();
  buildCurrencyList(document.getElementById('curSearch').value);
  render();
  closeModal('currencyModal');
  showToast(`Currency set to ${activeCurrency.code} ${activeCurrency.symbol}`);
}

// ── BUILD UI ──
function buildCatGrid() {
  document.getElementById('catGrid').innerHTML = CATEGORIES.map(c => `
    <button class="cat-btn${c.id === selectedCat ? ' selected' : ''}"
      onclick="selectCat('${c.id}')" data-cat="${c.id}">
      <span class="cat-emoji">${c.emoji}</span>
      <span class="cat-name">${c.label}</span>
    </button>
  `).join('');
}

function buildFilters() {
  const filters = [
    { id: 'all',     label: 'All' },
    { id: 'expense', label: 'Expenses' },
    { id: 'income',  label: 'Income' },
    ...CATEGORIES.map(c => ({ id: 'cat:' + c.id, label: c.emoji + ' ' + c.label })),
  ];
  document.getElementById('filterScroll').innerHTML = filters.map(f => `
    <button class="pill${activeFilter === f.id ? ' active' : ''}"
      onclick="setFilter('${f.id}')">${f.label}</button>
  `).join('');
}

// ── RENDER ──
function render() {
  updateBalance();
  renderChart();
  renderList();
  buildFilters();
}

function fmtAmount(n) {
  return activeCurrency.symbol + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmt(n) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function updateBalance() {
  const income  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  document.getElementById('balanceValue').textContent = fmt(Math.abs(balance));
  document.querySelector('.balance-amount .currency').textContent =
    (balance < 0 ? '-' : '') + activeCurrency.symbol;
  document.getElementById('totalIncome').textContent  = fmtAmount(income);
  document.getElementById('totalExpense').textContent = fmtAmount(expense);
}

function renderChart() {
  const bars = document.getElementById('chartBars');
  const days = [];
  const now  = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(d);
  }

  const amounts = days.map(d => {
    const key = d.toISOString().slice(0, 10);
    return transactions
      .filter(t => t.type === 'expense' && t.date === key)
      .reduce((s, t) => s + t.amount, 0);
  });

  const max      = Math.max(...amounts, 0.01);
  const todayKey = now.toISOString().slice(0, 10);

  bars.innerHTML = days.map((d, i) => {
    const pct     = Math.max((amounts[i] / max) * 100, 2);
    const isToday = d.toISOString().slice(0, 10) === todayKey;
    return `<div class="bar-col">
      <div class="bar${isToday ? ' active' : ''}" style="height:${pct}%"></div>
      <div class="bar-label">${d.toLocaleDateString('en-US', { weekday: 'narrow' })}</div>
    </div>`;
  }).join('');
}

function renderList() {
  const list = document.getElementById('txnList');
  let filtered = [...transactions];

  if      (activeFilter === 'expense')         filtered = filtered.filter(t => t.type === 'expense');
  else if (activeFilter === 'income')          filtered = filtered.filter(t => t.type === 'income');
  else if (activeFilter.startsWith('cat:')) {
    const cat = activeFilter.slice(4);
    filtered = filtered.filter(t => t.category === cat);
  }

  filtered.sort((a, b) =>
    new Date(b.date + 'T' + (b.createdAt || '00:00:00')) -
    new Date(a.date + 'T' + (a.createdAt || '00:00:00'))
  );

  document.getElementById('txnCount').textContent =
    filtered.length + ' item' + (filtered.length !== 1 ? 's' : '');

  if (!filtered.length) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-icon">📭</div>
      <div class="empty-text">Nothing here yet</div>
      <div class="empty-sub">Tap + to add your first transaction</div>
    </div>`;
    return;
  }

  list.innerHTML = filtered.map((t, idx) => {
    const cat     = CAT_MAP[t.category] || CAT_MAP['other'];
    const sign    = t.type === 'expense' ? '-' : '+';
    const cls     = t.type === 'expense' ? 'negative' : 'positive';
    const dateFmt = new Date(t.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `<div class="txn-item" onclick="openDetail('${t.id}')" style="animation-delay:${idx * 0.04}s" data-id="${t.id}">
      <div class="txn-icon">${cat.emoji}</div>
      <div class="txn-info">
        <div class="txn-name">${escHtml(t.name)}</div>
        <div class="txn-meta">
          <span>${dateFmt}</span>
          <span class="txn-category-tag">${cat.label}</span>
        </div>
      </div>
      <div class="txn-amount ${cls}">${sign}${fmtAmount(t.amount)}</div>
    </div>`;
  }).join('');
}

// ── ACTIONS ──
function setFilter(id) {
  activeFilter = id;
  render();
}

function setType(type) {
  currentType = type;
  document.getElementById('typeExpense').className = 'type-btn' + (type === 'expense' ? ' active-expense' : '');
  document.getElementById('typeIncome').className  = 'type-btn' + (type === 'income'  ? ' active-income'  : '');
}

function selectCat(id) {
  selectedCat = id;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.toggle('selected', b.dataset.cat === id));
}

function saveTransaction() {
  const amount = parseFloat(document.getElementById('inputAmount').value);
  const name   = document.getElementById('inputName').value.trim();
  const date   = document.getElementById('inputDate').value;
  const note   = document.getElementById('inputNote').value.trim();

  if (!amount || amount <= 0) { showToast('Please enter a valid amount'); return; }
  if (!name)                  { showToast('Please enter a description');  return; }
  if (!date)                  { showToast('Please select a date');        return; }

  transactions.push({
    id: 'txn_' + Date.now(),
    type: currentType,
    amount,
    name,
    date,
    note,
    category: selectedCat,
    createdAt: new Date().toTimeString().slice(0, 8),
  });

  saveAll();
  closeModal('addModal');
  resetForm();
  render();
  showToast('Transaction saved ✓');
}

function openDetail(id) {
  const t = transactions.find(x => x.id === id);
  if (!t) return;
  viewingId = id;

  const cat      = CAT_MAP[t.category] || CAT_MAP['other'];
  const sign     = t.type === 'expense' ? '-' : '+';
  const color    = t.type === 'expense' ? 'var(--red)' : 'var(--green)';
  const dateFmt  = new Date(t.date + 'T12:00:00')
    .toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  document.getElementById('detailContent').innerHTML = `
    <div class="detail-icon-wrap">${cat.emoji}</div>
    <div class="detail-amount" style="color:${color}">${sign}${fmtAmount(t.amount)}</div>
    <div class="detail-name">${escHtml(t.name)}</div>
    <div class="detail-rows">
      <div class="detail-row">
        <span class="detail-row-label">Type</span>
        <span class="detail-row-value" style="text-transform:capitalize">${t.type}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row-label">Category</span>
        <span class="detail-row-value">${cat.label}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row-label">Date</span>
        <span class="detail-row-value">${dateFmt}</span>
      </div>
      ${t.note ? `<div class="detail-row">
        <span class="detail-row-label">Note</span>
        <span class="detail-row-value" style="max-width:60%;text-align:right">${escHtml(t.note)}</span>
      </div>` : ''}
    </div>
  `;

  document.getElementById('detailDeleteBtn').onclick = () => deleteTransaction(id);
  openModal('detailModal');
}

function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  saveAll();
  closeModal('detailModal');
  render();
  showToast('Deleted');
}

// ── MODAL HELPERS ──
function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
  if (id === 'currencyModal') {
    setTimeout(() => document.getElementById('curSearch').focus(), 350);
  }
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}

function bindModalClose() {
  document.getElementById('fabBtn').onclick = () => { resetForm(); openModal('addModal'); };

  ['addModal', 'detailModal', 'currencyModal'].forEach(id => {
    document.getElementById(id).addEventListener('click', e => {
      if (e.target === e.currentTarget) closeModal(id);
    });
  });
}

function resetForm() {
  document.getElementById('inputAmount').value = '';
  document.getElementById('inputName').value   = '';
  document.getElementById('inputNote').value   = '';
  document.getElementById('inputDate').value   = new Date().toISOString().slice(0, 10);
  selectedCat = 'other';
  setType('expense');
  buildCatGrid();
}

// ── STORAGE ──
function saveAll() {
  localStorage.setItem('ledger_txns', JSON.stringify(transactions));
}

// ── UTILS ──
function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// ── RESPONSIVE BREAKPOINTS ──
const appEl = document.querySelector('.app');
const BP    = { XS: 400, SM: 600, MD: 800 };

function applyBreakpoint(width) {
  appEl.classList.remove('bp-xs', 'bp-sm', 'bp-md', 'bp-lg');
  if      (width < BP.XS) appEl.classList.add('bp-xs');
  else if (width < BP.SM) appEl.classList.add('bp-sm');
  else if (width < BP.MD) appEl.classList.add('bp-md');
  else                     appEl.classList.add('bp-lg');
}

// ResizeObserver — debounced via rAF to avoid "loop" console errors
if (window.ResizeObserver) {
  let rafId = null;
  const ro  = new ResizeObserver(entries => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      for (const entry of entries) {
        applyBreakpoint(entry.contentRect ? entry.contentRect.width : entry.target.clientWidth);
      }
      rafId = null;
    });
  });
  ro.observe(appEl);
} else {
  window.addEventListener('resize', () => applyBreakpoint(appEl.clientWidth));
}

// Window resize fallback
let resizeRafId = null;
window.addEventListener('resize', () => {
  if (resizeRafId) cancelAnimationFrame(resizeRafId);
  resizeRafId = requestAnimationFrame(() => {
    applyBreakpoint(appEl.clientWidth);
    resizeRafId = null;
  });
});

applyBreakpoint(appEl.clientWidth);
init();
