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
        const receiverName = document.getElementById("receiverName").value;

        // Vérification que tous les champs sont remplis
        if (!serviceEmail || !recipientName || !packageCount) {
            alert("Veuillez remplir tous les champs !");
            return;
        }

        const loadingPopup = document.getElementById("loadingPopup");
        const popupProgressBar = document.getElementById("popupProgressBar");

        try {
            // Afficher la popup
            loadingPopup.classList.remove("hidden");
            loadingPopup.classList.add("visible");
            popupProgressBar.style.width = "0%";

            // Simuler une progression (facultatif)
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                if (progress <= 90) {
                    popupProgressBar.style.width = `${progress}%`;
                }
            }, 200);

            // Initialiser EmailJS
            emailjs.init({
                publicKey: "UFlNoLfp7PdWyrBak",
            });

            // Envoi de l'e-mail via EmailJS
            await emailjs.send("service_colis", "template_colis", {
                serviceEmail: serviceEmail,
                recipientName: recipientName,
                packageCount: packageCount,
                receiverName: receiverName,
                message: "Le colis n'a pas pu être livré en raison d'une absence ou d'un autre motif. Merci de contacter le service manutention pour le récupérer.",
            });

            // Mise à jour à 100% après l'envoi réussi
            clearInterval(interval);
            popupProgressBar.style.width = "100%";

            alert("Email envoyé avec succès !");
            // Rafraîchir la page
            location.reload();
        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'email :', JSON.stringify(error, null, 2));
            alert(`Une erreur est survenue lors de l'envoi de l'email : ${error.text || error.message || 'Erreur inconnue'}`);
        } finally {
            // Masquer la popup après un court délai
            clearInterval(interval);
            setTimeout(() => {
                loadingPopup.classList.remove("visible");
                loadingPopup.classList.add("hidden");
            }, 1000);
        }
    }
});
