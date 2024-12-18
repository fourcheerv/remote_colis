const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sgMail = require('@sendgrid/mail');
require('dotenv').config();

// Charger la clé API depuis les variables d'environnement
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

// Configurer SendGrid
sgMail.setApiKey(SENDGRID_API_KEY);

const app = express();
app.use(bodyParser.json());
app.use(cors()); // Permettre les requêtes CORS pour le frontend

// Endpoint pour envoyer un email
app.post('/send-email', async (req, res) => {
    const { recipientName, receiverName, packageCount, deliveryDate, serviceEmail, delivered } = req.body;

    if (!recipientName || !receiverName || !packageCount || !deliveryDate || !serviceEmail) {
        return res.status(400).json({ error: "Tous les champs sont requis." });
    }

    const msg = {
        to: serviceEmail,
        from: 'spokorski@gmail.com', // Remplacez par une adresse validée dans SendGrid
        subject: `Notification de colis - Statut : ${delivered === "true" ? "Livré" : "Non livré"}`,
        text: `
            Bonjour,
            Voici les détails du colis :
            - Destinataire : ${recipientName}
            - Réceptionnaire : ${receiverName}
            - Nombre de colis : ${packageCount}
            - Date de réception : ${deliveryDate}
            - Statut : ${delivered === "true" ? "Livré" : "Non livré"}
        `,
        html: `
            <p><strong>Bonjour,</strong></p>
            <p>Voici les détails du colis :</p>
            <ul>
                <li><strong>Destinataire :</strong> ${recipientName}</li>
                <li><strong>Réceptionnaire :</strong> ${receiverName}</li>
                <li><strong>Nombre de colis :</strong> ${packageCount}</li>
                <li><strong>Date de réception :</strong> ${deliveryDate}</li>
                <li><strong>Statut :</strong> ${delivered === "true" ? "Livré" : "Non livré"}</li>
            </ul>
        `,
    };

    try {
        await sgMail.send(msg);
        res.status(200).json({ message: "Email envoyé avec succès !" });
    } catch (error) {
        console.error("Erreur lors de l'envoi de l'email :", error.response?.body || error.message);
        res.status(500).json({ error: "Erreur lors de l'envoi de l'email." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur lancé sur le port ${PORT}`));
