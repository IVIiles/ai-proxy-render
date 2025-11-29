const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors'); // Nécessaire pour autoriser les requêtes de votre site InfinityFree

const app = express();
// PORT doit être lu depuis l'environnement Render
const port = process.env.PORT || 10000; 

// Utiliser CORS pour autoriser l'accès depuis votre domaine InfinityFree
// ******************************************************************************
// ATTENTION : REMPLACER PAR VOTRE VRAI DOMAINE INFINITYFREE. 
// Inclure les versions HTTP et HTTPS si votre site peut être accédé par les deux.
// ******************************************************************************
const allowedOrigins = [
    'https://milescorp.great-site.net', // Exemple HTTPS
    'http://mon-comparateur-ia.infinityfreeapp.com',   // Exemple HTTP
    // Ajoutez d'autres domaines si nécessaire, y compris http et https
];

app.use(cors({
    origin: function (origin, callback) {
        // Permettre les requêtes sans 'origin' (ex: Postman) ou si l'origin est dans la liste
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));

// Middleware pour parser le JSON du front-end
app.use(express.json({ limit: '5mb' })); // Augmenter la limite pour les fichiers (base64)

// Endpoint unique pour le chat (qui est appelé par votre front-end JS)
app.post('/api/chat', async (req, res) => {
    // La clé API est lue de manière sécurisée depuis les variables d'environnement de Render
    const apiKey = process.env.OPENROUTER_API_KEY; 

    if (!apiKey) {
        console.error("Clé API non trouvée dans les variables d'environnement.");
        return res.status(500).json({ error: "Configuration du serveur incomplète (Clé API manquante)." });
    }

    try {
        // Récupérer le modèle et les messages envoyés par le front-end
        const { model, messages, ...otherParams } = req.body;

        if (!model || !messages) {
            return res.status(400).json({ error: "Requête invalide : 'model' et 'messages' sont requis." });
        }

        // Faire l'appel sécurisé à l'API OpenRouter
        const openrouterPayload = {
            model: model,
            messages: messages,
            // Ajouter d'autres paramètres OpenRouter que vous voulez transmettre
            ...otherParams 
        };

        const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                // Utiliser la clé API sécurisée du serveur
                'Authorization': `Bearer ${apiKey}`, 
                'Content-Type': 'application/json',
                // Indiquer la source de la requête pour OpenRouter (Utiliser aussi votre vrai domaine ici)
                'HTTP-Referer': allowedOrigins[0] || 'https://default-referer.com', 
            },
            body: JSON.stringify(openrouterPayload)
        });

        // Transmettre la réponse (succès ou erreur) d'OpenRouter au front-end
        const data = await orRes.json();
        
        // Si OpenRouter renvoie une erreur (ex: 400), on la transmet
        if (!orRes.ok) {
            return res.status(orRes.status).json(data);
        }

        // Succès
        res.json(data); 

    } catch (error) {
        console.error("Erreur lors de la communication avec OpenRouter:", error);
        res.status(500).json({ error: "Erreur interne du serveur proxy." });
    }
});

app.listen(port, () => {
    console.log(`Proxy démarré sur le port ${port}`);
});