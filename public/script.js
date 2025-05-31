// Animation pour les boutons
document.querySelectorAll('.btn').forEach(button => {
    button.addEventListener('mouseover', function() {
        this.style.transform = 'translateY(-2px)';
    });

    button.addEventListener('mouseout', function() {
        this.style.transform = 'translateY(0)';
    });
});

// Animation pour les cartes de fonctionnalités
document.querySelectorAll('.feature-card').forEach(card => {
    card.addEventListener('mouseover', function() {
        this.style.transform = 'translateY(-5px)';
    });

    card.addEventListener('mouseout', function() {
        this.style.transform = 'translateY(0)';
    });
});

// Gestion de la navigation active
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
        this.classList.add('active');
    });
});

// Animation de chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '1';
    }, 100);
}); 