const API_BASE = "/api/opportunities";

const grid             = document.getElementById("opportunitiesGrid");
const emptyState       = document.getElementById("emptyState");
const searchInput      = document.getElementById("searchInput");
const filterStatus     = document.getElementById("filterStatus");
const filterDept       = document.getElementById("filterDept");
const addBtn           = document.getElementById("addBtn");
const headerStats      = document.getElementById("headerStats");
const modalOverlay     = document.getElementById("modalOverlay");
const modalTitle       = document.getElementById("modalTitle");
const modalClose       = document.getElementById("modalClose");
const form             = document.getElementById("opportunityForm");
const editIdInput      = document.getElementById("editId");
const submitBtn        = document.getElementById("submitBtn");
const cancelBtn        = document.getElementById("cancelBtn");
const deleteOverlay    = document.getElementById("deleteOverlay");
const deleteCancelBtn  = document.getElementById("deleteCancelBtn");
const deleteConfirmBtn = document.getElementById("deleteConfirmBtn");
const toast            = document.getElementById("toast");
const formErrors       = document.getElementById("formErrors");
const viewOverlay      = document.getElementById("viewOverlay");
const viewModalClose   = document.getElementById("viewModalClose");
const viewModalBody    = document.getElementById("viewModalBody");

let allOpportunities = [];
let deleteTargetId   = null;

let originalDeadline = "";   // remembers the deadline while editing (see validateForm)
let isSaving = false;        // blocks double-submits

/* ── Helpers ─────────────────────────────────────────── */

// Reads a JSON response safely. If the server sends HTML or nothing
// (e.g. backend is down), we show a friendly message instead of crashing.
async function parseJSON(res) {
    try {
        return await parseJSON(res);
    } catch {
        return { error: res.ok ? "Unexpected server response." : `Server error (${res.status}). Is the backend running?` };
    }
}

// Flask/MySQL can return dates like "Tue, 01 Dec 2026 00:00:00 GMT".
// <input type="date"> needs "YYYY-MM-DD", so we convert here.
function toDateInput(value) {
    if (!value) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const d = new Date(value);
    if (isNaN(d)) return "";
    // GMT dates from the server are midnight UTC, so read the UTC parts
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

// Nice display format, e.g. "1 Dec 2026"
function formatDate(value) {
    const iso = toDateInput(value);
    if (!iso) return value || "—";
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}


async function fetchOpportunities() {
    try {
        const res  = await fetch(API_BASE);
        const data = await parseJSON(res);
        if (!res.ok) throw new Error(data.error || "Failed to fetch");
        allOpportunities = data;
        applyFilters();
        updateStats();
        updateDeptFilter();
    } catch (err) {
        showToast(err.message, "error");
    }
}


function updateStats() {
    const total = allOpportunities.length;
    const open  = allOpportunities.filter(o => o.status === "Open").length;
    headerStats.innerHTML = `
        <span class="stat-pill"><span class="stat-dot stat-dot--total"></span> ${total} Total</span>
        <span class="stat-pill"><span class="stat-dot stat-dot--open"></span> ${open} Open</span>
    `;
}


function updateDeptFilter() {
    const current = filterDept.value;
    const depts = [...new Set(allOpportunities.map(o => o.department))].sort();

    filterDept.innerHTML = '<option value="all">All Departments</option>';
    depts.forEach(d => {
        const opt = document.createElement("option");
        opt.value = d;
        opt.textContent = d;
        filterDept.appendChild(opt);
    });

    if (depts.includes(current)) {
        filterDept.value = current;
    }
}


function applyFilters() {
    const q      = searchInput.value.trim().toLowerCase();
    const status = filterStatus.value;
    const dept   = filterDept.value;

    const filtered = allOpportunities.filter(opp => {
        const matchesSearch = [opp.title, opp.research_area, opp.faculty_name, opp.department, opp.required_skills]
            .some(field => (field || "").toLowerCase().includes(q));
        const matchesStatus = status === "all" || opp.status === status;
        const matchesDept   = dept === "all"   || opp.department === dept;
        return matchesSearch && matchesStatus && matchesDept;
    });

    renderCards(filtered);
}


function renderCards(items) {
    grid.innerHTML = "";

    if (items.length === 0) {
        const hasData = allOpportunities.length > 0;
        document.getElementById("emptyTitle").textContent = hasData ? "No matching opportunities" : "No opportunities yet";
        document.getElementById("emptySub").innerHTML = hasData
            ? "Try a different search or clear your filters."
            : "Click <strong>New Opportunity</strong> to create your first listing.";
        grid.classList.add("hidden");
        emptyState.classList.remove("hidden");
        return;
    }

    grid.classList.remove("hidden");
    emptyState.classList.add("hidden");

    items.forEach((opp, i) => {
        const card = document.createElement("div");
        card.className = "card";
        card.style.animationDelay = `${i * 50}ms`;

        const statusClass = opp.status === "Open" ? "badge--open" : "badge--closed";
        const isOpen = opp.status === "Open";

        card.innerHTML = `
            <div class="card-header">
                <span class="card-title">${esc(opp.title)}</span>
                <span class="badge ${statusClass}">
                    <span class="badge-dot"></span>
                    ${esc(opp.status)}
                </span>
            </div>
            <p class="card-desc">${esc(opp.description)}</p>
            <div class="card-meta">
                <span class="meta-chip">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    ${esc(opp.faculty_name)}
                </span>
                <span class="meta-chip">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                    ${esc(opp.department)}
                </span>
                <span class="meta-chip">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    ${esc(opp.research_area)}
                </span>
                <span class="meta-chip">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    ${opp.available_positions} Available
                </span>
                <span class="meta-chip">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    ${esc(formatDate(opp.deadline))}
                </span>
            </div>
            <p class="card-skills"><strong>Skills:</strong> ${esc(opp.required_skills)}</p>
            <div class="card-actions">
                <button type="button" class="btn btn-accent-ghost btn-sm" data-action="view" data-id="${opp.id}">View</button>
                <button type="button" class="btn btn-ghost btn-sm" data-action="edit" data-id="${opp.id}">Edit</button>
                ${isOpen ? `<button type="button" class="btn btn-warning btn-sm" data-action="close" data-id="${opp.id}">Close</button>` : ""}
                <button type="button" class="btn btn-danger btn-sm" data-action="delete" data-id="${opp.id}">Delete</button>
            </div>
        `;
        grid.appendChild(card);
    });
}


async function viewDetails(id) {
    try {
        const res = await fetch(`${API_BASE}/${id}`);
        const opp = await parseJSON(res);
        if (!res.ok) throw new Error(opp.error || "Not found");

        const statusClass = opp.status === "Open" ? "badge--open" : "badge--closed";

        viewModalBody.innerHTML = `
            <div class="detail-grid">
                <div class="detail-row detail-row--full">
                    <span class="detail-label">Title</span>
                    <span class="detail-value detail-value--title">${esc(opp.title)}</span>
                </div>
                <div class="detail-row detail-row--full">
                    <span class="detail-label">Description</span>
                    <span class="detail-value">${esc(opp.description)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Research Area</span>
                    <span class="detail-value">${esc(opp.research_area)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Department</span>
                    <span class="detail-value">${esc(opp.department)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Faculty</span>
                    <span class="detail-value">${esc(opp.faculty_name)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Required Skills</span>
                    <span class="detail-value">${esc(opp.required_skills)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Available Positions</span>
                    <span class="detail-value">${opp.available_positions}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Deadline</span>
                    <span class="detail-value">${esc(formatDate(opp.deadline))}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Status</span>
                    <span class="detail-value"><span class="badge ${statusClass}"><span class="badge-dot"></span> ${esc(opp.status)}</span></span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">ID</span>
                    <span class="detail-value">#${opp.id}</span>
                </div>
            </div>
        `;

        viewOverlay.classList.remove("hidden");
    } catch (err) {
        showToast(err.message, "error");
    }
}

function closeViewModal() {
    viewOverlay.classList.add("hidden");
}

viewModalClose.addEventListener("click", closeViewModal);
viewOverlay.addEventListener("click", (e) => {
    if (e.target === viewOverlay) closeViewModal();
});


async function closeOpportunity(id) {
    const opp = allOpportunities.find(o => o.id === id);
    if (!opp) return;

    const payload = {
        title:               opp.title,
        description:         opp.description,
        research_area:       opp.research_area,
        faculty_name:        opp.faculty_name,
        department:          opp.department,
        required_skills:     opp.required_skills,
        available_positions: opp.available_positions,
        deadline:            toDateInput(opp.deadline),
        status:              "Closed"
    };

    try {
        const res = await fetch(`${API_BASE}/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await parseJSON(res);
        if (!res.ok) throw new Error(data.error || "Failed to close");

        showToast("Opportunity closed successfully.", "success");
        fetchOpportunities();
    } catch (err) {
        showToast(err.message, "error");
    }
}


function validateForm() {
    const errors = [];

    const fields = [
        { id: "title",               label: "Title" },
        { id: "description",         label: "Description" },
        { id: "research_area",       label: "Research Area" },
        { id: "faculty_name",        label: "Faculty Name" },
        { id: "department",          label: "Department" },
        { id: "required_skills",     label: "Required Skills" },
        { id: "available_positions", label: "Available Positions" },
        { id: "deadline",            label: "Deadline" }
    ];

    fields.forEach(f => {
        const el = document.getElementById(f.id);
        el.classList.remove("input-error");
    });

    fields.forEach(f => {
        const el  = document.getElementById(f.id);
        const val = el.value.trim();
        if (!val) {
            errors.push(`${f.label} is required.`);
            el.classList.add("input-error");
        }
    });

    const posVal = document.getElementById("available_positions").value;
    if (posVal && (!Number.isInteger(Number(posVal)) || parseInt(posVal, 10) < 1)) {
        errors.push("Available Positions must be a whole number of at least 1.");
        document.getElementById("available_positions").classList.add("input-error");
    }

    const deadlineVal = document.getElementById("deadline").value;
    if (deadlineVal) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const deadlineDate = new Date(deadlineVal + "T00:00:00");
        if (deadlineDate < today && deadlineVal !== originalDeadline) {
            errors.push("Deadline cannot be in the past.");
            document.getElementById("deadline").classList.add("input-error");
        }
    }

    if (errors.length > 0) {
        formErrors.innerHTML = errors.map(e => `<p>• ${esc(e)}</p>`).join("");
        formErrors.classList.remove("hidden");
        return false;
    }

    formErrors.classList.add("hidden");
    return true;
}


form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const payload = {
        title:               document.getElementById("title").value.trim(),
        description:         document.getElementById("description").value.trim(),
        research_area:       document.getElementById("research_area").value.trim(),
        faculty_name:        document.getElementById("faculty_name").value.trim(),
        department:          document.getElementById("department").value.trim(),
        required_skills:     document.getElementById("required_skills").value.trim(),
        available_positions: parseInt(document.getElementById("available_positions").value, 10),
        deadline:            document.getElementById("deadline").value,
        status:              document.getElementById("status").value
    };

    const editId = editIdInput.value;
    const isEdit = !!editId;

    if (isSaving) return;
    isSaving = true;
    submitBtn.disabled = true;

    try {
        const res = await fetch(
            isEdit ? `${API_BASE}/${editId}` : API_BASE,
            {
                method:  isEdit ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify(payload)
            }
        );
        const data = await parseJSON(res);
        if (!res.ok) throw new Error(data.error || "Request failed");

        closeModal();
        showToast(data.message || "Saved successfully.", "success");
        fetchOpportunities();
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        isSaving = false;
        submitBtn.disabled = false;
    }
});


async function openEdit(id) {
    try {
        const res = await fetch(`${API_BASE}/${id}`);
        const opp = await parseJSON(res);
        if (!res.ok) throw new Error(opp.error || "Not found");

        editIdInput.value = id;
        document.getElementById("title").value               = opp.title;
        document.getElementById("description").value         = opp.description;
        document.getElementById("research_area").value       = opp.research_area;
        document.getElementById("faculty_name").value        = opp.faculty_name;
        document.getElementById("department").value          = opp.department;
        document.getElementById("required_skills").value     = opp.required_skills;
        document.getElementById("available_positions").value = opp.available_positions;
        originalDeadline = toDateInput(opp.deadline);
        document.getElementById("deadline").value            = originalDeadline;
        document.getElementById("status").value              = opp.status;

        modalTitle.textContent = "Edit Opportunity";
        submitBtn.textContent  = "Update";
        formErrors.classList.add("hidden");
        modalOverlay.classList.remove("hidden");
    } catch (err) {
        showToast(err.message, "error");
    }
}


function confirmDelete(id) {
    deleteTargetId = id;
    deleteOverlay.classList.remove("hidden");
}

deleteConfirmBtn.addEventListener("click", async () => {
    if (!deleteTargetId || deleteConfirmBtn.disabled) return;
    deleteConfirmBtn.disabled = true;
    try {
        const res  = await fetch(`${API_BASE}/${deleteTargetId}`, { method: "DELETE" });
        const data = await parseJSON(res);
        if (!res.ok) throw new Error(data.error || "Delete failed");

        deleteOverlay.classList.add("hidden");
        deleteTargetId = null;
        showToast(data.message || "Opportunity deleted.", "success");
        fetchOpportunities();
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        deleteConfirmBtn.disabled = false;
    }
});

deleteCancelBtn.addEventListener("click", () => {
    deleteOverlay.classList.add("hidden");
    deleteTargetId = null;
});


searchInput.addEventListener("input", applyFilters);
filterStatus.addEventListener("change", applyFilters);
filterDept.addEventListener("change", applyFilters);


addBtn.addEventListener("click", () => {
    form.reset();
    originalDeadline = "";
    editIdInput.value = "";
    modalTitle.textContent = "New Opportunity";
    submitBtn.textContent  = "Create";
    formErrors.classList.add("hidden");
    modalOverlay.classList.remove("hidden");
    document.getElementById("title").focus();
});

function closeModal() {
    modalOverlay.classList.add("hidden");
    originalDeadline = "";
    form.reset();
    editIdInput.value = "";
    formErrors.classList.add("hidden");
    document.querySelectorAll(".input-error").forEach(el => el.classList.remove("input-error"));
}

modalClose.addEventListener("click", closeModal);
cancelBtn.addEventListener("click",  closeModal);
modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
});


let toastTimer;
function showToast(msg, type = "success") {
    toast.textContent = msg;
    toast.className   = `toast ${type} show`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.classList.remove("show"); }, 3500);
}


function esc(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}


// Initialize portal listings
fetchOpportunities();


/* ── Card buttons (event delegation) ─────────────────── */
// One listener on the grid handles every View / Edit / Close / Delete button,
// so we don't need inline onclick="" attributes in the generated HTML.
grid.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const actions = { view: viewDetails, edit: openEdit, close: closeOpportunity, delete: confirmDelete };
    if (actions[btn.dataset.action]) actions[btn.dataset.action](id);
});

/* ── Keyboard: Escape closes whichever popup is open ─── */
document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!deleteOverlay.classList.contains("hidden")) deleteCancelBtn.click();
    else if (!modalOverlay.classList.contains("hidden")) closeModal();
    else if (!viewOverlay.classList.contains("hidden")) closeViewModal();
});