const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const htmlPdf = require('html-pdf-node');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Connexion à MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pharmacie-clinique', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connecté à MongoDB'))
.catch(err => console.error('Erreur de connexion à MongoDB:', err));

// Configuration de multer pour l'upload de fichiers
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/documents';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        // Accepter les images et les PDFs
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Format de fichier non supporté. Seuls les images et les PDFs sont acceptés.'));
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // Limite à 5MB
    }
});

// Modèle Patient (Informations Générales)
const patientSchema = new mongoose.Schema({
    dateEntretien: Date,
    numeroDossier: Number,
    nom: String,
    prenom: String,
    dateNaissance: Date,
    telephone: String,
    profession: String,
    assurance: String,
    adresse: String,
    medecinTraitant: String,
    archived: { type: Boolean, default: false },
    documentPath: String,
    documentType: String,
    documentName: String
}, { timestamps: true });

// Modèle Antécédents
const antecedentsSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    tValue: String,
    nValue: String,
    mValue: String,
    protocole: String,
    antecedentsMedicaux: String,
    antecedentsChirurgicaux: String,
    antecedentsFamiliaux: String,
    hygieneVie: String,
    alertes: String,
    habitudesToxiques: String
}, { timestamps: true });

// Modèle Médicaments
const medicamentsSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    allergieMedi: String,
    medicament: String,
    automedication: String,
    medicamentAutomed: String,
    complements: String,
    complement: String,
    phytotherapie: String,
    phytotherapieDetails: String,
    vaccination: String,
    vaccinsEffectues: String,
    atb: String,
    antibiotiques: String
}, { timestamps: true });

// Modèle Prescription
const prescriptionSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    indication: String,
    medication: String,
    posologie: String,
    debut: Date,
    fin: Date,
    commentaire: String
}, { timestamps: true });

// Modèle Suivi
const suiviSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    date_suivi: Date,
    type_examen: String,
    resultat_analyse: String,
    unite_mesure: String,
    effets_secondaires: String,
    poids_surface: String,
    pression_arterielle: String,
    resultat_imagerie: String
}, { timestamps: true });

// Modèle Évaluation
const evaluationSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    dateEval: Date,
    typePLM: String,
    sousType: String,
    medicament: String,
    intervention: String,
    objectifs: String,
    suivi: String,
    pieceJointe: { type: String, default: '' }
}, { timestamps: true });

// Modèle Historique des Modifications
const historiqueSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    champ: String,
    ancienneValeur: String,
    nouvelleValeur: String,
    dateModification: { type: Date, default: Date.now },
    typeDonnee: String, // 'patient', 'antecedents', 'medicaments', 'prescription', 'suivi', 'evaluation'
    sessionId: String // Identifiant unique pour chaque session de modification
}, { timestamps: true });

// Création des modèles
const Patient = mongoose.model('Patient', patientSchema);
const Antecedents = mongoose.model('Antecedents', antecedentsSchema);
const Medicaments = mongoose.model('Medicaments', medicamentsSchema);
const Prescription = mongoose.model('Prescription', prescriptionSchema);
const Suivi = mongoose.model('Suivi', suiviSchema);
const Evaluation = mongoose.model('Evaluation', evaluationSchema);
const Historique = mongoose.model('Historique', historiqueSchema);

// Fonction utilitaire pour enregistrer les modifications
async function enregistrerModification(patientId, champ, ancienneValeur, nouvelleValeur, typeDonnee, sessionId) {
    // Liste des champs à exclure (uniquement les dates)
    const excludedFields = [
        'dateEntretien',
        'dateNaissance',
        'debut',
        'fin',
        'date_suivi',
        'dateEval',
        'patientId',
        'numeroDossier'
    ];

    // Ne pas enregistrer les modifications pour les champs exclus
    if (excludedFields.includes(champ)) {
        return;
    }

    // Ne pas enregistrer si la nouvelle valeur est vide
    if (!nouvelleValeur || nouvelleValeur.trim() === '') {
        return;
    }

    // Nettoyer les valeurs pour la comparaison
    const cleanAncienneValeur = ancienneValeur ? ancienneValeur.toString().trim() : '';
    const cleanNouvelleValeur = nouvelleValeur.toString().trim();

    // Ne pas enregistrer si les valeurs sont identiques après nettoyage
    if (cleanAncienneValeur === cleanNouvelleValeur) {
        return;
    }

    // Vérifier s'il existe déjà une entrée d'historique pour cette session
    const derniereModification = await Historique.findOne({
        patientId,
        typeDonnee,
        sessionId
    });

    if (derniereModification) {
        // Mettre à jour l'entrée existante
        derniereModification.champ = `${derniereModification.champ}, ${champ}`;
        derniereModification.ancienneValeur = `${derniereModification.ancienneValeur}, ${cleanAncienneValeur}`;
        derniereModification.nouvelleValeur = `${derniereModification.nouvelleValeur}, ${cleanNouvelleValeur}`;
        await derniereModification.save();
    } else {
        // Créer une nouvelle entrée
        const historique = new Historique({
            patientId,
            champ,
            ancienneValeur: cleanAncienneValeur,
            nouvelleValeur: cleanNouvelleValeur,
            typeDonnee,
            sessionId
        });
        await historique.save();
    }
}

// Routes API pour les patients
app.get('/api/patients', async (req, res) => {
    try {
        const patients = await Patient.find().sort({ createdAt: -1 });
        res.json(patients);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/patients', async (req, res) => {
    try {
        const patient = new Patient(req.body);
        const savedPatient = await patient.save();
        res.status(201).json(savedPatient);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.put('/api/patients/:id', async (req, res) => {
    try {
        const ancienPatient = await Patient.findById(req.params.id);
        if (!ancienPatient) {
            return res.status(404).json({ message: 'Patient non trouvé' });
        }

        const sessionId = new Date().getTime().toString(); // Générer un ID de session unique

        // Enregistrer les modifications pour chaque champ
        for (const [champ, nouvelleValeur] of Object.entries(req.body)) {
            await enregistrerModification(
                req.params.id,
                champ,
                ancienPatient[champ],
                nouvelleValeur,
                'patient',
                sessionId
            );
        }

        const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(patient);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Routes API pour les antécédents
app.post('/api/antecedents', async (req, res) => {
    try {
        const antecedents = new Antecedents(req.body);
        const savedAntecedents = await antecedents.save();
        res.status(201).json(savedAntecedents);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.put('/api/antecedents/:patientId', async (req, res) => {
    try {
        const ancienAntecedents = await Antecedents.findOne({ patientId: req.params.patientId });
        
        const sessionId = new Date().getTime().toString(); // Générer un ID de session unique

        // Enregistrer les modifications pour chaque champ
        for (const [champ, nouvelleValeur] of Object.entries(req.body)) {
            await enregistrerModification(
                req.params.patientId,
                champ,
                ancienAntecedents ? ancienAntecedents[champ] : null,
                nouvelleValeur,
                'antecedents',
                sessionId
            );
        }

        const antecedents = await Antecedents.findOneAndUpdate(
            { patientId: req.params.patientId },
            req.body,
            { new: true, upsert: true }
        );
        res.json(antecedents);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Routes API pour les médicaments
app.post('/api/medicaments', async (req, res) => {
    try {
        const medicaments = new Medicaments(req.body);
        const savedMedicaments = await medicaments.save();
        res.status(201).json(savedMedicaments);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.put('/api/medicaments/:patientId', async (req, res) => {
    try {
        const ancienMedicaments = await Medicaments.findOne({ patientId: req.params.patientId });
        
        const sessionId = new Date().getTime().toString(); // Générer un ID de session unique

        // Enregistrer les modifications pour chaque champ
        for (const [champ, nouvelleValeur] of Object.entries(req.body)) {
            await enregistrerModification(
                req.params.patientId,
                champ,
                ancienMedicaments ? ancienMedicaments[champ] : null,
                nouvelleValeur,
                'medicaments',
                sessionId
            );
        }

        const medicaments = await Medicaments.findOneAndUpdate(
            { patientId: req.params.patientId },
            req.body,
            { new: true, upsert: true }
        );
        res.json(medicaments);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Routes API pour les prescriptions
app.post('/api/prescriptions', async (req, res) => {
    try {
        const prescription = new Prescription(req.body);
        const savedPrescription = await prescription.save();
        res.status(201).json(savedPrescription);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.put('/api/prescriptions/:patientId', async (req, res) => {
    try {
        const anciennePrescription = await Prescription.findOne({ patientId: req.params.patientId });
        
        const sessionId = new Date().getTime().toString(); // Générer un ID de session unique

        // Enregistrer les modifications pour chaque champ
        for (const [champ, nouvelleValeur] of Object.entries(req.body)) {
            await enregistrerModification(
                req.params.patientId,
                champ,
                anciennePrescription ? anciennePrescription[champ] : null,
                nouvelleValeur,
                'prescription',
                sessionId
            );
        }

        const prescription = await Prescription.findOneAndUpdate(
            { patientId: req.params.patientId },
            req.body,
            { new: true, upsert: true }
        );
        res.json(prescription);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Routes API pour le suivi
app.post('/api/suivi', async (req, res) => {
    try {
        const suivi = new Suivi(req.body);
        const savedSuivi = await suivi.save();
        res.status(201).json(savedSuivi);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.put('/api/suivi/:patientId', async (req, res) => {
    try {
        const ancienSuivi = await Suivi.findOne({ patientId: req.params.patientId });
        
        const sessionId = new Date().getTime().toString(); // Générer un ID de session unique

        // Enregistrer les modifications pour chaque champ
        for (const [champ, nouvelleValeur] of Object.entries(req.body)) {
            await enregistrerModification(
                req.params.patientId,
                champ,
                ancienSuivi ? ancienSuivi[champ] : null,
                nouvelleValeur,
                'suivi',
                sessionId
            );
        }

        const suivi = await Suivi.findOneAndUpdate(
            { patientId: req.params.patientId },
            req.body,
            { new: true, upsert: true }
        );
        res.json(suivi);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Routes API pour l'évaluation
app.post('/api/evaluation', async (req, res) => {
    try {
        console.log('Données d\'évaluation reçues:', req.body);
        const evaluation = new Evaluation(req.body);
        const savedEvaluation = await evaluation.save();
        console.log('Évaluation sauvegardée:', savedEvaluation);
        res.status(201).json(savedEvaluation);
    } catch (error) {
        console.error('Erreur lors de la sauvegarde de l\'évaluation:', error);
        res.status(400).json({ message: error.message });
    }
});

app.put('/api/evaluation/:patientId', async (req, res) => {
    try {
        console.log('Mise à jour évaluation pour patient:', req.params.patientId);
        console.log('Données reçues:', req.body);
        
        const ancienneEvaluation = await Evaluation.findOne({ patientId: req.params.patientId });
        console.log('Ancienne évaluation:', ancienneEvaluation);
        
        const sessionId = new Date().getTime().toString();

        // Enregistrer les modifications pour chaque champ
        for (const [champ, nouvelleValeur] of Object.entries(req.body)) {
            await enregistrerModification(
                req.params.patientId,
                champ,
                ancienneEvaluation ? ancienneEvaluation[champ] : null,
                nouvelleValeur,
                'evaluation',
                sessionId
            );
        }

        const evaluation = await Evaluation.findOneAndUpdate(
            { patientId: req.params.patientId },
            req.body,
            { new: true, upsert: true }
        );
        console.log('Évaluation mise à jour:', evaluation);
        res.json(evaluation);
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'évaluation:', error);
        res.status(400).json({ message: error.message });
    }
});

// Routes API pour l'historique
app.get('/api/historique/:patientId', async (req, res) => {
    try {
        console.log('Récupération historique pour patient:', req.params.patientId);
        const historique = await Historique.find({ patientId: req.params.patientId })
            .sort({ dateModification: -1 })
            .lean();

        // Liste des champs à exclure
        const excludedFields = [
            'dateEntretien',
            'dateNaissance',
            'debut',
            'fin',
            'date_suivi',
            'dateEval',
            'patientId',
            'numeroDossier'
        ];

        // Transformer l'historique pour séparer les modifications groupées
        const historiqueDetaille = historique.flatMap(entry => {
            const champs = entry.champ.split(', ');
            const anciennesValeurs = entry.ancienneValeur.split(', ');
            const nouvellesValeurs = entry.nouvelleValeur.split(', ');

            return champs.map((champ, index) => {
                // Ne pas inclure les champs exclus
                if (excludedFields.includes(champ)) {
                    return null;
                }

                return {
                    dateModification: entry.dateModification,
                    champ: champ,
                    ancienneValeur: anciennesValeurs[index],
                    nouvelleValeur: nouvellesValeurs[index],
                    typeDonnee: entry.typeDonnee
                };
            }).filter(Boolean); // Filtrer les entrées null
        });

        console.log('Historique détaillé:', historiqueDetaille);
        res.json(historiqueDetaille);
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'historique:', error);
        res.status(500).json({ message: error.message });
    }
});

// Route pour récupérer toutes les données d'un patient
app.get('/api/patients/:id/complete', async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ message: 'Patient non trouvé' });
        }

        const [antecedents, medicaments, prescription, suivi, evaluation, historique] = await Promise.all([
            Antecedents.findOne({ patientId: patient._id }),
            Medicaments.findOne({ patientId: patient._id }),
            Prescription.findOne({ patientId: patient._id }),
            Suivi.findOne({ patientId: patient._id }),
            Evaluation.findOne({ patientId: patient._id }),
            Historique.find({ patientId: patient._id }).sort({ dateModification: -1 })
        ]);

        res.json({
            patient,
            antecedents,
            medicaments,
            prescription,
            suivi,
            evaluation,
            historique
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Route pour l'upload de document
app.post('/api/patients/:id/document', upload.single('document'), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ message: 'Patient non trouvé' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Aucun fichier n\'a été uploadé' });
        }

        // Supprimer l'ancien document s'il existe
        if (patient.documentPath && fs.existsSync(patient.documentPath)) {
            fs.unlinkSync(patient.documentPath);
        }

        // Mettre à jour les informations du document
        patient.documentPath = req.file.path;
        patient.documentType = req.file.mimetype;
        patient.documentName = req.file.originalname;
        await patient.save();

        res.json({ message: 'Document uploadé avec succès', document: patient.documentPath });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ message: error.message });
    }
});

// Modifier la route de génération du PDF pour inclure toutes les informations du patient
app.get('/api/patients/:id/pdf', async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ message: 'Patient non trouvé' });
        }

        // Récupérer toutes les données associées au patient
        const [antecedents, medicaments, prescription, suivi, evaluation] = await Promise.all([
            Antecedents.findOne({ patientId: patient._id }),
            Medicaments.findOne({ patientId: patient._id }),
            Prescription.findOne({ patientId: patient._id }),
            Suivi.findOne({ patientId: patient._id }),
            Evaluation.findOne({ patientId: patient._id })
        ]);

        // Convertir l'image en base64 si elle existe
        let imageBase64 = '';
        if (patient.documentPath && patient.documentType.startsWith('image/')) {
            const imageBuffer = fs.readFileSync(patient.documentPath);
            imageBase64 = `data:${patient.documentType};base64,${imageBuffer.toString('base64')}`;
        }

        // Générer le HTML avec toutes les informations
        let html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .section { margin-bottom: 20px; }
                    .section-title { color: #6C63FF; font-size: 18px; margin-bottom: 15px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    th, td { padding: 8px; border: 1px solid #ddd; }
                    th { background-color: #f5f5f5; text-align: left; }
                    .document-section { margin-top: 30px; }
                    .document-image { max-width: 100%; height: auto; margin-top: 10px; }
                    .page-break { page-break-after: always; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Dossier Patient</h1>
                </div>
                
                <div class="section">
                    <h2 class="section-title">Informations Générales</h2>
                    <table>
                        <tr>
                            <th>N° Dossier</th>
                            <td>${patient.numeroDossier || '-'}</td>
                        </tr>
                        <tr>
                            <th>Nom</th>
                            <td>${patient.nom || '-'}</td>
                        </tr>
                        <tr>
                            <th>Prénom</th>
                            <td>${patient.prenom || '-'}</td>
                        </tr>
                        <tr>
                            <th>Date de Naissance</th>
                            <td>${patient.dateNaissance ? new Date(patient.dateNaissance).toLocaleDateString('fr-FR') : '-'}</td>
                        </tr>
                        <tr>
                            <th>Téléphone</th>
                            <td>${patient.telephone || '-'}</td>
                        </tr>
                        <tr>
                            <th>Profession</th>
                            <td>${patient.profession || '-'}</td>
                        </tr>
                        <tr>
                            <th>Assurance</th>
                            <td>${patient.assurance || '-'}</td>
                        </tr>
                        <tr>
                            <th>Médecin Traitant</th>
                            <td>${patient.medecinTraitant || '-'}</td>
                        </tr>
                    </table>
                </div>

                ${antecedents ? `
                <div class="section">
                    <h2 class="section-title">Antécédents</h2>
                    <table>
                        <tr>
                            <th>T Value</th>
                            <td>${antecedents.tValue || '-'}</td>
                        </tr>
                        <tr>
                            <th>N Value</th>
                            <td>${antecedents.nValue || '-'}</td>
                        </tr>
                        <tr>
                            <th>M Value</th>
                            <td>${antecedents.mValue || '-'}</td>
                        </tr>
                        <tr>
                            <th>Protocole</th>
                            <td>${antecedents.protocole || '-'}</td>
                        </tr>
                        <tr>
                            <th>Antécédents Médicaux</th>
                            <td>${antecedents.antecedentsMedicaux || '-'}</td>
                        </tr>
                        <tr>
                            <th>Antécédents Chirurgicaux</th>
                            <td>${antecedents.antecedentsChirurgicaux || '-'}</td>
                        </tr>
                        <tr>
                            <th>Antécédents Familiaux</th>
                            <td>${antecedents.antecedentsFamiliaux || '-'}</td>
                        </tr>
                        <tr>
                            <th>Hygiène de Vie</th>
                            <td>${antecedents.hygieneVie || '-'}</td>
                        </tr>
                        <tr>
                            <th>Alertes</th>
                            <td>${antecedents.alertes || '-'}</td>
                        </tr>
                        <tr>
                            <th>Habitudes Toxiques</th>
                            <td>${antecedents.habitudesToxiques || '-'}</td>
                        </tr>
                    </table>
                </div>
                ` : ''}

                ${medicaments ? `
                <div class="section">
                    <h2 class="section-title">Médicaments</h2>
                    <table>
                        <tr>
                            <th>Allergie Médicamenteuse</th>
                            <td>${medicaments.allergieMedi || '-'}</td>
                        </tr>
                        <tr>
                            <th>Médicament</th>
                            <td>${medicaments.medicament || '-'}</td>
                        </tr>
                        <tr>
                            <th>Automédication</th>
                            <td>${medicaments.automedication || '-'}</td>
                        </tr>
                        <tr>
                            <th>Médicaments en Automédication</th>
                            <td>${medicaments.medicamentAutomed || '-'}</td>
                        </tr>
                        <tr>
                            <th>Compléments</th>
                            <td>${medicaments.complements || '-'}</td>
                        </tr>
                        <tr>
                            <th>Détails des Compléments</th>
                            <td>${medicaments.complement || '-'}</td>
                        </tr>
                        <tr>
                            <th>Phytothérapie</th>
                            <td>${medicaments.phytotherapie || '-'}</td>
                        </tr>
                        <tr>
                            <th>Détails Phytothérapie</th>
                            <td>${medicaments.phytotherapieDetails || '-'}</td>
                        </tr>
                        <tr>
                            <th>Vaccination</th>
                            <td>${medicaments.vaccination || '-'}</td>
                        </tr>
                        <tr>
                            <th>Vaccins Effectués</th>
                            <td>${medicaments.vaccinsEffectues || '-'}</td>
                        </tr>
                        <tr>
                            <th>Antibiotiques</th>
                            <td>${medicaments.atb || '-'}</td>
                        </tr>
                        <tr>
                            <th>Détails Antibiotiques</th>
                            <td>${medicaments.antibiotiques || '-'}</td>
                        </tr>
                    </table>
                </div>
                ` : ''}

                ${prescription ? `
                <div class="section">
                    <h2 class="section-title">Prescription</h2>
                    <table>
                        <tr>
                            <th>Indication</th>
                            <td>${prescription.indication || '-'}</td>
                        </tr>
                        <tr>
                            <th>Médication</th>
                            <td>${prescription.medication || '-'}</td>
                        </tr>
                        <tr>
                            <th>Posologie</th>
                            <td>${prescription.posologie || '-'}</td>
                        </tr>
                        <tr>
                            <th>Date de Début</th>
                            <td>${prescription.debut ? new Date(prescription.debut).toLocaleDateString('fr-FR') : '-'}</td>
                        </tr>
                        <tr>
                            <th>Date de Fin</th>
                            <td>${prescription.fin ? new Date(prescription.fin).toLocaleDateString('fr-FR') : '-'}</td>
                        </tr>
                        <tr>
                            <th>Commentaire</th>
                            <td>${prescription.commentaire || '-'}</td>
                        </tr>
                    </table>
                </div>
                ` : ''}

                ${suivi ? `
                <div class="section">
                    <h2 class="section-title">Suivi</h2>
                    <table>
                        <tr>
                            <th>Date de Suivi</th>
                            <td>${suivi.date_suivi ? new Date(suivi.date_suivi).toLocaleDateString('fr-FR') : '-'}</td>
                        </tr>
                        <tr>
                            <th>Type d'Examen</th>
                            <td>${suivi.type_examen || '-'}</td>
                        </tr>
                        <tr>
                            <th>Résultat d'Analyse</th>
                            <td>${suivi.resultat_analyse || '-'}</td>
                        </tr>
                        <tr>
                            <th>Unité de Mesure</th>
                            <td>${suivi.unite_mesure || '-'}</td>
                        </tr>
                        <tr>
                            <th>Effets Secondaires</th>
                            <td>${suivi.effets_secondaires || '-'}</td>
                        </tr>
                        <tr>
                            <th>Poids/Surface</th>
                            <td>${suivi.poids_surface || '-'}</td>
                        </tr>
                        <tr>
                            <th>Pression Artérielle</th>
                            <td>${suivi.pression_arterielle || '-'}</td>
                        </tr>
                        <tr>
                            <th>Résultat d'Imagerie</th>
                            <td>${suivi.resultat_imagerie || '-'}</td>
                        </tr>
                    </table>
                </div>
                ` : ''}

                ${evaluation ? `
                <div class="section">
                    <h2 class="section-title">Évaluation</h2>
                    <table>
                        <tr>
                            <th>Date d'Évaluation</th>
                            <td>${evaluation.dateEval ? new Date(evaluation.dateEval).toLocaleDateString('fr-FR') : '-'}</td>
                        </tr>
                        <tr>
                            <th>Type PLM</th>
                            <td>${evaluation.typePLM || '-'}</td>
                        </tr>
                        <tr>
                            <th>Sous-type</th>
                            <td>${evaluation.sousType || '-'}</td>
                        </tr>
                        <tr>
                            <th>Médicament</th>
                            <td>${evaluation.medicament || '-'}</td>
                        </tr>
                        <tr>
                            <th>Intervention</th>
                            <td>${evaluation.intervention || '-'}</td>
                        </tr>
                        <tr>
                            <th>Objectifs</th>
                            <td>${evaluation.objectifs || '-'}</td>
                        </tr>
                        <tr>
                            <th>Suivi</th>
                            <td>${evaluation.suivi || '-'}</td>
                        </tr>
                    </table>
                </div>
                ` : ''}

                ${patient.documentPath ? `
                <div class="document-section">
                    <h2 class="section-title">Document Joint</h2>
                    ${patient.documentType.startsWith('image/') ? 
                        `<img src="${imageBase64}" class="document-image" />` :
                        `<p>Document PDF: ${patient.documentName}</p>`
                    }
                </div>
                ` : ''}

                <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #666;">
                    Document généré le ${new Date().toLocaleDateString('fr-FR')}
                </div>
            </body>
            </html>
        `;

        // Options optimisées pour la génération du PDF
        const options = {
            format: 'A4',
            margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
            printBackground: true,
            preferCSSPageSize: true,
            timeout: 0
        };

        // Générer le PDF
        const file = { content: html };
        const pdfBuffer = await htmlPdf.generatePdf(file, options);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=patient_${patient._id}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ message: error.message });
    }
});

// Route pour archiver un patient
app.put('/api/patients/:id/archive', async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ message: 'Patient non trouvé' });
        }

        // Enregistrer la modification dans l'historique
        await enregistrerModification(
            req.params.id,
            'archived',
            patient.archived,
            true,
            'patient',
            new Date().getTime().toString()
        );

        patient.archived = true;
        await patient.save();
        res.json(patient);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Route pour restaurer un patient
app.put('/api/patients/:id/restore', async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ message: 'Patient non trouvé' });
        }

        // Enregistrer la modification dans l'historique
        await enregistrerModification(
            req.params.id,
            'archived',
            patient.archived,
            false,
            'patient',
            new Date().getTime().toString()
        );

        patient.archived = false;
        await patient.save();
        res.json(patient);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Route pour récupérer l'historique des versions d'un patient
app.get('/api/patients/:id/history', async (req, res) => {
    try {
        const patientId = req.params.id;
        const historique = await Historique.find({ patientId })
            .sort({ dateModification: -1 }) // Trier par date décroissante
            .lean();

        // Récupérer les données actuelles du patient
        const [patient, antecedents, medicaments, prescription, suivi, evaluation] = await Promise.all([
            Patient.findById(patientId).lean(),
            Antecedents.findOne({ patientId }).lean(),
            Medicaments.findOne({ patientId }).lean(),
            Prescription.findOne({ patientId }).lean(),
            Suivi.findOne({ patientId }).lean(),
            Evaluation.findOne({ patientId }).lean()
        ]);

        // Regrouper les modifications par sessionId
        const sessions = {};
        historique.forEach(modif => {
            if (!sessions[modif.sessionId]) {
                sessions[modif.sessionId] = {
                    dateModification: modif.dateModification,
                    typeDonnee: modif.typeDonnee,
                    modifications: []
                };
            }
            sessions[modif.sessionId].modifications.push(modif);
        });

        // Transformer les sessions en versions
        const versions = Object.values(sessions).map(session => {
            // Créer une copie des données actuelles
            const data = {
                ...patient,
                ...antecedents,
                ...medicaments,
                ...prescription,
                ...suivi,
                ...evaluation
            };

            // Liste des champs modifiés pour cette session
            const modifiedFields = [];

            // Créer un objet pour stocker les anciennes valeurs de chaque champ
            const oldValues = {};

            // Appliquer toutes les modifications de la session
            session.modifications.forEach(modif => {
                const champs = modif.champ.split(', ');
                const anciennesValeurs = modif.ancienneValeur.split(', ');
                const nouvellesValeurs = modif.nouvelleValeur.split(', ');

                champs.forEach((champ, index) => {
                    if (champ in data) {
                        // Stocker l'ancienne valeur pour ce champ
                        oldValues[champ] = anciennesValeurs[index];
                        // Ajouter le champ à la liste des champs modifiés
                        if (!modifiedFields.includes(champ)) {
                            modifiedFields.push(champ);
                        }
                    }
                });
            });

            // Appliquer les anciennes valeurs à chaque champ
            Object.entries(oldValues).forEach(([champ, valeur]) => {
                data[champ] = valeur;
            });

            return {
                date: session.dateModification,
                type: session.typeDonnee,
                data: {
                    ...data,
                    modifiedFields: modifiedFields
                }
            };
        });

        res.json(versions);
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'historique:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération de l\'historique' });
    }
});

// Gestion des fichiers statiques
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/ajouter-patient', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'ajouter-patient.html'));
});

app.get('/liste-patients', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'liste-patients.html'));
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
}); 