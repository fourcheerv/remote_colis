document.getElementById("packageForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const deliveredRadio = document.querySelector('input[name="delivered"]:checked');
    if (!deliveredRadio) {
        alert("Veuillez sélectionner si le(les) colis a(ont) été livré(s) !");
        return;
    }

    const isDelivered = deliveredRadio.value === "true";

    // Champs communs
    const serviceEmail = document.getElementById("serviceEmails").value.trim();
    const recipientName = document.getElementById("recipientName").value.trim();
    const packageCount = document.getElementById("packageCount").value.trim();
    const receiverName = document.getElementById("receiverName").value.trim();
    const photoInput = document.getElementById("photoInput");
    const imageFiles = photoInput?.files || [];
    const signatureEmpty = signaturePad?.isEmpty?.() ?? true;

    // Si colis NON livré
    if (!isDelivered) {
        // Vérification des champs requis
        if (!serviceEmail) {
            alert("Veuillez renseigner l'adresse e-mail du service référent !");
            return;
        }
        if (!recipientName || !packageCount || !receiverName) {
            alert("Veuillez remplir tous les champs requis !");
            return;
        }
        if (imageFiles.length === 0) {
            alert("Veuillez ajouter au moins une photo !");
            return;
        }
        if (signatureEmpty) {
            alert("Veuillez ajouter votre signature !");
            return;
        }

        // (Optionnel) Marquer "non" dans un champ caché
        const colisLivréField = document.getElementById("colisLivréStatus");
        if (colisLivréField) {
            colisLivréField.value = "non";
        }

        // EmailJS + animation
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
                serviceEmail,
                recipientName,
                packageCount,
                receiverName,
                message: "Le(les) colis n'a(ont) pas pu être livré(s). Merci de contacter le service manutention.",
            });

            clearInterval(interval);
            popupProgressBar.style.width = "100%";
            alert("Email envoyé avec succès !");
            location.reload();
        } catch (error) {
            clearInterval(interval);
            console.error("Erreur lors de l'envoi de l'email :", error);
            alert(`Erreur : ${error.text || error.message || "Erreur inconnue"}`);
        } finally {
            setTimeout(() => {
                loadingPopup.classList.remove("visible");
                loadingPopup.classList.add("hidden");
            }, 1000);
        }
    }

    // (Optionnel : ajouter ici la gestion du cas "livré" si tu veux faire autre chose dans ce cas)
});
