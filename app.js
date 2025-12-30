// ============================================
// STATE MANAGEMENT
// ============================================
const AppState = {
  goals: [],
  tasks: [],
  expenses: [],
  income: [],
  settings: {
    currency: "USD",
    weightUnit: "lbs",
    theme: localStorage.getItem("theme") || "light",
  },
  currentView: "dashboard",
  currentFilter: {
    goals: "all",
    tasks: "pending",
    taskCategory: "all",
    taskSort: "dueDate",
  },
  taskCategories: {
    Work: { color: "#6366f1", emoji: "💼" },
    Personal: { color: "#10b981", emoji: "🏠" },
    Health: { color: "#f59e0b", emoji: "🏥" },
    Grocery: { color: "#ec4899", emoji: "🛒" },
  },
  categoryBudgets: {
    food: 500,
    transport: 200,
    shopping: 300,
    entertainment: 150,
    health: 100,
    bills: 400,
    other: 200,
  },
  metrics: [],
  metricTypes: {
    weight: { name: "Weight", unit: "lbs" },
    bodyFat: { name: "Body Fat", unit: "%" },
    sleep: { name: "Sleep Hours", unit: "hrs" },
    mood: { name: "Mood", unit: "/10" },
    energy: { name: "Energy Level", unit: "/10" },
    steps: { name: "Steps", unit: "steps" },
    waterIntake: { name: "Water Intake", unit: "L" },
    calories: { name: "Calories", unit: "cal" },
  },
  currentMetricType: "weight",
  currentMetricTimeframe: 7,
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener("DOMContentLoaded", () => {
  loadData();
  initializeTheme();
  initializeNavigation();
  initializeModals();
  initializeQuickActions();
  initializeForms();
  initializeFilters();
  initializeMetrics();
  renderDashboard();
  updateAllViews();

  // Add sample data if first time
  if (AppState.goals.length === 0) {
    addSampleData();
  }
});

// ============================================
// DATA PERSISTENCE
// ============================================
function loadData() {
  const savedGoals = localStorage.getItem("goals");
  const savedTasks = localStorage.getItem("tasks");
  const savedExpenses = localStorage.getItem("expenses");
  const savedIncome = localStorage.getItem("income");
  const savedBudgets = localStorage.getItem("categoryBudgets");
  const savedSettings = localStorage.getItem("settings");
  const savedMetrics = localStorage.getItem("metrics");
  const savedMetricTypes = localStorage.getItem("metricTypes");

  const savedTaskCategories = localStorage.getItem("taskCategories");

  if (savedGoals) AppState.goals = JSON.parse(savedGoals);
  if (savedTasks) AppState.tasks = JSON.parse(savedTasks);
  if (savedTaskCategories) AppState.taskCategories = JSON.parse(savedTaskCategories);
  if (savedExpenses) AppState.expenses = JSON.parse(savedExpenses);
  if (savedIncome) AppState.income = JSON.parse(savedIncome);
  if (savedBudgets) AppState.categoryBudgets = JSON.parse(savedBudgets);
  if (savedSettings) AppState.settings = { ...AppState.settings, ...JSON.parse(savedSettings) };
  if (savedMetrics) AppState.metrics = JSON.parse(savedMetrics);
  if (savedMetricTypes) AppState.metricTypes = { ...AppState.metricTypes, ...JSON.parse(savedMetricTypes) };
  
  // Apply units to metrics based on settings
  AppState.metricTypes.weight.unit = AppState.settings.weightUnit;
}

function saveData() {
  localStorage.setItem("goals", JSON.stringify(AppState.goals));
  localStorage.setItem("tasks", JSON.stringify(AppState.tasks));
  localStorage.setItem("expenses", JSON.stringify(AppState.expenses));
  localStorage.setItem("income", JSON.stringify(AppState.income));
  localStorage.setItem(
    "categoryBudgets",
    JSON.stringify(AppState.categoryBudgets)
  );
  localStorage.setItem("settings", JSON.stringify(AppState.settings));
  localStorage.setItem("metrics", JSON.stringify(AppState.metrics));
  localStorage.setItem("metricTypes", JSON.stringify(AppState.metricTypes));
  localStorage.setItem("taskCategories", JSON.stringify(AppState.taskCategories));
}

// ============================================
// THEME MANAGEMENT
// ============================================
function initializeTheme() {
  document.documentElement.setAttribute("data-theme", AppState.settings.theme);
}

// ============================================
// NAVIGATION
// ============================================
function initializeNavigation() {
  const navItems = document.querySelectorAll(".nav-item");

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const view = item.getAttribute("data-view");
      switchView(view);
    });
  });
}

function switchView(viewName) {
  // Update nav items
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active");
    if (item.getAttribute("data-view") === viewName) {
      item.classList.add("active");
    }
  });

  // Update views
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.remove("active");
  });
  document.getElementById(viewName).classList.add("active");

  AppState.currentView = viewName;

  // Update specific view
  switch (viewName) {
    case "dashboard":
      renderDashboard();
      break;
    case "goals":
      renderGoals();
      break;
    case "tasks":
      renderTasks();
      break;
    case "spending":
      renderSpending();
      break;
    case "metrics":
      renderMetrics();
      break;
    case "insights":
      renderInsights();
      break;
    case "settings":
      renderSettings();
      break;
  }
}

// ============================================
// MODAL MANAGEMENT
// ============================================
function initializeModals() {
  // Goal Modal
  const goalModal = document.getElementById("goalModal");
  const addGoalBtn = document.getElementById("addGoalBtn");
  const closeGoalModal = document.getElementById("closeGoalModal");
  const cancelGoal = document.getElementById("cancelGoal");

  addGoalBtn.addEventListener("click", () => openGoalModal());
  closeGoalModal.addEventListener("click", () => closeModal("goalModal"));
  cancelGoal.addEventListener("click", () => closeModal("goalModal"));

  // Task Modal
  const taskModal = document.getElementById("taskModal");
  const addTaskBtn = document.getElementById("addTaskBtn");
  const closeTaskModal = document.getElementById("closeTaskModal");
  const cancelTask = document.getElementById("cancelTask");

  addTaskBtn.addEventListener("click", () => openTaskModal());
  closeTaskModal.addEventListener("click", () => closeModal("taskModal"));
  cancelTask.addEventListener("click", () => closeModal("taskModal"));

  // Custom Category toggle
  document.getElementById("taskCategorySelect").addEventListener("change", (e) => {
    const customSection = document.getElementById("customCategorySection");
    customSection.style.display = e.target.value === "custom" ? "block" : "none";
  });

  // Expense Modal
  const expenseModal = document.getElementById("expenseModal");
  const addExpenseBtn = document.getElementById("addExpenseBtn");
  const closeExpenseModal = document.getElementById("closeExpenseModal");
  const cancelExpense = document.getElementById("cancelExpense");

  addExpenseBtn.addEventListener("click", () => openExpenseModal());
  closeExpenseModal.addEventListener("click", () => closeModal("expenseModal"));
  cancelExpense.addEventListener("click", () => closeModal("expenseModal"));

  // Income Modal
  const closeIncomeModal = document.getElementById("closeIncomeModal");
  const cancelIncome = document.getElementById("cancelIncome");
  const addIncomeBtn = document.getElementById("addIncomeBtn");

  addIncomeBtn.addEventListener("click", () => {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("incomeDate").value = today;
    openModal("incomeModal");
  });
  closeIncomeModal.addEventListener("click", () => closeModal("incomeModal"));
  cancelIncome.addEventListener("click", () => closeModal("incomeModal"));

  // Category Details Modal
  const closeCategoryDetailsModal = document.getElementById("closeCategoryDetailsModal");
  const closeCategoryDetails = document.getElementById("closeCategoryDetails");

  closeCategoryDetailsModal.addEventListener("click", () => closeModal("categoryDetailsModal"));
  closeCategoryDetails.addEventListener("click", () => closeModal("categoryDetailsModal"));

  // Progress Modal
  const closeProgressModal = document.getElementById("closeProgressModal");
  const cancelProgress = document.getElementById("cancelProgress");

  closeProgressModal.addEventListener("click", () =>
    closeModal("goalProgressModal")
  );
  cancelProgress.addEventListener("click", () =>
    closeModal("goalProgressModal")
  );

  // Close on outside click
  window.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal")) {
      closeModal(e.target.id);
    }
  });

  // Goal type change
  document.getElementById("goalType").addEventListener("change", (e) => {
    const targetGroup = document.getElementById("targetGroup");
    if (e.target.value === "quantitative") {
      targetGroup.style.display = "block";
    } else {
      targetGroup.style.display = "none";
    }
  });

  // Metric Modal
  const addMetricBtn = document.getElementById("addMetricBtn");
  const closeMetricModal = document.getElementById("closeMetricModal");
  const cancelMetric = document.getElementById("cancelMetric");

  addMetricBtn.addEventListener("click", () => {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("metricDate").value = today;
    document.getElementById("metricType").value = AppState.currentMetricType;
    openModal("metricModal");
  });
  closeMetricModal.addEventListener("click", () => closeModal("metricModal"));
  cancelMetric.addEventListener("click", () => closeModal("metricModal"));

  // Custom Metric Modal
  const addMetricTypeBtn = document.getElementById("addMetricTypeBtn");
  const closeCustomMetricModal = document.getElementById("closeCustomMetricModal");
  const cancelCustomMetric = document.getElementById("cancelCustomMetric");

  addMetricTypeBtn.addEventListener("click", () => openModal("customMetricModal"));
  closeCustomMetricModal.addEventListener("click", () => closeModal("customMetricModal"));
  cancelCustomMetric.addEventListener("click", () => closeModal("customMetricModal"));
}

function openModal(modalId) {
  document.getElementById(modalId).classList.add("active");
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove("active");
}

function openGoalModal(goalId = null) {
  const modal = document.getElementById("goalModal");
  const form = document.getElementById("goalForm");
  const title = document.getElementById("goalModalTitle");

  if (goalId) {
    const goal = AppState.goals.find((g) => g.id === goalId);
    title.textContent = "Edit Goal";
    document.getElementById("goalName").value = goal.name;
    document.getElementById("goalType").value = goal.type;
    document.getElementById("goalFrequency").value = goal.frequency;

    if (goal.type === "quantitative") {
      document.getElementById("targetGroup").style.display = "block";
      document.getElementById("goalTarget").value = goal.target;
      document.getElementById("goalUnit").value = goal.unit;
    }

    form.dataset.editId = goalId;
  } else {
    title.textContent = "New Goal";
    form.reset();
    delete form.dataset.editId;
  }

  openModal("goalModal");
}

// ============================================
// QUICK ACTIONS
// ============================================
function initializeQuickActions() {
  document.getElementById("quickAddGoal").addEventListener("click", () => {
    openGoalModal();
  });

  document.getElementById("quickAddTask").addEventListener("click", () => {
    openTaskModal();
  });

  document.getElementById("quickAddExpense").addEventListener("click", () => {
    openExpenseModal();
  });
}

function openTaskModal(taskId = null) {
  const form = document.getElementById("taskForm");
  const title = document.getElementById("taskModalTitle");
  const saveBtn = document.getElementById("saveTaskBtn");
  const catSelect = document.getElementById("taskCategorySelect");
  const customSection = document.getElementById("customCategorySection");
  
  updateTaskCategorySelect();

  if (taskId) {
    const task = AppState.tasks.find((t) => t.id === taskId);
    title.textContent = "Edit To-Do";
    saveBtn.textContent = "Save Changes";
    document.getElementById("taskName").value = task.name;
    document.getElementById("taskDescription").value = task.description || "";
    catSelect.value = task.category;
    document.getElementById("taskDueDate").value = task.dueDate || "";
    document.getElementById("taskRepeating").checked = task.repeating || false;
    form.dataset.editId = taskId;
    customSection.style.display = "none";
  } else {
    title.textContent = "New To-Do";
    saveBtn.textContent = "Add To-Do";
    form.reset();
    delete form.dataset.editId;
    customSection.style.display = "none";
  }

  openModal("taskModal");
}

function updateTaskCategorySelect() {
  const select = document.getElementById("taskCategorySelect");
  const currentValue = select.value;
  
  select.innerHTML = "";
  Object.keys(AppState.taskCategories).forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = `${AppState.taskCategories[cat].emoji} ${cat}`;
    select.appendChild(opt);
  });
  
  const customOpt = document.createElement("option");
  customOpt.value = "custom";
  customOpt.textContent = "+ Custom Category";
  select.appendChild(customOpt);
  
  if (currentValue) select.value = currentValue;
}

// ============================================
// FORM HANDLING
// ============================================
function initializeForms() {
  // Goal Form
  document.getElementById("goalForm").addEventListener("submit", (e) => {
    e.preventDefault();
    handleGoalSubmit();
  });

  // Task Form
  document.getElementById("taskForm").addEventListener("submit", (e) => {
    e.preventDefault();
    handleTaskSubmit();
  });

  // Expense Form
  document.getElementById("expenseForm").addEventListener("submit", (e) => {
    e.preventDefault();
    handleExpenseSubmit();
  });

  // Income Form
  document.getElementById("incomeForm").addEventListener("submit", (e) => {
    e.preventDefault();
    handleIncomeSubmit();
  });

  // Progress controls
  document.getElementById("incrementProgress").addEventListener("click", () => {
    const input = document.getElementById("progressInput");
    input.value = parseInt(input.value) + 1;
  });

  document.getElementById("decrementProgress").addEventListener("click", () => {
    const input = document.getElementById("progressInput");
    const newValue = parseInt(input.value) - 1;
    if (newValue >= 0) input.value = newValue;
  });

  document.getElementById("saveProgress").addEventListener("click", () => {
    handleProgressSave();
  });

  // Export data
  document
    .getElementById("exportDataBtn")
    .addEventListener("click", exportData);
}

function handleGoalSubmit() {
  const form = document.getElementById("goalForm");
  const editId = form.dataset.editId;

  const goalData = {
    id: editId || Date.now().toString(),
    name: document.getElementById("goalName").value,
    type: document.getElementById("goalType").value,
    frequency: document.getElementById("goalFrequency").value,
    createdAt: editId
      ? AppState.goals.find((g) => g.id === editId).createdAt
      : new Date().toISOString(),
    history: editId ? AppState.goals.find((g) => g.id === editId).history : [],
  };

  if (goalData.type === "quantitative") {
    goalData.target = parseInt(document.getElementById("goalTarget").value);
    goalData.unit = document.getElementById("goalUnit").value;
  }

  if (editId) {
    const index = AppState.goals.findIndex((g) => g.id === editId);
    AppState.goals[index] = { ...AppState.goals[index], ...goalData };
  } else {
    AppState.goals.push(goalData);
  }

  saveData();
  closeModal("goalModal");
  form.reset();
  updateAllViews();
}

function handleTaskSubmit() {
  const form = document.getElementById("taskForm");
  const editId = form.dataset.editId;
  const catSelect = document.getElementById("taskCategorySelect");
  
  let category = catSelect.value;
  
  if (category === "custom") {
    const name = document.getElementById("customCatName").value;
    const emoji = document.getElementById("customCatEmoji").value || "📝";
    const color = document.getElementById("customCatColor").value;
    
    if (name) {
      AppState.taskCategories[name] = { color, emoji };
      category = name;
      updateTodoCategoryFilter();
    } else {
      category = "Other";
      if (!AppState.taskCategories["Other"]) {
        AppState.taskCategories["Other"] = { color: "#94a3b8", emoji: "📝" };
      }
    }
  }

  const taskData = {
    id: editId || Date.now().toString(),
    name: document.getElementById("taskName").value,
    description: document.getElementById("taskDescription").value,
    category: category,
    dueDate: document.getElementById("taskDueDate").value,
    repeating: document.getElementById("taskRepeating").checked,
    completed: editId ? AppState.tasks.find(t => t.id === editId).completed : false,
    createdAt: editId ? AppState.tasks.find(t => t.id === editId).createdAt : new Date().toISOString(),
  };

  if (editId) {
    const index = AppState.tasks.findIndex((t) => t.id === editId);
    AppState.tasks[index] = taskData;
  } else {
    AppState.tasks.push(taskData);
  }

  saveData();
  closeModal("taskModal");
  form.reset();
  updateAllViews();
}

function openExpenseModal(expenseId = null) {
  const form = document.getElementById("expenseForm");
  const title = document.getElementById("expenseModalTitle");

  if (expenseId) {
    const expense = AppState.expenses.find((e) => e.id === expenseId);
    title.textContent = "Edit Expense";
    document.getElementById("expenseAmount").value = expense.amount;
    document.getElementById("expenseCategory").value = expense.category;
    document.getElementById("expenseDescription").value = expense.description || "";
    form.dataset.editId = expenseId;
  } else {
    title.textContent = "Add Expense";
    form.reset();
    delete form.dataset.editId;
  }

  openModal("expenseModal");
}

function handleExpenseSubmit() {
  const form = document.getElementById("expenseForm");
  const editId = form.dataset.editId;

  const expenseData = {
    id: editId || Date.now().toString(),
    amount: parseFloat(document.getElementById("expenseAmount").value),
    category: document.getElementById("expenseCategory").value,
    description: document.getElementById("expenseDescription").value,
    date: editId ? AppState.expenses.find(e => e.id === editId).date : new Date().toISOString(),
  };

  if (editId) {
    const index = AppState.expenses.findIndex((e) => e.id === editId);
    AppState.expenses[index] = expenseData;
  } else {
    AppState.expenses.push(expenseData);
  }

  saveData();
  closeModal("expenseModal");
  form.reset();
  updateAllViews();
}

function handleIncomeSubmit() {
  const incomeData = {
    id: Date.now().toString(),
    amount: parseFloat(document.getElementById("incomeAmount").value),
    source: document.getElementById("incomeSource").value,
    date: document.getElementById("incomeDate").value,
    createdAt: new Date().toISOString(),
  };

  AppState.income.push(incomeData);
  saveData();
  closeModal("incomeModal");
  document.getElementById("incomeForm").reset();
  updateAllViews();
}

// ============================================
// METRICS FUNCTIONS
// ============================================
function initializeMetrics() {
  // Metric type selector
  const metricTypeSelect = document.getElementById("metricTypeSelect");
  metricTypeSelect.addEventListener("change", (e) => {
    AppState.currentMetricType = e.target.value;
    renderMetrics();
  });

  // Timeframe buttons
  document.querySelectorAll(".timeframe-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".timeframe-btn").forEach(b => b.classList.remove("active"));
      e.target.classList.add("active");
      const timeframe = e.target.getAttribute("data-timeframe");
      AppState.currentMetricTimeframe = timeframe === "all" ? "all" : parseInt(timeframe);
      renderMetricChart();
    });
  });

  // Metric form
  document.getElementById("metricForm").addEventListener("submit", (e) => {
    e.preventDefault();
    handleMetricSubmit();
  });

  // Custom metric form
  document.getElementById("customMetricForm").addEventListener("submit", (e) => {
    e.preventDefault();
    handleCustomMetricSubmit();
  });
}

function handleMetricSubmit() {
  const metricData = {
    id: Date.now().toString(),
    type: document.getElementById("metricType").value,
    value: parseFloat(document.getElementById("metricValue").value),
    date: document.getElementById("metricDate").value,
    notes: document.getElementById("metricNotes").value,
    createdAt: new Date().toISOString(),
  };

  AppState.metrics.push(metricData);
  saveData();
  closeModal("metricModal");
  document.getElementById("metricForm").reset();
  renderMetrics();
}

function handleCustomMetricSubmit() {
  const name = document.getElementById("customMetricName").value;
  const unit = document.getElementById("customMetricUnit").value || "";
  const key = name.toLowerCase().replace(/\s+/g, "");

  AppState.metricTypes[key] = { name, unit };
  
  // Update select dropdowns
  updateMetricTypeSelects();
  
  saveData();
  closeModal("customMetricModal");
  document.getElementById("customMetricForm").reset();
}

function updateMetricTypeSelects() {
  const selects = [
    document.getElementById("metricTypeSelect"),
    document.getElementById("metricType")
  ];

  selects.forEach(select => {
    select.innerHTML = "";
    Object.keys(AppState.metricTypes).forEach(key => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = AppState.metricTypes[key].name;
      select.appendChild(option);
    });
  });
}

function deleteMetricEntry(entryId) {
  if (confirm("Are you sure you want to delete this entry?")) {
    AppState.metrics = AppState.metrics.filter(m => m.id !== entryId);
    saveData();
    renderMetrics();
  }
}

function getMetricStats(metricType) {
  const entries = AppState.metrics
    .filter(m => m.type === metricType)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (entries.length === 0) {
    return {
      current: "--",
      average: "--",
      highest: "--",
      lowest: "--",
      change: "--",
      total: 0
    };
  }

  const values = entries.map(e => e.value);
  const current = entries[entries.length - 1].value;
  const average = (values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(1);
  const highest = Math.max(...values).toFixed(1);
  const lowest = Math.min(...values).toFixed(1);

  // Calculate 7-day change
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentEntries = entries.filter(e => new Date(e.date) >= sevenDaysAgo);
  
  let change = "--";
  if (recentEntries.length >= 2) {
    const oldValue = recentEntries[0].value;
    const newValue = recentEntries[recentEntries.length - 1].value;
    const diff = newValue - oldValue;
    change = (diff >= 0 ? "+" : "") + diff.toFixed(1);
  }

  const unit = AppState.metricTypes[metricType]?.unit || "";

  return {
    current: `${current} ${unit}`,
    average: `${average} ${unit}`,
    highest: `${highest} ${unit}`,
    lowest: `${lowest} ${unit}`,
    change,
    total: entries.length
  };
}

function renderMetrics() {
  const metricType = AppState.currentMetricType;
  const stats = getMetricStats(metricType);

  // Update stats
  document.getElementById("currentMetricValue").textContent = stats.current;
  document.getElementById("avgMetricValue").textContent = stats.average;
  document.getElementById("highMetricValue").textContent = stats.highest;
  document.getElementById("lowMetricValue").textContent = stats.lowest;
  document.getElementById("changeMetricValue").textContent = stats.change;
  document.getElementById("totalMetricEntries").textContent = stats.total;

  // Render chart
  renderMetricChart();

  // Render entries list
  renderMetricEntries();
}

function renderMetricChart() {
  const canvas = document.getElementById("metricChart");
  const ctx = canvas.getContext("2d");
  const metricType = AppState.currentMetricType;
  const timeframe = AppState.currentMetricTimeframe;

  // Set canvas size
  canvas.width = canvas.offsetWidth;
  canvas.height = 300;

  const width = canvas.width;
  const height = canvas.height;
  const padding = 50;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Get data
  let entries = AppState.metrics
    .filter(m => m.type === metricType)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (timeframe !== "all") {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeframe);
    entries = entries.filter(e => new Date(e.date) >= cutoffDate);
  }

  if (entries.length === 0) {
    // Show empty state
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
    ctx.font = "16px Inter";
    ctx.textAlign = "center";
    ctx.fillText("No data available", width / 2, height / 2);
    return;
  }

  const values = entries.map(e => e.value);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const valueRange = maxValue - minValue || 1;

  // Draw axes
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  ctx.strokeStyle = isDark ? "#2d2d2d" : "#e9ecef";
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();

  // Draw line
  ctx.strokeStyle = "#667eea";
  ctx.lineWidth = 3;
  ctx.beginPath();

  entries.forEach((entry, index) => {
    const x = padding + (index / Math.max(entries.length - 1, 1)) * (width - 2 * padding);
    const y = height - padding - ((entry.value - minValue) / valueRange) * (height - 2 * padding);

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();

  // Draw points
  ctx.fillStyle = "#667eea";
  entries.forEach((entry, index) => {
    const x = padding + (index / Math.max(entries.length - 1, 1)) * (width - 2 * padding);
    const y = height - padding - ((entry.value - minValue) / valueRange) * (height - 2 * padding);

    ctx.beginPath();
    ctx.arc(x, y, 4, 0, 2 * Math.PI);
    ctx.fill();
  });

  // Draw labels
  ctx.fillStyle = isDark ? "#adb5bd" : "#6c757d";
  ctx.font = "12px Inter";
  ctx.textAlign = "center";

  // X-axis labels (dates)
  const labelInterval = Math.max(1, Math.floor(entries.length / 5));
  entries.forEach((entry, index) => {
    if (index % labelInterval === 0 || index === entries.length - 1) {
      const x = padding + (index / Math.max(entries.length - 1, 1)) * (width - 2 * padding);
      const date = new Date(entry.date);
      ctx.fillText(`${date.getMonth() + 1}/${date.getDate()}`, x, height - padding + 20);
    }
  });

  // Y-axis label
  ctx.textAlign = "right";
  const unit = AppState.metricTypes[metricType]?.unit || "";
  ctx.fillText(`${AppState.metricTypes[metricType]?.name || metricType} (${unit})`, padding - 10, padding - 10);

  // Value labels on Y-axis
  ctx.textAlign = "right";
  for (let i = 0; i <= 4; i++) {
    const value = minValue + (valueRange * i / 4);
    const y = height - padding - (i / 4) * (height - 2 * padding);
    ctx.fillText(value.toFixed(1), padding - 10, y + 5);
  }
}

function renderMetricEntries() {
  const container = document.getElementById("metricEntriesList");
  const metricType = AppState.currentMetricType;
  
  const entries = AppState.metrics
    .filter(m => m.type === metricType)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 20);

  if (entries.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 3v18h18"></path>
          <path d="M18 17V9"></path>
          <path d="M13 17V5"></path>
          <path d="M8 17v-3"></path>
        </svg>
        <h3>No entries yet</h3>
        <p>Start tracking by adding your first entry</p>
      </div>
    `;
    return;
  }

  const unit = AppState.metricTypes[metricType]?.unit || "";

  container.innerHTML = entries.map(entry => `
    <div class="metric-entry-card">
      <div class="metric-entry-info">
        <div class="metric-entry-date">${new Date(entry.date).toLocaleDateString()}</div>
        ${entry.notes ? `<div class="metric-entry-notes">${entry.notes}</div>` : ""}
      </div>
      <div class="metric-entry-value">${entry.value} ${unit}</div>
      <div class="metric-entry-actions">
        <button class="metric-entry-delete" onclick="deleteMetricEntry('${entry.id}')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>
  `).join("");
}

// ============================================
// FILTERS
// ============================================
function initializeFilters() {
  document.querySelectorAll(".filter-tab").forEach((tab) => {
    tab.addEventListener("click", (e) => {
      const filter = e.target.getAttribute("data-filter");
      const parent = e.target.parentElement;

      parent
        .querySelectorAll(".filter-tab")
        .forEach((t) => t.classList.remove("active"));
      e.target.classList.add("active");

      // Determine which view we're in
      if (document.getElementById("goals").classList.contains("active")) {
        AppState.currentFilter.goals = filter;
        renderGoals();
      } else if (
        document.getElementById("tasks").classList.contains("active")
      ) {
        AppState.currentFilter.tasks = filter;
        renderTasks();
      }
    });
  });

  // To-Do Category Filter
  const todoCatFilter = document.getElementById("todoCategoryFilter");
  todoCatFilter.addEventListener("change", (e) => {
    AppState.currentFilter.taskCategory = e.target.value;
    renderTasks();
  });

  // To-Do Sort
  const todoSort = document.getElementById("todoSortSelect");
  todoSort.addEventListener("change", (e) => {
    AppState.currentFilter.taskSort = e.target.value;
    renderTasks();
  });
  
  updateTodoCategoryFilter();
}

function updateTodoCategoryFilter() {
  const select = document.getElementById("todoCategoryFilter");
  if (!select) return;
  const current = select.value || "all";
  
  select.innerHTML = '<option value="all">All Categories</option>';
  Object.keys(AppState.taskCategories).forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = `${AppState.taskCategories[cat].emoji} ${cat}`;
    select.appendChild(opt);
  });
  
  select.value = current;
}

// ============================================
// GOAL FUNCTIONS
// ============================================
function completeGoal(goalId) {
  const goal = AppState.goals.find((g) => g.id === goalId);
  const today = new Date().toISOString().split("T")[0];

  if (!goal.history) goal.history = [];

  const todayEntry = goal.history.find((h) => h.date === today);

  if (goal.type === "binary") {
    if (todayEntry) {
      // Remove completion
      goal.history = goal.history.filter((h) => h.date !== today);
    } else {
      // Add completion
      goal.history.push({ date: today, value: 1 });
    }
  }

  saveData();
  updateAllViews();
}

function openProgressModal(goalId) {
  const goal = AppState.goals.find((g) => g.id === goalId);
  const today = new Date().toISOString().split("T")[0];
  const todayEntry = goal.history?.find((h) => h.date === today);
  const currentValue = todayEntry?.value || 0;

  document.getElementById("progressModalTitle").textContent = goal.name;
  document.getElementById(
    "progressCurrentValue"
  ).textContent = `Current: ${currentValue} ${goal.unit || ""}`;
  document.getElementById("progressTargetValue").textContent = `Target: ${
    goal.target
  } ${goal.unit || ""}`;
  document.getElementById("progressInput").value = currentValue;
  document.getElementById("progressInput").max = goal.target * 2; // Allow overage

  const saveBtn = document.getElementById("saveProgress");
  saveBtn.onclick = () => {
    const newValue = parseInt(document.getElementById("progressInput").value);
    updateGoalProgress(goalId, newValue);
    closeModal("goalProgressModal");
  };

  openModal("goalProgressModal");
}

function updateGoalProgress(goalId, value) {
  const goal = AppState.goals.find((g) => g.id === goalId);
  const today = new Date().toISOString().split("T")[0];

  if (!goal.history) goal.history = [];

  const todayIndex = goal.history.findIndex((h) => h.date === today);

  if (todayIndex >= 0) {
    goal.history[todayIndex].value = value;
  } else {
    goal.history.push({ date: today, value });
  }

  saveData();
  updateAllViews();
}

function deleteGoal(goalId) {
  if (
    confirm(
      "Are you sure you want to delete this goal? This will remove all historical data."
    )
  ) {
    AppState.goals = AppState.goals.filter((g) => g.id !== goalId);
    saveData();
    updateAllViews();
  }
}

function calculateGoalStats(goal) {
  if (!goal.history || goal.history.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalCompleted: 0,
      missedDays: 0,
      percentSinceYear: 0,
      percentSinceCreation: 0,
    };
  }

  const sortedHistory = [...goal.history].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );
  const today = new Date();
  const yearStart = new Date(today.getFullYear(), 0, 1);
  const creationDate = new Date(goal.createdAt);

  // Calculate streaks
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  const allDates = [];
  let currentDate = new Date(sortedHistory[0].date);
  const lastDate = new Date(sortedHistory[sortedHistory.length - 1].date);

  while (currentDate <= lastDate) {
    allDates.push(currentDate.toISOString().split("T")[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Check for current streak (from today backwards)
  let checkDate = new Date(today);
  while (true) {
    const dateStr = checkDate.toISOString().split("T")[0];
    const entry = goal.history.find((h) => h.date === dateStr);

    if (entry && isGoalCompleted(goal, entry)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Calculate longest streak
  for (const date of allDates) {
    const entry = goal.history.find((h) => h.date === date);
    if (entry && isGoalCompleted(goal, entry)) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  // Total completed days
  const totalCompleted = goal.history.filter((h) =>
    isGoalCompleted(goal, h)
  ).length;

  // Days since year start
  const daysSinceYear =
    Math.floor((today - yearStart) / (1000 * 60 * 60 * 24)) + 1;
  const completedThisYear = goal.history.filter((h) => {
    const hDate = new Date(h.date);
    return hDate >= yearStart && isGoalCompleted(goal, h);
  }).length;
  const percentSinceYear = Math.round(
    (completedThisYear / daysSinceYear) * 100
  );

  // Days since creation
  const daysSinceCreation =
    Math.floor((today - creationDate) / (1000 * 60 * 60 * 24)) + 1;
  const percentSinceCreation = Math.round(
    (totalCompleted / daysSinceCreation) * 100
  );

  return {
    currentStreak,
    longestStreak,
    totalCompleted,
    missedDays: daysSinceCreation - totalCompleted,
    percentSinceYear,
    percentSinceCreation,
  };
}

function isGoalCompleted(goal, entry) {
  if (goal.type === "binary") {
    return entry.value === 1;
  } else {
    return entry.value >= goal.target;
  }
}

function getTodayProgress(goal) {
  const today = new Date().toISOString().split("T")[0];
  const todayEntry = goal.history?.find((h) => h.date === today);

  if (!todayEntry)
    return {
      current: 0,
      target: goal.target || 1,
      percentage: 0,
      completed: false,
    };

  if (goal.type === "binary") {
    return {
      current: todayEntry.value,
      target: 1,
      percentage: todayEntry.value === 1 ? 100 : 0,
      completed: todayEntry.value === 1,
    };
  } else {
    const percentage = Math.min(
      Math.round((todayEntry.value / goal.target) * 100),
      100
    );
    return {
      current: todayEntry.value,
      target: goal.target,
      percentage,
      completed: todayEntry.value >= goal.target,
    };
  }
}

// ============================================
// TASK FUNCTIONS
// ============================================
function toggleTask(taskId) {
  const task = AppState.tasks.find((t) => t.id === taskId);
  task.completed = !task.completed;
  task.completedAt = task.completed ? new Date().toISOString() : null;

  saveData();
  updateAllViews();
}

function deleteTask(taskId) {
  if (confirm("Are you sure you want to delete this to-do?")) {
    AppState.tasks = AppState.tasks.filter((t) => t.id !== taskId);
    saveData();
    updateAllViews();
  }
}

// ============================================
// SPENDING FUNCTIONS
// ============================================
function getSpendingByPeriod(period) {
  const now = new Date();
  let startDate;

  switch (period) {
    case "today":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week":
      const dayOfWeek = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }

  return AppState.expenses
    .filter((e) => new Date(e.date) >= startDate)
    .reduce((sum, e) => sum + e.amount, 0);
}

function getNoSpendDays() {
  const expenses = AppState.expenses;
  const expenseDates = new Set(
    expenses.map((e) => new Date(e.date).toISOString().split("T")[0])
  );

  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const today = new Date();
  const daysSinceYearStart =
    Math.floor((today - yearStart) / (1000 * 60 * 60 * 24)) + 1;

  return daysSinceYearStart - expenseDates.size;
}

function getCategorySpending(category) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  return AppState.expenses
    .filter((e) => e.category === category && new Date(e.date) >= monthStart)
    .reduce((sum, e) => sum + e.amount, 0);
}

// ============================================
// RENDERING FUNCTIONS
// ============================================
function updateAllViews() {
  renderDashboard();
  renderGoals();
  renderTasks();
  renderSpending();
  renderInsights();
  if (AppState.currentView === "settings") renderSettings();
}

function renderDashboard() {
  // Update date
  const dateDisplay = document.getElementById("currentDate");
  const now = new Date();
  dateDisplay.textContent = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Year progress
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear(), 11, 31);
  const totalDays =
    Math.floor((yearEnd - yearStart) / (1000 * 60 * 60 * 24)) + 1;
  const daysPassed = Math.floor((now - yearStart) / (1000 * 60 * 60 * 24)) + 1;
  const daysRemaining = totalDays - daysPassed;
  const yearPercentage = Math.round((daysPassed / totalDays) * 100);

  document.getElementById(
    "yearProgressPercent"
  ).textContent = `${yearPercentage}%`;
  document.getElementById(
    "yearProgressDays"
  ).textContent = `${daysPassed} days completed`;
  document.getElementById(
    "yearProgressRemaining"
  ).textContent = `${daysRemaining} days remaining`;

  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (yearPercentage / 100) * circumference;
  document.getElementById("yearProgressRing").style.strokeDashoffset = offset;

  // Stats
  document.getElementById("activeGoalsCount").textContent =
    AppState.goals.length;
  document.getElementById("pendingTasksCount").textContent =
    AppState.tasks.filter((t) => !t.completed).length;
  document.getElementById(
    "todaySpending"
  ).textContent = formatCurrency(getSpendingByPeriod("today"));

  const bestStreak = Math.max(
    ...AppState.goals.map((g) => calculateGoalStats(g).longestStreak),
    0
  );
  document.getElementById("bestStreak").textContent = bestStreak;

  // Today's goals
  renderTodayGoals();
}

function renderTodayGoals() {
  const container = document.getElementById("todayGoalsList");
  const goals = AppState.goals;

  if (goals.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <circle cx="12" cy="12" r="6"></circle>
                </svg>
                <h3>No goals yet</h3>
                <p>Create your first goal to get started</p>
            </div>
        `;
    return;
  }

  container.innerHTML = goals
    .map((goal) => {
      const progress = getTodayProgress(goal);
      const stats = calculateGoalStats(goal);

      return `
            <div class="goal-card">
                <div class="goal-header">
                    <div>
                        <div class="goal-title">${goal.name}</div>
                        <span class="goal-frequency">${goal.frequency}</span>
                    </div>
                    <div class="goal-actions">
                        <button class="goal-action-btn" onclick="openGoalModal('${
                          goal.id
                        }')" title="Edit">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="goal-action-btn" onclick="deleteGoal('${
                          goal.id
                        }')" title="Delete">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                
                ${
                  goal.type === "quantitative"
                    ? `
                    <div class="goal-progress">
                        <div class="progress-bar-container">
                            <div class="progress-bar" style="width: ${
                              progress.percentage
                            }%"></div>
                        </div>
                        <div class="progress-text">${progress.current} / ${
                        progress.target
                      } ${goal.unit || ""} (${progress.percentage}%)</div>
                    </div>
                    <button class="goal-increment-btn" onclick="openProgressModal('${
                      goal.id
                    }')">
                        Update Progress
                    </button>
                `
                    : `
                    <button class="goal-complete-btn ${
                      progress.completed ? "completed" : ""
                    }" onclick="completeGoal('${goal.id}')">
                        ${
                          progress.completed
                            ? "✓ Completed Today"
                            : "Mark as Complete"
                        }
                    </button>
                `
                }
                
                <div class="goal-stats">
                    <div class="goal-stat">
                        <div class="goal-stat-value">${
                          stats.currentStreak
                        }</div>
                        <div class="goal-stat-label">Current Streak</div>
                    </div>
                    <div class="goal-stat">
                        <div class="goal-stat-value">${
                          stats.longestStreak
                        }</div>
                        <div class="goal-stat-label">Best Streak</div>
                    </div>
                    <div class="goal-stat">
                        <div class="goal-stat-value">${
                          stats.totalCompleted
                        }</div>
                        <div class="goal-stat-label">Total Days</div>
                    </div>
                    <div class="goal-stat">
                        <div class="goal-stat-value">${
                          stats.percentSinceYear
                        }%</div>
                        <div class="goal-stat-label">This Year</div>
                    </div>
                </div>
            </div>
        `;
    })
    .join("");
}

function renderGoals() {
  const container = document.getElementById("goalsList");
  let goals = AppState.goals;

  // Apply filter
  if (AppState.currentFilter.goals !== "all") {
    goals = goals.filter((g) => g.frequency === AppState.currentFilter.goals);
  }

  if (goals.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <circle cx="12" cy="12" r="6"></circle>
                </svg>
                <h3>No goals found</h3>
                <p>Create a new goal to start tracking your progress</p>
            </div>
        `;
    return;
  }

  container.innerHTML = goals
    .map((goal) => {
      const progress = getTodayProgress(goal);
      const stats = calculateGoalStats(goal);

      return `
            <div class="goal-card">
                <div class="goal-header">
                    <div>
                        <div class="goal-title">${goal.name}</div>
                        <span class="goal-frequency">${goal.frequency}</span>
                    </div>
                    <div class="goal-actions">
                        <button class="goal-action-btn" onclick="openGoalModal('${
                          goal.id
                        }')" title="Edit">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="goal-action-btn" onclick="deleteGoal('${
                          goal.id
                        }')" title="Delete">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                
                ${
                  goal.type === "quantitative"
                    ? `
                    <div class="goal-progress">
                        <div class="progress-bar-container">
                            <div class="progress-bar" style="width: ${
                              progress.percentage
                            }%"></div>
                        </div>
                        <div class="progress-text">${progress.current} / ${
                        progress.target
                      } ${goal.unit || ""} (${progress.percentage}%)</div>
                    </div>
                    <button class="goal-increment-btn" onclick="openProgressModal('${
                      goal.id
                    }')">
                        Update Progress
                    </button>
                `
                    : `
                    <button class="goal-complete-btn ${
                      progress.completed ? "completed" : ""
                    }" onclick="completeGoal('${goal.id}')">
                        ${
                          progress.completed
                            ? "✓ Completed Today"
                            : "Mark as Complete"
                        }
                    </button>
                `
                }
                
                <div class="goal-stats">
                    <div class="goal-stat">
                        <div class="goal-stat-value">${
                          stats.currentStreak
                        }</div>
                        <div class="goal-stat-label">Current Streak</div>
                    </div>
                    <div class="goal-stat">
                        <div class="goal-stat-value">${
                          stats.longestStreak
                        }</div>
                        <div class="goal-stat-label">Best Streak</div>
                    </div>
                    <div class="goal-stat">
                        <div class="goal-stat-value">${
                          stats.totalCompleted
                        }</div>
                        <div class="goal-stat-label">Total Days</div>
                    </div>
                    <div class="goal-stat">
                        <div class="goal-stat-value">${
                          stats.percentSinceYear
                        }%</div>
                        <div class="goal-stat-label">This Year</div>
                    </div>
                </div>
            </div>
        `;
    })
    .join("");
}

function renderTasks() {
  const container = document.getElementById("tasksList");
  let tasks = [...AppState.tasks];

  // Apply Status filter
  if (AppState.currentFilter.tasks === "pending") {
    tasks = tasks.filter((t) => !t.completed);
  } else if (AppState.currentFilter.tasks === "completed") {
    tasks = tasks.filter((t) => t.completed);
  }
  
  // Apply Category filter
  if (AppState.currentFilter.taskCategory !== "all") {
    tasks = tasks.filter(t => t.category === AppState.currentFilter.taskCategory);
  }

  // Sort
  const sortProp = AppState.currentFilter.taskSort;
  tasks.sort((a, b) => {
    if (sortProp === "dueDate") {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    } else {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });

  if (tasks.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 11 12 14 22 4"></polyline>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                </svg>
                <h3>No to-dos found</h3>
                <p>Add a new to-do to get organized</p>
            </div>
        `;
    return;
  }

  container.innerHTML = tasks
    .map(
      (task) => {
        const cat = AppState.taskCategories[task.category] || { color: "#94a3b8", emoji: "📝" };
        return `
        <div class="task-card ${task.completed ? "completed" : ""}" onclick="openTaskModal('${task.id}')">
            <div class="task-checkbox ${
              task.completed ? "checked" : ""
            }" onclick="event.stopPropagation(); toggleTask('${task.id}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            </div>
            <div class="task-content">
                <div class="task-name">
                  <span class="category-tag" style="background: ${cat.color}">
                    ${cat.emoji} ${task.category}
                  </span>
                  ${task.name}
                </div>
                ${task.description ? `<span class="task-description-text">${task.description}</span>` : ""}
                <div class="task-meta">
                    ${
                      task.dueDate
                        ? `
                        <span class="task-due-date">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            ${new Date(task.dueDate).toLocaleDateString()}
                        </span>
                    `
                        : ""
                    }
                    ${
                      task.repeating
                        ? `
                        <span class="task-category">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="23 4 23 10 17 10"></polyline>
                                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                            </svg>
                            Daily
                        </span>
                    `
                        : ""
                    }
                </div>
            </div>
            <button class="task-delete" onclick="event.stopPropagation(); deleteTask('${task.id}')">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>
        </div>
    `;
      }
    )
    .join("");
}

function renderSpending() {
  // Update summary
  document.getElementById(
    "spendingToday"
  ).textContent = formatCurrency(getSpendingByPeriod("today"));
  document.getElementById("spendingWeek").textContent = formatCurrency(getSpendingByPeriod(
    "week"
  ));
  document.getElementById(
    "spendingMonth"
  ).textContent = formatCurrency(getSpendingByPeriod("month"));
  document.getElementById("noSpendDays").textContent = getNoSpendDays();

  // Category budgets
  const categoriesContainer = document.getElementById("categoryBudgetsList");
  const categories = Object.keys(AppState.categoryBudgets);

  categoriesContainer.innerHTML = categories
    .map((category) => {
      const spent = getCategorySpending(category);
      const budget = AppState.categoryBudgets[category];
      const percentage = Math.min(Math.round((spent / budget) * 100), 100);

      return `
            <div class="category-item" onclick="openCategoryDetails('${category}')">
                <div class="category-header">
                    <span class="category-name">${
                      category.charAt(0).toUpperCase() + category.slice(1)
                    }</span>
                    <div>
                        <span class="category-amount">${formatCurrency(spent)}</span>
                        <span class="category-budget"> / ${formatCurrency(budget)}</span>
                    </div>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${percentage}%; background: ${
        percentage > 90 ? "var(--gradient-danger)" : "var(--gradient-success)"
      }"></div>
                </div>
            </div>
        `;
    })
    .join("");

  // Recent expenses
  const expensesContainer = document.getElementById("expensesList");
  const recentExpenses = [...AppState.expenses]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

  if (recentExpenses.length === 0) {
    expensesContainer.innerHTML = `
            <div class="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="1" x2="12" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                <h3>No expenses yet</h3>
                <p>Start tracking your spending</p>
            </div>
        `;
  } else {
    expensesContainer.innerHTML = recentExpenses
      .map(
        (expense) => `
          <div class="expense-card" onclick="openExpenseModal('${expense.id}')">
              <div class="expense-info">
                  <div class="expense-description">${
                    expense.description || expense.category
                  }</div>
                  <div class="expense-meta">
                      ${expense.category} • ${new Date(
          expense.date
        ).toLocaleDateString()}
                  </div>
              </div>
              <div class="expense-amount">${formatCurrency(expense.amount)}</div>
          </div>
      `
      )
      .join("");
  }

  renderSpendingChart();
}

function renderSpendingChart() {
  const canvas = document.getElementById("spendingChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  canvas.width = canvas.offsetWidth;
  canvas.height = 200;

  const width = canvas.width;
  const height = canvas.height;
  const padding = 30;

  ctx.clearRect(0, 0, width, height);

  // Get last 7 days spending
  const days = 7;
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const spent = AppState.expenses
          .filter(e => e.date.split('T')[0] === dateStr)
          .reduce((sum, e) => sum + e.amount, 0);
      data.push({ date: dateStr, value: spent });
  }

  const maxValue = Math.max(...data.map(d => d.value), 10);
  const isDark = AppState.settings.theme === "dark";

  // Draw chart
  ctx.strokeStyle = isDark ? "#2d2d2d" : "#e9ecef";
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();

  // Draw line
  ctx.strokeStyle = "#6366f1";
  ctx.lineWidth = 3;
  ctx.beginPath();
  data.forEach((d, i) => {
      const x = padding + (i / (days - 1)) * (width - 2 * padding);
      const y = height - padding - (d.value / maxValue) * (height - 2 * padding);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Labels
  ctx.fillStyle = isDark ? "#adb5bd" : "#6c757d";
  ctx.font = "10px Inter";
  ctx.textAlign = "center";
  data.forEach((d, i) => {
      const x = padding + (i / (days - 1)) * (width - 2 * padding);
      const date = new Date(d.date);
      ctx.fillText(`${date.getMonth()+1}/${date.getDate()}`, x, height - 10);
  });
}

function openCategoryDetails(category) {
    const expenses = AppState.expenses.filter(e => e.category === category)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    const spent = expenses.reduce((sum, e) => sum + e.amount, 0);
    const budget = AppState.categoryBudgets[category];

    document.getElementById("categoryDetailsTitle").textContent = category.charAt(0).toUpperCase() + category.slice(1);
    document.getElementById("categorySpentValue").textContent = formatCurrency(spent);
    document.getElementById("categoryBudgetValue").textContent = formatCurrency(budget);
    document.getElementById("categoryRemainingValue").textContent = formatCurrency(budget - spent);

    const list = document.getElementById("categoryExpensesList");
    if (expenses.length === 0) {
        list.innerHTML = `<p class="empty-state">No expenses in this category</p>`;
    } else {
        list.innerHTML = expenses.map(e => `
            <div class="category-expense-item">
                <span>${e.description || 'No description'}</span>
                <strong>${formatCurrency(e.amount)}</strong>
                <small>${new Date(e.date).toLocaleDateString()}</small>
            </div>
        `).join("");
    }

    openModal("categoryDetailsModal");
}

function renderSettings() {
    const container = document.getElementById("settings");
    
    // Set current values
    document.getElementById("darkModeToggle").checked = AppState.settings.theme === "dark";
    document.getElementById("currencySelect").value = AppState.settings.currency;
    document.getElementById("weightUnitSelect").value = AppState.settings.weightUnit;

    // Add event listeners (if not already added)
    const darkModeToggle = document.getElementById("darkModeToggle");
    darkModeToggle.onchange = (e) => {
        AppState.settings.theme = e.target.checked ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", AppState.settings.theme);
        saveData();
    };

    const currencySelect = document.getElementById("currencySelect");
    currencySelect.onchange = (e) => {
        AppState.settings.currency = e.target.value;
        saveData();
        updateAllViews();
    };

    const weightUnitSelect = document.getElementById("weightUnitSelect");
    weightUnitSelect.onchange = (e) => {
        AppState.settings.weightUnit = e.target.value;
        AppState.metricTypes.weight.unit = e.target.value;
        saveData();
        updateAllViews();
    };

    const clearDataBtn = document.getElementById("clearDataBtn");
    clearDataBtn.onclick = () => {
        if (confirm("Are you sure you want to clear ALL data? This cannot be undone.")) {
            localStorage.clear();
            location.reload();
        }
    };
}

function formatCurrency(amount) {
    const currencies = {
        USD: { symbol: "$", pos: "before" },
        EUR: { symbol: "€", pos: "before" },
        GBP: { symbol: "£", pos: "before" },
        JPY: { symbol: "¥", pos: "before" },
        NGN: { symbol: "₦", pos: "before" },
    };
    const c = currencies[AppState.settings.currency] || currencies.USD;
    return c.pos === "before" ? `${c.symbol}${amount.toFixed(2)}` : `${amount.toFixed(2)}${c.symbol}`;
}

function renderInsights() {
  renderWeeklySummary();
  renderHeatmap();
  renderProgressChart();
}

function renderWeeklySummary() {
  const container = document.getElementById("weeklySummary");
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const goalsCompleted = AppState.goals.reduce((sum, goal) => {
    const weekEntries =
      goal.history?.filter((h) => {
        const date = new Date(h.date);
        return date >= weekStart && isGoalCompleted(goal, h);
      }) || [];
    return sum + weekEntries.length;
  }, 0);

  const tasksCompleted = AppState.tasks.filter((t) => {
    if (!t.completed || !t.completedAt) return false;
    return new Date(t.completedAt) >= weekStart;
  }).length;

  const weekSpending = getSpendingByPeriod("week");

  container.innerHTML = `
        <div class="summary-item">
            <span class="summary-label">Goals Completed</span>
            <span class="summary-value">${goalsCompleted}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Tasks Completed</span>
            <span class="summary-value">${tasksCompleted}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Total Spending</span>
            <span class="summary-value">$${weekSpending.toFixed(2)}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Active Streaks</span>
            <span class="summary-value">${
              AppState.goals.filter(
                (g) => calculateGoalStats(g).currentStreak > 0
              ).length
            }</span>
        </div>
    `;
}

function renderHeatmap() {
  const container = document.getElementById("activityHeatmap");
  const days = 35; // 5 weeks
  const cells = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    // Calculate activity level
    const goalsCompleted = AppState.goals.filter((g) => {
      const entry = g.history?.find((h) => h.date === dateStr);
      return entry && isGoalCompleted(g, entry);
    }).length;

    const level =
      goalsCompleted === 0 ? 0 : Math.min(Math.ceil(goalsCompleted / 2), 4);

    cells.push(
      `<div class="heatmap-cell level-${level}" title="${dateStr}: ${goalsCompleted} goals"></div>`
    );
  }

  container.innerHTML = cells.join("");
}

function renderProgressChart() {
  const canvas = document.getElementById("progressChart");
  const ctx = canvas.getContext("2d");

  // Set canvas size
  canvas.width = canvas.offsetWidth;
  canvas.height = 300;

  const width = canvas.width;
  const height = canvas.height;
  const padding = 40;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Get data for last 30 days
  const days = 30;
  const data = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    const completed = AppState.goals.filter((g) => {
      const entry = g.history?.find((h) => h.date === dateStr);
      return entry && isGoalCompleted(g, entry);
    }).length;

    data.push({ date: dateStr, value: completed });
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  // Draw axes
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  ctx.strokeStyle = isDark ? "#2d2d2d" : "#e9ecef";
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();

  // Draw line
  ctx.strokeStyle = "#667eea";
  ctx.lineWidth = 2;
  ctx.beginPath();

  data.forEach((point, index) => {
    const x = padding + (index / (days - 1)) * (width - 2 * padding);
    const y =
      height - padding - (point.value / maxValue) * (height - 2 * padding);

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();

  // Draw points
  ctx.fillStyle = "#667eea";
  data.forEach((point, index) => {
    const x = padding + (index / (days - 1)) * (width - 2 * padding);
    const y =
      height - padding - (point.value / maxValue) * (height - 2 * padding);

    ctx.beginPath();
    ctx.arc(x, y, 3, 0, 2 * Math.PI);
    ctx.fill();
  });

  // Draw labels
  ctx.fillStyle = isDark ? "#adb5bd" : "#6c757d";
  ctx.font = "12px Inter";
  ctx.textAlign = "center";

  // X-axis labels (every 7 days)
  for (let i = 0; i < days; i += 7) {
    const x = padding + (i / (days - 1)) * (width - 2 * padding);
    const date = new Date(data[i].date);
    ctx.fillText(
      `${date.getMonth() + 1}/${date.getDate()}`,
      x,
      height - padding + 20
    );
  }

  // Y-axis label
  ctx.textAlign = "right";
  ctx.fillText("Goals Completed", padding - 10, padding - 10);
}

// ============================================
// DATA EXPORT
// ============================================
function exportData() {
  const data = {
    goals: AppState.goals,
    tasks: AppState.tasks,
    expenses: AppState.expenses,
    exportDate: new Date().toISOString(),
  };

  // Create CSV for goals
  let goalsCSV =
    "Goal Name,Type,Frequency,Created,Total Completed,Current Streak,Longest Streak\n";
  AppState.goals.forEach((goal) => {
    const stats = calculateGoalStats(goal);
    goalsCSV += `"${goal.name}",${goal.type},${goal.frequency},${goal.createdAt},${stats.totalCompleted},${stats.currentStreak},${stats.longestStreak}\n`;
  });

  // Create CSV for tasks
  let tasksCSV = "Task Name,Category,Due Date,Completed,Created\n";
  AppState.tasks.forEach((task) => {
    tasksCSV += `"${task.name}","${task.category || ""}","${
      task.dueDate || ""
    }",${task.completed},${task.createdAt}\n`;
  });

  // Create CSV for expenses
  let expensesCSV = "Amount,Category,Description,Date\n";
  AppState.expenses.forEach((expense) => {
    expensesCSV += `${expense.amount},"${expense.category}","${
      expense.description || ""
    }",${expense.date}\n`;
  });

  // Download files
  downloadCSV(goalsCSV, "goals.csv");
  downloadCSV(tasksCSV, "tasks.csv");
  downloadCSV(expensesCSV, "expenses.csv");

  // Also download JSON backup
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "life-tracker-backup.json";
  a.click();
}

function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

// ============================================
// SAMPLE DATA
// ============================================
function addSampleData() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  // Sample goals
  AppState.goals = [
    {
      id: "1",
      name: "Drink 3L Water",
      type: "quantitative",
      target: 3,
      unit: "L",
      frequency: "daily",
      createdAt: twoDaysAgo.toISOString(),
      history: [
        { date: twoDaysAgo.toISOString().split("T")[0], value: 3 },
        { date: yesterday.toISOString().split("T")[0], value: 2.5 },
        { date: today.toISOString().split("T")[0], value: 1.5 },
      ],
    },
    {
      id: "2",
      name: "Morning Meditation",
      type: "binary",
      frequency: "daily",
      createdAt: twoDaysAgo.toISOString(),
      history: [
        { date: twoDaysAgo.toISOString().split("T")[0], value: 1 },
        { date: yesterday.toISOString().split("T")[0], value: 1 },
      ],
    },
    {
      id: "3",
      name: "Exercise 30 Minutes",
      type: "binary",
      frequency: "daily",
      createdAt: twoDaysAgo.toISOString(),
      history: [{ date: twoDaysAgo.toISOString().split("T")[0], value: 1 }],
    },
    {
      id: "4",
      name: "Read 50 Pages",
      type: "quantitative",
      target: 50,
      unit: "pages",
      frequency: "weekly",
      createdAt: twoDaysAgo.toISOString(),
      history: [
        { date: twoDaysAgo.toISOString().split("T")[0], value: 20 },
        { date: yesterday.toISOString().split("T")[0], value: 15 },
      ],
    },
  ];

  // Sample tasks
  AppState.tasks = [
    {
      id: "1",
      name: "Review project proposal",
      category: "Work",
      dueDate: today.toISOString().split("T")[0],
      repeating: false,
      completed: false,
      createdAt: yesterday.toISOString(),
    },
    {
      id: "2",
      name: "Buy groceries",
      category: "Personal",
      dueDate: "",
      repeating: false,
      completed: false,
      createdAt: yesterday.toISOString(),
    },
    {
      id: "3",
      name: "Call dentist",
      category: "Health",
      dueDate: "",
      repeating: false,
      completed: true,
      completedAt: today.toISOString(),
      createdAt: twoDaysAgo.toISOString(),
    },
  ];

  // Sample expenses
  AppState.expenses = [
    {
      id: "1",
      amount: 45.5,
      category: "food",
      description: "Grocery shopping",
      date: today.toISOString(),
    },
    {
      id: "2",
      amount: 12.0,
      category: "transport",
      description: "Uber ride",
      date: today.toISOString(),
    },
    {
      id: "3",
      amount: 89.99,
      category: "shopping",
      description: "New shoes",
      date: yesterday.toISOString(),
    },
    {
      id: "4",
      amount: 25.0,
      category: "entertainment",
      description: "Movie tickets",
      date: yesterday.toISOString(),
    },
  ];

  // Sample metrics
  AppState.metrics = [
    {
      id: "1",
      type: "weight",
      value: 185.5,
      date: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: "Morning weight",
      createdAt: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "2",
      type: "weight",
      value: 184.8,
      date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: "",
      createdAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "3",
      type: "weight",
      value: 185.2,
      date: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: "",
      createdAt: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "4",
      type: "weight",
      value: 184.5,
      date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: "Feeling good",
      createdAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "5",
      type: "weight",
      value: 184.0,
      date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: "",
      createdAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "6",
      type: "weight",
      value: 183.8,
      date: yesterday.toISOString().split('T')[0],
      notes: "",
      createdAt: yesterday.toISOString(),
    },
    {
      id: "7",
      type: "weight",
      value: 183.5,
      date: today.toISOString().split('T')[0],
      notes: "New low!",
      createdAt: today.toISOString(),
    },
  ];

  saveData();
}
