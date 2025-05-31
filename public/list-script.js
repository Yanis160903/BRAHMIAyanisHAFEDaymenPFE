// Variables globales
let patients = [];
let currentPage = 1;
const itemsPerPage = 10;
let currentSort = { column: 'numeroDossier', direction: 'asc' };
let currentFilter = 'all';

// Éléments DOM
const patientsTable = document.getElementById('patientsTable');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');
const archiveModal = document.getElementById('archiveModal');
const confirmArchiveBtn = document.getElementById('confirmArchive');
const cancelArchiveBtn = document.getElementById('cancelArchive');

// État du patient en cours d'archivage
let patientToArchive = null;

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    loadPatients();
    setupEventListeners();
});

// Chargement des patients
async function loadPatients() {
    try {
        const response = await fetch('/api/patients');
        patients = await response.json();
        renderTable();
    } catch (error) {
        console.error('Erreur lors du chargement des patients:', error);
        showError('Impossible de charger la liste des patients');
    }
}

// Configuration des écouteurs d'événements
function setupEventListeners() {
    // Recherche
    searchInput.addEventListener('input', debounce(() => {
        currentPage = 1;
        renderTable();
    }, 300));

    // Filtre de statut
    statusFilter.addEventListener('change', (e) => {
        currentFilter = e.target.value;
        currentPage = 1;
        renderTable();
    });

    // Pagination
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    });

    nextPageBtn.addEventListener('click', () => {
        const maxPage = Math.ceil(getFilteredPatients().length / itemsPerPage);
        if (currentPage < maxPage) {
            currentPage++;
            renderTable();
        }
    });

    // Tri des colonnes
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.sort;
            if (currentSort.column === column) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.column = column;
                currentSort.direction = 'asc';
            }
            renderTable();
        });
    });

    // Modal d'archivage
    confirmArchiveBtn.addEventListener('click', handleArchive);
    cancelArchiveBtn.addEventListener('click', () => {
        archiveModal.style.display = 'none';
        patientToArchive = null;
    });

    // Fermeture des modals
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        });
    });
}

// Rendu du tableau
function renderTable() {
    const filteredPatients = getFilteredPatients();
    const sortedPatients = sortPatients(filteredPatients);
    const paginatedPatients = paginatePatients(sortedPatients);

    const tbody = patientsTable.querySelector('tbody');
    tbody.innerHTML = '';

    paginatedPatients.forEach(patient => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${patient.numeroDossier}</td>
            <td>${patient.nom}</td>
            <td>${patient.prenom}</td>
            <td>${formatDate(patient.dateNaissance)}</td>
            <td>${patient.telephone}</td>
            <td>${patient.medecinTraitant}</td>
            <td>
                <span class="status-badge ${patient.archived ? 'status-archived' : 'status-active'}">
                    <i class="fas ${patient.archived ? 'fa-archive' : 'fa-check-circle'}"></i>
                    ${patient.archived ? 'Archivé' : 'Actif'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view-btn" onclick="viewPatient('${patient._id}')" title="Voir les détails">
                        <i class="fas fa-eye"></i> Voir
                    </button>
                    <button class="action-btn edit-btn" onclick="editPatient('${patient._id}')" title="Modifier">
                        <i class="fas fa-edit"></i> Modifier
                    </button>
                    ${patient.archived ? 
                        `<button class="action-btn restore-btn" onclick="restorePatient('${patient._id}')" title="Restaurer">
                            <i class="fas fa-undo"></i> Restaurer
                        </button>` :
                        `<button class="action-btn archive-btn" onclick="showArchiveModal('${patient._id}')" title="Archiver">
                            <i class="fas fa-archive"></i> Archiver
                        </button>`
                    }
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    updatePagination();
}

// Filtrage des patients
function getFilteredPatients() {
    let filtered = patients;
    
    // Filtre de recherche
    const searchTerm = searchInput.value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(patient => 
            patient.nom.toLowerCase().includes(searchTerm) ||
            patient.prenom.toLowerCase().includes(searchTerm) ||
            patient.numeroDossier.toString().includes(searchTerm)
        );
    }

    // Filtre de statut
    if (currentFilter !== 'all') {
        filtered = filtered.filter(patient => 
            currentFilter === 'archived' ? patient.archived : !patient.archived
        );
    }

    return filtered;
}

// Tri des patients
function sortPatients(patients) {
    return [...patients].sort((a, b) => {
        let valueA = a[currentSort.column];
        let valueB = b[currentSort.column];

        if (typeof valueA === 'string') {
            valueA = valueA.toLowerCase();
            valueB = valueB.toLowerCase();
        }

        if (valueA < valueB) return currentSort.direction === 'asc' ? -1 : 1;
        if (valueA > valueB) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });
}

// Pagination
function paginatePatients(patients) {
    const start = (currentPage - 1) * itemsPerPage;
    return patients.slice(start, start + itemsPerPage);
}

// Mise à jour de la pagination
function updatePagination() {
    const filteredPatients = getFilteredPatients();
    const maxPage = Math.ceil(filteredPatients.length / itemsPerPage);
    
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === maxPage;
    
    pageInfo.textContent = `Page ${currentPage} sur ${maxPage}`;
}

// Archivage d'un patient
async function handleArchive() {
    if (!patientToArchive) return;

    try {
        const response = await fetch(`/api/patients/${patientToArchive}/archive`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const patient = patients.find(p => p._id === patientToArchive);
            if (patient) {
                patient.archived = true;
                renderTable();
            }
            archiveModal.style.display = 'none';
            showSuccess('Patient archivé avec succès');
        } else {
            throw new Error('Erreur lors de l\'archivage');
        }
    } catch (error) {
        console.error('Erreur lors de l\'archivage:', error);
        showError('Impossible d\'archiver le patient');
    } finally {
        patientToArchive = null;
    }
}

// Restauration d'un patient
async function restorePatient(id) {
    try {
        const response = await fetch(`/api/patients/${id}/restore`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const patient = patients.find(p => p._id === id);
            if (patient) {
                patient.archived = false;
                renderTable();
            }
            showSuccess('Patient restauré avec succès');
        } else {
            throw new Error('Erreur lors de la restauration');
        }
    } catch (error) {
        console.error('Erreur lors de la restauration:', error);
        showError('Impossible de restaurer le patient');
    }
}

// Affichage du modal d'archivage
function showArchiveModal(id) {
    patientToArchive = id;
    const modal = document.getElementById('archiveModal');
    modal.style.display = 'block';
    
    // Ajouter une animation de fondu
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.style.opacity = '1';
    }, 10);
}

// Utilitaires
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('fr-FR');
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showSuccess(message) {
    // Créer un élément de notification
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(notification);

    // Afficher la notification
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    }, 10);

    // Supprimer la notification après 3 secondes
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

function showError(message) {
    // Créer un élément de notification
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(notification);

    // Afficher la notification
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    }, 10);

    // Supprimer la notification après 3 secondes
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Fonctions de navigation
function viewPatient(id) {
    window.location.href = `/patient/${id}`;
}

function editPatient(id) {
    window.location.href = `/modifier-patient/${id}`;
}

// Fonctions d'archivage
async function archivePatient(id) {
    try {
        const response = await fetch(`/api/patients/${id}/archive`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Erreur lors de l\'archivage');
        }

        // Mettre à jour l'interface
        const patient = patients.find(p => p._id === id);
        if (patient) {
            patient.archived = true;
            patient.dateArchivage = new Date();
            renderTable();
            showSuccess('Patient archivé avec succès');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError(error.message);
    }
}

async function restorePatient(id) {
    try {
        const response = await fetch(`/api/patients/${id}/restore`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Erreur lors de la restauration');
        }

        // Mettre à jour l'interface
        const patient = patients.find(p => p._id === id);
        if (patient) {
            patient.archived = false;
            patient.dateArchivage = null;
            renderTable();
            showSuccess('Patient restauré avec succès');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError(error.message);
    }
}

// Fonction pour afficher le modal de confirmation d'archivage
function showArchiveModal(id) {
    const modal = document.getElementById('archiveModal');
    const confirmBtn = document.getElementById('confirmArchive');
    const cancelBtn = document.getElementById('cancelArchive');
    const patientName = document.getElementById('patientName');

    // Trouver le patient
    const patient = patients.find(p => p._id === id);
    if (!patient) return;

    // Mettre à jour le nom du patient dans le modal
    patientName.textContent = `${patient.nom} ${patient.prenom}`;

    // Configurer les événements
    confirmBtn.onclick = () => {
        archivePatient(id);
        modal.style.display = 'none';
    };

    cancelBtn.onclick = () => {
        modal.style.display = 'none';
    };

    // Afficher le modal
    modal.style.display = 'block';
}

// Fonction pour afficher le modal de confirmation de restauration
function showRestoreModal(id) {
    const modal = document.getElementById('restoreModal');
    const confirmBtn = document.getElementById('confirmRestore');
    const cancelBtn = document.getElementById('cancelRestore');
    const patientName = document.getElementById('restorePatientName');

    // Trouver le patient
    const patient = patients.find(p => p._id === id);
    if (!patient) return;

    // Mettre à jour le nom du patient dans le modal
    patientName.textContent = `${patient.nom} ${patient.prenom}`;

    // Configurer les événements
    confirmBtn.onclick = () => {
        restorePatient(id);
        modal.style.display = 'none';
    };

    cancelBtn.onclick = () => {
        modal.style.display = 'none';
    };

    // Afficher le modal
    modal.style.display = 'block';
}