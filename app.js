// === 1. Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyCw3MkLyY_3wL5lPFZP3RN3pNNL_5MXfCQ",
    authDomain: "budget-d7b61.firebaseapp.com",
    projectId: "budget-d7b61",
    storageBucket: "budget-d7b61.firebasestorage.app",
    messagingSenderId: "853003887380",
    appId: "1:853003887380:web:5aa5fda151ff9823c9d801",
    measurementId: "G-0JZTCC3MLW"
};
// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const transactionsCollection = db.collection('transactions');
const plansCollection = db.collection('financial-plans');
// === Ссылки на настройки
const goalDocRef = db.collection('settings').doc('goal');
// === 2. Глобальные переменные
let transactions = [];
let savingsGoal = 500000;
let financialPlans = [];
// === 3. Форматирование чисел
function formatNumber(num) {
    return num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
// === 4. Загрузка цели из Firebase
function loadGoalFromFirebase() {
    goalDocRef.onSnapshot(doc => {
        if (doc.exists) {
            savingsGoal = doc.data().amount || 500000;
        } else {
            savingsGoal = 500000;
            goalDocRef.set({ amount: savingsGoal });
        }
        const input = document.getElementById('savings-goal');
        if (input) input.value = savingsGoal;
        updateHome();
        localStorage.setItem('savingsGoal', savingsGoal);
    });
}
// === 5. Сохранение цели
function saveGoal() {
    const input = document.getElementById('savings-goal');
    const value = parseFloat(input.value);
    if (isNaN(value) || value < 0) {
        alert('Введите корректную сумму');
        return;
    }
    goalDocRef.set({ amount: value })
        .then(() => {
            savingsGoal = value;
            localStorage.setItem('savingsGoal', savingsGoal);
            updateHome();
            alert(`🎯 Цель обновлена: ${formatNumber(savingsGoal)} ₽`);
        })
        .catch(err => {
            console.error("Ошибка сохранения цели:", err);
            alert("Не удалось сохранить цель. Проверь интернет.");
        });
}
// === 6. Обновление статистики
function updateHome() {
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    const savings = income - expense;
    const progress = savingsGoal > 0 ? Math.min(100, (savings / savingsGoal) * 100) : 0;
    document.getElementById('total-savings').textContent = formatNumber(savings) + ' ₽';
    document.getElementById('progress-fill').style.width = progress + '%';
    document.getElementById('progress-text').textContent =
        `${Math.round(progress)}% от цели (${formatNumber(savings)} / ${formatNumber(savingsGoal)} ₽)`;
    document.getElementById('progress-fill').style.background = savings >= savingsGoal ? '#34c759' : '#007AFF';
    document.getElementById('total-income').textContent = formatNumber(income) + ' ₽';
    document.getElementById('total-expense').textContent = formatNumber(expense) + ' ₽';
}
// === 7. Загрузка данных
function loadFromFirebase() {
    transactionsCollection.orderBy('date', 'desc').onSnapshot(snapshot => {
        transactions = [];
        snapshot.forEach(doc => {
            transactions.push({ id: doc.id, ...doc.data() });
        });
        // Обновляем все зависимости
        renderRecentList();
        updateHome();
        updateAnalytics();
        // Если вкладка "История" открыта — обновляем список
        if (document.getElementById('list') && document.getElementById('list').style.display !== 'none') {
            renderAllList();
        }
    });
    plansCollection.onSnapshot(snapshot => {
        financialPlans = [];
        snapshot.forEach(doc => {
            financialPlans.push({ id: doc.id, ...doc.data() });
        });
        renderPlanList();
        updateAnalytics();
    });
}
// === 8. Последние 10 операций
function renderRecentList() {
    const list = document.getElementById('recent-transactions');
    list.innerHTML = '';
    const recent = [...transactions]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10);
    recent.forEach(tx => {
        const li = document.createElement('li');
        const amountColor = tx.type === 'income' ? '#34c759' : '#ff3b30';
        const sign = tx.type === 'income' ? '+' : '-';
        li.innerHTML = `
      <div>
        <div><strong>${tx.category}</strong> <span style="color: ${amountColor}; font-weight: bold;">${sign}${formatNumber(tx.amount)} ₽</span></div>
        <div class="info">${tx.date} · ${tx.author}</div>
      </div>
      <div class="actions">
        <button class="btn small" onclick="startEdit('${tx.id}')">✏️</button>
        <button class="btn small danger" onclick="deleteTransaction('${tx.id}')">🗑️</button>
      </div>
    `;
        list.appendChild(li);
    });
    if (recent.length === 0) {
        const li = document.createElement('li');
        li.style.color = '#999';
        li.style.fontStyle = 'italic';
        li.textContent = 'Нет записей';
        list.appendChild(li);
    }
}
// === 9. Все операции
function renderAllList(filtered = transactions) {
    const list = document.getElementById('all-transactions');
    list.innerHTML = '';
    const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
    sorted.forEach(tx => {
        const li = document.createElement('li');
        const amountColor = tx.type === 'income' ? '#34c759' : '#ff3b30';
        const sign = tx.type === 'income' ? '+' : '-';
        li.innerHTML = `
      <div>
        <div><strong>${tx.category}</strong> <span style="color: ${amountColor}; font-weight: bold;">${sign}${formatNumber(tx.amount)} ₽</span></div>
        <div class="info">${tx.date} · ${tx.author}</div>
      </div>
      <div class="actions">
        <button class="btn small" onclick="startEdit('${tx.id}')">✏️</button>
        <button class="btn small danger" onclick="deleteTransaction('${tx.id}')">🗑️</button>
      </div>
    `;
        list.appendChild(li);
    });
    if (sorted.length === 0) {
        const li = document.createElement('li');
        li.style.color = '#999';
        li.style.fontStyle = 'italic';
        li.textContent = 'Нет операций';
        list.appendChild(li);
    }
}
// === 10. Фильтр по датам
function filterByDate() {
    const start = document.getElementById('filter-start').value;
    const end = document.getElementById('filter-end').value;
    let filtered = transactions;
    if (start) filtered = filtered.filter(t => t.date >= start);
    if (end) filtered = filtered.filter(t => t.date <= end);
    renderAllList(filtered);
}
function clearFilter() {
    document.getElementById('filter-start').value = '';
    document.getElementById('filter-end').value = '';
    renderAllList();
}
// === 11. Добавление
document.getElementById('add-form').addEventListener('submit', e => {
    e.preventDefault();
    const form = e.target;
    const newTx = {
        date: form.date.value,
        category: form.category.value,
        amount: parseFloat(form.amount.value),
        type: form.type.value,
        author: form.author.value
    };
    transactionsCollection.add(newTx)
        .then(() => {
            form.reset();
            // Если открыта вкладка "История" — обновляем
            if (document.getElementById('list') && document.getElementById('list').style.display !== 'none') {
                renderAllList();
            }
        })
        .catch(err => alert('Ошибка: ' + err.message));
});
// === 12. Редактирование
function startEdit(id) {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;
    document.getElementById('edit-id').value = tx.id;
    document.getElementById('edit-date').value = tx.date;
    document.getElementById('edit-category').value = tx.category;
    document.getElementById('edit-amount').value = tx.amount;
    document.getElementById('edit-type').value = tx.type;
    document.getElementById('edit-author').value = tx.author;
    document.getElementById('edit-section').style.display = 'block';
}
document.getElementById('edit-form').addEventListener('submit', e => {
    e.preventDefault();
    const form = e.target;
    const id = form['edit-id'].value;
    const updatedTx = {
        date: form['edit-date'].value,
        category: form['edit-category'].value,
        amount: parseFloat(form['edit-amount'].value),
        type: form['edit-type'].value,
        author: form['edit-author'].value
    };
    transactionsCollection.doc(id).update(updatedTx)
        .then(() => {
            document.getElementById('edit-section').style.display = 'none';
            form.reset();
            // Обновляем список "История", если открыт
            if (document.getElementById('list') && document.getElementById('list').style.display !== 'none') {
                renderAllList();
            }
        })
        .catch(err => alert('Ошибка: ' + err.message));
});
function cancelEdit() {
    document.getElementById('edit-section').style.display = 'none';
    document.getElementById('edit-form').reset();
}
// === 13. Удаление
function deleteTransaction(id) {
    if (confirm('Удалить операцию?')) {
        transactionsCollection.doc(id).delete()
            .then(() => {
                // Обновляем список "История", если открыт
                if (document.getElementById('list') && document.getElementById('list').style.display !== 'none') {
                    renderAllList();
                }
            })
            .catch(err => {
                console.error("Ошибка удаления:", err);
            });
    }
}
// === 14. Навигация
function show(sectionId) {
    document.querySelectorAll('section').forEach(s => s.style.display = 'none');
    document.getElementById(sectionId).style.display = 'block';
    document.querySelectorAll('.bottom-nav button').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.bottom-nav button[onclick="show('${sectionId}')"]`).classList.add('active');
    if (sectionId === 'list') renderAllList();
    if (sectionId === 'analytics') updateAnalytics();
    if (sectionId === 'plan') renderPlanList();
}
// === 15. Аналитика
function updateAnalytics() {
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    const savings = income - expense;
    document.getElementById('analytics-income').textContent = formatNumber(income) + ' ₽';
    document.getElementById('analytics-expense').textContent = formatNumber(expense) + ' ₽';
    document.getElementById('analytics-savings').textContent = formatNumber(savings) + ' ₽';
    const expensesByCategory = {};
    transactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
            expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
        });
    const sorted = Object.entries(expensesByCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
    const topList = document.getElementById('top-expenses');
    topList.innerHTML = '';
    if (sorted.length === 0) {
        const li = document.createElement('li');
        li.style.color = '#999';
        li.textContent = 'Нет расходов';
        topList.appendChild(li);
    } else {
        sorted.forEach(([cat, amt]) => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${cat}:</strong> ${formatNumber(amt)} ₽`;
            topList.appendChild(li);
        });
    }
    updateMonthlyPlan();
    initBI();
}
// === 16. Ежемесячный план
function updateMonthlyPlan() {
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    document.getElementById('current-month').textContent = formatMonth(currentMonth);
    const plan = financialPlans.find(p => p.month === currentMonth);
    const actualIncome = transactions
        .filter(t => t.type === 'income' && t.date.startsWith(currentMonth))
        .reduce((sum, t) => sum + t.amount, 0);
    const actualExpense = transactions
        .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
        .reduce((sum, t) => sum + t.amount, 0);
    const plannedIncome = plan ? plan.income : 0;
    const plannedExpense = plan ? plan.expense : 0;
    document.getElementById('plan-income-value').textContent = `${formatNumber(plannedIncome)} ₽`;
    document.getElementById('fact-income-value').textContent = `${formatNumber(actualIncome)} ₽`;
    document.getElementById('progress-income-bar').style.width = plannedIncome > 0 ? Math.min(100, (actualIncome / plannedIncome) * 100) + '%' : '0%';
    document.getElementById('plan-expense-value').textContent = `${formatNumber(plannedExpense)} ₽`;
    document.getElementById('fact-expense-value').textContent = `${formatNumber(actualExpense)} ₽`;
    document.getElementById('progress-expense-bar').style.width = plannedExpense > 0 ? Math.min(100, (actualExpense / plannedExpense) * 100) + '%' : '0%';
}
// Вспомогательная: форматирует месяц (2025-04 → Апрель 2025)
function formatMonth(monthStr) {
    const [year, month] = monthStr.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
}
// === 17. Анализ: диаграммы
let expensePieChart = null;
let savingsWeeklyChart = null;
let goalProgressChart = null;
function initBI() {
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 30);
    document.getElementById('bi-start-date').valueAsDate = startDate;
    document.getElementById('bi-end-date').valueAsDate = today;
    updateBI();
}
function updateBI() {
    const start = document.getElementById('bi-start-date').value;
    const end = document.getElementById('bi-end-date').value;
    if (!start || !end) {
        alert('Выберите обе даты');
        return;
    }
    if (new Date(start) > new Date(end)) {
        alert('Дата начала не может быть позже даты окончания');
        return;
    }
    const filtered = transactions.filter(t => t.date >= start && t.date <= end);
    const income = filtered
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    const expense = filtered
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    const savings = income - expense;
    // 1. Круговая диаграмма расходов
    const expensesByCategory = {};
    filtered
        .filter(t => t.type === 'expense')
        .forEach(t => {
            expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
        });
    const categories = Object.keys(expensesByCategory);
    const values = Object.values(expensesByCategory);
    if (expensePieChart) expensePieChart.destroy();
    const ctx1 = document.getElementById('expensePieChart').getContext('2d');
    expensePieChart = new Chart(ctx1, {
        type: 'doughnut',
        data: {
            labels: categories,
            datasets: [{
                data: values,
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF', '#7CFC00', '#FFD700', '#8A2BE2']
            }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
    // 2. График по неделям
    const weeklyData = getWeeklySavings(filtered, start, end);
    const weekLabels = weeklyData.map(w => `Неделя ${w.week}`);
    const weekSavings = weeklyData.map(w => w.savings);
    if (savingsWeeklyChart) savingsWeeklyChart.destroy();
    const ctx2 = document.getElementById('savingsWeeklyChart').getContext('2d');
    savingsWeeklyChart = new Chart(ctx2, {
        type: 'line',
        data: {
            labels: weekLabels,
            datasets: [{
                label: 'Накопления (₽)',
                data: weekSavings,
                borderColor: '#34c759',
                backgroundColor: 'rgba(52, 199, 89, 0.2)',
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: true } }
        }
    });
    // 3. Кольцевой прогресс-бар
    const progress = savingsGoal > 0 ? Math.min(100, (savings / savingsGoal) * 100) : 0;
    updateGoalProgressChart(progress, savings, savingsGoal);
}
function getWeeklySavings(transactions, start, end) {
    // Сортируем транзакции по дате
    const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    const weeks = [];
    const current = new Date(start);
    let weekNum = 1;
    const endDate = new Date(end);
    let cumulativeSavings = 0; // Накопленный итог с начала периода
    while (current <= endDate) {
        const weekStart = new Date(current);
        const weekEnd = new Date(current);
        weekEnd.setDate(weekEnd.getDate() + 6);
        if (weekEnd > endDate) weekEnd.setTime(endDate.getTime());
        const weekStr = weekStart.toISOString().slice(0, 10);
        const weekEndStr = weekEnd.toISOString().slice(0, 10);
        // Фильтруем транзакции за неделю
        const weekTransactions = sorted.filter(t => t.date >= weekStr && t.date <= weekEndStr);
        // Считаем доход и расход за неделю
        const income = weekTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
        const expense = weekTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
        const weeklySavings = income - expense;
        // Добавляем к нарастающему итогу
        cumulativeSavings += weeklySavings;
        weeks.push({
            week: weekNum,
            savings: cumulativeSavings // кумулятивное значение
        });
        weekNum++;
        current.setDate(current.getDate() + 7);
    }
    return weeks;
}
function updateGoalProgressChart(progress, current, goal) {
    if (goalProgressChart) goalProgressChart.destroy();
    const ctx = document.getElementById('goalProgressChart').getContext('2d');
    goalProgressChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [progress, 100 - progress],
                backgroundColor: [progress >= 100 ? '#34c759' : '#007AFF', '#eee'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            cutout: '95%',
            plugins: { tooltip: { enabled: false }, legend: { display: false } }
        }
    });
    document.getElementById('goal-progress-text').textContent = `${Math.round(progress)}%`;
}
// === 18. Экспорт в Excel
function exportToExcel() {
    const start = document.getElementById('filter-start').value;
    const end = document.getElementById('filter-end').value;
    let filtered = [...transactions];
    if (start) filtered = filtered.filter(t => t.date >= start);
    if (end) filtered = filtered.filter(t => t.date <= end);
    if (filtered.length === 0) {
        alert('Нет данных для экспорта');
        return;
    }
    const data = filtered.map(tx => ({
        "Дата": tx.date,
        "Категория": tx.category,
        "Сумма": tx.amount,
        "Тип": tx.type === 'income' ? 'Доход' : 'Расход',
        "Автор": tx.author
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Операции");
    const period = start && end ? `${start}_до_${end}` : "все";
    XLSX.writeFile(wb, `финансы_экспорт_${period}.xlsx`);
}
// === 19. Финансовый план: отображение списка
function renderPlanList() {
    const list = document.getElementById('plan-list');
    list.innerHTML = '';
    if (financialPlans.length === 0) {
        const li = document.createElement('li');
        li.style.color = '#999';
        li.style.fontStyle = 'italic';
        li.textContent = 'Пока нет планов';
        list.appendChild(li);
        return;
    }
    financialPlans
        .sort((a, b) => a.month.localeCompare(b.month))
        .forEach(plan => {
            const li = document.createElement('li');
            li.innerHTML = `
        <div>
          <div><strong>${formatMonth(plan.month)}</strong></div>
          <div class="info">Доход: ${formatNumber(plan.income)} ₽ · Расход: ${formatNumber(plan.expense)} ₽</div>
        </div>
        <div class="actions">
          <button class="btn small danger" onclick="deletePlan('${plan.id}')">🗑️</button>
        </div>
      `;
            list.appendChild(li);
        });
}
// === 20. Генерация списка месяцев
function populateMonthSelect() {
    const select = document.getElementById('plan-month');
    select.innerHTML = '';
    const today = new Date();
    const start = new Date(today.getFullYear() - 1, today.getMonth(), 1);
    const end = new Date(today.getFullYear() + 1, today.getMonth(), 1);
    const current = new Date(start);
    while (current <= end) {
        const year = current.getFullYear();
        const month = current.getMonth() + 1;
        const value = `${year}-${String(month).padStart(2, '0')}`;
        const label = new Date(year, month - 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        select.appendChild(option);
        current.setMonth(current.getMonth() + 1);
    }
    select.value = today.toISOString().slice(0, 7);
}
// === 21. Добавление плана вручную
document.getElementById('plan-form').addEventListener('submit', e => {
    e.preventDefault();
    const month = document.getElementById('plan-month').value;
    const income = parseFloat(document.getElementById('plan-income').value);
    const expense = parseFloat(document.getElementById('plan-expense').value);
    if (isNaN(income) || isNaN(expense) || !month) {
        alert('Заполните все поля корректно');
        return;
    }
    const exists = financialPlans.find(p => p.month === month);
    if (exists) {
        if (confirm(`План на ${formatMonth(month)} уже существует. Заменить?`)) {
            plansCollection.doc(exists.id).update({ income, expense });
        }
    } else {
        plansCollection.add({ month, income, expense });
    }
    document.getElementById('plan-form').reset();
});
// === 22. Удаление плана
function deletePlan(id) {
    if (confirm('Удалить план?')) {
        plansCollection.doc(id).delete();
    }
}
// === 23. Импорт из Excel
function importPlanFromExcel() {
    const fileInput = document.getElementById('import-plan-file');
    const file = fileInput.files[0];
    if (!file) {
        alert('Выберите файл');
        return;
    }
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            const rows = json.slice(json[0]?.includes('Месяц') ? 1 : 0);
            const batch = db.batch();
            let validCount = 0;
            for (const row of rows) {
                const [month, incomeRaw, expenseRaw] = row;
                if (!month || isNaN(incomeRaw) || isNaN(expenseRaw)) continue;
                let monthFormatted;
                if (typeof month === 'string' && /^\d{4}-\d{2}$/.test(month)) {
                    monthFormatted = month;
                } else if (typeof month === 'number') {
                    const date = XLSX.SSF.parse_date_code(month);
                    monthFormatted = `${date.y}-${String(date.m).padStart(2, '0')}`;
                } else {
                    continue;
                }
                const income = parseFloat(incomeRaw);
                const expense = parseFloat(expenseRaw);
                const existing = financialPlans.find(p => p.month === monthFormatted);
                const docRef = existing ? plansCollection.doc(existing.id) : plansCollection.doc();
                batch.set(docRef, { month: monthFormatted, income, expense }, { merge: true });
                validCount++;
            }
            if (validCount === 0) {
                alert('Не удалось распознать данные');
                return;
            }
            batch.commit().then(() => {
                alert(`✅ Успешно импортировано ${validCount} записей`);
                fileInput.value = '';
            });
        } catch (err) {
            console.error(err);
            alert('Ошибка при обработке файла');
        }
    };
    reader.readAsArrayBuffer(file);
}
// === 24. Авторизация: вход
document.getElementById('login-form').addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    auth.signInWithEmailAndPassword(email, password)
        .catch(err => {
            document.getElementById('auth-error').textContent = err.message;
        });
});
// === 25. Авторизация: регистрация
function register() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    auth.createUserWithEmailAndPassword(email, password)
        .catch(err => {
            document.getElementById('auth-error').textContent = err.message;
        });
}
// === 26. Прослушка состояния аутентификации
auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        loadFromFirebase();
        loadGoalFromFirebase();
        populateMonthSelect();
        document.getElementById('date').valueAsDate = new Date();
    } else {
        document.getElementById('app').style.display = 'none';
        document.getElementById('auth-screen').style.display = 'block';
    }
});
