// Initialisez EmailJS au chargement de la page (évite de le faire à chaque envoi)
emailjs.init("UFlNoLfp7PdWyrBak"); // Remplacez par votre User ID

document.getElementById("packageForm").addEventListener("submit", async (event) => {
    event.preventDefault(); // Empêche le rechargement de la page lors de la soumission du formulaire

    // Vérifie si un bouton radio a été coché
    const deliveredRadio = document.querySelector('input[name="delivered"]:checked');
    if (!deliveredRadio) {
        alert("Veuillez sélectionner si le colis a été livré !");
        return;
    }

    // Si le colis n'a pas été livré, on récupère les informations du formulaire
    if (deliveredRadio.value === "false") {
        const serviceEmail = document.getElementById("serviceEmails").value.trim();
        const recipientName = document.getElementById("recipientName").value.trim();
        const packageCount = document.getElementById("packageCount").value.trim();

        // Validation des champs obligatoires
        if (!serviceEmail) {
            alert("Le champ 'Email du service' est obligatoire !");
            return;
        }

        if (!recipientName) {
            alert("Le champ 'Nom du destinataire' est obligatoire !");
            return;
        }

        if (!packageCount) {
            alert("Le champ 'Nombre de colis' est obligatoire !");
            return;
        }

        // Validation du format de l'e-mail
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(serviceEmail)) {
            alert("Veuillez entrer une adresse e-mail valide !");
            return;
        }

        try {
            // Affichage d'un message de chargement (facultatif)
            alert("Envoi de l'e-mail en cours...");

            // Envoi de l'e-mail via EmailJS
            await emailjs.send("service_colis", "template_colis", {
                serviceEmail: serviceEmail, // Veillez à ce que le template EmailJS utilise {{to_email}} comme variable
                recipientName: recipientName,
                packageCount: packageCount,
                message: "Le colis n'a pas été livré. Merci de prévoir un rendez-vous pour le relever dans notre service au quai papier RDC",
            });

            alert("Email envoyé avec succès !");
        } catch (error) {
            // Affiche l'erreur complète dans la console
            console.error('Erreur lors de l\'envoi de l\'email :', error);
            
            // Tente d'afficher le message d'erreur dans la fenêtre d'alerte
            let errorMessage = "Une erreur est survenue lors de l'envoi de l'email.";
            
            // Si l'erreur contient un message ou des détails, on l'affiche
            if (error && error.text) {
                errorMessage += `\nDétails de l'erreur : ${error.text}`;
            } else if (error && error.message) {
                errorMessage += `\nDétails de l'erreur : ${error.message}`;
            } else if (typeof error === 'string') {
                errorMessage += `\nDétails de l'erreur : ${error}`;
            }

            // Affiche l'erreur au complet dans l'alerte
            alert(errorMessage);
        }
    }
});
