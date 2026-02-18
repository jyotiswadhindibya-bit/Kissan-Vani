const fetch = require('node-fetch');
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
app.use(bodyParser.json());

// ==========================================
// 📂 1. FOLDER CONFIGURATION (CRITICAL FIX)
// ==========================================
// This tells the server where to find your files in the new structure
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use(express.static(path.join(__dirname, 'html'))); // Serve HTML files from 'html' folder

// Main Route: When user opens the site, send index.html
app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'index.html'));
});

// ==========================================
// 🤖 2. AI & DATA SETUP
// ==========================================

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Using Flash for "Zero Latency" vision
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 

const chatSession = model.startChat({
    history: [
        {
            role: "user",
            parts: [{ text: "System Initialization: You are Kisan Vani. Act as a wise, helpful agricultural expert for Indian farmers. Output strictly plain text." }],
        },
        {
            role: "model",
            parts: [{ text: "Namaste! I am Kisan Vani. I am ready to help you with crops, weather, and mandi prices." }],
        },
    ],
});

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
let SCHEME_CONTEXT = "";
let MANDI_DB = {};

// --- Load Government Schemes (PDF) ---
async function loadPDF() {
    try {
        const pdfPath = path.join(__dirname, 'scheme.pdf'); // Look in root folder
        if (fs.existsSync(pdfPath)) {
            const dataBuffer = fs.readFileSync(pdfPath);
            const data = await pdfParse(dataBuffer);
            SCHEME_CONTEXT = data.text.substring(0, 40000); // Increased context limit
            console.log("✅ PDF Loaded: Government Schemes Ready");
        } else {
            console.log("⚠️ scheme.pdf not found in root folder.");
        }
    } catch (e) { console.log("⚠️ PDF Error:", e.message); }
}

// --- Load Mandi Prices (JSON) ---
function loadMandiDB() {
    try {
        const jsonPath = path.join(__dirname, 'mandi_rates.json'); // Look in root folder
        if (fs.existsSync(jsonPath)) {
            const rawData = fs.readFileSync(jsonPath);
            MANDI_DB = JSON.parse(rawData);
            console.log("✅ Mandi DB Loaded: Prices Ready");
        } else {
            console.log("⚠️ mandi_rates.json not found in root folder.");
        }
    } catch (e) { console.log("⚠️ Mandi DB Error:", e.message); }
}

loadPDF();
loadMandiDB();

// ==========================================
// 🛠️ 3. HELPER FUNCTIONS
// ==========================================

function detectLocation(text) {
    const textLower = text.toLowerCase();
    // Simplified Map - Add more cities if needed
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
    return null; // Return null if no city found (AI will handle it)
}

async function getWeather(city) {
    if (!city) return "Location not detected.";
    if (!WEATHER_API_KEY) return "Weather API Key missing.";

    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${WEATHER_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.cod !== 200) return `Weather unavailable for ${city}`;
        return `In ${city}: ${data.main.temp}°C, ${data.weather[0].description}, Humidity ${data.main.humidity}%`;
    } catch (error) {
        return "Weather Service Error";
    }
}

// ==========================================
// 🚀 4. CHAT API (The Brain)
// ==========================================

app.post('/api/chat', async (req, res) => {
    try {
        const { text, language, image } = req.body;
        console.log(`User (${language}): ${text} | Image: ${!!image}`);

        // 1. Context Gathering
        const city = detectLocation(text);
        const weatherInfo = await getWeather(city);
        
        // 2. Construct the Prompt (The "Vision")
        let promptText = `
        [SYSTEM INSTRUCTION]
        You are 'Kisan Vani', a friendly and expert agricultural assistant (Digital Saathi).
        
        [CONTEXT]
        - User Language: ${language} (MUST REPLY IN THIS SCRIPT/LANGUAGE)
        - Weather: ${weatherInfo}
        - Mandi Database: ${JSON.stringify(MANDI_DB)}
        - Govt Schemes: ${SCHEME_CONTEXT}
        
        [RULES]
        1. **Response Style:** Short, simple, like a wise village elder.
        2. **Format:** PLAIN TEXT ONLY. No markdown (**bold**, *italics*), no bullet points. This is for VOICE output.
        3. **Language:** - If user asks in Hindi, reply in Hindi (Devanagari).
           - If user asks in Odia, reply in Odia (Odia script).
           - Never use English letters for Indian languages.
        4. **Data Usage:**
           - If asked about "Mandi" or "Price", look up the city in the Mandi Database context.
           - If asked about "Disease" (and image is provided), identify it and suggest a simple remedy.
           - If asked about "Schemes", summarize from the Govt Schemes context.
        
        [USER QUESTION]
        "${text}"
        `;

        // 3. Add Image if available (Multimodal)
        let parts = [{ text: promptText }];
        if (image) {
            promptText += " [IMAGE ATTACHED: Analyze crop health/disease]";
            parts.push({
                inlineData: {
                    mimeType: "image/jpeg",
                    data: image
                }
            });
        }

        // 4. Generate Answer
        const result = await chatSession.sendMessage(parts);
        const response = await result.response;
        
        // 5. Clean Output (Remove Markdown for Voice)
        let replyText = response.text().replace(/[*#_~`]/g, '').trim(); 

        console.log(`AI Replied: ${replyText.substring(0, 50)}...`);
        
        // 6. Send Response
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json({ reply: replyText });

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ reply: "Maaf karein, kuch takneeki samasya hai. (Sorry, technical error)." });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Kisan Vani running on http://localhost:${PORT}`));