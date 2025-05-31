// Récupérer l'ID du patient depuis l'URL
const urlParams = new URLSearchParams(window.location.search);
const patientId = urlParams.get('id');

// Fonction pour formater les dates
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
}

// Fonction pour formater les noms de champs
function formatFieldName(field) {
    return field
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
}

// Fonction pour afficher l'historique
function displayHistorique(historique) {
    const tbody = document.getElementById('historiqueBody');
    tbody.innerHTML = '';

    if (!historique || historique.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center;">Aucune modification enregistrée</td>
            </tr>
        `;
        return;
    }

    // Trier l'historique par date (du plus récent au plus ancien)
    historique.sort((a, b) => new Date(b.dateModification) - new Date(a.dateModification));

    historique.forEach(entry => {
        const row = document.createElement('tr');
        const dateModification = new Date(entry.dateModification);
        
        // Formater la valeur avant/après pour une meilleure lisibilité
        const formatValue = (value) => {
            if (value === null || value === undefined || value === '') return '-';
            if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
            if (value instanceof Date) return formatDate(value);
            return value.toString();
        };

        row.innerHTML = `
            <td>${formatDate(dateModification)}</td>
            <td>${formatFieldName(entry.champ)}</td>
            <td class="valeur-avant">${formatValue(entry.ancienneValeur)}</td>
            <td class="valeur-apres">${formatValue(entry.nouvelleValeur)}</td>
            <td>${entry.utilisateur || 'Système'}</td>
        `;

        // Ajouter des classes pour le style des valeurs modifiées
        if (entry.ancienneValeur !== entry.nouvelleValeur) {
            row.classList.add('modification');
        }

        tbody.appendChild(row);
    });
}

// Fonction pour obtenir le type de fichier
function getFileType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const types = {
        'pdf': 'Document PDF',
        'jpg': 'Image JPEG',
        'jpeg': 'Image JPEG',
        'png': 'Image PNG',
        'doc': 'Document Word',
        'docx': 'Document Word',
        'xls': 'Tableur Excel',
        'xlsx': 'Tableur Excel'
    };
    return types[ext] || 'Fichier';
}

// Fonction pour afficher les pièces jointes
function displayPieceJointe(pieceJointe) {
    const pieceJointeElement = document.getElementById('pieceJointe');
    if (!pieceJointe) {
        pieceJointeElement.textContent = 'Aucune pièce jointe';
        return;
    }

    const fileName = pieceJointe.split('/').pop();
    const fileExtension = fileName.split('.').pop().toLowerCase();
    
    // Afficher directement l'image
    if (['jpg', 'jpeg', 'png'].includes(fileExtension)) {
        // Ajouter le chemin complet vers le dossier uploads
        const imagePath = `/uploads/${pieceJointe}`;
        pieceJointeElement.innerHTML = `
            <img src="${imagePath}" alt="${fileName}" style="max-width: 100%; max-height: 400px; object-fit: contain;">
        `;
    } else if (fileExtension === 'pdf') {
        const pdfPath = `/uploads/${pieceJointe}`;
        pieceJointeElement.innerHTML = `
            <iframe src="${pdfPath}" style="width: 100%; height: 500px; border: none;"></iframe>
        `;
    } else {
        pieceJointeElement.innerHTML = `
            <div class="file-preview">
                <i class="fas fa-file-alt fa-3x"></i>
                <p>${fileName}</p>
            </div>
        `;
    }
}

// Fonction pour télécharger une pièce jointe
async function downloadPieceJointe(filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error('Erreur lors du téléchargement');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filePath.split('/').pop();
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors du téléchargement de la pièce jointe');
    }
}

// Fonction pour charger les données du patient
async function loadPatientData() {
    try {
        const response = await fetch(`/api/patients/${patientId}/complete`);
        if (!response.ok) {
            throw new Error('Erreur lors du chargement des données du patient');
        }
        const data = await response.json();
        console.log('Données complètes reçues:', data);
        
        // Remplir les informations générales
        document.getElementById('numeroDossier').textContent = data.patient.numeroDossier || '';
        document.getElementById('nom').textContent = data.patient.nom || '';
        document.getElementById('prenom').textContent = data.patient.prenom || '';
        document.getElementById('dateNaissance').textContent = formatDate(data.patient.dateNaissance) || '';
        document.getElementById('telephone').textContent = data.patient.telephone || '';
        document.getElementById('profession').textContent = data.patient.profession || '';
        document.getElementById('assurance').textContent = data.patient.assurance || '';
        document.getElementById('medecinTraitant').textContent = data.patient.medecinTraitant || '';
        document.getElementById('adresse').textContent = data.patient.adresse || '';

        // Remplir les antécédents
        if (data.antecedents) {
            document.getElementById('tValue').textContent = data.antecedents.tValue || '';
            document.getElementById('nValue').textContent = data.antecedents.nValue || '';
            document.getElementById('mValue').textContent = data.antecedents.mValue || '';
            document.getElementById('protocole').textContent = data.antecedents.protocole || '';
            document.getElementById('antecedentsMedicaux').textContent = data.antecedents.antecedentsMedicaux || '';
            document.getElementById('antecedentsChirurgicaux').textContent = data.antecedents.antecedentsChirurgicaux || '';
            document.getElementById('antecedentsFamiliaux').textContent = data.antecedents.antecedentsFamiliaux || '';
            document.getElementById('hygieneVie').textContent = data.antecedents.hygieneVie || '';
            document.getElementById('alertes').textContent = data.antecedents.alertes || '';
            document.getElementById('habitudesToxiques').textContent = data.antecedents.habitudesToxiques || '';
        }

        // Remplir les médicaments
        if (data.medicaments) {
            document.getElementById('allergieMedi').textContent = data.medicaments.allergieMedi === 'oui' ? 'Oui' : 'Non';
            document.getElementById('medicament').textContent = data.medicaments.medicament || '';
            document.getElementById('automedication').textContent = data.medicaments.automedication === 'oui' ? 'Oui' : 'Non';
            document.getElementById('medicamentAutomed').textContent = data.medicaments.medicamentAutomed || '';
            document.getElementById('complements').textContent = data.medicaments.complements === 'oui' ? 'Oui' : 'Non';
            document.getElementById('complement').textContent = data.medicaments.complement || '';
            document.getElementById('phytotherapie').textContent = data.medicaments.phytotherapie === 'oui' ? 'Oui' : 'Non';
            document.getElementById('phytotherapieDetails').textContent = data.medicaments.phytotherapieDetails || '';
            document.getElementById('vaccination').textContent = data.medicaments.vaccination === 'oui' ? 'Oui' : 'Non';
            document.getElementById('vaccinsEffectues').textContent = data.medicaments.vaccinsEffectues || '';
            document.getElementById('atb').textContent = data.medicaments.atb === 'oui' ? 'Oui' : 'Non';
            document.getElementById('antibiotiques').textContent = data.medicaments.antibiotiques || '';
        }

        // Remplir la prescription
        if (data.prescription) {
            document.getElementById('indication').textContent = data.prescription.indication || '';
            document.getElementById('medication').textContent = data.prescription.medication || '';
            document.getElementById('posologie').textContent = data.prescription.posologie || '';
            document.getElementById('debut').textContent = formatDate(data.prescription.debut) || '';
            document.getElementById('fin').textContent = formatDate(data.prescription.fin) || '';
            document.getElementById('commentaire').textContent = data.prescription.commentaire || '';
        }

        // Remplir le suivi
        if (data.suivi) {
            document.getElementById('date_suivi').textContent = formatDate(data.suivi.date_suivi) || '';
            document.getElementById('type_examen').textContent = data.suivi.type_examen || '';
            document.getElementById('resultat_analyse').textContent = data.suivi.resultat_analyse || '';
            document.getElementById('unite_mesure').textContent = data.suivi.unite_mesure || '';
            document.getElementById('effets_secondaires').textContent = data.suivi.effets_secondaires || '';
            document.getElementById('poids_surface').textContent = data.suivi.poids_surface || '';
            document.getElementById('pression_arterielle').textContent = data.suivi.pression_arterielle || '';
            document.getElementById('resultat_imagerie').textContent = data.suivi.resultat_imagerie || '';
        }

        // Remplir l'évaluation
        if (data.evaluation) {
            document.getElementById('dateEval').textContent = formatDate(data.evaluation.dateEval) || '';
            document.getElementById('typePLM').textContent = data.evaluation.typePLM || '';
            document.getElementById('sousType').textContent = data.evaluation.sousType || '';
            document.getElementById('medicamentEval').textContent = data.evaluation.medicament || '';
            document.getElementById('intervention').textContent = data.evaluation.intervention || '';
            document.getElementById('objectifs').textContent = data.evaluation.objectifs || '';
            document.getElementById('suivi').textContent = data.evaluation.suivi || '';
        }

        // Afficher l'historique
        if (data.historique) {
            console.log('Historique reçu:', data.historique);
            displayHistorique(data.historique);
        } else {
            console.log('Aucun historique trouvé');
        }

    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors du chargement des données du patient');
    }
}

// Gestionnaire d'événement pour le bouton de modification
document.getElementById('editBtn').addEventListener('click', () => {
    window.location.href = `patient-edit.html?id=${patientId}`;
});

// Charger les données au chargement de la page
document.addEventListener('DOMContentLoaded', loadPatientData); 