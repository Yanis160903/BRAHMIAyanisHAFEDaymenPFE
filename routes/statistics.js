const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const Prescription = require('../models/Prescription');
const Medication = require('../models/Medication');

// Obtenir les statistiques générales
router.get('/overview', async (req, res) => {
    try {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        // Total des patients
        const totalPatients = await Patient.countDocuments();
        const lastMonthPatients = await Patient.countDocuments({
            createdAt: { $lt: firstDayOfMonth }
        });
        const patientsTrend = calculateTrend(totalPatients, lastMonthPatients);

        // Nouveaux patients ce mois
        const newPatients = await Patient.countDocuments({
            createdAt: { $gte: firstDayOfMonth }
        });
        const lastMonthNewPatients = await Patient.countDocuments({
            createdAt: { $gte: firstDayOfLastMonth, $lt: firstDayOfMonth }
        });
        const newPatientsTrend = calculateTrend(newPatients, lastMonthNewPatients);

        // Total des prescriptions
        const totalPrescriptions = await Prescription.countDocuments();
        const lastMonthPrescriptions = await Prescription.countDocuments({
            createdAt: { $lt: firstDayOfMonth }
        });
        const prescriptionsTrend = calculateTrend(totalPrescriptions, lastMonthPrescriptions);

        // Total des médicaments prescrits
        const totalMedications = await Medication.countDocuments();
        const lastMonthMedications = await Medication.countDocuments({
            createdAt: { $lt: firstDayOfMonth }
        });
        const medicationsTrend = calculateTrend(totalMedications, lastMonthMedications);

        res.json({
            totalPatients,
            newPatients,
            totalPrescriptions,
            totalMedications,
            patientsTrend,
            newPatientsTrend,
            prescriptionsTrend,
            medicationsTrend
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Évolution des patients
router.get('/patients/evolution', async (req, res) => {
    try {
        const months = 6;
        const data = [];
        const labels = [];

        for (let i = months - 1; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
            const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            const count = await Patient.countDocuments({
                createdAt: { $gte: firstDay, $lte: lastDay }
            });

            data.push(count);
            labels.push(date.toLocaleString('fr-FR', { month: 'short' }));
        }

        res.json({ labels, values: data });
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'évolution des patients:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Répartition par âge
router.get('/patients/age-distribution', async (req, res) => {
    try {
        const patients = await Patient.find({}, 'dateNaissance');
        const ageGroups = {
            '0-18': 0,
            '19-30': 0,
            '31-50': 0,
            '51-70': 0,
            '70+': 0
        };

        patients.forEach(patient => {
            const age = calculateAge(patient.dateNaissance);
            if (age <= 18) ageGroups['0-18']++;
            else if (age <= 30) ageGroups['19-30']++;
            else if (age <= 50) ageGroups['31-50']++;
            else if (age <= 70) ageGroups['51-70']++;
            else ageGroups['70+']++;
        });

        res.json({
            labels: Object.keys(ageGroups),
            values: Object.values(ageGroups)
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de la répartition par âge:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Top médicaments
router.get('/medications/top', async (req, res) => {
    try {
        const topMedications = await Prescription.aggregate([
            { $unwind: '$medicaments' },
            { $group: {
                _id: '$medicaments.nom',
                count: { $sum: 1 }
            }},
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        res.json({
            labels: topMedications.map(m => m._id),
            values: topMedications.map(m => m.count)
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des top médicaments:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Évolution des prescriptions
router.get('/prescriptions/evolution', async (req, res) => {
    try {
        const months = 6;
        const data = [];
        const labels = [];

        for (let i = months - 1; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
            const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            const count = await Prescription.countDocuments({
                date: { $gte: firstDay, $lte: lastDay }
            });

            data.push(count);
            labels.push(date.toLocaleString('fr-FR', { month: 'short' }));
        }

        res.json({ labels, values: data });
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'évolution des prescriptions:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Fonctions utilitaires
function calculateTrend(current, previous) {
    if (!previous) return 0;
    return ((current - previous) / previous) * 100;
}

function calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    
    return age;
}

module.exports = router; 