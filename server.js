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
// 🟢 INCREASED LIMIT: Essential for high-quality camera photos
app.use(bodyParser.json({ limit: '10mb' }));

app.use(express.static(__dirname));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 🟢 YOUR ORIGINAL MODELS KEPT HERE
const modelsToTry = [
    "gemini-2.5-flash-lite", 
    "gemini-2.0-flash",      
    "gemini-2.5-flash"       
];

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

let SCHEME_CONTEXT = "";
let MANDI_DB = {};

async function loadPDF() {
    try {
        if (fs.existsSync('./scheme.pdf')) {
            const dataBuffer = fs.readFileSync('./scheme.pdf');
            const data = await pdfParse(dataBuffer);
            SCHEME_CONTEXT = data.text.substring(0, 30000); 
            console.log("✅ PDF Loaded");
        } else {
            console.log("⚠️ scheme.pdf not found (Skipping RAG)");
        }
    } catch (e) { console.log("⚠️ PDF Error:", e.message); }
}

function loadMandiDB() {
    try {
        if (fs.existsSync('./mandi_rates.json')) {
            const rawData = fs.readFileSync('./mandi_rates.json');
            MANDI_DB = JSON.parse(rawData);
            console.log("✅ Mandi DB Loaded");
        } else {
            console.log("⚠️ mandi_rates.json not found");
        }
    } catch (e) { console.log("⚠️ Mandi DB Error:", e.message); }
}

loadPDF();
loadMandiDB();

function detectLocation(text) {
    if (!text) return null;
    const textLower = text.toLowerCase();
    const cityMap = {
        "bhubaneswar": "Bhubaneswar", "bbsr": "Bhubaneswar",
        "cuttack": "Cuttack", "puri": "Puri", "delhi": "Delhi",
        "mumbai": "Mumbai", "kolkata": "Kolkata", "chennai": "Chennai",
        "balasore": "Balasore", "bhadrak": "Bhadrak"
    };
    for (const [keyword, englishName] of Object.entries(cityMap)) {
        if (textLower.includes(keyword)) {
            return englishName;
        }
    }
    return null;
}
function detectCrop(text) {
    const crops = ["potato", "आलू", "ଆଳୁ", "onion", "प्याज", "ପିଆଜ", "Wheat", "गेहूँ","ଗହମ","Rice","धान","ଧାନ","brinjal","बैंगन","ବାଇଗଣ","Tomato","टमाटर","ଟମାଟୋ","Pointed Gourd","परवल","ପୋଟଳ"];
    const textLower = text.toLowerCase();
    return crops.find(crop => textLower.includes(crop)) || null;
}

async function getWeather(city) {
    const targetCity = city || "Bhubaneswar"; // Default city if none mentioned
    if (!WEATHER_API_KEY) return "Weather API Key missing.";
    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${targetCity}&units=metric&appid=${WEATHER_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.cod !== 200) return `Weather unavailable for ${targetCity}`;
        return `In ${targetCity}: ${data.main.temp}°C, ${data.weather[0].description}`;
    } catch (error) { return "Weather Service Error"; }
}

// ==========================================
// 🚀 4. CHAT API (Optimized for Independent Inputs)
// ==========================================
app.post('/api/chat', async (req, res) => {
    try {
        const { text, language, image } = req.body;
        
        const city = detectLocation(text);
        const mentionedCrop = detectCrop(text);
        let mandiContext = "";
        const weatherInfo = await getWeather(city);

        // Define Script Rules
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

        // Updated AI Brain Logic for Crops vs Sky
        let dynamicContext = `
        [TASK]
        You are Kisan Vani AI, an agricultural expert built to assist farmers facing problems in agriculture. your answers should be clear,consise and simple to be understood by the lay man farmer. Answer the questions asked by the user only, do not provide anything uneccessary until asked for. Return a JSON object with keys: "translatedQuery", "reply", "spokenReply".

        [RELEVANT DATA]
        - Current Weather: ${weatherInfo}
        - Mandi Prices: ${JSON.stringify(MANDI_DB)}
        - Govt Schemes Context: ${SCHEME_CONTEXT}

        [ANALYSIS RULES]
        1. If an image is provided:
           - If it is a CROP: Identify the crop and strictly analyze the health of the crop and give suggestions to prevent it from diseases.If there is any disease in the crop or plant, identify it suggest solutions to cure the crop or plant.  
           - If it is the SKY: Use the provided weather data to explain current conditions and advise on farming activities (irrigation, sowing, etc.).
           - If the image is unclear, state that you cannot analyze it and rely solely on the text input for your response.
           - Don't give any unnecessary information other than what is asked for in the question. Be concise and to the point.
           - Don't mention the government schemes if the user doesn't ask for it. Only provide information about government schemes if the user specifically asks for it.
        2. If only text is provided: Strictly answer the agricultural question using the data above.
        
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

        for (const modelName of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({ 
                    model: modelName,
                    generationConfig: { responseMimeType: "application/json" }
                }); 
                
                const result = await model.generateContent(parts);
                const responseText = result.response.text();
                aiData = JSON.parse(responseText);
                break; 

            } catch (error) {
                console.log(`⚠️ ${modelName} failed. Trying backup...`);
                lastError = error;
            }
        }

        if (!aiData) throw lastError;

        res.json(aiData);

    } catch (error) {
        console.error("❌ Final Server Error:", error.message);
        res.status(500).json({ 
            reply: "Server Error. Please try again later.", 
            spokenReply: "Server error. Please try again later." 
        });
    }
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Kisan Vani running on http://localhost:${PORT}`));