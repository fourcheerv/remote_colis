document.getElementById("packageForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const deliveredRadio = document.querySelector('input[name="delivered"]:checked');
    if (!deliveredRadio) {
        alert("Veuillez sélectionner si le(les) colis a(ont) été livré(s) !");
        return;
    }

    const isDelivered = deliveredRadio.value === "true";

    // Obtenir les champs
    const serviceEmail = document.getElementById("serviceEmails").value.trim();
    const recipientName = document.getElementById("recipientName").value.trim();
    const packageCount = document.getElementById("packageCount").value.trim();
    const receiverName = document.getElementById("receiverName").value.trim();

    // 🖼️ Photo obligatoire
    const photoInput = document.getElementById("photoInput"); // ID du champ input[type=file]
    const imageFiles = photoInput?.files || [];

    // ✍️ Signature obligatoire
    const signatureEmpty = signaturePad?.isEmpty?.() ?? true;

    // Cas "Non livré"
    if (!isDelivered) {
        // 🧠 Vérification de tous les champs requis
        if (!serviceEmail || !recipientName || !packageCount) {
            alert("Veuillez remplir tous les champs !");
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

        // (Optionnel) Mettre à jour un champ visible ou caché avec "non"
        const colisLivréField = document.getElementById("colisLivréStatus");
        if (colisLivréField) {
            colisLivréField.value = "non";
        }

        // 🔄 Envoi Email + Popup
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
            console.error('Erreur lors de l\'envoi de l\'email :', error);
            alert(`Erreur : ${error.text || error.message || 'Erreur inconnue'}`);
        } finally {
            setTimeout(() => {
                loadingPopup.classList.remove("visible");
                loadingPopup.classList.add("hidden");
            }, 1000);
        }
    }
});
