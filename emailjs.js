document.getElementById("packageForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const deliveredRadio = document.querySelector('input[name="delivered"]:checked');
    if (!deliveredRadio) {
        alert("Veuillez sélectionner si le colis a été livré !");
        return;
    }

    if (deliveredRadio.value === "false") {
        const serviceEmail = document.getElementById("serviceEmails").value;
        const recipientName = document.getElementById("recipientName").value;
        const packageCount = document.getElementById("packageCount").value;

        // Vérification que tous les champs sont remplis
        if (!serviceEmail || !recipientName || !packageCount) {
            alert("Veuillez remplir tous les champs !");
            return;
        }

        try {
            // Initialiser EmailJS avec votre User ID
            emailjs.init("UFlNoLfp7PdWyrBak"); // Remplacez par votre User ID

            // Affichage d'un message de chargement (facultatif)
            alert("Envoi de l'e-mail en cours...");

            // Envoi de l'e-mail via EmailJS
            await emailjs.send("service_colis", "template_colis", {
                serviceEmail: serviceEmail,
                recipientName: recipientName,
                packageCount: packageCount,
                message: "Le colis n'a pas été livré. Merci de prévoir un rendez vous pour le relever dans notre service au quai papier RDC",
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
});
