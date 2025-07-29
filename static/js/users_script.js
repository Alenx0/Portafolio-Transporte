/*
 * ---------------------------------------------------
 * SCRIPT PARA LA PÁGINA DE USUARIOS (LOGIN Y DASHBOARD)
 * Versión 7.7 - Con Calendario Reparado
 * ---------------------------------------------------
 */
document.addEventListener('DOMContentLoaded', function() {

        // ===============================================
        // 1. ELEMENTOS DEL DOM
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
        
        // Contenedores del Dashboard
        const adminPanelContainer = document.getElementById('admin-panel-container');
        const adminDriverDetailsView = document.getElementById('admin-driver-details-view');
        const conductorViewElements = document.querySelectorAll('.conductor-view');
        const allTabs = document.querySelectorAll('.tab-link');
    
        // Estado de la aplicación
        let currentUser = null;
        let activePeriod = null;
        let expenses = [];
    
        // ===============================================
        // 2. LÓGICA DE LA API
        // ===============================================
        async function apiCall(endpoint, method = 'POST', data = null) {
            const options = { method, headers: { 'Content-Type': 'application/json' } };
            if (data) options.body = JSON.stringify(data);
            const response = await fetch(endpoint, options);
            if (response.status === 204 || response.headers.get("content-length") === "0") {
                return { success: true, message: "Operación exitosa" };
            }
            const responseData = await response.json();
            if (!response.ok) {
                const error = new Error(responseData.message || 'Error del servidor');
                error.data = responseData;
                throw error;
            }
            return responseData;
        }
    
        // ===============================================
        // 3. FUNCIONES DE MANEJO DE LA INTERFAZ (UI)
        // ===============================================
        function showSection(sectionToShow) {
            loginSection.classList.add('hidden');
            registerSection.classList.add('hidden');
            dashboardSection.classList.add('hidden');
            if (sectionToShow === 'login') loginSection.classList.remove('hidden');
            else if (sectionToShow === 'register') registerSection.classList.remove('hidden');
            else if (sectionToShow === 'dashboard') dashboardSection.classList.remove('hidden');
        }
        
        function showMessage(messageElement, text, isSuccess) {
            messageElement.textContent = text;
            messageElement.style.color = isSuccess ? 'green' : 'red';
            messageElement.classList.remove('hidden');
            setTimeout(() => messageElement.classList.add('hidden'), 4000);
        }
        
        // ===================================
        // FUNCIÓN DE CALENDARIO CORREGIDA
        // ===================================
        function renderCalendar(schedule, container) {
            if (!container) return;
        
            // Mensaje si no hay turno configurado
            if (!schedule || schedule.length === 0) {
                container.innerHTML = '<h3>Calendario de Turnos</h3><p>El conductor aún no ha configurado su turno.</p>';
                return;
            }
        
            // Limpiar contenedor y agregar leyenda
            container.innerHTML = `
                <h3>Calendario de Turnos</h3>
                <div class="calendar-legend">
                    <div><span class="day-cell-legend work"></span> Trabajo</div>
                    <div><span class="day-cell-legend off"></span> Descanso</div>
                </div>
            `;
        
            const months = {};
            schedule.forEach(day => {
                const month = day.date.substring(0, 7);
                if (!months[month]) months[month] = [];
                months[month].push(day);
            });
        
            for (const monthKey in months) {
                const date = new Date(monthKey + '-02T00:00:00'); // Usar T00:00:00 para evitar problemas de zona horaria
                const monthName = date.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
        
                const title = document.createElement('h4');
                title.className = 'month-title';
                title.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                container.appendChild(title);
        
                // Crear la cuadrícula del mes
                const monthGrid = document.createElement('div');
                monthGrid.className = 'month-grid'; // USAR LA CLASE CORRECTA
        
                // --- AÑADIR LOS ENCABEZADOS DE LOS DÍAS ---
                const weekdays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
                weekdays.forEach(day => {
                    const dayHeader = document.createElement('div');
                    dayHeader.className = 'day-header';
                    dayHeader.textContent = day;
                    monthGrid.appendChild(dayHeader);
                });
        
                // --- CALCULAR ESPACIOS EN BLANCO AL INICIO DEL MES ---
                const firstDayOfMonth = new Date(months[monthKey][0].date + 'T00:00:00');
                let dayOfWeek = firstDayOfMonth.getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado
                if (dayOfWeek === 0) dayOfWeek = 7; // Convertir Domingo a 7 para que quede al final
                
                // Añadir celdas vacías para los días antes de que empiece el mes
                for (let i = 1; i < dayOfWeek; i++) {
                    const emptyCell = document.createElement('div');
                    monthGrid.appendChild(emptyCell);
                }
        
                // Añadir las celdas de los días
                months[monthKey].forEach(day => {
                    const dayCell = document.createElement('div');
                    dayCell.className = `day-cell ${day.status}`;
                    dayCell.textContent = new Date(day.date + 'T00:00:00').getDate();
                    monthGrid.appendChild(dayCell);
                });
        
                container.appendChild(monthGrid);
            }
        }
    
        function renderExpenseUI(period, expenseList, container) {
            const startContainer = container.querySelector('#start-period-container') || container.querySelector('#admin-no-period-container');
            const activeContainer = container.querySelector('#active-period-container') || container.querySelector('#admin-active-period-container');
            const tableBody = container.querySelector('tbody');
        
            if (period) {
                if(startContainer) startContainer.classList.add('hidden');
                if(activeContainer) activeContainer.classList.remove('hidden');
                
                const format = (n) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(n);
                
                const summaryPatente = container.querySelector('#summary-patente') || container.querySelector('#admin-summary-patente');
                const summaryTrip = container.querySelector('#summary-trip') || container.querySelector('#admin-summary-trip');
                const summaryInitial = container.querySelector('#summary-initial') || container.querySelector('#admin-summary-initial');
                const summarySpent = container.querySelector('#summary-spent') || container.querySelector('#admin-summary-spent');
                const summaryBalance = container.querySelector('#summary-balance') || container.querySelector('#admin-summary-balance');
        
                if(summaryPatente) summaryPatente.textContent = period.patente;
                if(summaryTrip) summaryTrip.textContent = `${period.trip_origin} - ${period.trip_destination}`;
                if(summaryInitial) summaryInitial.textContent = format(period.initial_amount);
        
                const totalSpent = expenseList.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
                const balance = parseFloat(period.initial_amount) - totalSpent;
        
                if(summarySpent) summarySpent.textContent = format(totalSpent);
                if(summaryBalance) summaryBalance.textContent = format(balance);
                
                if(tableBody) {
                    tableBody.innerHTML = '';
                    expenseList.forEach(exp => {
                        const row = tableBody.insertRow();
                        const isConductorView = container.id === 'expenses-tab';
                        
                        row.innerHTML = `
                            <td>${exp.date}</td>
                            <td>${exp.category}</td>
                            <td>${exp.notes || ''}</td>
                            <td>${format(exp.amount)}</td>
                            ${isConductorView ? `<td><button class="delete-btn" data-id="${exp.id}" title="Eliminar este gasto"><i class="fas fa-trash-alt"></i></button></td>` : '<td>-</td>'}
                        `;
                    });
                }
            } else {
                if(startContainer) startContainer.classList.remove('hidden');
                if(activeContainer) activeContainer.classList.add('hidden');
            }
        }
        
        function renderDriverList(conductores) {
            let listHTML = '<h3>Panel de Administración</h3><h4>Conductores Registrados</h4>';
            if (conductores.length === 0) {
                listHTML += '<p>No hay conductores registrados actualmente.</p>';
            } else {
                listHTML += '<ul class="driver-list">';
                conductores.forEach(conductor => {
                    listHTML += `<li class="driver-item" data-username="${conductor.username}"><span>${conductor.username}</span><button class="view-btn">Ver Detalles</button></li>`;
                });
                listHTML += '</ul>';
            }
            adminPanelContainer.innerHTML = listHTML;
        }
    
        function setupDashboardForRole(user) {
            if (user.role === 'admin') {
                conductorViewElements.forEach(el => el.classList.add('hidden'));
                adminPanelContainer.classList.remove('hidden');
                adminDriverDetailsView.classList.add('hidden');
            } else {
                conductorViewElements.forEach(el => el.classList.remove('hidden'));
                adminPanelContainer.classList.add('hidden');
                adminDriverDetailsView.classList.add('hidden');
                
                allTabs.forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                const firstTab = document.querySelector('.tab-link[data-tab="calendar-tab"]');
                const firstTabContent = document.getElementById('calendar-tab');
                if (firstTab) firstTab.classList.add('active');
                if (firstTabContent) firstTabContent.classList.add('active');
            }
        }
    
        // ===============================================
        // 4. LÓGICA PRINCIPAL Y EVENT LISTENERS
        // ===============================================
        
        async function loadDashboardData() {
            welcomeUsername.textContent = currentUser.username;
            setupDashboardForRole(currentUser);
    
            if (currentUser.role === 'admin') {
                try {
                    const data = await apiCall('/api/admin/conductores', 'GET');
                    if (data.success) renderDriverList(data.conductores);
                } catch (error) { console.error("Error al cargar lista de conductores:", error); }
            } else {
                const shiftTypeSelect = document.getElementById('shift-type-select');
                const shiftStartDateInput = document.getElementById('shift-start-date-input');
                if(currentUser.shift_type) shiftTypeSelect.value = currentUser.shift_type;
                if(currentUser.shift_start_date) shiftStartDateInput.value = currentUser.shift_start_date;
                try {
                    const scheduleData = await apiCall(`/api/user/shift?username=${currentUser.username}`, 'GET');
                    if (scheduleData.success) renderCalendar(scheduleData.schedule, document.getElementById('calendar-container'));
                } catch (error) { renderCalendar([], document.getElementById('calendar-container')); }
                try {
                    const expenseData = await apiCall(`/api/expense_data?username=${currentUser.username}`, 'GET');
                    if (expenseData.success) {
                        activePeriod = expenseData.active_period;
                        expenses = expenseData.expenses;
                        renderExpenseUI(activePeriod, expenses, document.getElementById('expenses-tab'));
                    }
                } catch (error) { renderExpenseUI(null, [], document.getElementById('expenses-tab')); }
            }
        }
    
        const storedUser = localStorage.getItem('loggedInUser');
        if (storedUser) {
            currentUser = JSON.parse(storedUser);
            showSection('dashboard');
            loadDashboardData();
        } else {
            showSection('login');
        }
    
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            showSection('register');
        });
    
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            showSection('login');
        });
        
        allTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const parentTabs = tab.closest('.tabs');
                parentTabs.querySelectorAll('.tab-link').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const targetId = tab.dataset.tab;
                const viewContainer = tab.closest('section, #admin-driver-details-view');
                viewContainer.querySelectorAll('.tab-content').forEach(content => {
                    content.id === targetId ? content.classList.add('active') : content.classList.remove('active');
                });
            });
        });
        
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;
            const submitButton = loginForm.querySelector('button');
            submitButton.disabled = true;
            try {
                const data = await apiCall('/api/login', 'POST', { username, password });
                currentUser = data.user;
                localStorage.setItem('loggedInUser', JSON.stringify(currentUser));
                showSection('dashboard');
                await loadDashboardData();
            } catch (error) {
                showMessage(loginMessage, error.data?.message || 'Error al conectar.', false);
            } finally {
                submitButton.disabled = false;
            }
        });
    
        const shiftConfigForm = document.getElementById('shift-config-form');
        if (shiftConfigForm) {
            shiftConfigForm.addEventListener('submit', async (e) => { 
                e.preventDefault(); 
                const newShiftType = document.getElementById('shift-type-select').value; 
                const newStartDate = document.getElementById('shift-start-date-input').value; 
                try { 
                    const data = await apiCall('/api/user/shift', 'POST', { username: currentUser.username, shift_type: newShiftType, shift_start_date: newStartDate }); 
                    showMessage(document.getElementById('shift-message'), data.message, true); 
                    currentUser.shift_type = newShiftType; 
                    currentUser.shift_start_date = newStartDate; 
                    localStorage.setItem('loggedInUser', JSON.stringify(currentUser)); 
                    const scheduleData = await apiCall(`/api/user/shift?username=${currentUser.username}`, 'GET'); 
                    if (scheduleData.success) renderCalendar(scheduleData.schedule, document.getElementById('calendar-container')); 
                } catch (error) { 
                    showMessage(document.getElementById('shift-message'), error.data?.message || 'Error al guardar.', false); 
                } 
            });
        }
        
        const startPeriodForm = document.getElementById('start-period-form');
        if (startPeriodForm) {
            startPeriodForm.addEventListener('submit', async (e) => { 
                e.preventDefault(); 
                const periodData = { 
                    username: currentUser.username, 
                    patente: document.getElementById('patente').value, 
                    rut: document.getElementById('rut').value, 
                    trip_origin: document.getElementById('trip-origin').value, 
                    trip_destination: document.getElementById('trip-destination').value, 
                    initial_amount: document.getElementById('initial-amount').value 
                }; 
                try { 
                    const data = await apiCall('/api/work_periods', 'POST', periodData); 
                    activePeriod = data.period; 
                    expenses = []; 
                    renderExpenseUI(activePeriod, expenses, document.getElementById('expenses-tab')); 
                    startPeriodForm.reset(); 
                } catch (error) { 
                    console.error("Error al iniciar período:", error); 
                    alert("Hubo un error al iniciar el período de trabajo."); 
                } 
            });
        }
    
        const expenseAmountInput = document.getElementById('expense-amount');
        if (expenseAmountInput) {
            expenseAmountInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
                
                if (value) {
                    e.target.value = new Intl.NumberFormat('es-CL').format(value);
                } else {
                    e.target.value = '';
                }
            });
        }
        
        const addExpenseForm = document.getElementById('add-expense-form');
        if (addExpenseForm) {
            addExpenseForm.addEventListener('submit', async (e) => { 
                e.preventDefault();
    
                const amountInput = document.getElementById('expense-amount');
                const unformattedAmount = amountInput.value.replace(/\./g, '');
    
                const expenseData = { 
                    period_id: activePeriod.id, 
                    category: document.getElementById('expense-category').value, 
                    amount: unformattedAmount, 
                    notes: document.getElementById('expense-notes').value 
                }; 
                try { 
                    const data = await apiCall('/api/expenses', 'POST', expenseData); 
                    expenses.push(data.expense); 
                    renderExpenseUI(activePeriod, expenses, document.getElementById('expenses-tab')); 
                    addExpenseForm.reset(); 
                } catch (error) { 
                    console.error("Error al añadir gasto:", error); 
                    alert("Hubo un error al añadir el gasto."); 
                } 
            });
        }
        
        dashboardSection.addEventListener('click', async (e) => {
            const deleteButton = e.target.closest('.delete-btn');
            if (deleteButton) {
                const expenseId = deleteButton.dataset.id;
                if (confirm('¿Estás seguro de que quieres eliminar este gasto?')) {
                    try {
                        await apiCall(`/api/expenses/${expenseId}`, 'DELETE');
                        const container = deleteButton.closest('.tab-content') || document.getElementById('expenses-tab');
                        expenses = expenses.filter(exp => exp.id != expenseId);
                        renderExpenseUI(activePeriod, expenses, container);
                    } catch (error) {
                        console.error('Error al eliminar el gasto:', error);
                        alert('No se pudo eliminar el gasto.');
                    }
                }
            }
        });
        
        logoutButton.addEventListener('click', () => { 
            localStorage.removeItem('loggedInUser'); 
            currentUser = null; 
            activePeriod = null; 
            expenses = []; 
            showSection('login'); 
            loginForm.reset(); 
            registerForm.reset(); 
        });
        
        registerForm.addEventListener('submit', async (e) => { 
            e.preventDefault(); 
            const username = document.getElementById('register-username').value; 
            const password = document.getElementById('register-password').value; 
            const submitButton = registerForm.querySelector('button'); 
            submitButton.disabled = true; 
            try { 
                const data = await apiCall('/api/register', 'POST', { username, password }); 
                showMessage(registerMessage, data.message, true); 
                if (data.success) setTimeout(() => showSection('login'), 2000); 
            } catch (error) { 
                showMessage(registerMessage, error.data?.message || 'Error al registrar.', false); 
            } finally { 
                submitButton.disabled = false; 
            } 
        });
    
        adminPanelContainer.addEventListener('click', async (e) => {
            const viewButton = e.target.closest('.view-btn');
            if (viewButton) {
                const driverUsername = viewButton.closest('.driver-item').dataset.username;
                try {
                    const data = await apiCall(`/api/admin/conductor_details/${driverUsername}`, 'GET');
                    if (data.success) {
                        adminPanelContainer.classList.add('hidden');
                        adminDriverDetailsView.classList.remove('hidden');
                        document.getElementById('details-driver-name').textContent = `Detalles de: ${data.conductor.username}`;
                        
                        renderCalendar(data.schedule, document.getElementById('admin-calendar-container'));
                        renderExpenseUI(data.active_period, data.expenses, document.getElementById('admin-expenses-tab'));
                    }
                } catch (error) {
                    console.error("Error al cargar detalles del conductor:", error);
                    alert("No se pudieron cargar los detalles del conductor.");
                }
            }
        });
    
        document.getElementById('back-to-list-btn').addEventListener('click', () => {
            adminPanelContainer.classList.remove('hidden');
            adminDriverDetailsView.classList.add('hidden');
        });
    
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            showSection('register');
        });
    
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            showSection('login');
        });
    });