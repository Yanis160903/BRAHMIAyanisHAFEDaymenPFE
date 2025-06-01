// Gestion du formulaire multi-étapes
let currentStep = 1;
const totalSteps = 6;
let patientId = null; // Pour stocker l'ID du patient en cours de création

// Éléments du DOM
const form = document.getElementById('patientForm');
const steps = document.querySelectorAll('.form-step');
const progressSteps = document.querySelectorAll('.progress-step');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const submitBtn = document.getElementById('submitBtn');

// Fonction pour gérer les champs conditionnels
function handleConditionalFields() {
    const conditionalFields = {
        'allergieMedi': 'medicament',
        'automedication': 'medicamentAutomed',
        'complements': 'complement',
        'phytotherapie': 'phytotherapieDetails',
        'vaccination': 'vaccinsEffectues',
        'atb': 'antibiotiques'
    };

    Object.entries(conditionalFields).forEach(([selectId, inputGroupId]) => {
        const select = document.getElementById(selectId);
        const inputGroup = document.getElementById(inputGroupId + 'Group');

        if (select && inputGroup) {
            select.addEventListener('change', function () {
                inputGroup.style.display = this.value === 'oui' ? 'flex' : 'none';
            });
            // Initialisation au chargement
            inputGroup.style.display = select.value === 'oui' ? 'flex' : 'none';
        }
    });
}

// Fonction pour valider les champs de l'étape actuelle
function validateCurrentStep() {
    const currentStepElement = document.querySelector(`.form-step[data-step="${currentStep}"]`);
    const requiredFields = currentStepElement.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            isValid = false;
            field.style.borderColor = 'var(--danger-color)';
        } else {
            field.style.borderColor = '';
        }
    });

    return isValid;
}

// Fonction pour mettre à jour l'affichage des étapes
function updateStepDisplay() {
    steps.forEach((step, index) => {
        if (index + 1 === currentStep) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });

    // Mettre à jour la barre de progression
    progressSteps.forEach((step, index) => {
        if (index + 1 < currentStep) {
            step.classList.add('completed');
            step.classList.remove('active');
        } else if (index + 1 === currentStep) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('active', 'completed');
        }
    });

    // Gestion des boutons de navigation
    prevBtn.style.display = currentStep === 1 ? 'none' : 'block';
    nextBtn.style.display = currentStep === totalSteps ? 'none' : 'block';
    submitBtn.style.display = currentStep === totalSteps ? 'block' : 'none';

    // Défilement vers le haut de la page
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Fonction pour récupérer les données de l'étape actuelle
function getCurrentStepData() {
    const currentStepElement = document.querySelector(`.form-step[data-step="${currentStep}"]`);
    const formData = {};

    // Récupérer tous les champs du formulaire de l'étape courante
    const inputs = currentStepElement.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        if (input.name) {
            formData[input.name] = input.value;
        }
    });

    return formData;
}

// Fonction pour sauvegarder les données de l'étape
async function saveStepData() {
    const stepData = getCurrentStepData();

    try {
        let response;
        let endpoint;

        // Déterminer l'endpoint en fonction de l'étape
        switch (currentStep) {
            case 1: // Informations Générales
                endpoint = '/api/patients';
                break;
            case 2: // Antécédents
                endpoint = '/api/antecedents';
                stepData.patientId = patientId;
                break;
            case 3: // Médicaments
                endpoint = '/api/medicaments';
                stepData.patientId = patientId;
                break;
            case 4: // Prescription
                endpoint = '/api/prescriptions';
                stepData.patientId = patientId;
                break;
            case 5: // Suivi
                endpoint = '/api/suivi';
                stepData.patientId = patientId;
                break;
            case 6: // Évaluation
                endpoint = '/api/evaluation';
                stepData.patientId = patientId;
                break;
            default:
                throw new Error('Étape non reconnue');
        }

        // Envoyer les données à l'API
        response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(stepData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();

        // Si c'est la première étape, sauvegarder l'ID du patient
        if (currentStep === 1) {
            patientId = data._id || data.id;
        }

        return true;
    } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        throw new Error(`Erreur lors de la sauvegarde des données : ${error.message}`);
    }
}

// Soumission finale du formulaire
form.addEventListener('submit', async function (e) {
    e.preventDefault();

    try {
        // Sauvegarder les données de la dernière étape
        const saved = await saveStepData();
        if (saved) {
            // Afficher un message de succès
            alert('Patient enregistré avec succès !');
            // Redirection vers la liste des patients
            window.location.href = 'liste-patients.html';
        }
    } catch (error) {
        console.error('Erreur détaillée:', error);
        alert(`Une erreur est survenue lors de l'enregistrement du patient :\n\n${error.message}`);
    }
});

// Gestionnaire d'événements pour le bouton "Suivant"
nextBtn.addEventListener('click', async () => {
    if (currentStep < totalSteps) {
        // Valider les champs de l'étape actuelle
        if (validateCurrentStep()) {
            // Sauvegarder les données de l'étape actuelle
            const saved = await saveStepData();
            if (saved) {
                currentStep++;
                updateStepDisplay();
            }
        } else {
            alert('Veuillez remplir tous les champs obligatoires');
        }
    }
});

// Gestionnaire d'événements pour le bouton "Précédent"
prevBtn.addEventListener('click', () => {
    if (currentStep > 1) {
        currentStep--;
        updateStepDisplay();
    }
});

// Initialisation
updateStepDisplay();
handleConditionalFields(); 