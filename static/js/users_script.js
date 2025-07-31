/*
 * ---------------------------------------------------
 * SCRIPT PARA LA PÁGINA DE USUARIOS (LOGIN Y DASHBOARD)
 * Versión 17.1 - Formateo de Monto Inicial
 * ---------------------------------------------------
 */
document.addEventListener('DOMContentLoaded', function() {

    // ===============================================
    // 1. SELECTORES DE ELEMENTOS DEL DOM
    // ===============================================
    const loginSection = document.getElementById('login-section');
    const registerSection = document.getElementById('register-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginMessage = document.getElementById('login-message');
    const registerMessage = document.getElementById('register-message');
    const showRegisterLink = document.getElementById('show-register-link');
    const showLoginLink = document.getElementById('show-login-link');
    const welcomeUsername = document.getElementById('welcome-username');
    const logoutButton = document.getElementById('logout-button');
    const adminPanelContainer = document.getElementById('admin-panel-container');
    const adminDriverDetailsView = document.getElementById('admin-driver-details-view');
    const conductorViewElements = document.querySelectorAll('.conductor-view');
    const allTabs = document.querySelectorAll('.tab-link');
    const expenseAmountInput = document.getElementById('expense-amount');
    const initialAmountInput = document.getElementById('initial-amount');
    const shiftDisplayView = document.getElementById('shift-display-view');
    const shiftConfigForm = document.getElementById('shift-config-form');
    const displayShiftType = document.getElementById('display-shift-type');
    const displayShiftStartDate = document.getElementById('display-shift-start-date');
    const changeShiftBtn = document.getElementById('change-shift-btn');
    const editDriverModal = document.getElementById('edit-driver-modal');
    const editDriverForm = document.getElementById('edit-driver-form');
    const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
    const editDriverMessage = document.getElementById('edit-driver-message');
    const globalSpinner = document.getElementById('global-spinner-overlay');

    // Estado global
    let currentUser = null;
    let activePeriod = null;
    let currentCalendarDate = new Date();
    let adminCalendarDate = new Date();
    let userSchedule = [];
    let adminSchedule = [];

    // ===============================================
    // FUNCIONES GLOBALES DE UI
    // ===============================================
    function showSpinner() {
        if (globalSpinner) globalSpinner.classList.remove('hidden');
    }

    function hideSpinner() {
        if (globalSpinner) globalSpinner.classList.add('hidden');
    }

    // ===============================================
    // 2. COMUNICACIÓN CON LA API
    // ===============================================
    async function apiCall(endpoint, method = 'POST', data = null) {
        showSpinner();
        try {
            const options = { method, headers: { 'Content-Type': 'application/json' } };
            if (data) options.body = JSON.stringify(data);
            const response = await fetch(endpoint, options);
            if (response.status === 204) return { success: true };
            const responseData = await response.json();
            if (!response.ok) throw responseData;
            return responseData;
        } catch (error) {
            console.error(`Error en apiCall a ${endpoint}:`, error);
            throw error;
        } finally {
            hideSpinner();
        }
    }

    // ===============================================
    // 3. FUNCIONES DE RENDERIZADO DE UI
    // ===============================================
    function showSection(section) {
        [loginSection, registerSection, dashboardSection].forEach(s => s.classList.add('hidden'));
        document.getElementById(`${section}-section`)?.classList.remove('hidden');
    }

    function showMessage(element, message, isSuccess) {
        if (!element) return;
        element.textContent = message;
        element.style.color = isSuccess ? 'green' : 'red';
        element.classList.remove('hidden');
        setTimeout(() => element.classList.add('hidden'), 4000);
    }

    function openEditModal(conductor) {
        editDriverForm.querySelector('#edit-username').value = conductor.username;
        editDriverForm.querySelector('#edit-rut').value = conductor.rut || '';
        editDriverForm.querySelector('#edit-phone').value = conductor.phone || '';
        editDriverModal.classList.remove('hidden');
    }

    function closeEditModal() {
        editDriverModal.classList.add('hidden');
        editDriverForm.reset();
        editDriverMessage.classList.add('hidden');
    }

    function renderDriverList(conductores) {
        if (!adminPanelContainer) return;
        adminPanelContainer.innerHTML = `<h3>Panel de Administración</h3><h4>Conductores Registrados</h4>` + 
            ((!conductores || conductores.length === 0) 
            ? '<p>No hay conductores registrados.</p>' 
            : `<ul class="driver-list">${conductores.map(c => {
                const conductorData = JSON.stringify(c);
                return `<li class="driver-item" data-conductor='${conductorData}'>
                    <span>${c.username}</span>
                    <div class="actions">
                        <button class="view-btn action-btn">Ver</button>
                        <button class="edit-btn action-btn">Editar</button>
                    </div>
                </li>`;
            }).join('')}</ul>`);
    }

    function renderCalendar(schedule, displayDate, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const monthTitleDisplay = container.querySelector('.month-title');
        const monthGridContainer = container.querySelector('.month-grid-container, .admin-month-grid-container');
        const legend = container.querySelector('.calendar-legend');
        if (!monthTitleDisplay || !monthGridContainer) return;

        if (!schedule || schedule.length === 0) {
            monthGridContainer.innerHTML = '<p>No hay un turno configurado.</p>';
            monthTitleDisplay.textContent = 'Calendario de Turnos';
            if (legend) legend.style.display = 'none';
            return;
        }
        
        if (legend) legend.style.display = 'flex';
        const year = displayDate.getFullYear();
        const month = displayDate.getMonth();
        const monthName = displayDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
        monthTitleDisplay.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        monthGridContainer.innerHTML = '';
        const monthGrid = document.createElement('div');
        monthGrid.className = 'month-grid';
        ['L', 'M', 'M', 'J', 'V', 'S', 'D'].forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'day-header';
            dayHeader.textContent = day;
            monthGrid.appendChild(dayHeader);
        });
        const firstDayOfMonth = new Date(year, month, 1);
        let dayOfWeek = firstDayOfMonth.getDay();
        if (dayOfWeek === 0) dayOfWeek = 7;
        for (let i = 1; i < dayOfWeek; i++) {
            monthGrid.appendChild(document.createElement('div'));
        }
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
            const isoDate = new Date(Date.UTC(year, month, day)).toISOString().split('T')[0];
            const scheduleDay = schedule.find(d => d.date === isoDate);
            const status = scheduleDay ? scheduleDay.status : 'off';
            const dayCell = document.createElement('div');
            dayCell.className = `day-cell ${status}`;
            dayCell.textContent = day;
            monthGrid.appendChild(dayCell);
        }
        monthGridContainer.appendChild(monthGrid);
    }

    function renderExpenseUI(period, expenses) {
        const startContainer = document.getElementById('start-period-container');
        const activeContainer = document.getElementById('active-period-container');
        const tableBody = document.getElementById('expenses-table')?.querySelector('tbody');
        activePeriod = (period && period.status === 'activo') ? period : null;
        startContainer.classList.toggle('hidden', !!activePeriod);
        activeContainer.classList.toggle('hidden', !activePeriod);
        if (!activePeriod) return;
        const format = (n) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(n);
        document.getElementById('summary-patente').textContent = activePeriod.patente;
        document.getElementById('summary-trip').textContent = `${activePeriod.trip_origin} - ${activePeriod.trip_destination}`;
        document.getElementById('summary-initial').textContent = format(activePeriod.initial_amount);
        const totalSpent = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
        const balance = parseFloat(activePeriod.initial_amount) - totalSpent;
        document.getElementById('summary-spent').textContent = format(totalSpent);
        document.getElementById('summary-balance').textContent = format(balance);
        if (tableBody) {
            tableBody.innerHTML = '';
            expenses.forEach(exp => {
                const row = tableBody.insertRow();
                row.innerHTML = `<td>${exp.date}</td><td>${exp.category}</td><td>${exp.notes || ''}</td><td>${format(exp.amount)}</td><td><button class="delete-btn" data-id="${exp.id}" title="Eliminar este gasto"><i class="fas fa-trash-alt"></i></button></td>`;
            });
        }
    }

    function renderHistoryList(historyData, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = (!historyData || historyData.length === 0) 
            ? '<p>No hay viajes cerrados para mostrar.</p>' 
            : historyData.map((period, index) => {
                const format = (n) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(n);
                const totalSpent = period.expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
                const balance = parseFloat(period.initial_amount) - totalSpent;
                const detailsId = `${containerId}-details-${index}`;
                const expensesTableRows = period.expenses.map(exp => `<tr><td>${exp.date}</td><td>${exp.category}</td><td>${exp.notes || ''}</td><td>${format(exp.amount)}</td></tr>`).join('');
                const detailsTable = `<div id="${detailsId}" class="history-details"><table class="table-container"><thead><tr><th>Fecha</th><th>Categoría</th><th>Notas</th><th>Monto</th></tr></thead><tbody>${expensesTableRows}</tbody></table></div>`;
                return `<div class="history-item"><div class="history-summary" data-target="${detailsId}"><strong>Fecha:</strong> ${period.start_date} | <strong>Viaje:</strong> ${period.trip_origin} a ${period.trip_destination} | <strong>Saldo Final:</strong> <span class="saldo">${format(balance)}</span></div>${detailsTable}</div>`;
            }).join('');
    }
    
    function renderAdminExpenseDetails(activePeriodData, historyData) {
        const noPeriodContainer = document.getElementById('admin-no-period-container');
        const activeContainer = document.getElementById('admin-active-period-container');
        noPeriodContainer.classList.toggle('hidden', !!activePeriodData);
        activeContainer.classList.toggle('hidden', !activePeriodData);
        if (activePeriodData) {
            const format = (n) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(n);
            const expenses = activePeriodData.expenses || [];
            document.getElementById('admin-summary-patente').textContent = activePeriodData.patente;
            document.getElementById('admin-summary-trip').textContent = `${activePeriodData.trip_origin} - ${activePeriodData.trip_destination}`;
            document.getElementById('admin-summary-initial').textContent = format(activePeriodData.initial_amount);
            const totalSpent = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
            const balance = parseFloat(activePeriodData.initial_amount) - totalSpent;
            document.getElementById('admin-summary-spent').textContent = format(totalSpent);
            document.getElementById('admin-summary-balance').textContent = format(balance);
            const tableBody = document.getElementById('admin-expenses-table')?.querySelector('tbody');
            if (tableBody) {
                tableBody.innerHTML = expenses.map(exp => `<tr><td>${exp.date}</td><td>${exp.category}</td><td>${exp.notes || ''}</td><td>${format(exp.amount)}</td></tr>`).join('');
            }
        }
        renderHistoryList(historyData, 'admin-history-list-container');
    }
    
    function renderShiftConfigUI() {
        if (!currentUser || !shiftDisplayView || !shiftConfigForm) return;
        const hasShift = currentUser.shift_type && currentUser.shift_start_date;
        shiftDisplayView.classList.toggle('hidden', !hasShift);
        shiftConfigForm.classList.toggle('hidden', hasShift);
        if (hasShift) {
            displayShiftType.textContent = currentUser.shift_type;
            displayShiftStartDate.textContent = currentUser.shift_start_date;
        }
    }

    function setupDashboardForRole(user) {
        const isAdmin = user.role === 'admin';
        conductorViewElements.forEach(el => el.classList.toggle('hidden', isAdmin));
        adminPanelContainer.classList.toggle('hidden', !isAdmin);
        adminDriverDetailsView.classList.add('hidden');
        if (!isAdmin) {
            const firstTab = document.querySelector('.conductor-view .tab-link[data-tab="calendar-tab"]');
            if (firstTab) firstTab.click();
        }
    }

    async function refreshExpenseAndHistoryData() {
        const [expenseData, historyData] = await Promise.all([
            apiCall(`/api/expense_data?username=${currentUser.username}`, 'GET').catch(() => ({})),
            apiCall(`/api/work_periods/history?username=${currentUser.username}`, 'GET').catch(() => ({}))
        ]);
        if (expenseData.success) renderExpenseUI(expenseData.active_period, expenseData.expenses);
        if (historyData.success) renderHistoryList(historyData.history, 'history-list-container');
    }

    async function loadDashboardData() {
        welcomeUsername.textContent = currentUser.username;
        setupDashboardForRole(currentUser);
        if (currentUser.role === 'admin') {
            const data = await apiCall('/api/admin/conductores', 'GET');
            if (data.success) renderDriverList(data.conductores);
        } else {
            renderShiftConfigUI();
            const scheduleData = await apiCall(`/api/user/shift?username=${currentUser.username}`, 'GET').catch(() => ({}));
            userSchedule = scheduleData.success ? scheduleData.schedule : [];
            renderCalendar(userSchedule, currentCalendarDate, 'calendar-container');
            await refreshExpenseAndHistoryData();
        }
    }
    
    // ===============================================
    // 4. LÓGICA PRINCIPAL Y EVENT LISTENERS
    // ===============================================
    function init() {
        const storedUser = localStorage.getItem('loggedInUser');
        if (storedUser) {
            currentUser = JSON.parse(storedUser);
            showSection('dashboard');
            loadDashboardData();
        } else {
            showSection('login');
        }

        loginForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const data = await apiCall('/api/login', 'POST', { username: loginForm.username.value, password: loginForm.password.value });
                currentUser = data.user;
                localStorage.setItem('loggedInUser', JSON.stringify(currentUser));
                showSection('dashboard');
                await loadDashboardData();
            } catch (error) {
                showMessage(loginMessage, error.message || 'Error al conectar.', false);
            }
        });
        
        registerForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const data = await apiCall('/api/register', 'POST', { username: registerForm.username.value, password: registerForm.password.value });
                showMessage(registerMessage, data.message, true);
                setTimeout(() => showSection('login'), 2000);
            } catch (error) {
                showMessage(registerMessage, error.message || 'Error al registrar.', false);
            }
        });

        logoutButton?.addEventListener('click', () => {
            localStorage.removeItem('loggedInUser');
            currentUser = null;
            activePeriod = null;
            loginForm.reset();
            registerForm.reset();
            showSection('login');
        });

        showRegisterLink?.addEventListener('click', (e) => { e.preventDefault(); showSection('register'); });
        showLoginLink?.addEventListener('click', (e) => { e.preventDefault(); showSection('login'); });

        allTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetId = tab.dataset.tab;
                if (!targetId) return;
                const parent = tab.closest('.tabs').parentElement;
                parent.querySelectorAll('.tab-link').forEach(t => t.classList.remove('active'));
                parent.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(targetId)?.classList.add('active');
            });
        });
        
        document.addEventListener('click', async (e) => {
            const target = e.target;
            const historySummary = target.closest('.history-summary');
            if (historySummary) {
                const detailsDiv = document.getElementById(historySummary.dataset.target);
                if (detailsDiv) {
                    detailsDiv.style.display = (detailsDiv.style.display === 'block') ? 'none' : 'block';
                }
                return;
            }

            if (adminPanelContainer && !adminPanelContainer.classList.contains('hidden')) {
                const viewButton = target.closest('.view-btn');
                if (viewButton) {
                    const driverItem = viewButton.closest('.driver-item');
                    const conductorData = JSON.parse(driverItem.dataset.conductor);
                    try {
                        const data = await apiCall(`/api/admin/conductor_details/${conductorData.username}`, 'GET');
                        if (data.success) {
                            adminPanelContainer.classList.add('hidden');
                            adminDriverDetailsView.classList.remove('hidden');
                            document.getElementById('details-driver-name').innerHTML = `Detalles de: ${data.conductor.username}<div style="font-size: 0.8em; color: #555; margin-top: 5px;">RUT: ${data.conductor.rut || 'No asignado'} | Teléfono: ${data.conductor.phone || 'No asignado'}</div>`;
                            adminSchedule = data.schedule;
                            renderAdminExpenseDetails(data.active_period, data.history);
                            renderCalendar(adminSchedule, adminCalendarDate, 'admin-calendar-container');
                            const firstAdminTab = adminDriverDetailsView.querySelector('.tab-link');
                            if (firstAdminTab) firstAdminTab.click();
                        }
                    } catch (error) {
                        alert('No se pudieron cargar los detalles del conductor.');
                    }
                }
                const editButton = target.closest('.edit-btn');
                if (editButton) {
                    const driverItem = editButton.closest('.driver-item');
                    const conductorData = JSON.parse(driverItem.dataset.conductor);
                    openEditModal(conductorData);
                }
            }

            if (!dashboardSection.classList.contains('hidden')) {
                const deleteButton = target.closest('.delete-btn');
                if (deleteButton && activePeriod) {
                    if (confirm('¿Estás seguro de que quieres eliminar este gasto?')) {
                        await apiCall(`/api/expenses/${deleteButton.dataset.id}`, 'DELETE');
                        await refreshExpenseAndHistoryData();
                    }
                }
                const closeButton = target.closest('#close-period-btn');
                if (closeButton && activePeriod) {
                    if (confirm('¿Estás seguro de que quieres cerrar este viaje? No podrás añadir más gastos.')) {
                        await apiCall(`/api/work_periods/${activePeriod.id}/close`, 'POST');
                        alert('Viaje cerrado con éxito.');
                        await refreshExpenseAndHistoryData();
                    }
                }
            }
        });
        
        editDriverForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = editDriverForm.querySelector('#edit-username').value;
            const rut = editDriverForm.querySelector('#edit-rut').value;
            const phone = editDriverForm.querySelector('#edit-phone').value;
            try {
                const data = await apiCall(`/api/admin/conductor/${username}`, 'PUT', { rut, phone });
                if (data.success) {
                    showMessage(editDriverMessage, data.message, true);
                    await loadDashboardData();
                    setTimeout(closeEditModal, 1500);
                }
            } catch (error) {
                showMessage(editDriverMessage, error.message || 'Error al guardar.', false);
            }
        });

        closeEditModalBtn?.addEventListener('click', closeEditModal);
        editDriverModal?.addEventListener('click', (e) => {
            if (e.target === editDriverModal) closeEditModal();
        });
        
        document.getElementById('back-to-list-btn')?.addEventListener('click', () => {
            adminPanelContainer.classList.remove('hidden');
            adminDriverDetailsView.classList.add('hidden');
        });
        
        document.getElementById('start-period-form')?.addEventListener('submit', async(e) => {
            e.preventDefault();
            const form = e.target;
            const unformattedAmount = form['initial-amount'].value.replace(/\./g, '');
            const periodData = { username: currentUser.username, patente: form.patente.value, rut: form.rut.value, trip_origin: form['trip-origin'].value, trip_destination: form['trip-destination'].value, initial_amount: unformattedAmount };
            try {
                await apiCall('/api/work_periods', 'POST', periodData);
                await refreshExpenseAndHistoryData();
                form.reset();
            } catch(error) {
                alert(error.message || 'Error al iniciar el período.');
            }
        });

        document.getElementById('add-expense-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!activePeriod) return alert("No hay un período activo para añadir gastos.");
            const form = e.target;
            const unformattedAmount = form['expense-amount'].value.replace(/\./g, '');
            const expenseData = { period_id: activePeriod.id, category: form['expense-category'].value, amount: unformattedAmount, notes: form['expense-notes'].value };
            try {
                await apiCall('/api/expenses', 'POST', expenseData);
                await refreshExpenseAndHistoryData();
                form.reset();
            } catch(error) {
                alert(error.message || 'Error al añadir el gasto.');
            }
        });
        
        expenseAmountInput?.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
            e.target.value = value ? new Intl.NumberFormat('es-CL').format(value) : '';
        });

        initialAmountInput?.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
            e.target.value = value ? new Intl.NumberFormat('es-CL').format(value) : '';
        });
        
        changeShiftBtn?.addEventListener('click', () => {
            shiftDisplayView.classList.add('hidden');
            shiftConfigForm.classList.remove('hidden');
        });

        shiftConfigForm?.addEventListener('submit', async(e) => {
            e.preventDefault();
            const form = e.target;
            const shiftData = { 
                username: currentUser.username, 
                shift_type: form.querySelector('#shift-type-select').value, 
                shift_start_date: form.querySelector('#shift-start-date-input').value 
            };
            try {
                const data = await apiCall('/api/user/shift', 'POST', shiftData);
                currentUser.shift_type = shiftData.shift_type;
                currentUser.shift_start_date = shiftData.shift_start_date;
                localStorage.setItem('loggedInUser', JSON.stringify(currentUser));
                showMessage(document.getElementById('shift-message'), data.message, true);
                await loadDashboardData();
            } catch (error) {
                showMessage(document.getElementById('shift-message'), error.message || 'Error al guardar el turno.', false);
            }
        });

        document.getElementById('prev-month-btn')?.addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
            renderCalendar(userSchedule, currentCalendarDate, 'calendar-container');
        });

        document.getElementById('next-month-btn')?.addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
            renderCalendar(userSchedule, currentCalendarDate, 'calendar-container');
        });

        document.getElementById('admin-prev-month-btn')?.addEventListener('click', () => {
            adminCalendarDate.setMonth(adminCalendarDate.getMonth() - 1);
            renderCalendar(adminSchedule, adminCalendarDate, 'admin-calendar-container');
        });
        document.getElementById('admin-next-month-btn')?.addEventListener('click', () => {
            adminCalendarDate.setMonth(adminCalendarDate.getMonth() + 1);
            renderCalendar(adminSchedule, adminCalendarDate, 'admin-calendar-container');
        });
    }

    init();
});