const apiUrl = "http://localhost:3000/api/users";

// Application State
let usersList = [];
let filteredUsers = [];
let currentView = 'cards'; // 'cards' or 'table'
let sortBy = { field: 'name', direction: 'asc' };
let editUserId = null;
let deleteUserId = null;

// DOM Elements
const userForm = document.getElementById('userForm');
const editForm = document.getElementById('editForm');
const userCardsGrid = document.getElementById('user-cards-grid');
const userTableContainer = document.getElementById('user-table-container');
const userTableBody = document.getElementById('table-body');
const searchInput = document.getElementById('searchInput');
const viewToggleBtn = document.getElementById('viewToggleBtn');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const scrollToTopBtn = document.getElementById('scrollToTopBtn');

// Modals
const editModal = document.getElementById('editModal');
const confirmModal = document.getElementById('confirmModal');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

// View Indicators
const pillCardsView = document.getElementById('pill-cards-view');
const pillTableView = document.getElementById('pill-table-view');

// Stats Counters
const statTotalUsers = document.getElementById('stat-total-users');
const statActiveEmails = document.getElementById('stat-active-emails');
const statVerifiedPhones = document.getElementById('stat-verified-phones');

// Skeleton & Empty States
const skeletonLoader = document.getElementById('skeleton-loader');
const emptyState = document.getElementById('empty-state');

// Toast Container
const toastContainer = document.getElementById('toast-container');

/* ==========================================================================
   Initials-based Gradient SVG Avatar Generator
   ========================================================================== */
function getAvatarUri(name) {
    const initials = name
        .split(' ')
        .filter(part => part.trim().length > 0)
        .map(part => part[0])
        .join('')
        .substring(0, 2)
        .toUpperCase() || 'U';

    const gradients = [
        ['#6366f1', '#a855f7'], // Indigo -> Purple
        ['#3b82f6', '#8b5cf6'], // Blue -> Violet
        ['#10b981', '#047857'], // Emerald -> Green
        ['#f59e0b', '#d97706'], // Amber -> Orange
        ['#ec4899', '#be185d']  // Pink -> Rose
    ];

    // Simple hash to consistently pick a gradient based on user's name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const gradientIndex = Math.abs(hash) % gradients.length;
    const gradient = gradients[gradientIndex];

    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
            <linearGradient id="grad-${Math.abs(hash)}" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:${gradient[0]};stop-opacity:1" />
                <stop offset="100%" style="stop-color:${gradient[1]};stop-opacity:1" />
            </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#grad-${Math.abs(hash)})" />
        <text x="50%" y="54%" font-size="34" font-family="'Outfit', 'Poppins', sans-serif" font-weight="700" fill="#ffffff" dominant-baseline="middle" text-anchor="middle">${initials}</text>
    </svg>
    `;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/* ==========================================================================
   Toast Notification System
   ========================================================================== */
function showToast(title, message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const iconClass = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';

    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fa-solid ${iconClass}"></i>
        </div>
        <div class="toast-content">
            <h4>${title}</h4>
            <p>${message}</p>
        </div>
        <div class="toast-progress"></div>
    `;

    toastContainer.appendChild(toast);

    // Automatically start removal animation after 3s
    setTimeout(() => {
        toast.classList.add('removing');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 3000);
}

/* ==========================================================================
   Theme Management (Light / Dark Mode)
   ========================================================================== */
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);

    showToast('Theme Updated', `Switched to ${newTheme === 'dark' ? 'Dark' : 'Light'} Mode`, 'success');
}

function updateThemeIcon(theme) {
    const icon = themeToggleBtn.querySelector('i');
    if (theme === 'dark') {
        icon.className = 'fa-solid fa-sun';
        themeToggleBtn.title = 'Switch to Light Mode';
    } else {
        icon.className = 'fa-solid fa-moon';
        themeToggleBtn.title = 'Switch to Dark Mode';
    }
}

themeToggleBtn.addEventListener('click', toggleTheme);

/* ==========================================================================
   Layout View Management (Grid / Table Toggle)
   ========================================================================== */
function toggleView() {
    currentView = currentView === 'cards' ? 'table' : 'cards';
    renderView();
}

function renderView() {
    const viewIcon = viewToggleBtn.querySelector('i');

    if (currentView === 'cards') {
        viewIcon.className = 'fa-solid fa-table-list';
        userCardsGrid.style.display = 'grid';
        userTableContainer.style.display = 'none';

        pillCardsView.classList.add('active');
        pillTableView.classList.remove('active');
    } else {
        viewIcon.className = 'fa-solid fa-grip-vertical';
        userCardsGrid.style.display = 'none';
        userTableContainer.style.display = 'block';

        pillCardsView.classList.remove('active');
        pillTableView.classList.add('active');
    }
}

viewToggleBtn.addEventListener('click', toggleView);
pillCardsView.addEventListener('click', () => { if (currentView !== 'cards') toggleView(); });
pillTableView.addEventListener('click', () => { if (currentView !== 'table') toggleView(); });

/* ==========================================================================
   Statistics Calculations
   ========================================================================== */
function animateCounter(element, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        element.textContent = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            element.textContent = end;
        }
    };
    window.requestAnimationFrame(step);
}

function updateStatistics(users) {
    const totalCount = users.length;

    // Count active emails (just count formatting matches)
    const validEmails = users.filter(user => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)).length;

    // Count valid 10-digit phone numbers
    const validPhones = users.filter(user => /^\d{10}$/.test(user.phone)).length;

    // Animate stats values
    const prevTotal = parseInt(statTotalUsers.textContent) || 0;
    const prevEmails = parseInt(statActiveEmails.textContent) || 0;
    const prevPhones = parseInt(statVerifiedPhones.textContent) || 0;

    animateCounter(statTotalUsers, prevTotal, totalCount, 800);
    animateCounter(statActiveEmails, prevEmails, validEmails, 800);
    animateCounter(statVerifiedPhones, prevPhones, validPhones, 800);
}

/* ==========================================================================
   User Fetch, Filter & Sort Methods
   ========================================================================== */
async function fetchUsers() {
    skeletonLoader.style.display = 'block';
    userCardsGrid.style.display = 'none';
    userTableContainer.style.display = 'none';
    emptyState.style.display = 'none';

    try {
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error('Could not establish database sync');

        usersList = await res.json();
        updateStatistics(usersList);
        applyFilterAndSearch();
    } catch (err) {
        showToast('Sync Failed', err.message, 'error');
        skeletonLoader.style.display = 'none';
        emptyState.style.display = 'flex';
        console.error(err);
    }
}

// Search and local filtering
function applyFilterAndSearch() {
    const query = searchInput.value.toLowerCase().trim();

    filteredUsers = usersList.filter(user => {
        return (
            user.name.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query) ||
            user.phone.toLowerCase().includes(query)
        );
    });

    applySorting();
}

// Sorting logic
function applySorting() {
    const { field, direction } = sortBy;

    filteredUsers.sort((a, b) => {
        let valA = a[field] ? a[field].toString().toLowerCase() : '';
        let valB = b[field] ? b[field].toString().toLowerCase() : '';

        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    displayUsers();
}

function setSort(field, direction) {
    sortBy = { field, direction };
    applySorting();
    showToast('Sorted successfully', `Sorting by ${field} (${direction.toUpperCase()})`, 'success');
}

/* ==========================================================================
   UI Data Rendering (Cards Grid & Table Body)
   ========================================================================== */
function displayUsers() {
    skeletonLoader.style.display = 'none';

    if (filteredUsers.length === 0) {
        emptyState.style.display = 'flex';
        userCardsGrid.innerHTML = '';
        userTableBody.innerHTML = '';
        return;
    }

    emptyState.style.display = 'none';
    renderView(); // Show active view layout

    // 1. Render User Cards Grid
    userCardsGrid.innerHTML = '';
    filteredUsers.forEach((user, index) => {
        const avatar = getAvatarUri(user.name);
        const card = document.createElement('div');
        card.className = 'user-card glass-panel shimmer';
        card.style.animationDelay = `${index * 0.05}s`;

        card.innerHTML = `
            <div class="user-card-header">
                <div class="user-avatar-circle">
                    <img src="${avatar}" alt="${user.name}" width="52" height="52" />
                </div>
                <div class="user-meta-info">
                    <h4>${user.name}</h4>
                    <span class="status-badge badge-active">Active</span>
                </div>
            </div>
            <div class="user-card-body">
                <div class="user-detail-row">
                    <i class="fa-solid fa-envelope"></i>
                    <span>${user.email}</span>
                </div>
                <div class="user-detail-row">
                    <i class="fa-solid fa-phone"></i>
                    <span>${user.phone}</span>
                </div>
            </div>
            <div class="user-card-actions">
                <button class="card-action-btn card-edit-btn" onclick="openEditModal('${user._id}', '${escapeHtml(user.name)}', '${escapeHtml(user.email)}', '${escapeHtml(user.phone)}')">
                    <i class="fa-solid fa-user-pen"></i> Edit
                </button>
                <button class="card-action-btn card-delete-btn" onclick="openDeleteConfirm('${user._id}')">
                    <i class="fa-solid fa-trash-can"></i> Delete
                </button>
            </div>
        `;
        userCardsGrid.appendChild(card);
    });

    // 2. Render User Table Rows
    userTableBody.innerHTML = '';
    filteredUsers.forEach((user) => {
        const avatar = getAvatarUri(user.name);
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>
                <div class="table-avatar-cell">
                    <img class="user-avatar-circle" src="${avatar}" alt="${user.name}" width="36" height="36" />
                </div>
            </td>
            <td><strong>${user.name}</strong></td>
            <td>${user.email}</td>
            <td>${user.phone}</td>
            <td>
                <div class="table-actions">
                    <button class="icon-action-btn table-edit-btn" onclick="openEditModal('${user._id}', '${escapeHtml(user.name)}', '${escapeHtml(user.email)}', '${escapeHtml(user.phone)}')" title="Edit profile">
                        <i class="fa-solid fa-user-pen"></i>
                    </button>
                    <button class="icon-action-btn table-delete-btn" onclick="openDeleteConfirm('${user._id}')" title="Delete profile">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </td>
        `;
        userTableBody.appendChild(row);
    });
}

// Search field listeners
searchInput.addEventListener('input', applyFilterAndSearch);

// Helper function to escape HTML special characters
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* ==========================================================================
   CRUD Operations (Add, Update, Delete)
   ========================================================================== */
function isValidPhone(phone) {
    return /^\d{10}$/.test(phone);
}

// Add User submit handler
userForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();

    if (!name || !email || !phone) {
        showToast('Validation Error', 'Please complete all registration fields', 'error');
        return;
    }

    if (!isValidPhone(phone)) {
        showToast('Validation Error', 'Enter a valid 10-digit phone number', 'error');
        return;
    }

    const submitBtn = userForm.querySelector('button[type="submit"]');
    const originalBtnHTML = submitBtn.innerHTML;
    submitBtn.innerHTML = `<span>Saving...</span> <i class="fa-solid fa-spinner fa-spin"></i>`;
    submitBtn.disabled = true;

    try {
        const res = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone })
        });

        if (!res.ok) {
            const errDetails = await res.json();
            throw new Error(errDetails.message || 'Failed to submit profile details');
        }

        userForm.reset();
        await fetchUsers();
        document.getElementById("display-section").style.display = "block";
        showToast('Profile Saved', `${name} registered successfully`, 'success');
    } catch (err) {
        showToast('Submission Failed', err.message, 'error');
        console.error(err);
    } finally {
        submitBtn.innerHTML = originalBtnHTML;
        submitBtn.disabled = false;
    }
});

// Update User details handler
editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('editName').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    const phone = document.getElementById('editPhone').value.trim();

    if (!name || !email || !phone) {
        showToast('Validation Error', 'Please complete all edit fields', 'error');
        return;
    }

    if (!isValidPhone(phone)) {
        showToast('Validation Error', 'Enter a valid 10-digit phone number', 'error');
        return;
    }

    const submitBtn = editForm.querySelector('button[type="submit"]');
    const originalBtnHTML = submitBtn.innerHTML;
    submitBtn.innerHTML = `<span>Saving...</span> <i class="fa-solid fa-spinner fa-spin"></i>`;
    submitBtn.disabled = true;

    try {
        const res = await fetch(`${apiUrl}/${editUserId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone })
        });

        if (!res.ok) throw new Error('Database could not apply modifications');

        await fetchUsers();
        closeModal();
        showToast('Profile Updated', 'User records updated successfully', 'success');
    } catch (err) {
        showToast('Update Failed', err.message, 'error');
        console.error(err);
    } finally {
        submitBtn.innerHTML = originalBtnHTML;
        submitBtn.disabled = false;
    }
});

// Delete User operations
async function executeDelete() {
    if (!deleteUserId) return;

    try {
        const res = await fetch(`${apiUrl}/${deleteUserId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Database rejected deletion request');

        await fetchUsers();
        closeDeleteConfirm();
        showToast('Profile Removed', 'The user record was deleted successfully', 'success');
    } catch (err) {
        showToast('Deletion Failed', err.message, 'error');
    }
}

/* ==========================================================================
   Modal Operations
   ========================================================================== */
function openEditModal(id, name, email, phone) {
    editUserId = id;
    document.getElementById('editName').value = name;
    document.getElementById('editEmail').value = email;
    document.getElementById('editPhone').value = phone;
    editModal.style.display = 'flex';
}

function closeModal() {
    editModal.style.display = 'none';
    editUserId = null;
}

function openDeleteConfirm(id) {
    deleteUserId = id;
    confirmModal.style.display = 'flex';
}

function closeDeleteConfirm() {
    confirmModal.style.display = 'none';
    deleteUserId = null;
}

// Hook delete modal events
confirmDeleteBtn.addEventListener('click', executeDelete);
cancelDeleteBtn.addEventListener('click', closeDeleteConfirm);

// Close modals when clicking outside
window.onclick = function (event) {
    if (event.target === editModal) closeModal();
    if (event.target === confirmModal) closeDeleteConfirm();
};

/* ==========================================================================
   UX Polishing Effects (FAB & Button Ripple Effects)
   ========================================================================== */
// FAB visibility & action
window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
        scrollToTopBtn.classList.add('visible');
    } else {
        scrollToTopBtn.classList.remove('visible');
    }
});

scrollToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Ripple Click Effect Helper
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.glass-btn');
    if (!btn) return;

    const circle = document.createElement('span');
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);

    circle.style.width = circle.style.height = `${size}px`;
    circle.style.left = `${e.clientX - rect.left - size / 2}px`;
    circle.style.top = `${e.clientY - rect.top - size / 2}px`;
    circle.classList.add('ripple');

    // Remove existing ripples
    const existingRipple = btn.querySelector('.ripple');
    if (existingRipple) {
        existingRipple.remove();
    }

    btn.appendChild(circle);
});

/* ==========================================================================
   App Initialization
   ========================================================================== */
initTheme();
fetchUsers();
