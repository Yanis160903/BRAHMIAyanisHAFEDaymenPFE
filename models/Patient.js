const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
    numeroDossier: {
        type: Number,
        required: true,
        unique: true
    },
    dateEntretien: {
        type: Date,
        required: true
    },
    nom: {
        type: String,
        required: true
    },
    prenom: {
        type: String,
        required: true
    },
    dateNaissance: {
        type: Date,
        required: true
    },
    telephone: {
        type: String,
        required: true
    },
    profession: {
        type: String,
        required: true
    },
    assurance: {
        type: String,
        required: true
    },
    adresse: {
        type: String,
        required: true
    },
    medecinTraitant: {
        type: String,
        required: true
    },
    // Antécédents
    tValue: String,
    nValue: String,
    mValue: String,
    protocole: String,
    antecedentsMedicaux: String,
    antecedentsChirurgicaux: String,
    antecedentsFamiliaux: String,
    hygieneVie: String,
    alertes: String,
    habitudesToxiques: String,
    // Médicaments
    allergieMedi: {
        type: String,
        enum: ['oui', 'non'],
        default: 'non'
    },
    medicament: String,
    automedication: {
        type: String,
        enum: ['oui', 'non'],
        default: 'non'
    },
    medicamentAutomed: String,
    complements: {
        type: String,
        enum: ['oui', 'non'],
        default: 'non'
    },
    complement: String,
    phytotherapie: {
        type: String,
        enum: ['oui', 'non'],
        default: 'non'
    },
    phytotherapieDetails: String,
    vaccination: {
        type: String,
        enum: ['oui', 'non'],
        default: 'non'
    },
    vaccinsEffectues: String,
    atb: {
        type: String,
        enum: ['oui', 'non'],
        default: 'non'
    },
    antibiotiques: String,
    // Prescription
    indication: String,
    medication: String,
    posologie: String,
    debut: Date,
    fin: Date,
    commentaire: String,
    // Suivi
    date_suivi: Date,
    type_examen: String,
    resultat_analyse: String,
    unite_mesure: String,
    effets_secondaires: String,
    poids_surface: String,
    pression_arterielle: String,
    resultat_imagerie: String,
    // Évaluation
    dateEval: Date,
    typePLM: String,
    sousType: String,
    medicamentEval: String,
    intervention: String,
    objectifs: String,
    suivi: String,
    pieceJointe: String,
    documentPath: String,
    documentType: String,
    documentName: String
}, {
    timestamps: true
});

module.exports = mongoose.model('Patient', patientSchema); 