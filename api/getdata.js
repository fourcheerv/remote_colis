const PouchDB = require('pouchdb');

export default async function handler(req, res) {
    try {
        // Récupérer la clé API depuis les variables d'environnement
        const cloudantUrl = process.env.CLOUDANT_URL;

        if (!cloudantUrl) {
            throw new Error("CLOUDANT_URL is not defined in environment variables.");
        }

        // Se connecter à la base de données Cloudant
        const remoteDB = new PouchDB(cloudantUrl);

        // Récupérer les documents depuis la base
        const data = await remoteDB.allDocs({ include_docs: true });

        // Retourner les données au client
        res.status(200).json(data);
    } catch (error) {
        console.error("Error fetching data:", error.message);
        res.status(500).json({ error: error.message });
    }
}
