const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');

// Route pour obtenir le dernier numéro de dossier
router.get('/last-dossier', async (req, res) => {
    try {
        // Trouver le patient avec le plus grand numéro de dossier
        const lastPatient = await Patient.findOne()
            .sort({ numeroDossier: -1 })
            .select('numeroDossier');

        // Si aucun patient n'existe, retourner 0
        const lastDossierNumber = lastPatient ? lastPatient.numeroDossier : 0;
        
        res.json({ lastDossierNumber });
    } catch (error) {
        console.error('Erreur lors de la récupération du dernier numéro de dossier:', error);
        res.status(500).json({ 
            message: 'Erreur lors de la récupération du dernier numéro de dossier',
            error: error.message 
        });
    }
});

// Route pour créer un nouveau patient
router.post('/', async (req, res) => {
    try {
        const patient = new Patient(req.body);
        await patient.save();
        res.status(201).json(patient);
    } catch (error) {
        console.error('Erreur lors de la création du patient:', error);
        res.status(500).json({ 
            message: 'Erreur lors de la création du patient',
            error: error.message 
        });
    }
});

// Route pour obtenir tous les patients
router.get('/', async (req, res) => {
    try {
        const patients = await Patient.find().sort({ numeroDossier: 1 });
        res.json(patients);
    } catch (error) {
        console.error('Erreur lors de la récupération des patients:', error);
        res.status(500).json({ 
            message: 'Erreur lors de la récupération des patients',
            error: error.message 
        });
    }
});

// Route pour obtenir un patient par son ID
router.get('/:id', async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ message: 'Patient non trouvé' });
        }
        res.json(patient);
    } catch (error) {
        console.error('Erreur lors de la récupération du patient:', error);
        res.status(500).json({ 
            message: 'Erreur lors de la récupération du patient',
            error: error.message 
        });
    }
});

// Route pour mettre à jour un patient
router.put('/:id', async (req, res) => {
    try {
        const patient = await Patient.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!patient) {
            return res.status(404).json({ message: 'Patient non trouvé' });
        }
        res.json(patient);
    } catch (error) {
        console.error('Erreur lors de la mise à jour du patient:', error);
        res.status(500).json({ 
            message: 'Erreur lors de la mise à jour du patient',
            error: error.message 
        });
    }
});

// Route pour supprimer un patient
router.delete('/:id', async (req, res) => {
    try {
        const patient = await Patient.findByIdAndDelete(req.params.id);
        if (!patient) {
            return res.status(404).json({ message: 'Patient non trouvé' });
        }
        res.json({ message: 'Patient supprimé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression du patient:', error);
        res.status(500).json({ 
            message: 'Erreur lors de la suppression du patient',
            error: error.message 
        });
    }
});

module.exports = router; 