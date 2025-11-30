const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors'); 

const app = express();
const port = process.env.PORT || 10000; 

// ******************************************************************************
// 🛑 ÉTAPE 1: REMPLACER PAR VOTRE VRAI DOMAINE INFINITYFREE/GREAT-SITE.NET
// ******************************************************************************
const allowedOrigins = [
    'https://milescorp.great-site.net', // 🛑 REMPLACER PAR VOTRE VRAI DOMAINE HTTPS
    'http://milescorp.great-site.net',  // 🛑 REMPLACER PAR VOTRE VRAI DOMAINE HTTP
    // Si votre domaine par défaut est utilisé, ajoutez-le aussi:
    // 'http://mon-comparateur-ia.infinityfreeapp.com', 
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`Requête CORS bloquée depuis l'origine: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    }
}));

app.use(express.json({ limit: '5mb' }));

// ******************************************************************************
// ÉTAPE 2: NOUVEL ENDPOINT /status AJOUTÉ POUR LE TEST DE CONNEXION DU FRONT-END
// ******************************************************************************
app.get('/api/chat/status', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Proxy is running' });
});


// Endpoint unique pour le chat
app.post('/api/chat', async (req, res) => {
    const apiKey = process.env.OPENROUTER_API_KEY; 

    if (!apiKey) {
        console.error("Clé API non trouvée.");
        return res.status(500).json({ error: "Configuration du serveur incomplète (Clé API manquante)." });
    }

    try {
        const { model, messages, ...otherParams } = req.body;

        if (!model || !messages) {
            return res.status(400).json({ error: "Requête invalide : 'model' et 'messages' sont requis." });
        }

        const openrouterPayload = {
            model: model,
            messages: messages,
            ...otherParams 
        };
        
        // Assurez-vous d'utiliser un domaine autorisé comme referer pour OpenRouter
        const referer = allowedOrigins[0] || 'https://default-referer.com'; 

        const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`, 
                'Content-Type': 'application/json',
                'HTTP-Referer': referer, 
            },
            body: JSON.stringify(openrouterPayload)
        });

        const data = await orRes.json();
        
        if (!orRes.ok) {
            return res.status(orRes.status).json(data);
        }

        res.json(data); 

    } catch (error) {
        console.error("Erreur lors de la communication avec OpenRouter:", error);
        res.status(500).json({ error: "Erreur interne du serveur proxy." });
    }
});

app.listen(port, () => {
    console.log(`Proxy démarré sur le port ${port}`);
});
