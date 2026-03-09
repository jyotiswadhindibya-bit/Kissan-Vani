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
// 💬 CHAT SUBMISSION LOGIC
// ==========================================
async function handleSubmission() {
    const userText = textInput.value.trim();
    
    if (!userText && !selectedImageBase64) {
        statusText.innerText = getStatus('clearImg');
        return;
    }

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
        
        // Use the new hybrid speak function
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
imageInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            selectedImageBase64 = e.target.result.split(',')[1]; 
            imagePreview.src = e.target.result;
            imagePreviewContainer.classList.remove('hidden');
            statusText.innerText = getStatus('imgAttached');
        };
        reader.readAsDataURL(file);
    }
});

window.clearImage = function() {
    selectedImageBase64 = null;
    imageInput.value = "";
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

// ==========================================
// 🔊 HYBRID TEXT-TO-SPEECH LOGIC
// ==========================================
async function speak(text, lang) {
    // 🟢 SCENARIO 1: ODIA IS SELECTED (Use Sarvam AI via Backend)
    if (lang === 'or-IN') {
        try {
            statusText.innerText = "Generating Odia voice... ⏳";
            
            const response = await fetch('/api/speak', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text, language: lang })
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
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 1.0; 
        window.speechSynthesis.speak(utterance);
    }
}