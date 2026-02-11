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

app.use(express.static(__dirname));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
const chatSession = model.startChat({
    history: [
        {
            role: "user",
            parts: [{ text: "You are Kisan Vani, an expert agricultural AI assistant. Keep answers short, simple, and helpful for Indian farmers." }],
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
    const textLower = text.toLowerCase();
const cityMap = {
        "balasore": "Balasore", "baleswar": "Balasore", "बालासोर": "Balasore", "ବାଲେଶ୍ୱର": "Balasore",
        "bhadrak": "Bhadrak", "भद्रक": "Bhadrak", "ଭଦ୍ରକ": "Bhadrak",
        "cuttack": "Cuttack", "katak": "Cuttack", "कटक": "Cuttack", "କଟକ": "Cuttack",
        "ganjam": "Ganjam", "berhampur": "Berhampur", "brahmapur": "Berhampur", "गंजम": "Ganjam", "ଗଞ୍ଜାମ": "Ganjam",
        "jajpur": "Jajpur", "जाजपुर": "Jajpur", "ଯାଜପୁର": "Jajpur",
        "jagatsinghpur": "Jagatsinghpur", "जगतसिंहपुर": "Jagatsinghpur", "ଜଗତସିଂହପୁର": "Jagatsinghpur",
        "kendrapara": "Kendrapara", "केंद्रपाड़ा": "Kendrapara", "କେନ୍ଦ୍ରାପଡା": "Kendrapara",
        "khurda": "Khordha", "khordha": "Khordha", "खुर्दा": "Khordha", "ଖୋର୍ଦ୍ଧା": "Khordha",
        "nayagarh": "Nayagarh", "नयागढ़": "Nayagarh", "ନୟାଗଡ଼": "Nayagarh",
        "puri": "Puri", "jagannath dham": "Puri", "पुरी": "Puri", "ପୁରୀ": "Puri",
        "bhubaneswar": "Bhubaneswar", "bbsr": "Bhubaneswar", "भुवनेश्वर": "Bhubaneswar", "ଭୁବନେଶ୍ୱର": "Bhubaneswar",

        "delhi": "Delhi", "new delhi": "Delhi", "दिल्ली": "Delhi",
        "mumbai": "Mumbai", "maharashtra": "Mumbai", "मुंबई": "Mumbai",
        "kolkata": "Kolkata", "calcutta": "Kolkata", "कोलकाता": "Kolkata",
        "chennai": "Chennai", "tamil nadu": "Chennai", "चेन्नई": "Chennai",
        "bangalore": "Bangalore", "bengaluru": "Bangalore", "बंगलौर": "Bangalore",
        "hyderabad": "Hyderabad", "telangana": "Hyderabad", "हैदराबाद": "Hyderabad"
    };
    for (const [keyword, englishName] of Object.entries(cityMap)) {
        if (textLower.includes(keyword)) {
            return englishName;
        }
    }
    return "Bhubaneswar";
}

async function getWeather(city) {
    if (!WEATHER_API_KEY) 
        return "Weather API Key missing in .env";

    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${WEATHER_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.cod !== 200) 
            return `Weather unavailable for ${city}`;

        return `In ${city}: Temp ${data.main.temp}°C, Humidity ${data.main.humidity}%, Condition: ${data.weather[0].description}`;
    } catch (error) {
        return "Weather Service Error";
    }
}

app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


app.post('/api/chat', async (req, res) => {
    try {
        const { text, language, image } = req.body;
        console.log(`User asked: ${text} | Image attached: ${!!image}`);

        const city = detectLocation(text);
        const weatherInfo = await getWeather(city);

        let promptText = `
        [System Context Update]
        User Language: ${language} (Reply in this language).
        Current Weather: ${weatherInfo}
        Mandi Rates: ${JSON.stringify(MANDI_DB)}
        Govt Schemes: ${SCHEME_CONTEXT}
        
        User Question: ${text}
        `;

        if (image) {
            promptText += " (User has also attached an image. Analyze it.)";
        }
        let parts = [{ text: promptText }];
        if (image) {
            parts.push({
                inlineData: {
                    mimeType: "image/jpeg",
                    data: image
                }
            });
        }
        const result = await chatSession.sendMessage(parts);
        
        const response = await result.response;
        const replyText = response.text();

        console.log(`AI Replied: ${replyText}`);
        res.json({ reply: replyText });

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ reply: "Sorry, I lost my train of thought. Please ask again." });
    }
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Kisan Vani running on http://localhost:${PORT}`));