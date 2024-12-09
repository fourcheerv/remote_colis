// Assurez-vous d'installer EmailJS SDK si ce n'est pas déjà fait
// npm install emailjs-com

import emailjs from 'emailjs-com';

// ID de votre service (obtenu dans EmailJS)
const SERVICE_ID = 'votre_service_id';
// ID de votre modèle d'e-mail (défini dans EmailJS)
const TEMPLATE_ID = 'votre_template_id';
// Clé utilisateur (trouvée dans votre tableau de bord EmailJS)
const USER_ID = 'votre_user_id';

function envoyerEmail() {
  const params = {
    from_name: 'Votre nom',
    to_name: 'Nom du destinataire',
    message: 'Ceci est un message de test',
    reply_to: 'votre@email.com',
  };

  emailjs
    .send(SERVICE_ID, TEMPLATE_ID, params, USER_ID)
    .then(
      (response) => {
        console.log('Succès !', response.status, response.text);
      },
      (error) => {
        console.error('Erreur lors de l'envoi de l'e-mail:', error);
      }
    );
}
