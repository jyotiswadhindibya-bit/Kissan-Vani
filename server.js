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
app.use(express.static(path.join(__dirname, 'html'))); 

app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'dashboard.html'));
});

// ==========================================
// 🤖 3. AI PERSONA & MEMORY 
// ==========================================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 🟢 FIX: Correctly set to the powerful 'gemini-2.5-flash' model
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 

const chatSession = model.startChat({
    history: [
        {
            role: "user",
            parts: [{ text: `
            [SYSTEM INSTRUCTION]
            You are 'Kisan Vani', a friendly and expert agricultural assistant (Digital Saathi).
            
            [STRICT RULES]0
            1. Response Style: Short, simple, like a wise village elder.
            2. Format: PLAIN TEXT ONLY. No markdown (**bold**). Voice friendly.
            3. Goal: Help with crops, weather, mandi prices, and government schemes.
            ` }],
        },
        {
            role: "model",
            parts: [{ text: "Namaste! I am Kisan Vani. I understand my instructions. I am ready to help." }],
        },
    ],
});

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
let SCHEME_CONTEXT = "";
let MANDI_DB = {};

// --- Load Data ---
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

// ==========================================
// 🛠️ 4. HELPER FUNCTIONS
// ==========================================
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
// 🚀 5. CHAT API
// ==========================================
app.post('/api/chat', async (req, res) => {
    try {
        const { text, language, image } = req.body;
        console.log(`User (${language}): ${text} | Image: ${!!image}`);

        const city = detectLocation(text);
        const weatherInfo = await getWeather(city);

        // 🟢 STRICT LANGUAGE ENFORCER
        let scriptInstruction = "";
        if (language.includes("Odia") || language.includes("or-IN")) {
            scriptInstruction = "The user is speaking Odia. Even if their input is in English letters, you MUST strictly reply in ODIA SCRIPT (e.g., ନମସ୍କାର). Do not use English letters.";
        } else if (language.includes("Hindi") || language.includes("hi-IN")) {
            scriptInstruction = "STRICTLY REPLY IN HINDI SCRIPT (Devanagari).";
        } else {
            scriptInstruction = "Reply in English.";
        }
        
        let dynamicContext = `
        [REAL-TIME DATA UPDATE]
        - User Language: ${language}
        - Formatting Rule: ${scriptInstruction}
        - Current Weather: ${weatherInfo}
        - Mandi Prices: ${JSON.stringify(MANDI_DB)}
        - Govt Schemes: ${SCHEME_CONTEXT}
        
        [USER QUESTION]
        "${text}"
        `;

        let parts = [{ text: dynamicContext }];
        
        if (image) {
            parts.push({
                inlineData: {
                    mimeType: "image/jpeg",
                    data: image
                }
            });
            parts.push({ text: " (Analyze this crop image for disease)" });
        }

        const result = await chatSession.sendMessage(parts);
        const response = await result.response;
        
        let replyText = response.text().replace(/[*#_~`]/g, '').trim(); 
        console.log(`AI Replied: ${replyText.substring(0, 50)}...`);
        
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json({ reply: replyText });

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ reply: "Maaf karein, network samasya hai. (Network Error)" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Kisan Vani running on http://localhost:${PORT}`));