const AppState = {
  currentView: 'dashboard',
  tasks: [],
  taskCategories: { 'Work': '#6366f1', 'Personal': '#10b981', 'Fitness': '#f59e0b', 'Other': '#888' },
  goals: [], 
  metrics: {}, 
  metricOrder: [], 
  settings: {
     theme: 'light',
     primaryColor: '#6366f1',
     currency: '€',
     weightUnit: 'kg'
  },
  sidebarOrder: ['dashboard', 'tasks', 'goals', 'growth'],
  editId: null,
  editMetricKey: null,
  chartInstances: {},
  goalsShowCharts: false 
};

const App = {
  init() {
     this.loadData();
     this.checkHabitResets();
     this.applySettings();
     this.bindEvents();
     this.renderAll();
     this.updateTime();
  },

  loadData() {
     const data = localStorage.getItem('lifeTrackerData');
     if (data) {
        const parsed = JSON.parse(data);
        AppState.tasks = parsed.tasks || [];
        AppState.taskCategories = parsed.taskCategories || { 'Work': '#6366f1', 'Personal': '#10b981', 'Fitness': '#f59e0b', 'Other': '#888' };
        AppState.goals = parsed.goals || [];
        AppState.metrics = parsed.metrics || { weight: { unit: 'kg', entries: [], target: null } };
        AppState.settings = { ...AppState.settings, ...parsed.settings };
        // Force units to Euro and KG as requested
        AppState.settings.currency = '€';
        AppState.settings.weightUnit = 'kg';
        AppState.sidebarOrder = parsed.sidebarOrder || ['dashboard', 'tasks', 'goals', 'growth'];
        AppState.metricOrder = parsed.metricOrder || Object.keys(AppState.metrics);
        Object.keys(AppState.metrics).forEach(m => {
            if(!AppState.metricOrder.includes(m)) AppState.metricOrder.push(m);
        });
     } else {
        // Seed
        AppState.metrics = { weight: { unit: 'kg', entries: [], target: 75 } };
        AppState.metricOrder = ['weight'];
        AppState.goals = [
           { 
             id: '1', title: 'Drink Water', desc: 'Daily hydration', freq: 'daily', type: 'quantitative', target: 2000, unit: 'ml', 
             progress: 0, streak: 0, longStreak: 0, history: [], lastReset: new Date().toISOString(), startDate: new Date().toISOString()
           },
           { 
             id: '2', title: 'Read Book', desc: 'Weekly reading', freq: 'weekly', type: 'binary', target: 1, unit: '', 
             progress: 0, streak: 0, longStreak: 0, history: [], lastReset: new Date().toISOString(), startDate: new Date().toISOString()
           }
        ];
     }
  },

  saveData() {
     localStorage.setItem('lifeTrackerData', JSON.stringify({
        tasks: AppState.tasks,
        taskCategories: AppState.taskCategories,
        goals: AppState.goals,
        metrics: AppState.metrics,
        settings: AppState.settings,
        sidebarOrder: AppState.sidebarOrder,
        metricOrder: AppState.metricOrder
     }));
     this.renderDashboard(); 
     this.renderSidebar();
  },

  checkHabitResets() {
     const now = new Date();
     let changed = false;
     AppState.goals.forEach(g => {
        const lastReset = new Date(g.lastReset);
        let shouldReset = false;
        if (g.freq === 'daily' && now.toDateString() !== lastReset.toDateString()) shouldReset = true;
        else if (g.freq === 'weekly') {
           const getWeek = (d) => {
              const onejan = new Date(d.getFullYear(), 0, 1);
              return Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
           };
           if (getWeek(now) !== getWeek(lastReset) || now.getFullYear() !== lastReset.getFullYear()) shouldReset = true;
        } else if (g.freq === 'monthly' && (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear())) shouldReset = true;

        if (shouldReset) {
           const completed = g.type === 'binary' ? (g.progress >= 1) : (g.progress >= g.target);
           if (completed) { 
              g.streak++; 
              if (g.streak > g.longStreak) g.longStreak = g.streak; 
           } else { 
              g.streak = 0; 
           }
           g.history.push({ date: g.lastReset, progress: g.progress, target: g.target, completed });
           g.progress = 0;
           g.lastReset = now.toISOString();
           changed = true;
        }
     });
     if (changed) this.saveData();
  },

  applySettings() {
     document.documentElement.setAttribute('data-theme', AppState.settings.theme);
     document.getElementById('themeToggle').checked = AppState.settings.theme === 'dark';
     document.documentElement.style.setProperty('--primary', AppState.settings.primaryColor);
  },

  bindEvents() {
     document.querySelector('.sidebar').addEventListener('click', (e) => {
        const btn = e.target.closest('.nav-item');
        if (btn) this.switchView(btn.dataset.view);
     });

     this.setupModal('taskModal', 'addTaskBtn', 'taskForm', (e) => this.handleTaskSubmit(e));
     
     document.getElementById('taskCategorySelect').addEventListener('change', (e) => {
         document.getElementById('newCategoryInputWrapper').style.display = e.target.value === 'new' ? 'block' : 'none';
     });

     document.getElementById('taskCategoryFilter').addEventListener('change', () => this.renderTasks());
     document.getElementById('taskImportanceFilter').addEventListener('change', () => this.renderTasks());
     document.getElementById('taskSortOrder').addEventListener('change', () => this.renderTasks());
     document.getElementById('goalCompletionFilter')?.addEventListener('change', () => this.renderGoals());

     document.getElementById('goalType').addEventListener('change', (e) => {
        document.getElementById('goalQuantFields').style.display = e.target.value === 'quantitative' ? 'block' : 'none';
     });

     this.setupModal('goalModal', 'addGoalBtn', 'goalForm', (e) => this.handleGoalSubmit(e));
     this.setupModal('metricModal', 'addMetricBtn', 'metricForm', (e) => this.handleMetricSubmit(e));
     
     document.getElementById('addNewMetricTypeBtn').addEventListener('click', () => {
         AppState.editId = null; 
         const modal = document.getElementById('metricModal');
         document.getElementById('metricForm').reset();
         document.getElementById('metricDate').value = new Date().toISOString().split('T')[0];
         this.populateMetricTypeSelect();
         document.getElementById('metricTypeInput').value = 'custom';
         document.getElementById('newMetricInputs').style.display = 'block';
         modal.querySelector('h2').textContent = 'New Metric';
         modal.classList.add('active');
     });

     document.getElementById('openSettingsBtn').addEventListener('click', () => document.getElementById('settingsModal').classList.add('active'));

     document.getElementById('metricTypeInput').addEventListener('change', (e) => {
        const presets = {
           steps: { unit: 'steps', target: 10000 },
           water: { unit: 'ml', target: 2000 },
           sleep: { unit: 'hrs', target: 8 },
           pushups: { unit: 'reps', target: 50 }
        };
        if (e.target.value === 'custom' || !AppState.metrics[e.target.value]) {
           document.getElementById('newMetricInputs').style.display = 'block';
           if (presets[e.target.value]) {
              document.getElementById('newMetricName').value = e.target.options[e.target.selectedIndex].text;
              document.getElementById('newMetricUnit').value = presets[e.target.value].unit;
              document.getElementById('newMetricTarget').value = presets[e.target.value].target;
           }
        } else {
           document.getElementById('newMetricInputs').style.display = 'none';
        }
     });

     document.getElementById('toggleGoalCharts')?.addEventListener('click', () => {
        AppState.goalsShowCharts = !AppState.goalsShowCharts;
        document.getElementById('toggleGoalCharts').textContent = AppState.goalsShowCharts ? '📋' : '📈';
        this.renderGoals();
     });

     document.getElementById('themeToggle').addEventListener('change', (e) => {
        AppState.settings.theme = e.target.checked ? 'dark' : 'light';
        this.applySettings();
        this.saveData();
     });
     
     document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', () => { AppState.settings.primaryColor = btn.dataset.color; this.applySettings(); this.saveData(); });
     });

     document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
           document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
           e.target.classList.add('active');
           this.renderTasks();
        });
     });

     document.querySelectorAll('.f-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
           document.querySelectorAll('.f-tab').forEach(t => t.classList.remove('active'));
           e.target.classList.add('active');
           this.renderGoals(e.target.dataset.goalFilter);
        });
     });

     document.addEventListener('click', (e) => {
        if (e.target.closest('.close-modal')) {
           e.target.closest('.modal').classList.remove('active');
        }
        if (e.target.closest('.delete-task')) this.deleteTask(e.target.closest('.task-card').dataset.id);
        if (e.target.closest('.edit-task')) this.editTask(e.target.closest('.task-card').dataset.id);
        if (e.target.closest('.task-checkbox-custom')) this.toggleTask(e.target.closest('.task-card').dataset.id);
        
        // Goal Progress Buttons
        const plusBtn = e.target.closest('.goal-step-plus');
        if (plusBtn) this.changeGoalProgress(plusBtn.dataset.id, 1);
        const minusBtn = e.target.closest('.goal-step-minus');
        if (minusBtn) this.changeGoalProgress(minusBtn.dataset.id, -1);

        const checkBtn = e.target.closest('.habit-check');
        if (checkBtn) this.toggleHabitBinary(checkBtn.dataset.id);

        if (e.target.closest('.delete-habit')) this.deleteHabit(e.target.closest('.habit-card').dataset.id);
        if (e.target.closest('.edit-habit')) this.editHabit(e.target.closest('.habit-card').dataset.id);

        const card = e.target.closest('.dash-card');
        if (card) this.switchView(card.dataset.view);
        
        if (e.target.closest('.view-goal')) this.switchView('goals');
        if (e.target.closest('.toolbar-add-goal')) document.getElementById('addGoalBtn').click();

        if (e.target.closest('.delete-metric')) this.deleteMetric(e.target.closest('.metric-card').dataset.metric);
        if (e.target.closest('.edit-metric')) this.editMetric(e.target.closest('.metric-card').dataset.metric);

        const timeTab = e.target.closest('.time-tab');
        if (timeTab) {
           document.querySelectorAll('.time-tab').forEach(t => t.classList.remove('active'));
           timeTab.classList.add('active');
           this.renderGrowth();
        }
        
        const histBtn = e.target.closest('.edit-hist-btn');
        if (histBtn) {
           const { gid, idx } = histBtn.dataset;
           this.editHabitHistory(gid, parseInt(idx));
        }
     });

     // Listen for manual input changes on goal progress
     document.addEventListener('change', (e) => {
        if (e.target.closest('.goal-progress-input')) {
           const id = e.target.dataset.id;
           const val = parseFloat(e.target.value);
           if (!isNaN(val)) {
              const g = AppState.goals.find(x => x.id === id);
              if (g) {
                 g.progress = Math.max(0, val);
                 this.saveData();
                 this.renderGoals();
              }
           }
        }
     });

     this.initSidebarDrag();
     this.initMetricDrag();
  },

  initSidebarDrag() {
     const sidebar = document.querySelector('.sidebar');
     let dragItem = null;
     sidebar.addEventListener('dragstart', (e) => { dragItem = e.target.closest('.nav-item'); if (dragItem) { dragItem.classList.add('dragging'); } });
     sidebar.addEventListener('dragend', () => { if (dragItem) { dragItem.classList.remove('dragging'); AppState.sidebarOrder = [...sidebar.querySelectorAll('.nav-item')].map(i => i.dataset.view); this.saveData(); } });
     sidebar.addEventListener('dragover', (e) => { e.preventDefault(); const after = getDragAfterElement(sidebar, e.clientY, '.nav-item'); if (after == null) sidebar.appendChild(dragItem); else sidebar.insertBefore(dragItem, after); });
  },

  initMetricDrag() {
     const container = document.getElementById('metricsContainer');
     let dragItem = null;
     container.addEventListener('dragstart', (e) => { dragItem = e.target.closest('.metric-card'); if (dragItem) { dragItem.classList.add('dragging'); } });
     container.addEventListener('dragend', () => { if (dragItem) { dragItem.classList.remove('dragging'); AppState.metricOrder = [...container.querySelectorAll('.metric-card')].map(i => i.dataset.metric); this.saveData(); this.renderGrowth(); } });
     container.addEventListener('dragover', (e) => { e.preventDefault(); const after = getDragAfterElement(container, e.clientY, '.metric-card'); if (after == null) container.appendChild(dragItem); else container.insertBefore(dragItem, after); });
  },

  renderSidebar() {
     const sidebar = document.querySelector('.sidebar');
     const active = AppState.currentView;
     sidebar.innerHTML = '';
     AppState.sidebarOrder.forEach(id => {
        const labels = { dashboard: 'Dashboard', tasks: 'Tasks', goals: 'Goals', growth: 'Growth' };
        const icons = { dashboard: '📊', tasks: '☑️', goals: '🎯', growth: '📈' };
        const btn = document.createElement('button');
        btn.className = `nav-item ${active === id ? 'active' : ''}`;
        btn.dataset.view = id; btn.draggable = true;
        btn.innerHTML = `<span class="nav-icon">${icons[id]}</span><span class="nav-label">${labels[id]}</span>`;
        sidebar.appendChild(btn);
     });
  },

  setupModal(modalId, btnId, formId, submitHandler) {
     const modal = document.getElementById(modalId);
     const btn = document.getElementById(btnId);
     const form = document.getElementById(formId);
     if(btn) btn.addEventListener('click', () => {
         AppState.editId = null; 
         form.reset();
         if(modalId === 'goalModal') {
            document.getElementById('goalQuantFields').style.display = 'none';
            document.getElementById('goalHistorySection').style.display = 'none';
            modal.querySelector('h2').textContent = 'Set Habit Goal';
            modal.querySelector('button[type="submit"]').textContent = 'Create Goal';
         }
         if(modalId === 'taskModal') {
            document.getElementById('taskImportance').value = '3';
            this.populateTaskCategories();
         }
         modal.classList.add('active');
     });
     modal.querySelectorAll('.close-modal').forEach(b => b.addEventListener('click', () => modal.classList.remove('active')));
     form.addEventListener('submit', (e) => { e.preventDefault(); submitHandler(e); modal.classList.remove('active'); });
  },

  switchView(id) {
     document.querySelectorAll('.view').forEach(v => {
        v.classList.remove('active');
     });
     document.getElementById(id).classList.add('active');
     document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
     const btn = document.querySelector(`.nav-item[data-view="${id}"]`);
     if (btn) btn.classList.add('active');
     AppState.currentView = id;
     if(id === 'growth') this.renderGrowth();
     if(id === 'goals') this.renderGoals();
     if(id === 'tasks') this.renderTasks();
  },

  // --- TASKS ---
  populateTaskCategories() {
      const select = document.getElementById('taskCategorySelect');
      let html = Object.keys(AppState.taskCategories).map(c => `<option value="${c}">${c}</option>`).join('');
      select.innerHTML = html + '<option value="new">+ New Category</option>';
      
      const filter = document.getElementById('taskCategoryFilter');
      const val = filter.value;
      filter.innerHTML = '<option value="all">All Categories</option>' + Object.keys(AppState.taskCategories).map(c => `<option value="${c}">${c}</option>`).join('');
      filter.value = val;
  },

  handleTaskSubmit() {
     let category = document.getElementById('taskCategorySelect').value;
     if (category === 'new') {
         category = document.getElementById('newCategoryName').value || 'Uncategorized';
         const color = document.getElementById('newCategoryColor').value;
         AppState.taskCategories[category] = color;
     }

     const task = {
        id: AppState.editId || Date.now().toString(),
        name: document.getElementById('taskName').value,
        category: category,
        dueDate: document.getElementById('taskDueDate').value,
        importance: parseInt(document.getElementById('taskImportance').value || 3),
        type: document.getElementById('taskTypeSelect').value,
        completed: false, 
        desc: document.getElementById('taskDesc').value,
        createdAt: AppState.editId ? AppState.tasks.find(t => t.id === AppState.editId).createdAt : new Date().toISOString()
     };
     if (task.type === 'quantitative') {
         task.target = parseFloat(document.getElementById('taskTarget').value);
         task.unit = document.getElementById('taskUnit').value;
         task.progress = 0;
     }
     if (AppState.editId) {
        const idx = AppState.tasks.findIndex(t => t.id === AppState.editId);
        task.completed = AppState.tasks[idx].completed;
        task.progress = AppState.tasks[idx].progress || 0;
        AppState.tasks[idx] = task;
     } else AppState.tasks.push(task);
     
     this.saveData(); 
     this.renderTasks();
  },

  renderTasks() {
     const filter = document.querySelector('.filter-tab.active')?.dataset.taskFilter || 'all';
     const catFilter = document.getElementById('taskCategoryFilter').value;
     const impFilter = document.getElementById('taskImportanceFilter').value;
     const sortOrder = document.getElementById('taskSortOrder').value;
     const list = document.getElementById('taskList');
     list.innerHTML = '';
     
     let filtered = AppState.tasks.filter(t => {
        if(filter === 'pending' && t.completed) return false;
        if(filter === 'completed' && !t.completed) return false;
        if(catFilter !== 'all' && t.category !== catFilter) return false;
        if(impFilter !== 'all' && (t.importance || 0) < parseInt(impFilter)) return false;
        return true;
     });

     filtered.sort((a,b) => {
         if (sortOrder === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
         if (sortOrder === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
         if (sortOrder === 'dueDate') {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
         }
         if (sortOrder === 'importance') return (b.importance || 0) - (a.importance || 0);
         return 0;
     });

     filtered.forEach(t => {
        const isQuant = t.type === 'quantitative';
        const catColor = AppState.taskCategories[t.category] || '#888';
        const stars = '⭐'.repeat(t.importance || 1);
        list.innerHTML += `
           <div class="task-card ${t.completed ? 'completed' : ''}" data-id="${t.id}" title="${t.desc || 'No description'}">
              <div class="task-checkbox-custom ${t.completed ? 'checked' : ''}">${t.completed ? '✓' : ''}</div>
              <div class="task-info">
                 <div class="task-title-row">
                    <span class="task-title">${t.name}</span>
                    <span class="task-tag" style="background: ${catColor}">${t.category}</span>
                    <span style="font-size: 0.8rem; margin-left: 5px; opacity: 0.8;">${stars}</span>
                 </div>
                 <div class="task-meta">
                    ${t.dueDate ? '📅 ' + t.dueDate : ''} 
                    ${isQuant ? ` | Goal: ${t.target} ${t.unit}` : ''}
                    <span style="font-size: 0.7rem; opacity: 0.6; margin-left: 10px;">Created: ${new Date(t.createdAt).toLocaleDateString()}</span>
                 </div>
              </div>
              <div class="card-actions">
                 <button class="icon-btn edit-task" title="Edit">✏️</button>
                 <button class="icon-btn delete-task" title="Delete">🗑️</button>
              </div>
           </div>`;
     });
  },
  
  toggleTask(id) { const t = AppState.tasks.find(x => x.id === id); t.completed = !t.completed; this.saveData(); this.renderTasks(); },
  deleteTask(id) { if(confirm('Delete?')) { AppState.tasks = AppState.tasks.filter(x => x.id !== id); this.saveData(); this.renderTasks(); } },
  editTask(id) {
      const t = AppState.tasks.find(x => x.id === id); AppState.editId = id;
      document.getElementById('taskName').value = t.name;
      this.populateTaskCategories();
      document.getElementById('taskCategorySelect').value = t.category;
      document.getElementById('taskDueDate').value = t.dueDate; 
      document.getElementById('taskImportance').value = t.importance || 3;
      document.getElementById('taskTypeSelect').value = t.type;
      document.getElementById('taskDesc').value = t.desc;
      if(t.type === 'quantitative') {
          document.getElementById('taskQuantInputs').style.display = 'block';
          document.getElementById('taskTarget').value = t.target; document.getElementById('taskUnit').value = t.unit;
      } else { document.getElementById('taskQuantInputs').style.display = 'none'; }
      document.getElementById('taskModal').classList.add('active');
  },

  // --- GOALS / HABITS ---
  handleGoalSubmit() {
     const title = document.getElementById('goalTitle').value;
     if (!title) return;
     const freq = document.getElementById('goalFrequency').value;
     const type = document.getElementById('goalType').value;
     const target = type === 'quantitative' ? parseFloat(document.getElementById('goalTarget').value || 1) : 1;
     const desc = document.getElementById('goalDesc').value;
     const unit = document.getElementById('goalUnit').value || '';

     if (AppState.editId) {
        const g = AppState.goals.find(x => x.id === AppState.editId);
        if (g) {
           g.title = title;
           g.freq = freq;
           g.type = type;
           g.target = target;
           g.desc = desc;
           g.unit = unit;
        }
     } else {
        const g = { 
           id: Date.now().toString(), title, freq, type, target, desc, unit,
           progress: 0, streak: 0, longStreak: 0, history: [], 
           lastReset: new Date().toISOString(), startDate: new Date().toISOString()
        };
        AppState.goals.push(g); 
     }
     this.saveData(); 
     this.renderGoals();
  },

  renderGoals(filter = 'all') {
     const list = document.getElementById('goalList');
     const chartsCont = document.getElementById('goalChartsContainer');
     const compFilter = document.getElementById('goalCompletionFilter')?.value || 'all';
     list.innerHTML = '';
     chartsCont.innerHTML = '';
     
     if (AppState.goalsShowCharts) {
        list.style.display = 'none';
        chartsCont.style.display = 'grid';
        this.renderGoalCharts(filter);
        return;
     }
     list.style.display = 'grid';
     chartsCont.style.display = 'none';

     let filtered = AppState.goals.filter(g => filter === 'all' || g.freq === filter);
     
     filtered = filtered.filter(g => {
         const isDone = g.type === 'binary' ? (g.progress >= 1) : (g.progress >= g.target);
         if (compFilter === 'completed' && !isDone) return false;
         if (compFilter === 'pending' && isDone) return false;
         return true;
     });

     if (filtered.length === 0) { list.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">No habits found.</div>'; return; }
     filtered.forEach(g => {
        const isCompleted = g.type === 'binary' ? (g.progress >= 1) : (g.progress >= g.target);
        const progressPct = Math.min((g.progress / g.target) * 100, 100);
        
        // Consistency Calculation
        const successful = g.history.filter(h => h.completed).length + (isCompleted ? 1 : 0);
        const total = g.history.length + 1;
        const consistency = Math.round((successful / total) * 100);

        const card = document.createElement('div');
        card.className = `habit-card ${isCompleted ? 'completed' : ''}`;
        card.dataset.id = g.id;
        
        if (g.type === 'binary') {
           card.innerHTML = `
              <div class="habit-header">
                 <div>
                    <span class="badge badge-${g.freq}">${g.freq}</span>
                    <div class="habit-title">${g.title}</div>
                 </div>
                 <div class="card-actions">
                    <button class="icon-btn edit-habit" title="Edit">✏️</button>
                    <button class="icon-btn delete-habit" title="Delete">🗑️</button>
                 </div>
              </div>
              <div class="habit-stats"><div class="stat-box"><span class="stat-val">${g.streak}</span><span class="stat-label">Streak</span></div><div class="stat-box"><span class="stat-val">${consistency}%</span><span class="stat-label">Consist.</span></div></div>
              <div class="habit-action">
                 <button class="habit-check ${isCompleted ? 'checked' : ''}" data-id="${g.id}">${isCompleted ? '✓' : ''}</button>
                 <div class="habit-progress-container"><span style="font-size:0.9rem;font-weight:600;">${isCompleted?'Done':'Mark Done'}</span></div>
              </div>
           `;
        } else {
           card.innerHTML = `
              <div class="habit-header">
                 <div class="habit-title">${g.title}</div>
                 <div class="card-actions">
                    <button class="icon-btn edit-habit" title="Edit">✏️</button>
                    <button class="icon-btn delete-habit" title="Delete">🗑️</button>
                 </div>
              </div>
              
              <div class="minimal-counter">
                 <button class="goal-step-btn habit-minus" data-id="${g.id}">&minus;</button>
                 <div class="counter-display">
                    <input type="number" class="goal-progress-input minimal-input" data-id="${g.id}" value="${g.progress}" step="any">
                    <span class="counter-target">/ ${g.target} ${g.unit}</span>
                 </div>
                 <button class="goal-step-btn habit-plus" data-id="${g.id}">&plus;</button>
              </div>

              <div class="habit-mini-stats">
                 <span class="badge badge-${g.freq}">${g.freq}</span>
                 <span>🔥 ${g.streak} day streak</span>
                 <span>📈 ${consistency}% consistency</span>
              </div>
              <div class="habit-bottom-progress"><div class="habit-progress-fill" style="width:${progressPct}%"></div></div>
           `;
        }
        list.appendChild(card);
     });
     this.renderToolbarGoals();
  },

  changeGoalProgress(id, amount) {
     const g = AppState.goals.find(x => x.id === id);
     if (g) {
        let step = 1;
        if (g.target >= 1000) step = 100;
        else if (g.target <= 10) step = 1;

        g.progress += amount * step;
        if (g.progress < 0) g.progress = 0;
        this.saveData();
        this.renderAll();
     }
  },

  renderGoalCharts(filter = 'all') {
     const container = document.getElementById('goalChartsContainer');
     const filtered = AppState.goals.filter(g => filter === 'all' || g.freq === filter);
     if (filtered.length === 0) { container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">No habits found to chart.</div>'; return; }
     
     filtered.forEach(g => {
        const card = document.createElement('div');
        card.className = 'metric-card';
        card.innerHTML = `<div class="habit-header"><h3>${g.title} (Last 7 Days)</h3><div class="card-actions"><button class="icon-btn edit-habit" data-id="${g.id}">✏️</button></div></div><div style="height:150px;"><canvas id="goal-chart-${g.id}"></canvas></div>`;
        container.appendChild(card);
        
        const ctx = document.getElementById(`goal-chart-${g.id}`).getContext('2d');
        const labels = [];
        const data = [];
        const now = new Date();
        for(let i=6; i>=0; i--) {
           const d = new Date(); d.setDate(now.getDate() - i);
           labels.push(d.toLocaleDateString(undefined, {weekday: 'short'}));
           
           if (i === 0) {
              data.push(g.type === 'binary' ? (g.progress >= 1 ? 1 : 0) : Math.min(1, g.progress / g.target));
           } else {
              const hist = g.history.find(h => new Date(h.date).toDateString() === d.toDateString());
              if (hist) data.push(hist.completed ? 1 : Math.min(1, hist.progress / hist.target));
              else data.push(0);
           }
        }

        new Chart(ctx, {
           type: 'bar',
           data: {
              labels: labels,
              datasets: [{
                 label: 'Completion',
                 data: data,
                 backgroundColor: data.map(v => v >= 1 ? '#10b981' : (v > 0 ? AppState.settings.primaryColor + '80' : '#ef444430')),
                 borderRadius: 4
              }]
           },
           options: {
              responsive: true, maintainAspectRatio: false,
              scales: { y: { beginAtZero: true, max: 1, ticks: { display: false } }, x: { grid: { display: false } } },
              plugins: { legend: { display: false } }
           }
        });
     });
  },

  toggleHabitBinary(id) {
     const g = AppState.goals.find(x => x.id === id);
     if (g && g.type === 'binary') { g.progress = g.progress >= 1 ? 0 : 1; this.saveData(); this.renderGoals(); }
  },

  deleteHabit(id) { if(confirm('Delete?')) { AppState.goals = AppState.goals.filter(g => g.id !== id); this.saveData(); this.renderGoals(); } },

  editHabit(id) {
     const g = AppState.goals.find(x => x.id === id); 
     if (!g) return;
     AppState.editId = id;
     document.getElementById('goalTitle').value = g.title;
     document.getElementById('goalFrequency').value = g.freq;
     document.getElementById('goalType').value = g.type;
     document.getElementById('goalDesc').value = g.desc || '';
     document.getElementById('goalTarget').value = g.target || '';
     document.getElementById('goalUnit').value = g.unit || '';
     
     document.getElementById('goalQuantFields').style.display = g.type === 'quantitative' ? 'block' : 'none';
     
     const histCont = document.getElementById('goalHistorySection');
     const histList = document.getElementById('goalHistoryList');
     histList.innerHTML = '';
     if (g.history && g.history.length > 0) {
        histCont.style.display = 'block';
        g.history.slice(-7).reverse().forEach((h, i) => {
           const realIdx = g.history.length - 1 - i;
           const dateStr = new Date(h.date).toLocaleDateString();
           histList.innerHTML += `
              <div class="history-item">
                 <span>${dateStr}: <b>${h.progress}${g.unit}</b></span>
                 <button type="button" class="btn-text edit-hist-btn" data-gid="${g.id}" data-idx="${realIdx}" style="color:var(--primary); font-size:0.8rem;">Change</button>
              </div>
           `;
        });
     } else {
        histCont.style.display = 'none';
     }

     document.getElementById('goalModal').querySelector('h2').textContent = 'Edit Habit Goal';
     document.getElementById('goalModal').querySelector('button[type="submit"]').textContent = 'Update Goal';
     document.getElementById('goalModal').classList.add('active');
  },

  editHabitHistory(gid, idx) {
     const g = AppState.goals.find(x => x.id === gid);
     const entry = g.history[idx];
     const newVal = prompt(`Change progress for ${new Date(entry.date).toLocaleDateString()}:`, entry.progress);
     if (newVal !== null && !isNaN(newVal)) {
        entry.progress = parseFloat(newVal);
        entry.completed = g.type === 'binary' ? (entry.progress >= 1) : (entry.progress >= entry.target);
        this.saveData();
        this.editHabit(gid); 
        this.renderGoals();
     }
  },

  renderToolbarGoals() {
      const list = document.getElementById('toolbarGoalsList'); if (!list) return;
      list.innerHTML = '';
      AppState.goals.slice(0, 5).forEach(g => {
         const done = g.type === 'binary' ? (g.progress >= 1) : (g.progress >= g.target);
         list.innerHTML += `<div class="goal-pill view-goal ${done ? 'completed' : ''}" data-id="${g.id}"><span class="goal-pill-title">${done ? '✓ ' : ''}${g.title}</span></div>`;
      });
      list.innerHTML += `<div class="goal-pill toolbar-add-goal">+ New</div>`;
  },
  
  // --- GROWTH / METRICS ---
  populateMetricTypeSelect() {
      const options = Object.keys(AppState.metrics).map(k => `<option value="${k}">${k}</option>`).join('');
      document.getElementById('metricTypeInput').innerHTML = options + '<option value="custom">Create New...</option>';
  },

  handleMetricSubmit(e) {
      let type = document.getElementById('metricTypeInput').value;
      const valStr = document.getElementById('metricValue').value;
      const val = valStr === "" ? NaN : parseFloat(valStr);
      const date = document.getElementById('metricDate').value;
      
      if (type === 'custom' || (type !== 'custom' && !AppState.metrics[type]) || AppState.editMetricKey) {
          const name = (AppState.editMetricKey) ? AppState.editMetricKey : (type === 'custom' ? document.getElementById('newMetricName').value : type);
          const unit = document.getElementById('newMetricUnit').value;
          const target = parseFloat(document.getElementById('newMetricTarget').value) || null;
          
          if (!AppState.metrics[name]) { 
             AppState.metrics[name] = { unit, entries: [], target }; 
             AppState.metricOrder.push(name); 
          } else { 
             AppState.metrics[name].unit = unit; 
             AppState.metrics[name].target = target; 
          }
          type = name;
      }
      if (!isNaN(val)) { 
         AppState.metrics[type].entries.push({ date, value: val }); 
         AppState.metrics[type].entries.sort((a,b) => new Date(a.date) - new Date(b.date)); 
      }
      this.saveData(); this.renderGrowth(); this.populateMetricTypeSelect();
  },

  deleteMetric(key) { if(confirm(`Delete "${key}"?`)) { delete AppState.metrics[key]; AppState.metricOrder = AppState.metricOrder.filter(k => k !== key); this.saveData(); this.renderGrowth(); } },

  editMetric(key) {
      AppState.editMetricKey = key; const m = AppState.metrics[key]; const modal = document.getElementById('metricModal'); document.getElementById('metricForm').reset();
      document.getElementById('metricTypeInput').value = 'custom'; document.getElementById('newMetricInputs').style.display = 'block';
      document.getElementById('newMetricName').value = key; document.getElementById('newMetricName').disabled = true;
      document.getElementById('newMetricUnit').value = m.unit; document.getElementById('newMetricTarget').value = m.target || '';
      modal.querySelector('h2').textContent = `Edit Metric: ${key}`; modal.classList.add('active');
  },

  renderGrowth() {
     const container = document.getElementById('metricsContainer'); container.innerHTML = '';
     const range = document.querySelector('.time-tab.active')?.dataset.range || 'all';
     AppState.metricOrder.forEach(key => {
        const data = AppState.metrics[key]; if(!data) return;
        let filtered = [...data.entries];
        if (range !== 'all') { const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - parseInt(range)); filtered = filtered.filter(e => new Date(e.date) >= cutoff); }
        const card = document.createElement('div'); card.className = 'metric-card'; card.dataset.metric = key; card.draggable = true;
        card.innerHTML = `<div class="metric-card-header"><h3>${key} (kg)</h3><div class="card-actions"><button class="icon-btn edit-metric">✏️</button><button class="icon-btn delete-metric">🗑️</button></div></div><div class="metric-chart-wrapper"><canvas id="chart-${key}"></canvas></div>`;
        container.appendChild(card);
        if(AppState.chartInstances[key]) AppState.chartInstances[key].destroy();
        const ctx = document.getElementById(`chart-${key}`).getContext('2d');
        const ds = [{ label: key, data: filtered.map(e => e.value), borderColor: AppState.settings.primaryColor, backgroundColor: AppState.settings.primaryColor + '20', fill: true, tension: 0.3, pointRadius: 3 }];
        if (data.target) ds.push({ label: 'Goal', data: Array(filtered.length).fill(data.target), borderColor: '#ef4444', borderWidth: 2, borderDash: [5, 5], pointRadius: 0, fill: false });
        AppState.chartInstances[key] = new Chart(ctx, { type: 'line', data: { labels: filtered.map(e => e.date), datasets: ds }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: false } }, plugins: { legend: { display: !!data.target } } } });
     });
  },
  
  renderDashboard() {
     document.getElementById('dashDate').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
     document.getElementById('dashTaskStat').textContent = `${AppState.tasks.filter(t => t.completed).length}/${AppState.tasks.length}`;
     document.getElementById('dashGoalStat').textContent = `${AppState.goals.filter(g => (g.type==='binary'?g.progress>=1:g.progress>=g.target)).length}/${AppState.goals.length}`;
  },

  updateTime() { this.renderDashboard(); },
  renderAll() { this.renderSidebar(); this.renderTasks(); this.renderGoals(); this.renderToolbarGoals(); this.populateMetricTypeSelect(); this.renderGrowth(); this.renderDashboard(); }
};

function getDragAfterElement(container, y, selector) {
    const draggables = [...container.querySelectorAll(`${selector}:not(.dragging)`)];
    return draggables.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) return { offset: offset, element: child }; else return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

document.addEventListener('DOMContentLoaded', () => App.init());
