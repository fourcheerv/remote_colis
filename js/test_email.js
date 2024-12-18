// Assurez-vous d'installer EmailJS SDK si ce n'est pas déjà fait
// npm install emailjs-com

import emailjs from 'emailjs-com';

// ID de votre service (obtenu dans EmailJS)
const SERVICE_ID = 'service_colis_smtp';
// ID de votre modèle d'e-mail (défini dans EmailJS)
const TEMPLATE_ID = 'votre_template_id';
// Clé utilisateur (trouvée dans votre tableau de bord EmailJS)
const USER_ID = 'UFlNoLfp7PdWyrBak';

function envoyerEmail() {
  const params = {
    from_name: 'POPO',
    to_name: 'spokorski@gmail.com',
    message: 'Ceci est un message de test',
    reply_to: 'sebastien.pokorski@estrepublicain.fr',
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
