// ==========================================
// 🟢 1. NETWORK FIX (CROSS-FETCH)
// ==========================================
const fetch = require('cross-fetch');
global.fetch = fetch;
global.Headers = fetch.Headers;
global.Request = fetch.Request;
global.Response = fetch.Response;

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const pdfParse = require('pdf-extraction'); 
const path = require('path');

const app = express();
app.use(cors());

// Limit for high-quality camera photos
app.use(bodyParser.json({ limit: '10mb' }));

app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use(express.static(path.join(__dirname, 'html'), { index: false }));

app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'dashboard.html'));
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const modelsToTry = [
    "gemini-2.5-flash-lite", 
    "gemini-2.0-flash",      
    "gemini-2.5-flash"       
];

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

let SCHEME_CONTEXT = "";
let MANDI_DB = {};

// 🟢 THE FIX: A Safe, Crash-Proof Memory Array
let chatHistory = [
    {
        role: "user",
        parts: [{ text: "You are Kisan Vani AI. Always respond in JSON format with translatedQuery, reply, and spokenReply." }]
    },
    {
        role: "model",
        parts: [{ text: "{\"translatedQuery\": \"System Initialized\", \"reply\": \"नमस्ते! I am ready.\", \"spokenReply\": \"Namaste!\"}" }]
    }
];

async function loadPDF() {
    try {
        const pdfPath = path.join(__dirname, 'scheme.pdf');
        if (fs.existsSync(pdfPath)) {
            const dataBuffer = fs.readFileSync(pdfPath);
            const data = await pdfParse(dataBuffer);
            SCHEME_CONTEXT = data.text.substring(0, 30000); 
            console.log("✅ PDF Loaded");
        }
    } catch (e) { console.log("⚠️ PDF Error:", e.message); }
}

function loadMandiDB() {
    try {
        const jsonPath = path.join(__dirname, 'mandi_rates.json');
        if (fs.existsSync(jsonPath)) {
            MANDI_DB = JSON.parse(fs.readFileSync(jsonPath));
            console.log("✅ Mandi DB Loaded");
        }
    } catch (e) { console.log("⚠️ Mandi DB Error:", e.message); }
}

loadPDF();
loadMandiDB();

function detectLocation(text) {
    if (!text) return null;
    const textLower = text.toLowerCase();
    const cityMap = {
        "bhubaneswar": "Bhubaneswar", "bbsr": "Bhubaneswar", "भुवनेश्वर": "Bhubaneswar", "ଭୁବନେଶ୍ୱର": "Bhubaneswar",
        "cuttack": "Cuttack", "कटक": "Cuttack", "କଟକ": "Cuttack",
        "puri": "Puri", "पुरी": "Puri", "ପୁରୀ": "Puri",
        "delhi": "Delhi", "दिल्ली": "Delhi", "ଦିଲ୍ଲୀ": "Delhi",
        "mumbai": "Mumbai", "मुंबई": "Mumbai", "ମୁମ୍ବାଇ": "Mumbai",
        "kolkata": "Kolkata", "कोलकाता": "Kolkata", "କୋଲକାତା": "Kolkata",
        "chennai": "Chennai", "चेन्नई": "Chennai", "ଚେନ୍ନାଇ": "Chennai",
        "bangalore": "Bangalore", "बेंगलुरु": "Bangalore", "ବାଙ୍ଗାଲୋର": "Bangalore",
        "hyderabad": "Hyderabad", "हैदराबाद": "Hyderabad", "ହାଇଦ୍ରାବାଦ": "Hyderabad",
        "balasore": "Balasore", "बालासोर": "Balasore", "ବାଲେଶ୍ୱର": "Balasore",
        "bhadrak": "Bhadrak", "भद्रक": "Bhadrak", "ଭଦ୍ରକ": "Bhadrak"
    };
    for (const [keyword, englishName] of Object.entries(cityMap)) {
        if (textLower.includes(keyword)) return englishName;
    }
    return null;
}

function detectCrop(text) {
    if (!text) return null;
    const crops = ["potato", "आलू", "ଆଳୁ", "onion", "प्याज", "ପିଆଜ", "wheat", "गेहूँ","ଗହମ","rice","धान","ଧାନ","brinjal","बैंगन","ବାଇଗଣ","tomato","टमाटर","ଟମାଟୋ","pointed gourd","परवल","ପୋଟଳ"];
    const textLower = text.toLowerCase();
    return crops.find(crop => textLower.includes(crop)) || null;
}

async function getWeather(city) {
    const targetCity = city || "Bhubaneswar"; 
    if (!WEATHER_API_KEY) return "Weather API Key missing.";
    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${targetCity}&units=metric&appid=${WEATHER_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.cod !== 200) return `Weather unavailable for ${targetCity}`;
        return `In ${targetCity}: ${data.main.temp}°C, ${data.weather[0].description}`;
    } catch (error) { return "Weather Service Error"; }
}

app.post('/api/chat', async (req, res) => {
    try {
        const { text, language, image } = req.body;
        console.log(`\nUser (${language}): ${text}`);
        
        const city = detectLocation(text);
        const mentionedCrop = detectCrop(text);
        const weatherInfo = await getWeather(city);

        let scriptInstruction = "";
        let translationRule = "";
        if (language.includes("Odia") || language.includes("or-IN")) {
            scriptInstruction = "STRICTLY write the 'reply' in pure Odia script.";
            translationRule = "Translate the user's input into pure Odia script.";
        } else if (language.includes("Hindi") || language.includes("hi-IN")) {
            scriptInstruction = "STRICTLY write the 'reply' in pure Hindi script.";
            translationRule = "Translate the user's input into pure Hindi script.";
        } else {
            scriptInstruction = "STRICTLY reply in English.";
            translationRule = "DO NOT TRANSLATE. Return the exact English text.";
        }

        let dynamicContext = `
        [TASK]
        You are Kisan Vani AI, an agricultural expert. Answers should be clear, concise, and simple.
        Return a JSON object with keys: "translatedQuery", "reply", "spokenReply".

        [RELEVANT DATA]
        - Current Weather: ${weatherInfo}
        - Mandi Prices: ${JSON.stringify(MANDI_DB)}
        - Govt Schemes Context: ${SCHEME_CONTEXT}

        [ANALYSIS RULES]
        1. If an image is provided:
           - If it is a CROP: Identify the crop. Analyze health and give suggestions to prevent/cure diseases.
           - If it is the SKY: Use weather data to advise on farming activities.
           - If unclear, state that you cannot analyze it.
        2. If only text is provided: Strictly answer using the data above.
        
        [OUTPUT RULES]
        - reply: ${scriptInstruction}
        - translatedQuery: ${translationRule}
        - spokenReply: Phonetic English letters for TTS reading.
        `;

        let parts = [{ text: dynamicContext }];
        if (text) parts.push({ text: `User Question: ${text}` });
        if (image) parts.push({ inlineData: { mimeType: "image/jpeg", data: image } });

        let aiData = null;
        let lastError = null;
        let successfulResponseText = "";

        for (const modelName of modelsToTry) {
            try {
                console.log(`🤖 Consulting model: ${modelName}...`);
                const model = genAI.getGenerativeModel({ 
                    model: modelName,
                    generationConfig: { responseMimeType: "application/json" }
                }); 
                
                // 🟢 Load the safe history
                const sessionHistory = JSON.parse(JSON.stringify(chatHistory));
                const chatSession = model.startChat({ history: sessionHistory });

                const result = await chatSession.sendMessage(parts);
                successfulResponseText = result.response.text();
                
                aiData = JSON.parse(successfulResponseText);
                console.log(`✅ Success using ${modelName}`);
                break; // Stop looping if successful!

            } catch (error) {
                console.log(`⚠️ ${modelName} failed (${error.message}). Trying backup...`);
                lastError = error;
            }
        }

        if (!aiData) throw lastError;

        // 🟢 ONLY update the memory if the AI successfully answered!
        chatHistory.push({ role: "user", parts: parts });
        chatHistory.push({ role: "model", parts: [{ text: successfulResponseText }] });

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(aiData);

    } catch (error) {
        console.error("❌ Final Server Error:", error.message);
        res.status(500).json({ 
            reply: "Server Error. Please try again later.", 
            translatedQuery: "Error",
            spokenReply: "Server error. Please try again later." 
        });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Kisan Vani running on http://localhost:${PORT}`));