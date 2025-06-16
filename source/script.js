
const LS_KEY = 'finance_transactions';
let transactions = [];

const form = document.getElementById('transaction-form');
const typeEl = document.getElementById('type');
const categoryEl = document.getElementById('category');
const amountEl = document.getElementById('amount');
const dateEl = document.getElementById('date');
const descEl = document.getElementById('desc');
const historyTable = document.querySelector('#history-table tbody');
const balanceEl = document.getElementById('balance');
const incomeEl = document.getElementById('income');
const expenseEl = document.getElementById('expense');
const clearAllBtn = document.getElementById('clearAll');
const pieChartEl = document.getElementById('pieChart');
const exportCSV = document.getElementById('exportCSV');
const importBtn = document.getElementById('importBtn');
const importCSV = document.getElementById('importCSV');
const monthSelect = document.getElementById('monthSelect');
const yearSelect = document.getElementById('yearSelect');
let pieChart;

function formatRupiah(num) {
  return 'Rp' + Number(num).toLocaleString('id-ID');
}
function pad(n) { return n < 10 ? '0' + n : n; }

function loadTransactions() {
  const data = localStorage.getItem(LS_KEY);
  transactions = data ? JSON.parse(data) : [];
}
function saveTransactions() {
  localStorage.setItem(LS_KEY, JSON.stringify(transactions));
}

function calcSummary(filtered=null) {
  let income = 0, expense = 0;
  let txs = filtered || transactions;
  for (let t of txs) {
    if (t.type === 'income') income += Number(t.amount);
    else expense += Number(t.amount);
  }
  return {income, expense, balance: income - expense};
}
function updateSummary(filtered=null) {
  const sum = calcSummary(filtered);
  balanceEl.textContent = formatRupiah(sum.balance);
  incomeEl.textContent = formatRupiah(sum.income);
  expenseEl.textContent = formatRupiah(sum.expense);
}

function renderTable(filtered=null) {
  let txs = filtered || transactions;
  historyTable.innerHTML = '';
  if (txs.length === 0) {
    historyTable.innerHTML = '<tr><td colspan="6">No transactions yet.</td></tr>';
    return;
  }
  txs.slice().reverse().forEach((t, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${t.date}</td>
      <td class="type-${t.type}">${t.type.charAt(0).toUpperCase() + t.type.slice(1)}</td>
      <td>${t.category}</td>
      <td>${formatRupiah(t.amount)}</td>
      <td>${t.desc || ''}</td>
      <td><button class="remove-btn" onclick="removeTx(${transactions.indexOf(t)})">Remove</button></td>
    `;
    historyTable.appendChild(tr);
  });
}

function renderPie(filtered=null) {
  let cats = {}, txs = filtered || transactions, typeSel = typeEl.value;
  txs.forEach(t => {
    if (t.type !== typeSel) return;
    cats[t.category] = (cats[t.category] || 0) + Number(t.amount);
  });
  const labels = Object.keys(cats);
  const data = Object.values(cats);
  if (pieChart) pieChart.destroy();
  pieChart = new Chart(pieChartEl, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: [
          '#2563eb', '#22c55e', '#ef4444', '#eab308', '#8b5cf6', '#0ea5e9', '#14b8a6', '#f472b6', '#a3e635'
        ],
      }]
    },
    options: {
      plugins: {
        title: { display: true, text: (typeSel.charAt(0).toUpperCase()+typeSel.slice(1)+' by Category') },
        legend: { position: 'bottom' }
      }
    }
  });
}

function filterByMonthYear(month, year) {
  return transactions.filter(t => {
    const [y, m] = t.date.split('-');
    return Number(m) === month && Number(y) === year;
  });
}

function populateMonthYearSelect() {
  const today = new Date();
  let years = new Set(transactions.map(t => Number(t.date.split('-')[0])));
  if (years.size === 0) years = new Set([today.getFullYear()]);
  yearSelect.innerHTML = '';
  for (let y of Array.from(years).sort((a,b) => b-a)) {
    yearSelect.innerHTML += `<option value="${y}">${y}</option>`;
  }
  monthSelect.innerHTML = '';
  for (let m = 1; m <= 12; m++) {
    monthSelect.innerHTML += `<option value="${m}">${pad(m)}</option>`;
  }
  monthSelect.value = today.getMonth() + 1;
  yearSelect.value = today.getFullYear();
}

window.removeTx = function(idx) {
  transactions.splice(idx, 1);
  saveTransactions();
  renderAll();
}

function exportToCSV() {
  let csv = 'type,category,amount,date,desc\n';
  transactions.forEach(t => {
    csv += `${t.type},${t.category.replace(/,/g, ' ')},${t.amount},${t.date},${(t.desc||'').replace(/,/g, ' ')}\n`;
  });
  const blob = new Blob([csv], {type: 'text/csv'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'transactions.csv';
  link.click();
}

function importFromCSV(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const rows = e.target.result.split('\n').filter(x=>x.trim());
    if (!rows.length || !rows[0].includes('type,category,amount,date,desc')) {
      alert('Invalid CSV format!');
      return;
    }
    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i].split(',');
      if (cols.length < 5) continue;
      let [type, category, amount, date, desc] = cols;
      type = type.trim().toLowerCase();
      if (!['income','expense'].includes(type)) continue;
      if (!category || !amount || !date) continue;
      transactions.push({
        type,
        category,
        amount: amount.replace(/[^0-9]/g,''),
        date,
        desc
      });
    }
    saveTransactions();
    renderAll();
    alert('Import sukses!');
  };
  reader.readAsText(file);
}

function renderAll() {
  loadTransactions();
  populateMonthYearSelect();
  let month = Number(monthSelect.value), year = Number(yearSelect.value);
  const filtered = filterByMonthYear(month, year);
  updateSummary(filtered);
  renderTable(filtered);
  renderPie(filtered);
}

form.onsubmit = (e) => {
  e.preventDefault();
  const tx = {
    type: typeEl.value,
    category: categoryEl.value.trim(),
    amount: amountEl.value,
    date: dateEl.value,
    desc: descEl.value.trim()
  };
  if (!tx.category || !tx.amount || !tx.date) return;
  transactions.push(tx);
  saveTransactions();
  form.reset();
  dateEl.value = new Date().toISOString().slice(0,10);
  renderAll();
};
clearAllBtn.onclick = () => {
  if (confirm('Clear all transactions?')) {
    transactions = [];
    saveTransactions();
    renderAll();
  }
};
typeEl.onchange = () => renderPie(filterByMonthYear(Number(monthSelect.value), Number(yearSelect.value)));
monthSelect.onchange = renderAll;
yearSelect.onchange = renderAll;
exportCSV.onclick = exportToCSV;
importBtn.onclick = () => importCSV.click();
importCSV.onchange = (e) => {
  if (e.target.files && e.target.files[0]) {
    importFromCSV(e.target.files[0]);
    importCSV.value = '';
  }
};

window.onload = () => {
  loadTransactions();
  populateMonthYearSelect();
  dateEl.value = new Date().toISOString().slice(0,10);
  renderAll();
};
