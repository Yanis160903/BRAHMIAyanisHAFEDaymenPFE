document.addEventListener('DOMContentLoaded', function() {
    const generateDossierBtn = document.getElementById('generateDossierBtn');
    const numeroDossierInput = document.getElementById('numeroDossier');

    // Fonction pour générer un numéro de dossier unique
    function generateDossierNumber() {
        try {
            // Obtenir l'année courante
            const currentYear = new Date().getFullYear();
            
            // Générer un numéro aléatoire à 4 chiffres
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            
            // Combiner l'année et le numéro aléatoire en un nombre unique
            const dossierNumber = parseInt(`${currentYear}${randomNum}`);
            
            // Mise à jour du champ avec le nouveau numéro
            numeroDossierInput.value = dossierNumber;
            
            // Animation de succès
            numeroDossierInput.classList.add('success');
            setTimeout(() => {
                numeroDossierInput.classList.remove('success');
            }, 2000);

        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors de la génération du numéro de dossier. Veuillez réessayer.');
        }
    }

    // Gestionnaire d'événement pour le bouton de génération
    generateDossierBtn.addEventListener('click', generateDossierNumber);

    // Générer automatiquement un numéro au chargement de la page
    generateDossierNumber();
}); 