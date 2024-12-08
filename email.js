//envoi email
document.getElementById("packageForm").addEventListener("change", () => {
    const email = document.getElementById("serviceEmails").value;
    const notDelivered = document.getElementById("falseRadio").checked;

    if (notDelivered && email) {
        const emailData = {
            toEmail: email,
            subject: "Notification : Colis non livré",
            message: "Un colis destiné à votre service n'a pas été livré.",
        };

        console.log("Données de l'email envoyées :", emailData);

        fetch("https://europe-west9-asymmetric-cove-308719.cloudfunctions.net/sendEmailFunction", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(emailData),
        })
        .then((response) => {
            if (!response.ok) throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
            return response.json();
        })
        .then((data) => {
            alert(data.message || "Email envoyé avec succès !");
        })
        .catch((error) => {
            alert("Erreur lors de l'envoi de l'email :", error.message);
            alert("Une erreur est survenue lors de l'envoi de l'email.");
        });
    } else if (notDelivered && !email) {
        alert("Veuillez sélectionner un email pour envoyer la notification.");
    }
});