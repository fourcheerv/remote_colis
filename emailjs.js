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

        try {
            // Remplir avec vos clés EmailJS
            emailjs.init("YOUR_USER_ID");
            await emailjs.send("YOUR_SERVICE_ID", "YOUR_TEMPLATE_ID", {
                serviceEmail: serviceEmail,
                recipientName: recipientName,
                packageCount: packageCount,
                message: "Le colis n'a pas été livré.",
            });
            alert("Email envoyé avec succès !");
        } catch (error) {
            console.error("Erreur lors de l'envoi de l'email :", error);
            alert("Une erreur est survenue lors de l'envoi de l'email.");
        }
    }
});
