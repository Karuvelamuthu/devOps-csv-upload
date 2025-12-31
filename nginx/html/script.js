// DOM Elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileInfo = document.getElementById('file-info');
const uploadBtn = document.getElementById('upload-btn');
const removeBtn = document.getElementById('remove-btn');
const refreshBtn = document.getElementById('refresh-btn');
const progressContainer = document.getElementById('progress-container');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const loadingState = document.getElementById('loading-state');
const filesContainer = document.getElementById('files-container');
const emptyState = document.getElementById('empty-state');
const filesTbody = document.getElementById('files-tbody');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const toast = document.getElementById('toast');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalConfirm = document.getElementById('modal-confirm');
const modalCancel = document.getElementById('modal-cancel');
const closeModal = document.getElementById('close-modal');

// State
let selectedFile = null;
const API_BASE = '/api';

// API Base URL (adjust for your backend)
const API_URL = window.location.origin;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkHealth();
    loadFiles();
});

// Setup Event Listeners
function setupEventListeners() {
    // Drag and Drop
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        handleFileDrop(e.dataTransfer.files);
    });

    // File Input
    fileInput.addEventListener('change', (e) => {
        handleFileDrop(e.target.files);
    });

    // Buttons
    uploadBtn.addEventListener('click', uploadFile);
    removeBtn.addEventListener('click', removeFile);
    refreshBtn.addEventListener('click', loadFiles);
    modalCancel.addEventListener('click', closeModalDialog);
    closeModal.addEventListener('click', closeModalDialog);
}

// Handle File Drop/Selection
function handleFileDrop(files) {
    if (files.length === 0) return;

    const file = files[0];

    // Validate file type
    if (!file.name.endsWith('.csv')) {
        showToast('Please select a CSV file', 'error');
        return;
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
        showToast('File size must be less than 100MB', 'error');
        return;
    }

    selectedFile = file;
    displayFileInfo(file);
}

// Display File Info
function displayFileInfo(file) {
    document.getElementById('file-name').textContent = file.name;
    document.getElementById('file-size').textContent = `${(file.size / 1024).toFixed(2)} KB`;
    fileInfo.classList.remove('hidden');
    uploadBtn.disabled = false;
}

// Remove Selected File
function removeFile() {
    selectedFile = null;
    fileInfo.classList.add('hidden');
    uploadBtn.disabled = true;
    fileInput.value = '';
}

// Upload File
async function uploadFile() {
    if (!selectedFile) {
        showToast('Please select a file', 'error');
        return;
    }

    uploadBtn.disabled = true;
    progressContainer.classList.remove('hidden');

    const formData = new FormData();
    formData.append('csv', selectedFile);

    try {
        const xhr = new XMLHttpRequest();

        // Progress Event
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                updateProgress(percentComplete);
            }
        });

        // Load Event
        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                showToast('File uploaded successfully!', 'success');
                removeFile();
                loadFiles();
            } else {
                showToast('Upload failed', 'error');
            }
            resetProgress();
            uploadBtn.disabled = false;
        });

        // Error Event
        xhr.addEventListener('error', () => {
            showToast('Upload error. Please try again.', 'error');
            resetProgress();
            uploadBtn.disabled = false;
        });

        // Send Request
        xhr.open('POST', `${API_URL}/uploads3`);
        xhr.send(formData);

    } catch (error) {
        showToast('Error uploading file', 'error');
        resetProgress();
        uploadBtn.disabled = false;
    }
}

// Update Progress Bar
function updateProgress(percent) {
    progressFill.style.width = percent + '%';
    progressText.textContent = Math.round(percent) + '%';
}

// Reset Progress Bar
function resetProgress() {
    progressContainer.classList.add('hidden');
    progressFill.style.width = '0%';
    progressText.textContent = '0%';
}

// Load Files List
async function loadFiles() {
    try {
        loadingState.classList.remove('hidden');
        filesContainer.classList.add('hidden');
        emptyState.classList.add('hidden');

        const response = await fetch(`${API_URL}/files`);
        const data = await response.json();

        if (response.ok && data.success) {
            const files = data.files || [];

            if (files.length === 0) {
                emptyState.classList.remove('hidden');
            } else {
                displayFiles(files);
                filesContainer.classList.remove('hidden');
            }
        } else {
            showToast('Failed to load files', 'error');
            emptyState.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error loading files:', error);
        showToast('Error loading files', 'error');
        emptyState.classList.remove('hidden');
    } finally {
        loadingState.classList.add('hidden');
    }
}

// Display Files in Table
function displayFiles(files) {
    filesTbody.innerHTML = '';

    files.forEach(file => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHtml(file.fileName || file.key)}</td>
            <td>${formatFileSize(file.size)}</td>
            <td>${formatDate(file.createdAt || file.lastModified)}</td>
            <td>
                <div class="file-actions">
                    <button class="btn btn-download" onclick="downloadFile('${escapeHtml(file.fileName || file.key)}')">
                        ⬇ Download
                    </button>
                    <button class="btn btn-delete" onclick="confirmDelete('${escapeHtml(file.fileName || file.key)}')">
                        🗑 Delete
                    </button>
                </div>
            </td>
        `;
        filesTbody.appendChild(row);
    });
}

// Download File
async function downloadFile(fileName) {
    try {
        const response = await fetch(`${API_URL}/download/${encodeURIComponent(fileName)}`);

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showToast('File downloaded successfully', 'success');
        } else {
            showToast('Download failed', 'error');
        }
    } catch (error) {
        showToast('Error downloading file', 'error');
    }
}

// Confirm Delete
function confirmDelete(fileName) {
    modalTitle.textContent = 'Delete File';
    modalMessage.textContent = `Are you sure you want to delete "${fileName}"?`;
    modalConfirm.textContent = 'Delete';
    modalConfirm.className = 'btn btn-delete';
    modalConfirm.onclick = () => deleteFile(fileName);
    modal.classList.remove('hidden');
}

// Delete File
async function deleteFile(fileName) {
    try {
        closeModalDialog();
        showToast('Deleting file...', 'warning');

        const response = await fetch(`${API_URL}/delete/${encodeURIComponent(fileName)}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast('File deleted successfully', 'success');
            loadFiles();
        } else {
            showToast('Delete failed', 'error');
        }
    } catch (error) {
        showToast('Error deleting file', 'error');
    }
}

// Check Health
async function checkHealth() {
    try {
        const response = await fetch(`${API_URL}/health`);

        if (response.ok) {
            statusDot.classList.add('connected');
            statusText.textContent = 'Connected';
        } else {
            statusDot.classList.add('error');
            statusText.textContent = 'Disconnected';
        }
    } catch (error) {
        statusDot.classList.add('error');
        statusText.textContent = 'Disconnected';
    }
}

// Show Toast Notification
function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = `toast show ${type}`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// Close Modal
function closeModalDialog() {
    modal.classList.add('hidden');
}

// Format File Size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Format Date
function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return dateString;
    }
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}