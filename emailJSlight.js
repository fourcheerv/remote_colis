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
     
        emailjs.init({
        publicKey: "UFlNoLfp7PdWyrBak",
      });

            // Affichage d'un message de chargement (facultatif)
            alert("Envoi de l'e-mail en cours...");

            // Envoi de l'e-mail via EmailJS
            await emailjs.send("service_colis", "template_colis", {
                serviceEmail: serviceEmail,
                recipientName: recipientName,
                packageCount: packageCount,
                message: "Le colis n'a pas été livré.",
            });

            alert("Email envoyé avec succès !");
        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'email :', JSON.stringify(error, null, 2));
            alert(`Une erreur est survenue lors de l'envoi de l'email : ${error.text || error.message || 'Erreur inconnue'}`);
        }
    }
});
