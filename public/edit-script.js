// Récupérer l'ID du patient depuis l'URL
const urlParams = new URLSearchParams(window.location.search);
const patientId = urlParams.get('id');

// Fonction pour formater les dates
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}

// Fonction pour basculer l'affichage des champs de texte
function toggleTextInput(selectId, inputGroupId) {
    const select = document.getElementById(selectId);
    const inputGroup = document.getElementById(inputGroupId + 'Group');
    if (!select || !inputGroup) return;
    
    if (select.value === 'oui') {
        inputGroup.style.display = 'block';
    } else {
        inputGroup.style.display = 'none';
        const input = document.getElementById(inputGroupId);
        if (input) input.value = '';
    }
}

// Fonction pour charger les données du patient
async function loadPatientData() {
    try {
        if (!patientId) {
            throw new Error('ID du patient manquant');
        }

        const response = await fetch(`/api/patients/${patientId}/complete`);
        if (!response.ok) {
            throw new Error('Erreur lors du chargement des données du patient');
        }
        const data = await response.json();
        
        // Fonction utilitaire pour définir la valeur d'un élément de manière sécurisée
        const setElementValue = (elementId, value) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.value = value || '';
            }
        };

        // Remplir les informations générales
        setElementValue('numeroDossier', data.patient?.numeroDossier);
        setElementValue('nom', data.patient?.nom);
        setElementValue('prenom', data.patient?.prenom);
        setElementValue('dateNaissance', formatDate(data.patient?.dateNaissance));
        setElementValue('telephone', data.patient?.telephone);
        setElementValue('profession', data.patient?.profession);
        setElementValue('assurance', data.patient?.assurance);
        setElementValue('medecinTraitant', data.patient?.medecinTraitant);
        setElementValue('adresse', data.patient?.adresse);

        // Remplir les antécédents
        if (data.antecedents) {
            setElementValue('tValue', data.antecedents.tValue);
            setElementValue('nValue', data.antecedents.nValue);
            setElementValue('mValue', data.antecedents.mValue);
            setElementValue('protocole', data.antecedents.protocole);
            setElementValue('antecedentsMedicaux', data.antecedents.antecedentsMedicaux);
            setElementValue('antecedentsChirurgicaux', data.antecedents.antecedentsChirurgicaux);
            setElementValue('antecedentsFamiliaux', data.antecedents.antecedentsFamiliaux);
            setElementValue('hygieneVie', data.antecedents.hygieneVie);
            setElementValue('alertes', data.antecedents.alertes);
            setElementValue('habitudesToxiques', data.antecedents.habitudesToxiques);
        }

        // Remplir les médicaments
        if (data.medicaments) {
            setElementValue('allergieMedi', data.medicaments.allergieMedi || 'non');
            toggleTextInput('allergieMedi', 'medicament');
            setElementValue('medicament', data.medicaments.medicament);

            setElementValue('automedication', data.medicaments.automedication || 'non');
            toggleTextInput('automedication', 'medicamentAutomed');
            setElementValue('medicamentAutomed', data.medicaments.medicamentAutomed);

            setElementValue('complements', data.medicaments.complements || 'non');
            toggleTextInput('complements', 'complement');
            setElementValue('complement', data.medicaments.complement);

            setElementValue('phytotherapie', data.medicaments.phytotherapie || 'non');
            toggleTextInput('phytotherapie', 'phytotherapieDetails');
            setElementValue('phytotherapieDetails', data.medicaments.phytotherapieDetails);

            setElementValue('vaccination', data.medicaments.vaccination || 'non');
            toggleTextInput('vaccination', 'vaccinsEffectues');
            setElementValue('vaccinsEffectues', data.medicaments.vaccinsEffectues);

            setElementValue('atb', data.medicaments.atb || 'non');
            toggleTextInput('atb', 'antibiotiques');
            setElementValue('antibiotiques', data.medicaments.antibiotiques);
        }

        // Remplir la prescription
        if (data.prescription) {
            setElementValue('indication', data.prescription.indication);
            setElementValue('medication', data.prescription.medication);
            setElementValue('posologie', data.prescription.posologie);
            setElementValue('debut', formatDate(data.prescription.debut));
            setElementValue('fin', formatDate(data.prescription.fin));
            setElementValue('commentaire', data.prescription.commentaire);
        }

        // Remplir le suivi
        if (data.suivi) {
            setElementValue('date_suivi', formatDate(data.suivi.date_suivi));
            setElementValue('type_examen', data.suivi.type_examen);
            setElementValue('resultat_analyse', data.suivi.resultat_analyse);
            setElementValue('unite_mesure', data.suivi.unite_mesure);
            setElementValue('effets_secondaires', data.suivi.effets_secondaires);
            setElementValue('poids_surface', data.suivi.poids_surface);
            setElementValue('pression_arterielle', data.suivi.pression_arterielle);
            setElementValue('resultat_imagerie', data.suivi.resultat_imagerie);
        }

        // Remplir l'évaluation
        if (data.evaluation) {
            setElementValue('dateEval', formatDate(data.evaluation.dateEval));
            setElementValue('typePLM', data.evaluation.typePLM);
            setElementValue('sousType', data.evaluation.sousType);
            setElementValue('medicamentEval', data.evaluation.medicament);
            setElementValue('intervention', data.evaluation.intervention);
            setElementValue('objectifs', data.evaluation.objectifs);
            setElementValue('suivi', data.evaluation.suivi);
        }

    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors du chargement des données du patient');
    }
}

// Fonction pour gérer les réponses de l'API
async function handleApiResponse(response, errorMessage) {
    if (!response.ok) {
        let errorDetail;
        try {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const errorData = await response.json();
                errorDetail = errorData.message;
            } else {
                errorDetail = `Erreur HTTP ${response.status}: ${response.statusText}`;
            }
        } catch (e) {
            errorDetail = `Erreur HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(`${errorMessage}: ${errorDetail}`);
    }
    return response;
}

// Fonction pour sauvegarder les données du patient
async function savePatientData() {
    try {
        if (!patientId) {
            throw new Error('ID du patient manquant');
        }

        // Fonction utilitaire pour récupérer la valeur d'un élément de manière sécurisée
        const getElementValue = (elementId) => {
            const element = document.getElementById(elementId);
            return element ? element.value : '';
        };

        // Récupérer les données du formulaire
        const patientData = {
            numeroDossier: getElementValue('numeroDossier'),
            nom: getElementValue('nom'),
            prenom: getElementValue('prenom'),
            dateNaissance: getElementValue('dateNaissance'),
            telephone: getElementValue('telephone'),
            profession: getElementValue('profession'),
            assurance: getElementValue('assurance'),
            medecinTraitant: getElementValue('medecinTraitant'),
            adresse: getElementValue('adresse')
        };

        const antecedentsData = {
            patientId: patientId,
            tValue: getElementValue('tValue'),
            nValue: getElementValue('nValue'),
            mValue: getElementValue('mValue'),
            protocole: getElementValue('protocole'),
            antecedentsMedicaux: getElementValue('antecedentsMedicaux'),
            antecedentsChirurgicaux: getElementValue('antecedentsChirurgicaux'),
            antecedentsFamiliaux: getElementValue('antecedentsFamiliaux'),
            hygieneVie: getElementValue('hygieneVie'),
            alertes: getElementValue('alertes'),
            habitudesToxiques: getElementValue('habitudesToxiques')
        };

        const medicamentsData = {
            patientId: patientId,
            allergieMedi: getElementValue('allergieMedi'),
            medicament: getElementValue('medicament'),
            automedication: getElementValue('automedication'),
            medicamentAutomed: getElementValue('medicamentAutomed'),
            complements: getElementValue('complements'),
            complement: getElementValue('complement'),
            phytotherapie: getElementValue('phytotherapie'),
            phytotherapieDetails: getElementValue('phytotherapieDetails'),
            vaccination: getElementValue('vaccination'),
            vaccinsEffectues: getElementValue('vaccinsEffectues'),
            atb: getElementValue('atb'),
            antibiotiques: getElementValue('antibiotiques')
        };

        const prescriptionData = {
            patientId: patientId,
            indication: getElementValue('indication'),
            medication: getElementValue('medication'),
            posologie: getElementValue('posologie'),
            debut: getElementValue('debut'),
            fin: getElementValue('fin'),
            commentaire: getElementValue('commentaire')
        };

        const suiviData = {
            patientId: patientId,
            date_suivi: getElementValue('date_suivi'),
            type_examen: getElementValue('type_examen'),
            resultat_analyse: getElementValue('resultat_analyse'),
            unite_mesure: getElementValue('unite_mesure'),
            effets_secondaires: getElementValue('effets_secondaires'),
            poids_surface: getElementValue('poids_surface'),
            pression_arterielle: getElementValue('pression_arterielle'),
            resultat_imagerie: getElementValue('resultat_imagerie')
        };

        const evaluationData = {
            patientId: patientId,
            dateEval: getElementValue('dateEval'),
            typePLM: getElementValue('typePLM'),
            sousType: getElementValue('sousType'),
            medicament: getElementValue('medicamentEval'),
            intervention: getElementValue('intervention'),
            objectifs: getElementValue('objectifs'),
            suivi: getElementValue('suivi')
        };

        // Envoyer les données au serveur
        const responses = await Promise.all([
            fetch(`/api/patients/${patientId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patientData)
            }),
            fetch(`/api/antecedents/${patientId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(antecedentsData)
            }),
            fetch(`/api/medicaments/${patientId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(medicamentsData)
            }),
            fetch(`/api/prescriptions/${patientId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(prescriptionData)
            }),
            fetch(`/api/suivi/${patientId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(suiviData)
            }),
            fetch(`/api/evaluation/${patientId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(evaluationData)
            })
        ]);

        // Vérifier les réponses
        for (const response of responses) {
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erreur lors de la mise à jour des données');
            }
        }

        // Rediriger vers la page de détails
        window.location.href = `patient-details.html?id=${patientId}`;

    } catch (error) {
        console.error('Erreur:', error);
        alert(error.message || 'Erreur lors de la mise à jour des données');
    }
}

// Gestionnaire d'événements pour le bouton de sauvegarde
document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', savePatientData);
    }

    // Charger les données du patient
    loadPatientData();
}); 