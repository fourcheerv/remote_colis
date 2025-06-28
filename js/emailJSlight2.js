document.getElementById("packageForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const deliveredRadio = document.querySelector('input[name="delivered"]:checked');
    if (!deliveredRadio) {
        alert("Veuillez sélectionner si le(les) colis a(ont) été livré(s) !");
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

        // 🚫 Vérifie qu’au moins une photo est ajoutée
        if (imageFiles.length === 0) {
            alert("Veuillez ajouter au moins une photo !");
            return;
        }

        // 🚫 Vérifie que la signature n’est pas vide
        if (signaturePad.isEmpty()) {
            alert("Veuillez ajouter votre signature !");
            return;
        }

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

            emailjs.init({ publicKey: "UFlNoLfp7PdWyrBak" });

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
            console.error('Erreur lors de l\'envoi de l\'email :', JSON.stringify(error, null, 2));
            alert(`Une erreur est survenue lors de l'envoi de l'email : ${error.text || error.message || 'Erreur inconnue'}`);
        } finally {
            clearInterval(interval);
            setTimeout(() => {
                loadingPopup.classList.remove("visible");
                loadingPopup.classList.add("hidden");
            }, 1000);
        }
    }
});
