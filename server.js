// ==========================================
// 🟢 1. NETWORK FIX (CROSS-FETCH)
// ==========================================
const fetch = require('cross-fetch');
global.fetch = fetch;
global.Headers = fetch.Headers;
global.Request = fetch.Request;
global.Response = fetch.Response;

// ==========================================
// 📦 2. STANDARD SETUP
// ==========================================
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
app.use(bodyParser.json());

app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use(express.static(path.join(__dirname, 'html'), { index: false })); 

app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'dashboard.html'));
});

// ==========================================
// 🤖 3. AI SETUP & DATA
// ==========================================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 🟢 THE FIX: A list of fallback models to try if one is overloaded!
const modelsToTry = [
    "gemini-2.5-flash-lite", // 1st Choice (Fastest, High Quota)
    "gemini-2.0-flash",      // 2nd Choice (Highly Stable)
    "gemini-2.5-flash"       // 3rd Choice (Powerful, lower quota)
];

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
let SCHEME_CONTEXT = "";
let MANDI_DB = {};

async function loadPDF() {
    try {
        const pdfPath = path.join(__dirname, 'scheme.pdf');
        if (fs.existsSync(pdfPath)) {
            const dataBuffer = fs.readFileSync(pdfPath);
            const data = await pdfParse(dataBuffer);
            SCHEME_CONTEXT = data.text.substring(0, 40000); 
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
    const textLower = text.toLowerCase();
    const cityMap = {
        "bhubaneswar": "Bhubaneswar", "bbsr": "Bhubaneswar",
        "cuttack": "Cuttack", "puri": "Puri", 
        "delhi": "Delhi", "mumbai": "Mumbai",
        "kolkata": "Kolkata", "chennai": "Chennai",
        "bangalore": "Bangalore", "hyderabad": "Hyderabad",
        "balasore": "Balasore", "bhadrak": "Bhadrak"
    };
    for (const [keyword, englishName] of Object.entries(cityMap)) {
        if (textLower.includes(keyword)) return englishName;
    }
    return null; 
}

async function getWeather(city) {
    if (!city) return "Location not detected.";
    if (!WEATHER_API_KEY) return "Weather API Key missing.";
    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${WEATHER_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.cod !== 200) return `Weather unavailable`;
        return `In ${city}: ${data.main.temp}°C, ${data.weather[0].description}`;
    } catch (error) { return "Weather Service Error"; }
}

// ==========================================
// 🚀 5. CHAT API (With Auto-Fallback)
// ==========================================
app.post('/api/chat', async (req, res) => {
    try {
        const { text, language, image } = req.body;
        console.log(`\nUser (${language}): ${text}`);

        const city = detectLocation(text);
        const weatherInfo = await getWeather(city);

        let scriptInstruction = "";
        let translationRule = "";
        
        if (language.includes("Odia") || language.includes("or-IN")) {
            scriptInstruction = "STRICTLY write the 'reply' in pure Odia script (e.g., ନମସ୍କାର).";
            translationRule = "Translate the user's input into pure Odia script.";
        } else if (language.includes("Hindi") || language.includes("hi-IN")) {
            scriptInstruction = "STRICTLY write the 'reply' in pure Hindi Devanagari script.";
            translationRule = "Translate the user's input into pure Hindi Devanagari script.";
        } else {
            scriptInstruction = "STRICTLY reply in English.";
            translationRule = "DO NOT TRANSLATE. Return the exact English text.";
        }
        
        let dynamicContext = `
        [TASK]
        Return a JSON object with THREE keys:
        1. "translatedQuery": ${translationRule}
        2. "reply": Your simple agricultural answer. ${scriptInstruction}
        3. "spokenReply": The EXACT SAME answer from 'reply', but transliterated into English letters (e.g., 'Namaskar, aji weather bhala achi') so a computer voice can read it.
        
        [RULES]
        - Weather: ${weatherInfo}
        - Mandi Prices: ${JSON.stringify(MANDI_DB)}
        - Govt Schemes: ${SCHEME_CONTEXT}
        
        [USER QUESTION]
        "${text}"
        `;

        let parts = [{ text: dynamicContext }];
        
        if (image) {
            parts.push({ inlineData: { mimeType: "image/jpeg", data: image } });
            parts.push({ text: " (Analyze this crop image for disease)" });
        }

        let aiData = null;
        let lastError = null;

        // 🟢 THE FIX: Loop through backups until one works!
        for (const modelName of modelsToTry) {
            try {
                console.log(`🤖 Consulting model: ${modelName}...`);
                const model = genAI.getGenerativeModel({ 
                    model: modelName,
                    generationConfig: { responseMimeType: "application/json" }
                }); 
                
                const chatSession = model.startChat({
                    history: [{ role: "user", parts: [{ text: "You are Kisan Vani. Always respond in JSON format." }] }]
                });

                const result = await chatSession.sendMessage(parts);
                const responseText = result.response.text();
                aiData = JSON.parse(responseText);
                
                console.log(`✅ Success using ${modelName}`);
                break; // Stop looping, we got the answer!

            } catch (error) {
                console.log(`⚠️ ${modelName} failed (${error.statusText || error.message}). Trying backup...`);
                lastError = error;
            }
        }

        // If ALL models failed
        if (!aiData) {
            throw lastError; 
        }

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json({ 
            reply: aiData.reply,
            translatedQuery: aiData.translatedQuery,
            spokenReply: aiData.spokenReply 
        });

    } catch (error) {
        console.error("❌ Final Server Error:", error.message);
        res.status(500).json({ 
            reply: "Maaf karein, server par bahut load hai. Kripya thodi der baad prayas karein.", 
            translatedQuery: "Server Busy", 
            spokenReply: "Server is very busy right now. Please try again in a few minutes." 
        });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Kisan Vani running on http://localhost:${PORT}`));