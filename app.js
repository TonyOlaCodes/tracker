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
  sidebarOrder: ['dashboard', 'tasks', 'habit', 'growth'],
  dashWidgets: {
     tasks: { type: 'today' },
     habit: { type: 'completed' },
     growth: {
        selections: [
            { metric: 'weight', stats: ['latest', 'change'] }
        ]
     }
  },
  dashboardEditMode: false,
  editId: null,
  editMetricKey: null,
  chartInstances: {},
  goalsShowCharts: false,
  goalsTimeframe: '7d' 
};

/**
 * CORE APPLICATION
 */
const App = {
  init() {
     this.loadData();
     this.checkHabitResets();
     this.applySettings();
     this.bindEvents();
     this.renderAll();
     this.updateTime();
     
     // Auto-select first timeframe tab
     const activeRange = document.querySelector('.time-tab.active');
     if (!activeRange) {
        const defaultTab = document.querySelector('.time-tab[data-range="all"]');
        if (defaultTab) defaultTab.classList.add('active');
     }
  },

  loadData() {
     const data = localStorage.getItem('lifeTrackerData');
     if (data) {
        try {
           const parsed = JSON.parse(data);
           AppState.tasks = parsed.tasks || [];
           AppState.taskCategories = parsed.taskCategories || { 'Work': '#6366f1', 'Personal': '#10b981', 'Fitness': '#f59e0b', 'Other': '#888' };
           AppState.goals = parsed.goals || [];
           AppState.metrics = parsed.metrics || {};
           
           // Ensure basic metrics exist
           if (Object.keys(AppState.metrics).length === 0) {
               AppState.metrics = { weight: { unit: 'kg', entries: [], target: 75 } };
               AppState.metricOrder = ['weight'];
           } else {
               AppState.metricOrder = parsed.metricOrder || Object.keys(AppState.metrics);
           }

           AppState.settings = { ...AppState.settings, ...(parsed.settings || {}) };
           // Hardcode units as requested by user previously
           AppState.settings.currency = '€';
           AppState.settings.weightUnit = 'kg';

           AppState.sidebarOrder = parsed.sidebarOrder || ['dashboard', 'tasks', 'habit', 'growth'];
           // Fix "goals" to "habit" rename
           AppState.sidebarOrder = AppState.sidebarOrder.map(v => v === 'goals' ? 'habit' : v);

           AppState.dashWidgets = { ...AppState.dashWidgets, ...(parsed.dashWidgets || {}) };
           
           // Ensure Growth widget has selections or defaults
           if (AppState.dashWidgets.growth) {
               if (!AppState.dashWidgets.growth.selections) {
                   AppState.dashWidgets.growth.selections = [{ metric: 'weight', stats: ['latest', 'average'] }];
               }
               // Cleanup deleted metrics
               AppState.dashWidgets.growth.selections = AppState.dashWidgets.growth.selections.filter(s => AppState.metrics[s.metric]);
           }

        } catch (e) {
           console.error("Failed to parse data", e);
           this.initDefaults();
        }
     } else {
        this.initDefaults();
     }
  },

  initDefaults() {
      AppState.metrics = { weight: { unit: 'kg', entries: [], target: 75 } };
      AppState.metricOrder = ['weight'];
      AppState.goals = [
         { 
           id: '1', title: 'Drink Water', desc: 'Daily hydration', freq: 'daily', type: 'quantitative', target: 2000, unit: 'ml', 
           progress: 0, streak: 0, longStreak: 0, history: [], lastReset: new Date().toISOString(), startDate: new Date().toISOString()
         },
         { 
           id: '2', title: 'Workout', desc: 'Fitness', freq: 'daily', type: 'binary', target: 1, unit: '', 
           progress: 0, streak: 0, longStreak: 0, history: [], lastReset: new Date().toISOString(), startDate: new Date().toISOString()
         }
      ];
      AppState.tasks = [
         { id: 't1', name: 'Plan my week', category: 'Personal', dueDate: '', importance: 5, completed: false, createdAt: new Date().toISOString() }
      ];
  },

  saveData() {
     localStorage.setItem('lifeTrackerData', JSON.stringify({
        tasks: AppState.tasks,
        taskCategories: AppState.taskCategories,
        goals: AppState.goals,
        metrics: AppState.metrics,
        settings: AppState.settings,
        sidebarOrder: AppState.sidebarOrder,
        metricOrder: AppState.metricOrder,
        dashWidgets: AppState.dashWidgets
     }));
     // Refresh relevant UI parts
     if (AppState.currentView === 'dashboard') this.renderDashboard();
     this.renderSidebar();
  },

  checkHabitResets() {
     const now = new Date();
     let changed = false;
     AppState.goals.forEach(g => {
        const lastReset = new Date(g.lastReset || g.startDate);
        let shouldReset = false;
        
        const isSameDay = (d1, d2) => d1.toDateString() === d2.toDateString();
        
        if (g.freq === 'daily' && !isSameDay(now, lastReset)) {
           shouldReset = true;
        } else if (g.freq === 'weekly') {
           const getWeek = (d) => {
              const start = new Date(d.getFullYear(), 0, 1);
              return Math.ceil((((d - start) / 86400000) + start.getDay() + 1) / 7);
           };
           if (getWeek(now) !== getWeek(lastReset) || now.getFullYear() !== lastReset.getFullYear()) shouldReset = true;
        } else if (g.freq === 'monthly') {
           if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) shouldReset = true;
        }

        if (shouldReset) {
           const isDone = g.type === 'binary' ? (g.progress >= 1) : (g.progress >= g.target);
           if (isDone) {
              g.streak++;
              if (g.streak > (g.longStreak || 0)) g.longStreak = g.streak;
           } else {
              g.streak = 0;
           }
           if (!g.history) g.history = [];
           g.history.push({ date: g.lastReset, progress: g.progress, target: g.target, completed: isDone });
           g.progress = 0;
           g.lastReset = now.toISOString();
           changed = true;
        }
     });
     if (changed) this.saveData();
  },

  applySettings() {
     document.documentElement.setAttribute('data-theme', AppState.settings.theme);
     const toggle = document.getElementById('themeToggle');
     if (toggle) toggle.checked = AppState.settings.theme === 'dark';
     document.documentElement.style.setProperty('--primary', AppState.settings.primaryColor);
  },

  bindEvents() {
     // Sidebar Nav
     document.querySelector('.sidebar').addEventListener('click', (e) => {
        const btn = e.target.closest('.nav-item');
        if (btn) this.switchView(btn.dataset.view);
     });

     // Logo Home Link
     document.querySelector('.logo').addEventListener('click', () => this.switchView('dashboard'));

     // Dash Edit
     document.getElementById('editDashboardBtn').addEventListener('click', () => {
         AppState.dashboardEditMode = !AppState.dashboardEditMode;
         const btn = document.getElementById('editDashboardBtn');
         btn.classList.toggle('active', AppState.dashboardEditMode);
         btn.innerHTML = AppState.dashboardEditMode ? '✅ Done' : '✏️ Edit';
         document.querySelector('.dashboard-grid').classList.toggle('editing', AppState.dashboardEditMode);
     });

     // Modals and Forms
     this.setupModal('taskModal', 'addTaskBtn', 'taskForm', (e) => this.handleTaskSubmit(e));
     
     document.getElementById('taskTypeSelect').addEventListener('change', (e) => {
         document.getElementById('taskQuantInputs').style.display = e.target.value === 'quantitative' ? 'block' : 'none';
     });
     
     this.setupModal('goalModal', 'addGoalBtn', 'goalForm', (e) => this.handleGoalSubmit(e));
     this.setupModal('metricModal', 'addMetricBtn', 'metricForm', (e) => this.handleMetricSubmit(e));
     
     document.getElementById('dashWidgetForm').addEventListener('submit', (e) => {
         e.preventDefault();
         const view = document.getElementById('dashWidgetId').value;
         if (view === 'tasks') {
             const selections = [];
             document.querySelectorAll('.t-dash-option:checked').forEach(cb => selections.push(cb.value));
             AppState.dashWidgets.tasks.selections = selections.length > 0 ? selections : ['today'];
         }
         if (view === 'habit') {
             const selections = [];
             document.querySelectorAll('.h-dash-option:checked').forEach(cb => selections.push(cb.value));
             AppState.dashWidgets.habit.selections = selections.length > 0 ? selections : ['completed'];
             
             if (selections.includes('custom')) {
                 const watchList = [];
                 document.querySelectorAll('.dash-habit-watch:checked').forEach(cb => watchList.push(cb.value));
                 AppState.dashWidgets.habit.watchList = watchList;
                 AppState.dashWidgets.habit.watchName = document.getElementById('dashHabitWatchName').value;
             }
         }
         if (view === 'growth') {
             const selections = [];
             document.querySelectorAll('.growth-metric-entry').forEach(entry => {
                 const mCheck = entry.querySelector('.m-main-check');
                 if (mCheck.checked) {
                     const metric = mCheck.value;
                     const stats = [];
                     entry.querySelectorAll('.s-check:checked').forEach(sc => stats.push(sc.value));
                     if (stats.length === 0) stats.push('latest');
                     selections.push({ metric, stats });
                 }
             });
             AppState.dashWidgets.growth.selections = selections;
         }
         this.saveData();
         document.getElementById('dashWidgetModal').classList.remove('active');
         if (AppState.currentView === 'dashboard') this.renderDashboard();
     });

     document.getElementById('openSettingsBtn').addEventListener('click', () => document.getElementById('settingsModal').classList.add('active'));
     
     document.getElementById('themeToggle').addEventListener('change', (e) => {
        AppState.settings.theme = e.target.checked ? 'dark' : 'light';
        this.applySettings();
        this.saveData();
     });

     document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', () => { AppState.settings.primaryColor = btn.dataset.color; this.applySettings(); this.saveData(); });
     });

     // Task Logic
     document.getElementById('taskCategoryFilter').addEventListener('change', () => this.renderTasks());
     document.getElementById('taskImportanceFilter').addEventListener('change', () => this.renderTasks());
     document.getElementById('taskSortOrder').addEventListener('change', () => this.renderTasks());
     document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
           document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
           e.target.classList.add('active');
           this.renderTasks();
        });
     });

     // Habit Logic
     document.getElementById('goalCompletionFilter')?.addEventListener('change', () => this.renderGoals());
     document.querySelectorAll('.f-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
           document.querySelectorAll('.f-tab').forEach(t => t.classList.remove('active'));
           e.target.classList.add('active');
           this.renderGoals(e.target.dataset.goalFilter);
        });
     });
     document.getElementById('toggleGoalCharts')?.addEventListener('click', () => {
        AppState.goalsShowCharts = !AppState.goalsShowCharts;
        document.getElementById('toggleGoalCharts').textContent = AppState.goalsShowCharts ? '📋' : '📈';
        this.renderGoals();
     });

     // Growth Logic
     document.getElementById('addNewMetricTypeBtn').addEventListener('click', () => {
         AppState.editMetricKey = null;
         this.openMetricLogModal(true);
     });
     document.querySelectorAll('.time-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
           document.querySelectorAll('.time-tab').forEach(t => t.classList.remove('active'));
           e.target.classList.add('active');
           this.renderGrowth();
        });
     });

     // Global Delegate
     document.addEventListener('click', (e) => {
        if (e.target.closest('.close-modal')) { e.target.closest('.modal').classList.remove('active'); }
        
        const card = e.target.closest('.dash-card');
        if (card && card.closest('#dashboard')) {
            if (AppState.dashboardEditMode) this.openWidgetSettings(card.dataset.view);
            else this.switchView(card.dataset.view);
        }

        // Action Buttons
        if (e.target.closest('.delete-task')) this.deleteTask(e.target.closest('.task-card').dataset.id);
        if (e.target.closest('.edit-task')) this.editTask(e.target.closest('.task-card').dataset.id);
        if (e.target.closest('.task-checkbox-custom')) this.toggleTask(e.target.closest('.task-card').dataset.id);

        if (e.target.closest('.habit-plus')) this.changeHabitProgress(e.target.closest('.habit-plus').dataset.id, 0.1);
        if (e.target.closest('.habit-minus')) this.changeHabitProgress(e.target.closest('.habit-minus').dataset.id, -0.1);
        if (e.target.closest('.habit-check')) this.toggleHabitBinary(e.target.closest('.habit-check').dataset.id);
        if (e.target.closest('.delete-habit')) this.deleteHabit(e.target.closest('.habit-card').dataset.id);
        if (e.target.closest('.edit-habit')) this.editHabit(e.target.closest('.habit-card').dataset.id);

        if (e.target.closest('.delete-metric')) this.deleteMetric(e.target.closest('.metric-card').dataset.metric);
        if (e.target.closest('.edit-metric')) this.editMetric(e.target.closest('.metric-card').dataset.metric);
        if (e.target.closest('.log-metric-direct')) this.openMetricLogFor(e.target.closest('.metric-card').dataset.metric);
     });

     document.addEventListener('input', (e) => {
        if (e.target.closest('.goal-progress-slider')) {
           const id = e.target.dataset.id;
           const val = parseFloat(e.target.value);
           const g = AppState.goals.find(x => x.id === id);
           if (g) { g.progress = val; this.saveData(); this.renderGoals(); }
        }
     });

     // Helpers
     document.getElementById('goalType').addEventListener('change', (e) => {
        document.getElementById('goalQuantFields').style.display = e.target.value === 'quantitative' ? 'block' : 'none';
     });
     document.getElementById('taskCategorySelect').addEventListener('change', (e) => {
        document.getElementById('newCategoryInputWrapper').style.display = e.target.value === 'new' ? 'block' : 'none';
     });
     document.getElementById('metricTypeInput').addEventListener('change', (e) => {
        document.getElementById('newMetricInputs').style.display = e.target.value === 'custom' ? 'block' : 'none';
     });
  },

  setupModal(modalId, btnId, formId, submitHandler) {
     const modal = document.getElementById(modalId);
     const btn = document.getElementById(btnId);
     const form = document.getElementById(formId);
     if (btn) btn.addEventListener('click', () => {
         AppState.editId = null;
         form.reset();
         if (modalId === 'goalModal') {
             document.getElementById('goalQuantFields').style.display = 'none';
             document.getElementById('goalHistorySection').style.display = 'none';
         }
         modal.classList.add('active');
     });
     form.addEventListener('submit', (e) => {
        e.preventDefault();
        submitHandler(e);
        modal.classList.remove('active');
     });
  },

  handleMetricSubmit() {
     const type = document.getElementById('metricTypeInput').value;
     const val = parseFloat(document.getElementById('metricValue').value);
     const date = document.getElementById('metricDate').value;
     
     let key = type;
     if (type === 'custom') {
         key = document.getElementById('newMetricName').value;
         if (!key) return;
         if (!AppState.metrics[key]) {
             AppState.metrics[key] = { unit: document.getElementById('newMetricUnit').value, target: parseFloat(document.getElementById('newMetricTarget').value), entries: [] };
             AppState.metricOrder.push(key);
         } else if (AppState.editMetricKey) {
             // If editing existing metric metadata
             AppState.metrics[key].unit = document.getElementById('newMetricUnit').value;
             AppState.metrics[key].target = parseFloat(document.getElementById('newMetricTarget').value);
         }
     }
     
     if (!isNaN(val)) {
         AppState.metrics[key].entries.push({ date, value: val });
     }
     
     AppState.editMetricKey = null;
     this.saveData(); this.renderGrowth();
  },

  switchView(id) {
     document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
     const target = document.getElementById(id);
     if (target) target.classList.add('active');
     
     document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === id));
     AppState.currentView = id;
     
     if (id === 'dashboard') this.renderDashboard();
     if (id === 'tasks') this.renderTasks();
     if (id === 'habit') this.renderGoals();
     if (id === 'growth') this.renderGrowth();
  },

  /** 
   * DASHBOARD ENGINE
   */
  renderDashboard() {
     document.getElementById('dashDate').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
     
     // Widget: Tasks
     const tCfg = AppState.dashWidgets.tasks;
     const tContainer = document.querySelector('.dash-card[data-view="tasks"]');
     const tSelections = tCfg.selections || [tCfg.type || 'today'];
     
     if (tSelections.length > 1) {
         let html = `<h3>To-Do List</h3><div class="dash-stat-list" style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; margin-top:0.5rem;">`;
         tSelections.forEach(sel => {
             let val = '--', label = '';
             if (sel === 'today') { val = `${AppState.tasks.filter(t => t.completed).length}/${AppState.tasks.length}`; label = 'Today'; }
             else if (sel === 'pending') { val = AppState.tasks.filter(t => !t.completed).length; label = 'Pending'; }
             else if (sel === 'due_soon') {
                 const soon = AppState.tasks.filter(t => !t.completed && t.dueDate).sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 3);
                 val = soon.length; label = 'Due Soon';
             }
             else if (sel === 'priority') { val = AppState.tasks.filter(t => !t.completed && t.importance >= 5).length; label = 'High Prio'; }
             
             html += `<div class="dash-stat-box" style="background:rgba(255,255,255,0.05); padding:0.5rem; border-radius:8px; text-align:center;">
                 <div style="font-size:1.1rem; font-weight:800; color:var(--primary);">${val}</div>
                 <div style="font-size:0.7rem; color:var(--text-muted); font-weight:600;">${label}</div>
             </div>`;
         });
         html += `</div>`;
         tContainer.innerHTML = html;
     } else {
         const sel = tSelections[0];
         let val = '--', label = '';
         if (sel === 'today') { val = `${AppState.tasks.filter(t => t.completed).length}/${AppState.tasks.length}`; label = 'Items completed today'; }
         else { val = AppState.tasks.filter(t => !t.completed).length; label = 'Items remaining to do'; }
         tContainer.innerHTML = `<h3>To-Do List</h3><div class="big-stat">${val}</div><p>${label}</p>`;
     }

     // Widget: Habit
     const hCfg = AppState.dashWidgets.habit;
     const hContainer = document.querySelector('.dash-card[data-view="habit"]');
     const hSelections = hCfg.selections || [hCfg.type || 'completed'];
     
     const getConsistency = (g) => {
         const done = g.type === 'binary' ? g.progress >= 1 : g.progress >= g.target;
         const successful = (g.history ? g.history.filter(h => h.completed).length : 0) + (done ? 1 : 0);
         const total = (g.history ? g.history.length : 0) + 1;
         return successful/total;
     };

     if (hSelections.length > 1 || hSelections.some(s => ['top_3_streaks', 'most_consistent', 'least_consistent', 'custom'].includes(s))) {
         let html = `<h3>Habit Progress</h3><div class="dash-stat-list" style="display:flex; flex-direction:column; gap:0.5rem; margin-top:0.5rem; width:100%;">`;
         
         hSelections.forEach(sel => {
             let boxTitle = '', boxContent = '';
             
             if (sel === 'count') {
                 boxTitle = 'Total Active';
                 boxContent = `<span style="font-size:0.9rem; font-weight:800; color:var(--primary);">${AppState.goals.length}</span>`;
             }
             else if (sel === 'completed') {
                 const done = AppState.goals.filter(g => (g.type === 'binary' ? g.progress >= 1 : g.progress >= g.target)).length;
                 boxTitle = 'Done Today';
                 boxContent = `<span style="font-size:0.9rem; font-weight:800; color:var(--primary);">${done}/${AppState.goals.length}</span>`;
             }
             else if (sel === 'percentage') {
                 let totalPct = 0;
                 AppState.goals.forEach(g => { totalPct += getConsistency(g); });
                 const avg = AppState.goals.length > 0 ? Math.round((totalPct / AppState.goals.length) * 100) : 0;
                 boxTitle = 'Avg Consistency';
                 boxContent = `<span style="font-size:0.9rem; font-weight:800; color:var(--primary);">${avg}%</span>`;
             }
             else if (sel === 'due') {
                 const pending = AppState.goals.filter(g => !(g.type === 'binary' ? g.progress >= 1 : g.progress >= g.target)).length;
                 boxTitle = 'Still Due';
                 boxContent = `<span style="font-size:0.9rem; font-weight:800; color:var(--primary);">${pending}</span>`;
             }
             else if (sel === 'top_3_streaks') {
                 const top = [...AppState.goals].sort((a,b) => b.streak - a.streak).slice(0, 3);
                 boxTitle = 'Top 3 Streaks';
                 boxContent = `<div style="display:flex; flex-direction:column; gap:2px; text-align:right;">` + 
                     top.map(g => `<div style="font-size:0.8rem; font-weight:700;">${g.title} <span style="color:var(--primary)">🔥 ${g.streak}</span></div>`).join('') + 
                     `</div>`;
             }
             else if (sel === 'most_consistent') {
                 const top = [...AppState.goals].sort((a,b) => getConsistency(b) - getConsistency(a)).slice(0, 3);
                 boxTitle = 'Top 3 Consistent';
                 boxContent = `<div style="display:flex; flex-direction:column; gap:2px; text-align:right;">` + 
                     top.map(g => `<div style="font-size:0.8rem; font-weight:700;">${g.title} <span style="color:var(--primary)">${Math.round(getConsistency(g)*100)}%</span></div>`).join('') + 
                     `</div>`;
             }
             else if (sel === 'least_consistent') {
                 const bottom = [...AppState.goals].sort((a,b) => getConsistency(a) - getConsistency(b)).slice(0, 3);
                 boxTitle = 'Least Consistent';
                 boxContent = `<div style="display:flex; flex-direction:column; gap:2px; text-align:right;">` + 
                     bottom.map(g => `<div style="font-size:0.8rem; font-weight:700;">${g.title} <span style="color:var(--primary)">${Math.round(getConsistency(g)*100)}%</span></div>`).join('') + 
                     `</div>`;
             }
             else if (sel === 'custom') {
                 const watchList = hCfg.watchList || [];
                 const title = hCfg.watchName || 'Watchlist';
                 const habits = AppState.goals.filter(g => watchList.includes(g.id));
                 boxTitle = title;
                 boxContent = `<div style="display:flex; flex-direction:column; gap:2px; text-align:right;">` + 
                     habits.map(g => {
                         const done = g.type === 'binary' ? g.progress >= 1 : g.progress >= g.target;
                         return `<div style="font-size:0.8rem; font-weight:700;">${g.title} <span style="color:var(--primary)">${done ? '✅' : '⏳'}</span></div>`;
                     }).join('') + 
                     `</div>`;
             }

             if (boxTitle) {
                 html += `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:0.6rem 0.8rem; border-radius:12px; min-height:45px;">
                     <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700; text-transform:uppercase;">${boxTitle}</span>
                     ${boxContent}
                 </div>`;
             }
         });
         html += `</div>`;
         hContainer.innerHTML = html;
     } else {
         const sel = hSelections[0] || 'count';
         let val = '--', label = '';
         if (sel === 'count') { val = AppState.goals.length; label = "Total habits tracked"; }
         else if (sel === 'completed') {
             const done = AppState.goals.filter(g => (g.type === 'binary' ? g.progress >= 1 : g.progress >= g.target)).length;
             val = `${done}/${AppState.goals.length}`; label = "Habits completed today";
         } else {
             let totalPct = 0;
             AppState.goals.forEach(g => { totalPct += getConsistency(g); });
             const avg = AppState.goals.length > 0 ? Math.round((totalPct / AppState.goals.length) * 100) : 0;
             val = `${avg}%`; label = "Average consistency";
         }
         hContainer.innerHTML = `<h3>Habit Progress</h3><div class="big-stat">${val}</div><p>${label}</p>`;
     }

     // Widget: Growth
     const gCfg = AppState.dashWidgets.growth;
     const gStatContainer = document.getElementById('dashMeasureStat');
     const gLabel = document.getElementById('dashMeasureLabel');
     
     const selections = gCfg.selections || [];
     if (selections.length > 0) {
        let html = '<div style="display:flex; flex-direction:column; gap:1.2rem; width:100%;">';
        
        selections.forEach(sel => {
            const m = AppState.metrics[sel.metric];
            if (!m || !m.entries || m.entries.length === 0) return;
            
            const entries = [...m.entries].sort((a,b) => new Date(a.date) - new Date(b.date));
            
            html += `<div class="dash-metric-group" style="text-align:left; width:100%;">
                <div style="font-size:0.8rem; font-weight:800; text-transform:uppercase; color:var(--primary); margin-bottom:0.4rem; padding-left:0.2rem;">${sel.metric}</div>
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(80px, 1fr)); gap:0.4rem;">`;
            
            sel.stats.forEach(statKey => {
                let val = '--';
                let label = '';
                if (statKey === 'latest') { val = entries[entries.length - 1].value; label = 'Latest'; }
                else if (statKey === 'average') { 
                    val = Math.round((entries.reduce((acc, e) => acc + e.value, 0) / entries.length) * 10) / 10; 
                    label = 'Avg (All)'; 
                }
                else if (statKey === 'averageWeek') {
                    const wAgo = new Date(); wAgo.setDate(wAgo.getDate() - 7);
                    const weekEntries = entries.filter(e => new Date(e.date) >= wAgo);
                    if (weekEntries.length > 0) {
                        val = Math.round((weekEntries.reduce((acc, e) => acc + e.value, 0) / weekEntries.length) * 10) / 10;
                    } else {
                        val = '--';
                    }
                    label = 'Avg (7d)';
                }
                else if (statKey === 'start') { val = entries[0].value; label = 'Start'; }
                else if (statKey === 'high') { val = Math.max(...entries.map(e=>e.value)); label = 'High'; }
                else if (statKey === 'low') { val = Math.min(...entries.map(e=>e.value)); label = 'Low'; }

                html += `<div style="display:flex; flex-direction:column; background:rgba(255,255,255,0.05); padding:0.4rem; border-radius:8px;">
                    <span style="font-size:0.65rem; color:var(--text-muted); font-weight:700;">${label}</span>
                    <span style="font-size:0.95rem; font-weight:800;">${val}<span style="font-size:0.7rem; font-weight:600; opacity:0.7; margin-left:1px;">${m.unit||''}</span></span>
                </div>`;
            });
            html += `</div></div>`;
        });
        html += '</div>';
        
        gStatContainer.innerHTML = html;
        gStatContainer.style.fontSize = '1rem';
        gLabel.textContent = "Metrics Summary";
     } else {
        gStatContainer.innerHTML = '--';
        gLabel.textContent = "No metrics selected";
     }
  },

  openWidgetSettings(view) {
      const modal = document.getElementById('dashWidgetModal');
      document.getElementById('dashWidgetId').value = view;
      document.querySelectorAll('.widget-settings-group').forEach(group => group.style.display = 'none');
      
      const title = document.getElementById('dashWidgetModalTitle');
      if (view === 'tasks') {
          title.textContent = "To-Do List Widget";
          document.getElementById('dashSettingsTasks').style.display = 'block';
          const selections = AppState.dashWidgets.tasks.selections || [AppState.dashWidgets.tasks.type || 'today'];
          document.querySelectorAll('.t-dash-option').forEach(cb => {
              cb.checked = selections.includes(cb.value);
          });
      } else if (view === 'habit') {
          title.textContent = "Habit Tracker Widget";
          document.getElementById('dashSettingsHabit').style.display = 'block';
          const selections = AppState.dashWidgets.habit.selections || [AppState.dashWidgets.habit.type || 'completed'];
          document.querySelectorAll('.h-dash-option').forEach(cb => {
              cb.checked = selections.includes(cb.value);
              cb.onchange = () => {
                  if (cb.value === 'custom') {
                      document.getElementById('dashHabitSelectionWrapper').style.display = cb.checked ? 'block' : 'none';
                      if (cb.checked) this.populateDashHabitList();
                  }
              };
          });
          document.getElementById('dashHabitWatchName').value = AppState.dashWidgets.habit.watchName || 'Watchlist';
          
          const customCheck = [...document.querySelectorAll('.h-dash-option')].find(c => c.value === 'custom');
          document.getElementById('dashHabitSelectionWrapper').style.display = (customCheck && customCheck.checked) ? 'block' : 'none';
          if (customCheck && customCheck.checked) this.populateDashHabitList();

      } else if (view === 'growth') {
          title.textContent = "Growth Widget";
          document.getElementById('dashSettingsGrowth').style.display = 'block';
          const container = document.getElementById('dashGrowthMetricList');
          container.innerHTML = '';
          
          const selections = AppState.dashWidgets.growth.selections || [];
          
          Object.keys(AppState.metrics).forEach(mKey => {
              const sel = selections.find(s => s.metric === mKey);
              const isSelected = !!sel;
              const stats = sel ? sel.stats : ['latest'];
              
              const entry = document.createElement('div');
              entry.className = `growth-metric-entry ${isSelected ? 'selected' : ''}`;
              
              entry.innerHTML = `
                 <div class="metric-selector-header" onclick="App.toggleMetricSelection(this, '${mKey}')">
                    <span style="font-weight:700;">${mKey}</span>
                    <div class="metric-check-indicator">${isSelected ? '✓' : ''}</div>
                    <input type="checkbox" class="m-main-check" value="${mKey}" ${isSelected ? 'checked' : ''} style="display:none;">
                 </div>
                 <div class="stat-grid-compact" style="display:${isSelected ? 'grid' : 'none'};">
                    ${this.renderStatToggle(mKey, 'start', 'Start', stats.includes('start'))}
                    ${this.renderStatToggle(mKey, 'latest', 'Latest', stats.includes('latest'))}
                    ${this.renderStatToggle(mKey, 'high', 'Highest', stats.includes('high'))}
                    ${this.renderStatToggle(mKey, 'low', 'Lowest', stats.includes('low'))}
                    ${this.renderStatToggle(mKey, 'average', 'Avg (Ever)', stats.includes('average'))}
                    ${this.renderStatToggle(mKey, 'averageWeek', 'Avg (Week)', stats.includes('averageWeek'))}
                 </div>
              `;
              container.appendChild(entry);
          });
      }
      modal.classList.add('active');
  },

  populateDashHabitList() {
      const container = document.getElementById('dashHabitList');
      container.innerHTML = '';
      const watched = AppState.dashWidgets.habit.watchList || [];
      
      AppState.goals.forEach(g => {
          const isWatched = watched.includes(g.id);
          const label = document.createElement('label');
          label.className = 'check-label-btn';
          label.innerHTML = `<input type="checkbox" class="dash-habit-watch" value="${g.id}" ${isWatched ? 'checked' : ''}> ${g.title}`;
          container.appendChild(label);
      });
  },

  renderStatToggle(metric, value, label, checked) {
      return `
        <label class="stat-pill-toggle ${checked ? 'stat-active' : ''}">
           <input type="checkbox" class="s-check" value="${value}" ${checked ? 'checked' : ''} onchange="App.handleStatChange(this)">
           <span>${label}</span>
        </label>
      `;
  },

  toggleMetricSelection(header, key) {
      const entry = header.closest('.growth-metric-entry');
      const cb = entry.querySelector('.m-main-check');
      cb.checked = !cb.checked;
      entry.classList.toggle('selected', cb.checked);
      entry.querySelector('.stat-grid-compact').style.display = cb.checked ? 'grid' : 'none';
      entry.querySelector('.metric-check-indicator').innerHTML = cb.checked ? '✓' : '';
  },

  handleStatChange(input) {
      input.closest('.stat-pill-toggle').classList.toggle('stat-active', input.checked);
  },

  /**
   * TO-DO LIST
   */
  handleTaskSubmit() {
     let cat = document.getElementById('taskCategorySelect').value;
     if (cat === 'new') {
        cat = document.getElementById('newCategoryName').value || 'Other';
        AppState.taskCategories[cat] = document.getElementById('newCategoryColor').value;
     }
     const type = document.getElementById('taskTypeSelect').value;
     const task = {
        id: AppState.editId || Date.now().toString(),
        name: document.getElementById('taskName').value,
        category: cat,
        dueDate: document.getElementById('taskDueDate').value,
        importance: parseInt(document.getElementById('taskImportance').value),
        type: type,
        target: type === 'quantitative' ? parseFloat(document.getElementById('taskTarget').value || 1) : 1,
        unit: document.getElementById('taskUnit').value || '',
        progress: AppState.editId ? AppState.tasks.find(t=>t.id===AppState.editId).progress || 0 : 0,
        completed: AppState.editId ? AppState.tasks.find(t=>t.id===AppState.editId).completed : false,
        createdAt: AppState.editId ? AppState.tasks.find(t=>t.id===AppState.editId).createdAt : new Date().toISOString(),
        desc: document.getElementById('taskDesc').value
     };
     if (AppState.editId) {
        const idx = AppState.tasks.findIndex(t => t.id === AppState.editId);
        AppState.tasks[idx] = task;
     } else AppState.tasks.push(task);
     this.saveData(); this.renderTasks();
  },

  renderTasks() {
     const list = document.getElementById('taskList');
     const filter = document.querySelector('.filter-tab.active')?.dataset.taskFilter || 'all';
     const catF = document.getElementById('taskCategoryFilter').value;
     const impF = document.getElementById('taskImportanceFilter').value;
     const sort = document.getElementById('taskSortOrder').value;
     
     let filtered = AppState.tasks.filter(t => {
        if (filter === 'pending' && t.completed) return false;
        if (filter === 'completed' && !t.completed) return false;
        if (catF !== 'all' && t.category !== catF) return false;
        if (impF !== 'all' && t.importance !== parseInt(impF)) return false;
        return true;
     });

     filtered.sort((a,b) => {
        if (sort === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
        if (sort === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
        if (sort === 'dueDate') return (a.dueDate || '9999') > (b.dueDate || '9999') ? 1 : -1;
        if (sort === 'importance') return b.importance - a.importance;
        return 0;
     });

     list.innerHTML = filtered.length ? '' : '<div style="text-align:center; padding: 3rem; color:var(--text-muted);">No items found.</div>';
     filtered.forEach(t => {
        const stars = '⭐'.repeat(t.importance);
        const color = AppState.taskCategories[t.category] || '#888';
        const isQuant = t.type === 'quantitative';
        
        // Glow logic
        let glowClass = '';
        if (t.dueDate && !t.completed) {
            const today = new Date(); today.setHours(0,0,0,0);
            const due = new Date(t.dueDate); due.setHours(0,0,0,0);
            const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
            
            if (diffDays < 0) glowClass = 'glow-overdue';
            else if (diffDays === 0) glowClass = 'glow-today';
            else if (diffDays === 1) glowClass = 'glow-soon-1';
            else if (diffDays <= 3) glowClass = 'glow-soon-2';
        }
        
        list.innerHTML += `
           <div class="task-card ${t.completed ? 'completed' : ''} ${glowClass}" data-id="${t.id}">
              <div class="task-checkbox-custom ${t.completed ? 'checked' : ''}">${t.completed ? '✓' : ''}</div>
              <div class="task-info">
                 <div class="task-title-row">
                    <span class="task-title">${t.name}</span>
                    <span class="task-tag" style="background:${color}">${t.category}</span>
                    <span style="font-size:0.8rem; margin-left:0.5rem; opacity:0.8;">${stars}</span>
                 </div>
                 <div class="task-meta">
                    ${t.dueDate ? '📅 ' + t.dueDate : ''}
                    ${isQuant ? `<div class="task-quant-progress" style="margin-top:0.5rem;">
                        <input type="range" class="task-progress-slider" min="0" max="${t.target}" value="${t.progress}" oninput="App.updateTaskProgress('${t.id}', this.value)">
                        <span style="font-size:0.75rem;">${t.progress} / ${t.target} ${t.unit}</span>
                    </div>` : ''}
                 </div>
              </div>
              <div class="card-actions">
                 <button class="icon-btn edit-task">✏️</button>
                 <button class="icon-btn delete-task">🗑️</button>
              </div>
           </div>`;
     });
     this.updateTaskFilterCounts();
  },

  updateTaskFilterCounts() {
      const select = document.getElementById('taskCategoryFilter');
      const cur = select.value;
      select.innerHTML = '<option value="all">All Categories</option>' + 
        Object.keys(AppState.taskCategories).map(c => `<option value="${c}">${c}</option>`).join('');
      select.value = cur;
      
      const modalSelect = document.getElementById('taskCategorySelect');
      modalSelect.innerHTML = Object.keys(AppState.taskCategories).map(c => `<option value="${c}">${c}</option>`).join('') + '<option value="new">+ Create New</option>';
  },

  toggleTask(id) {
      const t = AppState.tasks.find(x => x.id === id);
      if (t) { 
          t.completed = !t.completed; 
          if (t.type === 'quantitative') {
              t.progress = t.completed ? t.target : 0;
          }
          this.saveData(); 
          this.renderTasks(); 
      }
  },

  deleteTask(id) {
      if (confirm("Delete this item?")) { AppState.tasks = AppState.tasks.filter(t => t.id !== id); this.saveData(); this.renderTasks(); }
  },

  editTask(id) {
      const t = AppState.tasks.find(x => x.id === id);
      if (!t) return;
      AppState.editId = id;
      const modal = document.getElementById('taskModal');
      document.getElementById('taskModalTitle').textContent = "Edit Item";
      document.getElementById('taskName').value = t.name;
      this.updateTaskFilterCounts();
      document.getElementById('taskCategorySelect').value = t.category;
      document.getElementById('taskDueDate').value = t.dueDate;
      document.getElementById('taskImportance').value = t.importance;
      document.getElementById('taskTypeSelect').value = t.type || 'simple';
      document.getElementById('taskQuantInputs').style.display = (t.type === 'quantitative') ? 'block' : 'none';
      document.getElementById('taskTarget').value = t.target || 10;
      document.getElementById('taskUnit').value = t.unit || '';
      document.getElementById('taskDesc').value = t.desc || '';
      modal.classList.add('active');
  },

  updateTaskProgress(id, val) {
      const t = AppState.tasks.find(x => x.id === id);
      if (t) {
          t.progress = parseFloat(val);
          t.completed = t.progress >= t.target;
          this.saveData();
          this.renderTasks();
      }
  },

  /**
   * HABIT TRACKER
   */
  handleGoalSubmit() {
     const title = document.getElementById('goalTitle').value;
     const type = document.getElementById('goalType').value;
     const target = type === 'quantitative' ? parseFloat(document.getElementById('goalTarget').value) : 1;
     const goal = {
        id: AppState.editId || Date.now().toString(),
        title,
        freq: document.getElementById('goalFrequency').value,
        type,
        target,
        unit: document.getElementById('goalUnit').value,
        desc: document.getElementById('goalDesc').value,
        progress: AppState.editId ? AppState.goals.find(g=>g.id===AppState.editId).progress : 0,
        streak: AppState.editId ? AppState.goals.find(g=>g.id===AppState.editId).streak : 0,
        history: AppState.editId ? AppState.goals.find(g=>g.id===AppState.editId).history : [],
        lastReset: AppState.editId ? AppState.goals.find(g=>g.id===AppState.editId).lastReset : new Date().toISOString()
     };
     if (AppState.editId) {
        const idx = AppState.goals.findIndex(g => g.id === AppState.editId);
        AppState.goals[idx] = goal;
     } else AppState.goals.push(goal);
     this.saveData(); this.renderGoals();
  },

  renderGoals(filter = 'all') {
     const list = document.getElementById('goalList');
     const charts = document.getElementById('goalChartsContainer');
     const compF = document.getElementById('goalCompletionFilter').value;
     
     if (AppState.goalsShowCharts) {
        list.style.display = 'none';
        charts.style.display = 'grid';
        this.renderGoalCharts(filter);
        return;
     }
     list.style.display = 'grid';
     charts.style.display = 'none';

     let filtered = AppState.goals.filter(g => (filter === 'all' || g.freq === filter));
     filtered = filtered.filter(g => {
        const done = g.type === 'binary' ? g.progress >= 1 : g.progress >= g.target;
        if (compF === 'completed' && !done) return false;
        if (compF === 'pending' && done) return false;
        return true;
     });

     list.innerHTML = filtered.length ? '' : '<div style="grid-column:1/-1; text-align:center; padding: 4rem; color:var(--text-muted);">No habits active.</div>';
     
     filtered.forEach(g => {
        const done = g.type === 'binary' ? g.progress >= 1 : g.progress >= g.target;
        const pct = Math.min(100, Math.round((g.progress / g.target) * 100));
        const successful = (g.history ? g.history.filter(h => h.completed).length : 0) + (done ? 1 : 0);
        const consistency = Math.round((successful / ((g.history ? g.history.length : 0) + 1)) * 100);

        const card = document.createElement('div');
        card.className = `habit-card ${done ? 'completed' : ''}`;
        card.dataset.id = g.id;

        if (g.type === 'binary') {
           card.innerHTML = `
              <div class="habit-header">
                 <div class="habit-title">${g.title}</div>
                 <div class="card-actions">
                    <button class="icon-btn edit-habit">✏️</button>
                    <button class="icon-btn delete-habit">🗑️</button>
                 </div>
              </div>
              <div class="habit-stats">
                 <div class="stat-box"><span class="stat-val">🔥 ${g.streak}</span><span class="stat-label">Streak</span></div>
                 <div class="stat-box"><span class="stat-val">${consistency}%</span><span class="stat-label">Consist.</span></div>
              </div>
              <div class="habit-action">
                 <button class="habit-check ${done ? 'checked' : ''}" data-id="${g.id}">${done ? '✓' : ''}</button>
                 <div class="habit-progress-container" style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="badge badge-${g.freq}" style="margin:0;">${g.freq}</span>
                    <span style="font-size:0.9rem; font-weight:600;">${done ? 'Done' : 'Mark Done'}</span>
                 </div>
              </div>`;
        } else {
           card.innerHTML = `
              <div class="habit-header">
                 <div class="habit-title">${g.title}</div>
                 <div class="card-actions">
                    <button class="icon-btn edit-habit">✏️</button>
                    <button class="icon-btn delete-habit">🗑️</button>
                 </div>
              </div>
              <div class="minimal-counter">
                 <button class="goal-step-btn habit-minus" data-id="${g.id}">&minus;</button>
                 <div class="counter-display">
                    <span style="font-size:1.5rem; font-weight:800; color:var(--primary);">${Math.round(g.progress)}</span>
                    <span class="counter-target">/ ${g.target} ${g.unit}</span>
                 </div>
                 <button class="goal-step-btn habit-plus" data-id="${g.id}">&plus;</button>
              </div>
              <div class="slider-container">
                 <input type="range" class="goal-progress-slider" data-id="${g.id}" min="0" max="${g.target}" value="${g.progress}">
              </div>
              <div class="habit-stats">
                 <div class="stat-box"><span class="stat-val">🔥 ${g.streak}</span><span class="stat-label">Streak</span></div>
                 <div class="stat-box"><span class="stat-val">${consistency}%</span><span class="stat-label">Consist.</span></div>
              </div>
              <div class="habit-bottom-bar" style="display:flex; justify-content:space-between; align-items:center; margin-top:0.5rem; padding-top:0.5rem; border-top:1px solid var(--border);">
                 <span class="badge badge-${g.freq}">${g.freq}</span>
                 <div class="habit-bottom-progress" style="width:60%; margin:0;"><div class="habit-progress-fill" style="width:${pct}%"></div></div>
              </div>`;
        }
        list.appendChild(card);
     });
  },

  renderGoalCharts(filter) {
      const container = document.getElementById('goalChartsContainer');
      container.innerHTML = '';
      const filtered = AppState.goals.filter(g => filter === 'all' || g.freq === filter);
      
      filtered.forEach(g => {
         const card = document.createElement('div');
         card.className = 'metric-card';
         card.innerHTML = `<div class="habit-header"><h3>${g.title} (${AppState.goalsTimeframe || '7d'})</h3></div><div style="height:200px;"><canvas id="goal-chart-${g.id}"></canvas></div>`;
         container.appendChild(card);
         
         const ctx = document.getElementById(`goal-chart-${g.id}`).getContext('2d');
         const labels = [];
         const actualData = [];
         const targetData = [];
          
         const now = new Date();
         let days = 7;
         if (AppState.goalsTimeframe === 'month') days = 30;
         else if (AppState.goalsTimeframe === '3m') days = 90;
         else if (AppState.goalsTimeframe === 'year') days = 365;
         
         for(let i=days-1; i>=0; i--) {
            const d = new Date(); d.setDate(now.getDate() - i);
            labels.push(d.toLocaleDateString(undefined, {weekday: 'short', month: 'short', day: 'numeric'}));
            
            const targetVal = g.type === 'binary' ? 1 : g.target;
            targetData.push(targetVal);
            
            let val = 0;
            if (i === 0) {
                // Today
                val = g.type==='binary' ? (g.progress>=1 ? 1 : 0) : g.progress;
            } else {
                const h = g.history?.find(x => new Date(x.date).toDateString() === d.toDateString());
                if (h) {
                    val = g.type === 'binary' ? (h.completed ? 1 : 0) : (h.progress || 0);
                }
            }
            actualData.push(val);
         }
         
         new Chart(ctx, {
            type: 'bar', 
            data: { 
                labels, 
                datasets: [
                    { 
                        label: 'Actual', 
                        data: actualData, 
                        backgroundColor: actualData.map(v => {
                           const t = g.type === 'binary' ? 1 : g.target;
                           return v >= t ? '#10b981' : '#6366f1';
                        }),
                        borderRadius: 4,
                        order: 2
                    },
                    {
                        label: 'Goal',
                        data: targetData,
                        type: 'line',
                        borderColor: '#ef4444',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        pointRadius: 0,
                        fill: false,
                        order: 1
                    }
                ] 
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                interaction: {
                   mode: 'index',
                   intersect: false,
                },
                scales: { 
                    y: { 
                        beginAtZero: true,
                        grid: { display: true, color: 'rgba(0,0,0,0.05)' }
                    }, 
                    x: { 
                        grid: { display: false },
                        display: days <= 30
                    } 
                }, 
                plugins: { 
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y;
                                    if (g.unit) label += ' ' + g.unit;
                                }
                                return label;
                            }
                        }
                    }
                } 
            }
         });
      });
  },

  changeHabitProgress(id, percentage) {
     const g = AppState.goals.find(x => x.id === id);
     if (g) {
        g.progress = Math.max(0, Math.min(g.target, g.progress + g.target * percentage));
        this.saveData(); this.renderGoals();
     }
  },

  toggleHabitBinary(id) {
     const g = AppState.goals.find(x => x.id === id);
     if (g) { g.progress = g.progress >= 1 ? 0 : 1; this.saveData(); this.renderGoals(); }
  },

  deleteHabit(id) { if (confirm("Delete habit?")) { AppState.goals = AppState.goals.filter(g => g.id !== id); this.saveData(); this.renderGoals(); } },

  editHabit(id) {
      const g = AppState.goals.find(x => x.id === id);
      if (!g) return;
      AppState.editId = id;
      const modal = document.getElementById('goalModal');
      document.getElementById('goalTitle').value = g.title;
      document.getElementById('goalFrequency').value = g.freq;
      document.getElementById('goalType').value = g.type;
      document.getElementById('goalTarget').value = g.target;
      document.getElementById('goalUnit').value = g.unit;
      document.getElementById('goalDesc').value = g.desc || '';
      document.getElementById('goalQuantFields').style.display = g.type === 'quantitative' ? 'block' : 'none';
      
      const histSection = document.getElementById('goalHistorySection');
      const histList = document.getElementById('goalHistoryList');
      histList.innerHTML = '';
      if (g.history && g.history.length > 0) {
         histSection.style.display = 'block';
         g.history.slice(-10).reverse().forEach((h, i) => {
            const idx = g.history.length - 1 - i;
            histList.innerHTML += `<div class="history-item"><span>${new Date(h.date).toLocaleDateString()}: <b>${h.progress}${g.unit}</b></span><button type="button" class="btn-text edit-hist-btn" onclick="App.editHistoryEntry('${g.id}', ${idx})">Edit</button></div>`;
         });
      } else histSection.style.display = 'none';
      
      modal.querySelector('button[type="submit"]').textContent = 'Save Changes';
      modal.querySelector('h2').textContent = 'Edit Habit';
      modal.classList.add('active');
  },

  editHistoryEntry(gid, hidx) {
      const g = AppState.goals.find(x => x.id === gid);
      const h = g.history[hidx];
      const newVal = prompt(`Change value for ${new Date(h.date).toLocaleDateString()}:`, h.progress);
      if (newVal !== null) {
          h.progress = parseFloat(newVal);
          h.completed = g.type === 'binary' ? h.progress >= 1 : h.progress >= h.target;
          this.saveData(); this.editHabit(gid); this.renderGoals();
      }
  },

  /**
   * GROWTH & METRICS
   */
  handleMetricSubmit() {
     let type = document.getElementById('metricTypeInput').value;
     const val = parseFloat(document.getElementById('metricValue').value);
     const date = document.getElementById('metricDate').value;

     if (type === 'custom' || !AppState.metrics[type]) {
         const name = type === 'custom' ? document.getElementById('newMetricName').value : type;
         if (!name) return;
         const unit = document.getElementById('newMetricUnit').value;
         const target = parseFloat(document.getElementById('newMetricTarget').value) || null;
         
         const pref = {
             start: document.getElementById('prefStart').checked,
             avg: document.getElementById('prefAvg').checked,
             high: document.getElementById('prefHigh').checked,
             low: document.getElementById('prefLow').checked
         };

         if (!AppState.metrics[name]) {
             AppState.metrics[name] = { unit, entries: [], target, pref };
             AppState.metricOrder.push(name);
         } else {
             AppState.metrics[name].unit = unit;
             AppState.metrics[name].target = target;
             AppState.metrics[name].pref = pref;
         }
         type = name;
     }

     if (!isNaN(val)) {
        AppState.metrics[type].entries.push({ date, value: val });
        AppState.metrics[type].entries.sort((a,b) => new Date(a.date) - new Date(b.date));
     }
     this.saveData(); this.renderGrowth(); this.populateMetricTypeSelect();
  },

  renderGrowth() {
     const cont = document.getElementById('metricsContainer');
     cont.innerHTML = '';
     const range = document.querySelector('.time-tab.active')?.dataset.range || 'all';
     
     AppState.metricOrder.forEach(key => {
        const m = AppState.metrics[key];
        if (!m) return;
        
        let entries = [...m.entries].sort((a,b) => new Date(a.date) - new Date(b.date));
        if (range !== 'all') {
            const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - parseInt(range));
            entries = entries.filter(e => new Date(e.date) >= cutoff);
        }

        const lastVal = entries.length > 0 ? entries[entries.length-1].value : '--';
        
        // Calculate A, H, L, S
        let avg = '--', high = '--', low = '--', start = '--';
        if (entries.length > 0) {
            start = entries[0].value;
            const vals = entries.map(e => e.value);
            avg = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
            high = Math.max(...vals);
            low = Math.min(...vals);
        }

        const card = document.createElement('div');
        card.className = 'metric-card';
        card.dataset.metric = key;
        card.innerHTML = `
           <div class="metric-card-header">
              <div style="flex: 1;">
                 <h3 style="margin-bottom: 0.25rem;">${key}</h3>
                 <div style="display:flex; align-items:baseline; gap:0.5rem; flex-wrap: wrap;">
                    <span style="font-size:1.5rem; font-weight:800; color:var(--text-main);">${lastVal}</span>
                    <span style="font-size:0.8rem; color:var(--text-muted); font-weight:600;">${m.unit || ''}</span>
                    
                    <div style="display: flex; gap: 0.75rem; margin-left: auto; font-size: 0.7rem; font-weight: 700; color: var(--text-muted);">
                        ${(!m.pref || m.pref.start) ? `<span title="Start Value" style="cursor:help; border-bottom:1px dotted">S: <span style="color: var(--text-main)">${start}</span></span>` : ''}
                        ${(!m.pref || m.pref.avg) ? `<span title="Average Value" style="cursor:help; border-bottom:1px dotted">A: <span style="color: var(--text-main)">${avg}</span></span>` : ''}
                        ${(!m.pref || m.pref.high) ? `<span title="Highest Value" style="cursor:help; border-bottom:1px dotted">H: <span style="color: var(--text-main)">${high}</span></span>` : ''}
                        ${(!m.pref || m.pref.low) ? `<span title="Lowest Value" style="cursor:help; border-bottom:1px dotted">L: <span style="color: var(--text-main)">${low}</span></span>` : ''}
                    </div>
                 </div>
              </div>
              <div class="card-actions" style="margin-left: 1rem;">
                 <button class="icon-btn log-metric-direct" title="Log Data">📊</button>
                 <button class="icon-btn edit-metric">✏️</button>
                 <button class="icon-btn delete-metric">🗑️</button>
              </div>
           </div>
           <div class="metric-chart-wrapper"><canvas id="chart-${key}"></canvas></div>`;
        cont.appendChild(card);
        
        // Chart
        if (AppState.chartInstances[key]) AppState.chartInstances[key].destroy();
        const ctx = document.getElementById(`chart-${key}`).getContext('2d');
        const grad = ctx.createLinearGradient(0,0,0,200);
        grad.addColorStop(0, AppState.settings.primaryColor+'40');
        grad.addColorStop(1, AppState.settings.primaryColor+'00');

        const datasets = [{
           label: key, data: entries.map(e=>e.value), borderColor: AppState.settings.primaryColor,
           backgroundColor: grad, fill: true, tension: 0.4, pointRadius: 4, borderWidth: 3
        }];
        if (m.target) datasets.push({ label: 'Goal', data: Array(entries.length).fill(m.target), borderColor:'#ef4444', borderWidth:2, borderDash:[5,5], pointRadius:0, fill:false });

        AppState.chartInstances[key] = new Chart(ctx, {
           type: 'line', 
           data: { labels: entries.map(e => new Date(e.date).toLocaleDateString(undefined, {month:'short', day:'numeric'})), datasets },
           options: { 
               responsive:true, 
               maintainAspectRatio:false, 
               interaction: {
                   intersect: false,
                   mode: 'index',
               },
               scales:{ 
                   x:{grid:{display:false}}, 
                   y:{beginAtZero:false, grid:{color:'rgba(0,0,0,0.05)'}} 
               }, 
               plugins:{ 
                   legend:{display:false},
                   tooltip: {
                       enabled: true,
                       backgroundColor: 'rgba(30, 41, 59, 0.9)',
                       titleColor: '#f8fafc',
                       bodyColor: '#f8fafc',
                       padding: 10,
                       cornerRadius: 8,
                       displayColors: false
                   }
               } 
           }
        });
     });
  },

  populateMetricTypeSelect() {
      const s = document.getElementById('metricTypeInput');
      s.innerHTML = Object.keys(AppState.metrics).map(k => `<option value="${k}">${k}</option>`).join('') + '<option value="custom">Create New...</option>';
  },

  openMetricLogModal(isNew = false) {
      const modal = document.getElementById('metricModal');
      document.getElementById('metricForm').reset();
      document.getElementById('metricDate').value = new Date().toISOString().split('T')[0];
      this.populateMetricTypeSelect();
      
      const newInputs = document.getElementById('newMetricInputs');
      const dataFields = document.getElementById('metricDataFields');
      const title = modal.querySelector('h2');
      const typeGroup = modal.querySelector('.form-group:first-child');
      
      if (isNew) {
          newInputs.style.display = 'block';
          dataFields.style.display = 'none';
          document.getElementById('metricTypeInput').value = 'custom';
          typeGroup.style.display = 'none';
          title.textContent = AppState.editMetricKey ? "Edit Metric Type" : "New Metric Type";
          // Reset Prefs for new
          if (!AppState.editMetricKey) {
              ['prefStart','prefAvg','prefHigh','prefLow'].forEach(id => document.getElementById(id).checked = true);
          }
      } else {
          newInputs.style.display = 'none';
          dataFields.style.display = 'flex';
          typeGroup.style.display = 'block';
          title.textContent = "Log Entry";
      }
      
      modal.classList.add('active');
  },

  deleteMetric(key) { if(confirm(`Delete "${key}" and all its data?`)) { delete AppState.metrics[key]; AppState.metricOrder = AppState.metricOrder.filter(k=>k!==key); this.saveData(); this.renderGrowth(); } },

  editMetric(key) {
      AppState.editMetricKey = key;
      const m = AppState.metrics[key];
      this.openMetricLogModal(true);
      document.getElementById('newMetricName').value = key;
      document.getElementById('newMetricName').disabled = true;
      document.getElementById('newMetricUnit').value = m.unit || '';
      document.getElementById('newMetricTarget').value = m.target || '';
      // Prefs
      if (m.pref) {
          document.getElementById('prefStart').checked = m.pref.start;
          document.getElementById('prefAvg').checked = m.pref.avg;
          document.getElementById('prefHigh').checked = m.pref.high;
          document.getElementById('prefLow').checked = m.pref.low;
      } else {
          // Default all checked
          ['prefStart','prefAvg','prefHigh','prefLow'].forEach(id => document.getElementById(id).checked = true);
      }
  },

  openMetricLogFor(key) {
      this.openMetricLogModal(false);
      document.getElementById('metricTypeInput').value = key;
  },

  /**
   * SYSTEM
   */
  updateTime() { this.renderDashboard(); },
  renderSidebar() {
      // Sidebar logic
  },

  renderAll() { this.renderTasks(); this.renderGoals(); this.renderGrowth(); this.renderDashboard(); }
};

// Start
document.addEventListener('DOMContentLoaded', () => App.init());
// Global exposure for specific handlers
window.App = App;

function getDragAfterElement(container, y, selector) {
    const draggables = [...container.querySelectorAll(`${selector}:not(.dragging)`)];
    return draggables.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) return { offset: offset, element: child }; else return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}
