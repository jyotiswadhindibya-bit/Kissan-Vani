// ==========================================
// 0. MULTILINGUAL DICTIONARY FOR JS
// ==========================================
const statusDict = {
    "en-IN": {
        welcome: (name) => `Welcome ${name}! I am Kisan Vani, your Digital Saathi. How can I help you today?`,
        listening: "Listening... (Sun raha hoon)...",
        imgAttached: "📷 Image attached. Tap Mic to ask!",
        analyzing: "Analyzing Crop Image...",
        consulting: "Consulting AI Expert...",
        tapAgain: "Tap mic to ask again",
        error: "Error connecting to server.",
        clearImg: "Tap the mic to ask a question",
        micDenied: "⚠️ Mic blocked! Please allow access in browser settings.",
        micError: "⚠️ Mic error. Please try again."
    },
    "hi-IN": {
        welcome: (name) => `नमस्ते ${name}! मैं किसान वाणी हूँ, आपका डिजिटल साथी। आज मैं आपकी कैसे मदद कर सकता हूँ?`,
        listening: "सुन रहा हूँ...",
        imgAttached: "📷 फोटो जुड़ गई है। पूछने के लिए माइक दबाएं!",
        analyzing: "फसल की फोटो जांची जा रही है...",
        consulting: "एआई विशेषज्ञ से सलाह ले रहा हूँ...",
        tapAgain: "दोबारा पूछने के लिए माइक दबाएं",
        error: "सर्वर से जुड़ने में त्रुटि।",
        clearImg: "प्रश्न पूछने के लिए माइक पर टैप करें",
        micDenied: "⚠️ माइक ब्लॉक है! कृपया ब्राउज़र सेटिंग में अनुमति दें।",
        micError: "⚠️ माइक में त्रुटि। कृपया पुनः प्रयास करें।"
    },
    "or-IN": {
        welcome: (name) => `ନମସ୍କାର ${name}! ମୁଁ କିଷାନ ବାଣୀ, ଆପଣଙ୍କର ଡିଜିଟାଲ୍ ସାଥୀ। ଆଜି ମୁଁ ଆପଣଙ୍କୁ କିପରି ସାହାଯ୍ୟ କରିପାରିବି?`,
        listening: "ଶୁଣୁଛି...",
        imgAttached: "📷 ଫଟୋ ସଂଲଗ୍ନ ହୋଇଛି। ପଚାରିବା ପାଇଁ ମାଇକ୍ ଦବାନ୍ତୁ!",
        analyzing: "ଫସଲ ଫଟୋ ଯାଞ୍ଚ କରାଯାଉଛି...",
        consulting: "ଏଆଇ ବିଶେଷଜ୍ଞଙ୍କ ସହ ପରାମର୍ଶ କରାଯାଉଛି...",
        tapAgain: "ପୁଣି ପଚାରିବା ପାଇଁ ମାଇକ୍ ଦବାନ୍ତୁ",
        error: "ସର୍ଭର ସହିତ ସଂଯୋଗ କରିବାରେ ତ୍ରୁଟି।",
        clearImg: "ପ୍ରଶ୍ନ ପଚାରିବାକୁ ମାଇକ୍ ଟ୍ୟାପ୍ କରନ୍ତୁ",
        micDenied: "⚠️ ମାଇକ୍ ଅବରୋଧ ହୋଇଛି! ଦୟାକରି ବ୍ରାଉଜର୍ ସେଟିଂସରେ ଅନୁମତି ଦିଅନ୍ତୁ।",
        micError: "⚠️ ମାଇକ୍ ତ୍ରୁଟି। ଦୟାକରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।"
    }
};

function getStatus(key) {
    const lang = localStorage.getItem('kisanGlobalLang') || 'en-IN';
    return statusDict[lang][key];
}

window.addEventListener('DOMContentLoaded', function() {
    const userName = localStorage.getItem('userName');
    if (userName) {
        setTimeout(() => {
            const welcomeMsg = getStatus('welcome')(userName);
            addMessage(welcomeMsg, 'bot-msg');
        }, 500);
    }
});

function logout() {
    localStorage.removeItem('userName');
    localStorage.removeItem('userPhone');
    return true; 
}

const micBtn = document.getElementById('mic-btn');
const sendBtn = document.getElementById('send-btn'); 
const textInput = document.getElementById('text-input'); 
const statusText = document.getElementById('status-text');
const chatBox = document.getElementById('chat-box');
const langSelect = document.getElementById('language');
const imageInput = document.getElementById('imageInput');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imagePreview = document.getElementById('imagePreview');

let selectedImageBase64 = null;

// ==========================================
// 🎙️ HYBRID MICROPHONE LOGIC (Browser + Sarvam)
// ==========================================
let recognition;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false; 
    
    recognition.onstart = () => {
        micBtn.classList.add('listening');
        statusText.innerText = getStatus('listening');
    };

    recognition.onresult = (event) => {
        micBtn.classList.remove('listening');
        const transcript = event.results[0][0].transcript;
        textInput.value = transcript; 
        handleSubmission(); 
    };

    recognition.onend = () => {
        micBtn.classList.remove('listening');
        if (statusText.innerText === getStatus('listening')) {
            statusText.innerText = getStatus('tapAgain');
        }
    };

    recognition.onerror = (event) => {
        micBtn.classList.remove('listening');
        console.warn("Speech Recognition Error:", event.error);
        if (event.error === 'not-allowed') {
            statusText.innerText = getStatus('micDenied');
        } else if (event.error === 'no-speech') {
            statusText.innerText = getStatus('tapAgain');
        } else {
            statusText.innerText = getStatus('micError');
        }
    };
} else {
    console.warn("Speech Recognition is not supported in this browser.");
}

// Custom variables for Odia MediaRecorder
let mediaRecorder = null;
let audioChunks = [];
let isRecordingOdia = false;

// Button Click Event with Hybrid Logic
micBtn.addEventListener('click', async () => {
    const currentLang = langSelect.value;

    // 🟢 SCENARIO 1: ODIA IS SELECTED (Use Sarvam AI API via Backend)
    if (currentLang === 'or-IN') {
        if (isRecordingOdia) {
            // Stop recording
            mediaRecorder.stop();
            micBtn.classList.remove('listening');
            statusText.innerText = "Transcribing Odia... ⏳";
            isRecordingOdia = false;
        } else {
            // Start recording
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = e => {
                    if (e.data.size > 0) audioChunks.push(e.data);
                };

                mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    const reader = new FileReader();
                    
                    reader.readAsDataURL(audioBlob);
                    reader.onloadend = async () => {
                        const base64Audio = reader.result.split(',')[1];
                        
                        try {
                            const response = await fetch('/api/transcribe', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ audioBase64: base64Audio, language: 'or-IN' })
                            });
                            
                            const data = await response.json();
                            
                            if (data.text) {
                                textInput.value = data.text; 
                                handleSubmission();          
                            } else {
                                statusText.innerText = getStatus('error');
                            }
                        } catch(e) {
                            statusText.innerText = "Transcription error.";
                            console.error(e);
                        }
                    };
                    stream.getTracks().forEach(track => track.stop());
                };

                mediaRecorder.start();
                isRecordingOdia = true;
                micBtn.classList.add('listening');
                statusText.innerText = getStatus('listening'); 

            } catch (err) {
                console.error("Mic access denied:", err);
                statusText.innerText = getStatus('micDenied');
            }
        }
    } 
    // 🟢 SCENARIO 2: ENGLISH OR HINDI SELECTED (Use native browser API)
    else {
        if (!recognition) {
            alert("Voice input is not supported in your browser. Please use Google Chrome.");
            return;
        }

        if (micBtn.classList.contains('listening')) {
            recognition.stop();
            micBtn.classList.remove('listening');
            statusText.innerText = getStatus('tapAgain');
        } else {
            recognition.lang = currentLang;
            try { 
                recognition.start(); 
            } catch (e) {
                console.warn("Mic already starting...");
            }
        }
    }
});

// ==========================================
// 💬 CHAT SUBMISSION LOGIC (With Smart Trend Detection)
// ==========================================
async function handleSubmission() {
    const userText = textInput.value.trim();
    
    if (!userText && !selectedImageBase64) {
        statusText.innerText = getStatus('clearImg');
        return;
    }

// --- 🟢 NEW: SMART TREND INTERCEPTOR ---
    const textLower = userText.toLowerCase();
    
    const trendKeywords = [
        "trend", "news", "predict", "future", "market", "forecast", "sentiment",
        "bhavishya", "samachar", "bazar", "bazaar", "khabar", "ruzhaan", "anuman",
        "ट्रेंड", "रुझान", "भविष्य", "भविष्यवाणी", "समाचार", "खबर", "बाज़ार", "बाजार", "न्यूज़", "अनुमान", "संभावना",
        "ଖବର", "ବଜାର", "ଟ୍ରେଣ୍ଡ", "ଭବିଷ୍ୟତ", "ପୂର୍ବାନୁମାନ", "ଆଗକୁ", "ସମ୍ଭାବନା", "ନ୍ୟୁଜ୍", "ସମ୍ବାଦ"
    ];
    
    const crops = ["potato", "आलू", "ଆଳୁ", "onion", "प्याज", "ପିଆଜ", "wheat", "गेहूँ", "ଗହମ", "rice", "धान", "ଧାନ", "tomato", "टमाटर", "ଟମାଟୋ"];

    const isTrendQuery = trendKeywords.some(kw => textLower.includes(kw));
    const detectedCrop = crops.find(c => textLower.includes(c));

    // If they ask about trends/news...
    if (isTrendQuery && !selectedImageBase64) {
        const userBubble = addMessage(userText, 'user-msg'); // 🟢 Capture the bubble!
        textInput.value = ""; 
        
        if (!detectedCrop) {
            const promptMsg = "Which specific crop's future trend would you like me to check? (e.g., Onion, Tomato, Wheat)";
            addMessage(promptMsg, 'bot-msg');
            speak(promptMsg, langSelect.value);
            return; 
        }

        const cropMap = { 
            "आलू": "potato", "ଆଳୁ": "potato", "प्याज": "onion", "ପିଆଜ": "onion", 
            "गेहूँ": "wheat", "ଗହମ": "wheat", "धान": "rice", "ଧାନ": "rice", 
            "टमाटर": "tomato", "ଟମାଟୋ": "tomato" 
        };
        const englishCrop = cropMap[detectedCrop] || detectedCrop;
        
        // 🟢 FIX 1: Pass the user's text and bubble to the fetch function
        fetchMarketTrend(englishCrop, userText, userBubble); 
        return; 
    }
    // ---------------------------------------
    // ---------------------------------------

    const displayMsg = userText || (selectedImageBase64 ? "Analyzing uploaded image..." : "");
    const userBubble = addMessage(displayMsg, 'user-msg');
    
    const loadingText = selectedImageBase64 ? getStatus('analyzing') : getStatus('consulting');
    statusText.innerText = loadingText;
    const loadingBubble = addMessage("⏳ " + loadingText, 'bot-msg');

    textInput.value = "";
    const currentImage = selectedImageBase64;
    if (currentImage) clearImage();

    try {
        const response = await fetch('/api/chat', {  
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                text: userText, 
                language: langSelect.options[langSelect.selectedIndex].text, 
                image: currentImage 
            })
        });

        const data = await response.json();
        
        if (chatBox.contains(loadingBubble)) chatBox.removeChild(loadingBubble);

        if (data.translatedQuery && data.translatedQuery !== "Error") {
            userBubble.innerText = data.translatedQuery;
        }

        addMessage(data.reply, 'bot-msg');
        statusText.innerText = getStatus('tapAgain');
        
        speak(data.reply, langSelect.value);

    } catch (error) {
        console.error(error);
        if (chatBox.contains(loadingBubble)) chatBox.removeChild(loadingBubble);
        statusText.innerText = getStatus('error');
        addMessage("⚠️ Connection error. Please try again.", 'bot-msg');
    }
}

sendBtn.addEventListener('click', handleSubmission);

textInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSubmission();
});

// ==========================================
// 📷 IMAGE LOGIC & UTILITIES
// ==========================================
const galleryInput = document.getElementById('galleryInput');

// One function to handle both Camera and Gallery uploads
function processImageSelection(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            // 1. Save the actual data so Gemini can read it
            selectedImageBase64 = e.target.result.split(',')[1]; 
            
            // 2. Show the preview on the screen
            imagePreview.src = e.target.result;
            imagePreviewContainer.classList.remove('hidden');
            statusText.innerText = getStatus('imgAttached');
        };
        reader.readAsDataURL(file);
    }
}

// Attach this logic to BOTH buttons
imageInput.addEventListener('change', processImageSelection);
if (galleryInput) {
    galleryInput.addEventListener('change', processImageSelection);
}

window.clearImage = function() {
    selectedImageBase64 = null;
    imageInput.value = "";
    if (galleryInput) galleryInput.value = "";
    imagePreviewContainer.classList.add('hidden');
    statusText.innerText = getStatus('clearImg');
};

function addMessage(text, className) {
    const div = document.createElement('div');
    div.classList.add('msg', className);
    div.innerText = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    return div;
}
/* =========================================
           📸 ADVANCED WEBCAM LOGIC
           ========================================= */
        const cameraModal = document.getElementById('cameraModal');
        const cameraVideo = document.getElementById('cameraVideo');
        const cameraCanvas = document.getElementById('cameraCanvas');
        let videoStream = null;

        async function openCamera() {
            closePopover(); // Close the menu
            
            try {
                // Request the camera (prefers the back camera on mobile)
                videoStream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'environment' } 
                });
                
                // Connect the live camera to our video box
                cameraVideo.srcObject = videoStream;
                cameraModal.classList.remove('hidden');
            } catch (err) {
                console.error("Camera access denied:", err);
                alert("Could not access the camera. Please check your browser permissions.");
            }
        }

        // Handle the "Cancel" button
        document.getElementById('closeCameraBtn').addEventListener('click', () => {
            if (videoStream) {
                videoStream.getTracks().forEach(track => track.stop()); // Turn off the webcam light
            }
            cameraModal.classList.add('hidden');
        });

        // Handle the "Snap Photo" button
        document.getElementById('snapPhotoBtn').addEventListener('click', () => {
            // 1. Draw the exact video frame onto our hidden canvas
            cameraCanvas.width = cameraVideo.videoWidth;
            cameraCanvas.height = cameraVideo.videoHeight;
            const ctx = cameraCanvas.getContext('2d');
            ctx.drawImage(cameraVideo, 0, 0, cameraCanvas.width, cameraCanvas.height);
            
            // 2. Convert the canvas into a Base64 Image String
            const base64DataUrl = cameraCanvas.toDataURL('image/jpeg');
            
            // 3. Save it to the global variable so script.js can send it to Gemini
            selectedImageBase64 = base64DataUrl.split(',')[1];
            
            // 4. Show the thumbnail preview in the chat box
            document.getElementById('imagePreview').src = base64DataUrl;
            document.getElementById('imagePreviewContainer').classList.remove('hidden');
            document.getElementById('status-text').innerText = getStatus('imgAttached');
            
            // 5. Turn off the webcam and hide the modal
            if (videoStream) {
                videoStream.getTracks().forEach(track => track.stop());
            }
            cameraModal.classList.add('hidden');
        });

// ==========================================
// 🔊 HYBRID TEXT-TO-SPEECH LOGIC
// ==========================================

// 🟢 NEW: Helper function to strip out Markdown symbols before speaking
function cleanTextForSpeech(rawText) {
    if (!rawText) return "";
    return rawText
        .replace(/\*/g, '')      // Remove all asterisks
        .replace(/#/g, '')       // Remove hash/pound signs
        .replace(/_/g, '')       // Remove underscores
        .replace(/`/g, '')       // Remove backticks
        .replace(/~/g, '');      // Remove tildes
}

async function speak(text, lang) {
    // 🟢 FIX: Clean the text before doing anything else!
    const cleanText = cleanTextForSpeech(text);

    // 🟢 SCENARIO 1: ODIA IS SELECTED (Use Sarvam AI via Backend)
    if (lang === 'or-IN') {
        try {
            statusText.innerText = "Generating Odia voice... ⏳";
            
            const response = await fetch('/api/speak', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: cleanText, language: lang }) // Send clean text
            });
            
            const data = await response.json();
            
            if (data.audioBase64) {
                const audio = new Audio("data:audio/wav;base64," + data.audioBase64);
                audio.play();
                audio.onended = () => { statusText.innerText = getStatus('clearImg'); };
            } else {
                console.error("Failed to get audio from server.");
                statusText.innerText = getStatus('clearImg');
            }
        } catch (e) {
            console.error("Sarvam TTS Error:", e);
            statusText.innerText = getStatus('clearImg');
        }
    } 
    // 🟢 SCENARIO 2: ENGLISH OR HINDI SELECTED (Use Browser API)
    else {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanText); // Speak clean text
        utterance.lang = lang;
        utterance.rate = 1.0; 
        window.speechSynthesis.speak(utterance);
    }
}

// ==========================================
// 📈 MARKET TREND UI LOGIC (Multilingual)
// ==========================================
// 📈 MARKET TREND UI LOGIC (Multilingual)
// ==========================================
async function fetchMarketTrend(cropName, userText, userBubble) { 
    const loadingBubble = addMessage(`📰 Fetching news for ${cropName}...`, 'bot-msg');
    
    try {
        const currentLangVal = langSelect.value; // e.g., 'or-IN'

        const response = await fetch('/api/market-trend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                crop: cropName, 
                // 🟢 FIX 1: Send the exact language code so the backend never gets confused
                language: currentLangVal, 
                userQuery: userText || cropName
            })
        });

        const data = await response.json();
        chatBox.removeChild(loadingBubble);

        // Update the user's green bubble with the Odia/Hindi translation!
        if (data.translatedQuery && userBubble) {
            userBubble.innerText = data.translatedQuery;
        }

        // 1. Setup Icons and Colors
        let trendIcon = data.trend === "Upward" ? "📈" : data.trend === "Downward" ? "📉" : "⚖️";
        let trendColor = data.trend === "Upward" ? "#4CAF50" : data.trend === "Downward" ? "#f44336" : "#ff9800";

        // 2. Translate the hardcoded UI Labels & Trend word
        let trendLabel = "Trend";
        let analysisLabel = "AI Analysis";
        let displayTrend = data.trend;

        if (currentLangVal === 'hi-IN') {
            trendLabel = "बाज़ार का रुझान";
            analysisLabel = "एआई विश्लेषण";
            displayTrend = data.trend === "Upward" ? "तेजी (Upward)" : data.trend === "Downward" ? "गिरावट (Downward)" : "स्थिर (Stable)";
        } else if (currentLangVal === 'or-IN') {
            trendLabel = "ବଜାର ଟ୍ରେଣ୍ଡ";
            analysisLabel = "ଏଆଇ ବିଶ୍ଳେଷଣ";
            displayTrend = data.trend === "Upward" ? "ବୃଦ୍ଧି (Upward)" : data.trend === "Downward" ? "ହ୍ରାସ (Downward)" : "ସ୍ଥିର (Stable)";
        }

        // 3. Build the fully translated HTML Card
        const cardHTML = `
            <div style="background: #f9f9f9; border-left: 4px solid ${trendColor}; padding: 10px; border-radius: 8px; margin-top: 5px; color: #333;">
                <strong>${trendIcon} ${trendLabel}:</strong> ${displayTrend} (${data.probability})<br><br>
                <strong>🧠 ${analysisLabel}:</strong> ${data.reasoning}<br><br>
                <small style="color: #666;">⚠️ <em>${data.disclaimer}</em></small>
            </div>
        `;
        
        const div = document.createElement('div');
        div.classList.add('msg', 'bot-msg');
        div.innerHTML = cardHTML;
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;

        // Speak the reasoning in the correct language!
        speak(data.reasoning, currentLangVal);

    } catch (error) {
        console.error(error);
        if (chatBox.contains(loadingBubble)) chatBox.removeChild(loadingBubble);
        addMessage("⚠️ Failed to fetch market news.", 'bot-msg');
    }
}