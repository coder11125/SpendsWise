export function formatDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function parseLocalExpenseDate(dateString) {
  const [year, month, day] = String(dateString).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatMonthKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getTrendPeriodLabel(range) {
  switch (range) {
    case 'all': return 'All Time';
    case 'week': return 'Last 7 Days';
    case 'day': return 'Today';
    case 'month': default: return 'This Month';
  }
}

export async function calculateExpenseTrendData(expenseItems, range, currentCurrency) {
  const { convertToDisplayCurrency } = await import('./currency.js');
  const today = startOfDay(new Date());

  const items = expenseItems
    .filter(item => item.type === 'expense')
    .map(item => ({ ...item, parsedDate: parseLocalExpenseDate(item.date) }))
    .filter(item => item.parsedDate);

  const buckets = [];
  const bucketTotals = {};

  if (range === 'all') {
    if (items.length === 0) return { points: [], total: 0, average: 0, periodLabel: getTrendPeriodLabel(range) };

    const dates = items.map(item => item.parsedDate);
    let cursor = new Date(Math.min(...dates));
    const last = new Date(Math.max(...dates));
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const end = new Date(last.getFullYear(), last.getMonth(), 1);

    while (cursor <= end) {
      const key = formatMonthKey(cursor);
      buckets.push({ key, label: cursor.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }) });
      bucketTotals[key] = 0;
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }

    for (const item of items) {
      const converted = await convertToDisplayCurrency(item.amount, item.currency, currentCurrency);
      const key = formatMonthKey(item.parsedDate);
      bucketTotals[key] = (bucketTotals[key] || 0) + converted.amount;
    }
  } else {
    let start, end;
    if (range === 'week') { start = addDays(today, -6); end = today; }
    else if (range === 'day') { start = today; end = today; }
    else { start = new Date(today.getFullYear(), today.getMonth(), 1); end = new Date(today.getFullYear(), today.getMonth() + 1, 0); }

    for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
      const key = formatDateKey(cursor);
      buckets.push({ key, label: range === 'day' ? 'Today' : cursor.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) });
      bucketTotals[key] = 0;
    }

    for (const item of items) {
      if (item.parsedDate < start || item.parsedDate > end) continue;
      const converted = await convertToDisplayCurrency(item.amount, item.currency, currentCurrency);
      const key = formatDateKey(item.parsedDate);
      bucketTotals[key] = (bucketTotals[key] || 0) + converted.amount;
    }
  }

  const points = buckets.map(bucket => ({ ...bucket, amount: bucketTotals[bucket.key] || 0 }));
  const total = points.reduce((sum, p) => sum + p.amount, 0);
  const activeBuckets = points.filter(p => p.amount > 0).length;

  return { points, total, average: activeBuckets > 0 ? total / activeBuckets : 0, periodLabel: getTrendPeriodLabel(range) };
}

export function compressImageToDataUrl(file, maxPx, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
