document.getElementById("packageForm").addEventListener("submit", (event) => {
    event.preventDefault();

    // Récupération des valeurs du formulaire
    const recipientName = document.getElementById("recipientName").value;
    const receiverName = document.getElementById("receiverName").value;
    const packageCount = document.getElementById("packageCount").value;
    const deliveryDate = document.getElementById("deliveryDate").value;
    const serviceEmail = document.getElementById("serviceEmails").value;
    const delivered = document.querySelector('input[name="delivered"]:checked').value;

    // Données à envoyer au backend
    const emailData = {
        recipientName,
        receiverName,
        packageCount,
        deliveryDate,
        serviceEmail,
        delivered,
    };

    // Appel à l'API backend
    fetch("http://localhost:3000/send-email", { // Remplacez par l'URL de votre backend
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailData),
    })
    .then((response) => {
        if (!response.ok) throw new Error("Erreur lors de l'envoi de l'email.");
        return response.json();
    })
    .then((data) => {
        alert(data.message || "Email envoyé avec succès !");
    })
    .catch((error) => {
        console.error("Erreur :", error);
        alert("Une erreur est survenue.");
    });
});
