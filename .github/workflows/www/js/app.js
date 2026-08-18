(function () {
    "use strict";

    var STORAGE_KEY = "homework_tasks_v1";

    var state = {
        tasks: [],
        statusFilter: "all",
        categoryFilter: "all",
        sortBy: "dueDate"
    };

    var els = {};

    function cacheEls() {
        els.todayDate = document.getElementById("todayDate");
        els.statTotal = document.getElementById("statTotal");
        els.statActive = document.getElementById("statActive");
        els.statDone = document.getElementById("statDone");
        els.statOverdue = document.getElementById("statOverdue");
        els.statusFilters = document.getElementById("statusFilters");
        els.categoryFilter = document.getElementById("categoryFilter");
        els.sortSelect = document.getElementById("sortSelect");
        els.taskList = document.getElementById("taskList");
        els.emptyState = document.getElementById("emptyState");
        els.fabAdd = document.getElementById("fabAdd");
        els.taskModal = document.getElementById("taskModal");
        els.modalBackdrop = els.taskModal.querySelector(".modal-backdrop");
        els.modalTitle = document.getElementById("modalTitle");
        els.modalClose = document.getElementById("modalClose");
        els.taskForm = document.getElementById("taskForm");
        els.taskId = document.getElementById("taskId");
        els.taskTitle = document.getElementById("taskTitle");
        els.taskNotes = document.getElementById("taskNotes");
        els.taskCategory = document.getElementById("taskCategory");
        els.taskPriority = document.getElementById("taskPriority");
        els.taskDueDate = document.getElementById("taskDueDate");
        els.taskDueTime = document.getElementById("taskDueTime");
        els.deleteTaskBtn = document.getElementById("deleteTaskBtn");
    }

    function uid() {
        return "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    function loadTasks() {
        try {
            var raw = window.localStorage.getItem(STORAGE_KEY);
            state.tasks = raw ? JSON.parse(raw) : [];
        } catch (e) {
            state.tasks = [];
        }
    }

    function saveTasks() {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
        } catch (e) {
            /* storage unavailable - fail silently, app still works in-memory */
        }
    }

    function getDueTimestamp(task) {
        if (!task.dueDate) return null;
        var t = task.dueTime ? task.dueTime : "23:59";
        var iso = task.dueDate + "T" + t + ":00";
        var d = new Date(iso);
        return isNaN(d.getTime()) ? null : d.getTime();
    }

    function isOverdue(task) {
        if (task.completed) return false;
        var ts = getDueTimestamp(task);
        if (ts === null) return false;
        return ts < Date.now();
    }

    function formatDueLabel(task) {
        if (!task.dueDate) return null;
        var parts = task.dueDate.split("-");
        var label = parts[1] + "/" + parts[2] + "/" + parts[0];
        if (task.dueTime) label += " " + task.dueTime;
        return label;
    }

    function renderStats() {
        var total = state.tasks.length;
        var done = state.tasks.filter(function (t) { return t.completed; }).length;
        var overdue = state.tasks.filter(isOverdue).length;
        els.statTotal.textContent = total;
        els.statActive.textContent = total - done;
        els.statDone.textContent = done;
        els.statOverdue.textContent = overdue;
    }

    function priorityRank(p) {
        if (p === "high") return 0;
        if (p === "medium") return 1;
        return 2;
    }

    function getFilteredSortedTasks() {
        var list = state.tasks.slice();

        if (state.statusFilter === "active") {
            list = list.filter(function (t) { return !t.completed; });
        } else if (state.statusFilter === "completed") {
            list = list.filter(function (t) { return t.completed; });
        } else if (state.statusFilter === "overdue") {
            list = list.filter(isOverdue);
        }

        if (state.categoryFilter !== "all") {
            list = list.filter(function (t) { return t.category === state.categoryFilter; });
        }

        list.sort(function (a, b) {
            if (state.sortBy === "priority") {
                return priorityRank(a.priority) - priorityRank(b.priority);
            }
            if (state.sortBy === "created") {
                return b.createdAt - a.createdAt;
            }
            if (state.sortBy === "alpha") {
                return a.title.localeCompare(b.title);
            }
            var ad = getDueTimestamp(a);
            var bd = getDueTimestamp(b);
            if (ad === null && bd === null) return b.createdAt - a.createdAt;
            if (ad === null) return 1;
            if (bd === null) return -1;
            return ad - bd;
        });

        return list;
    }

    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text !== undefined) e.textContent = text;
        return e;
    }

    function renderTaskItem(task) {
        var li = el("li", "task-item" + (task.completed ? " completed" : ""));
        li.dataset.id = task.id;

        var checkbox = el("button", "task-checkbox" + (task.completed ? " checked" : ""));
        checkbox.setAttribute("aria-label", "Toggle complete");
        checkbox.addEventListener("click", function (ev) {
            ev.stopPropagation();
            toggleComplete(task.id);
        });

        var body = el("div", "task-body");
        var title = el("div", "task-title", task.title);
        body.appendChild(title);

        var meta = el("div", "task-meta");

        var catBadge = el("span", "badge", task.category);
        meta.appendChild(catBadge);

        var prBadge = el("span", "badge priority-" + task.priority, task.priority);
        meta.appendChild(prBadge);

        var dueLabel = formatDueLabel(task);
        if (dueLabel) {
            var overdue = isOverdue(task);
            var dueBadge = el("span", "badge" + (overdue ? " overdue" : ""), (overdue ? "Overdue: " : "Due: ") + dueLabel);
            meta.appendChild(dueBadge);
        }

        body.appendChild(meta);

        if (task.notes) {
            var notes = el("div", "task-notes", task.notes);
            body.appendChild(notes);
        }

        li.appendChild(checkbox);
        li.appendChild(body);

        li.addEventListener("click", function () {
            openModalForEdit(task);
        });

        return li;
    }

    function render() {
        renderStats();
        var list = getFilteredSortedTasks();
        els.taskList.innerHTML = "";

        if (list.length === 0) {
            els.emptyState.classList.remove("hidden");
        } else {
            els.emptyState.classList.add("hidden");
            var frag = document.createDocumentFragment();
            list.forEach(function (task) {
                frag.appendChild(renderTaskItem(task));
            });
            els.taskList.appendChild(frag);
        }
    }

    function toggleComplete(id) {
        var task = state.tasks.find(function (t) { return t.id === id; });
        if (!task) return;
        task.completed = !task.completed;
        task.completedAt = task.completed ? Date.now() : null;
        saveTasks();
        render();
    }

    function openModalForCreate() {
        els.modalTitle.textContent = "New Task";
        els.taskForm.reset();
        els.taskId.value = "";
        els.taskPriority.value = "medium";
        els.deleteTaskBtn.classList.add("hidden");
        showModal();
    }

    function openModalForEdit(task) {
        els.modalTitle.textContent = "Edit Task";
        els.taskId.value = task.id;
        els.taskTitle.value = task.title;
        els.taskNotes.value = task.notes || "";
        els.taskCategory.value = task.category;
        els.taskPriority.value = task.priority;
        els.taskDueDate.value = task.dueDate || "";
        els.taskDueTime.value = task.dueTime || "";
        els.deleteTaskBtn.classList.remove("hidden");
        showModal();
    }

    function showModal() {
        els.taskModal.classList.remove("hidden");
    }

    function hideModal() {
        els.taskModal.classList.add("hidden");
    }

    function handleFormSubmit(ev) {
        ev.preventDefault();
        var title = els.taskTitle.value.trim();
        if (!title) return;

        var id = els.taskId.value;
        var dueDate = els.taskDueDate.value || null;
        var dueTime = els.taskDueTime.value || null;

        if (id) {
            var task = state.tasks.find(function (t) { return t.id === id; });
            if (task) {
                task.title = title;
                task.notes = els.taskNotes.value.trim();
                task.category = els.taskCategory.value;
                task.priority = els.taskPriority.value;
                task.dueDate = dueDate;
                task.dueTime = dueTime;
            }
        } else {
            state.tasks.push({
                id: uid(),
                title: title,
                notes: els.taskNotes.value.trim(),
                category: els.taskCategory.value,
                priority: els.taskPriority.value,
                dueDate: dueDate,
                dueTime: dueTime,
                completed: false,
                createdAt: Date.now(),
                completedAt: null
            });
        }

        saveTasks();
        hideModal();
        render();
    }

    function handleDelete() {
        var id = els.taskId.value;
        if (!id) return;
        state.tasks = state.tasks.filter(function (t) { return t.id !== id; });
        saveTasks();
        hideModal();
        render();
    }

    function setStatusFilter(status) {
        state.statusFilter = status;
        var buttons = els.statusFilters.querySelectorAll(".filter-btn");
        buttons.forEach(function (btn) {
            btn.classList.toggle("active", btn.dataset.status === status);
        });
        render();
    }

    function renderTodayDate() {
        var d = new Date();
        var options = { weekday: "long", month: "short", day: "numeric" };
        els.todayDate.textContent = d.toLocaleDateString(undefined, options);
    }

    function bindEvents() {
        els.fabAdd.addEventListener("click", openModalForCreate);
        els.modalClose.addEventListener("click", hideModal);
        els.modalBackdrop.addEventListener("click", hideModal);
        els.taskForm.addEventListener("submit", handleFormSubmit);
        els.deleteTaskBtn.addEventListener("click", handleDelete);

        els.statusFilters.addEventListener("click", function (ev) {
            var btn = ev.target.closest(".filter-btn");
            if (!btn) return;
            setStatusFilter(btn.dataset.status);
        });

        els.categoryFilter.addEventListener("change", function () {
            state.categoryFilter = els.categoryFilter.value;
            render();
        });

        els.sortSelect.addEventListener("change", function () {
            state.sortBy = els.sortSelect.value;
            render();
        });

        document.addEventListener("backbutton", function (ev) {
            if (!els.taskModal.classList.contains("hidden")) {
                ev.preventDefault();
                hideModal();
            }
        }, false);
    }

    function init() {
        cacheEls();
        renderTodayDate();
        loadTasks();
        bindEvents();
        render();
    }

    document.addEventListener("deviceready", init, false);

    if (window.cordova === undefined) {
        document.addEventListener("DOMContentLoaded", init, false);
    }
})();
