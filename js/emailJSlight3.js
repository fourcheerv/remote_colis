document.getElementById("packageForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    // Vérifie que la radio "livré ou non" est sélectionnée
    const deliveredRadio = document.querySelector('input[name="delivered"]:checked');
    if (!deliveredRadio) {
        alert("Veuillez sélectionner si le(les) colis a(ont) été livré(s) !");
        return;
    }

    // Si colis non livré, on fait toutes les vérifications
    if (deliveredRadio.value === "false") {
        const serviceEmail = document.getElementById("serviceEmails").value.trim();
        const recipientName = document.getElementById("recipientName").value.trim();
        const packageCount = document.getElementById("packageCount").value.trim();
        const receiverName = document.getElementById("receiverName").value.trim();

        // Vérifie que tous les champs obligatoires sont remplis
        if (!serviceEmail || !recipientName || !packageCount || !receiverName) {
            alert("Veuillez remplir tous les champs obligatoires !");
            return;
        }

        // Vérifie qu’au moins une photo est ajoutée (imageFiles doit être défini dans ton code)
        if (typeof imageFiles === 'undefined' || imageFiles.length === 0) {
            alert("Veuillez ajouter au moins une photo !");
            return;
        }

        // Vérifie que la signature n’est pas vide (signaturePad doit être initialisé)
        if (signaturePad.isEmpty()) {
            alert("Veuillez ajouter votre signature !");
            return;
        }

        // Tous les contrôles OK, on envoie l'email
        const loadingPopup = document.getElementById("loadingPopup");
        const popupProgressBar = document.getElementById("popupProgressBar");

        try {
            loadingPopup.classList.remove("hidden");
            loadingPopup.classList.add("visible");
            popupProgressBar.style.width = "0%";

            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                if (progress <= 90) {
                    popupProgressBar.style.width = `${progress}%`;
                }
            }, 200);

            emailjs.init("UFlNoLfp7PdWyrBak");

            await emailjs.send("service_colis", "template_colis_non", {
                serviceEmail: serviceEmail,
                recipientName: recipientName,
                packageCount: packageCount,
                receiverName: receiverName,
                message: "Le(les) colis n'a(ont) pas pu être livré(s) en raison d'une absence ou d'un autre motif. Merci de contacter le service manutention pour le(les) récupérer.",
            });

            clearInterval(interval);
            popupProgressBar.style.width = "100%";

            alert("Email envoyé avec succès !");
            location.reload();
        } catch (error) {
            clearInterval(interval);
            alert(`Erreur lors de l'envoi de l'email : ${error.text || error.message || 'Erreur inconnue'}`);
        } finally {
            setTimeout(() => {
                loadingPopup.classList.remove("visible");
                loadingPopup.classList.add("hidden");
            }, 1000);
        }
    }
});
