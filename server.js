const express = require('express');
const multer = require('multer');
const axios = require('axios');
const QRCode = require('qrcode');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ElevenLabs API configuration
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || 'your_api_key_here';
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

// Middleware
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = 'public/uploads';
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Only audio files are allowed!'), false);
        }
    }
});

// In-memory storage for demo (use database in production)
let voiceClones = [];
let audioMessages = [];

// Routes
app.get('/', (req, res) => {
    res.render('index', { 
        voiceClones,
        message: null 
    });
});

// Voice cloning route
app.post('/clone-voice', upload.single('audioFile'), async (req, res) => {
    try {
        const { doctorName, description } = req.body;
        const audioFile = req.file;

        if (!audioFile || !doctorName) {
            return res.render('index', { 
                voiceClones,
                message: { type: 'error', text: 'Please provide doctor name and audio file' }
            });
        }

        // Create FormData for ElevenLabs API
        const formData = new FormData();
        formData.append('name', doctorName);
        formData.append('description', description || 'Doctor voice clone');
        formData.append('files', fs.createReadStream(audioFile.path));

        // Call ElevenLabs voice cloning API
        const response = await axios.post(
            `${ELEVENLABS_BASE_URL}/voices/add`,
            formData,
            {
                headers: {
                    'xi-api-key': ELEVENLABS_API_KEY,
                    ...formData.getHeaders()
                }
            }
        );

        const voiceId = response.data.voice_id;
        
        // Store voice clone info
        const voiceClone = {
            id: voiceId,
            name: doctorName,
            description: description || 'Doctor voice clone',
            audioFile: audioFile.filename,
            createdAt: new Date()
        };
        
        voiceClones.push(voiceClone);

        // Clean up uploaded file after processing
        fs.unlinkSync(audioFile.path);

        res.render('index', { 
            voiceClones,
            message: { type: 'success', text: `Voice clone created successfully! Voice ID: ${voiceId}` }
        });

    } catch (error) {
        console.error('Voice cloning error:', error.response?.data || error.message);
        res.render('index', { 
            voiceClones,
            message: { type: 'error', text: 'Failed to clone voice. Please try again.' }
        });
    }
});

// Generate voice message route
app.post('/generate-message', async (req, res) => {
    try {
        const { voiceId, messageText, patientName } = req.body;

        if (!voiceId || !messageText) {
            return res.render('index', { 
                voiceClones,
                message: { type: 'error', text: 'Please select a voice and provide message text' }
            });
        }

        // Call ElevenLabs text-to-speech API
        const response = await axios.post(
            `${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}`,
            {
                text: messageText,
                model_id: "eleven_monolingual_v1",
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.5
                }
            },
            {
                headers: {
                    'xi-api-key': ELEVENLABS_API_KEY,
                    'Content-Type': 'application/json'
                },
                responseType: 'arraybuffer'
            }
        );

        // Save audio file
        const audioFileName = `message-${Date.now()}.mp3`;
        const audioFilePath = path.join(uploadsDir, audioFileName);
        fs.writeFileSync(audioFilePath, response.data);

        // Generate QR code
        const audioUrl = `${req.protocol}://${req.get('host')}/uploads/${audioFileName}`;
        const qrCode = await QRCode.toDataURL(audioUrl);

        // Store message info
        const audioMessage = {
            id: Date.now(),
            voiceId,
            voiceName: voiceClones.find(v => v.id === voiceId)?.name || 'Unknown',
            messageText,
            patientName: patientName || 'Patient',
            audioFileName,
            audioUrl,
            qrCode,
            createdAt: new Date()
        };

        audioMessages.push(audioMessage);

        res.render('message-result', { 
            audioMessage,
            message: { type: 'success', text: 'Voice message generated successfully!' }
        });

    } catch (error) {
        console.error('Message generation error:', error.response?.data || error.message);
        res.render('index', { 
            voiceClones,
            message: { type: 'error', text: 'Failed to generate voice message. Please try again.' }
        });
    }
});

// View all messages
app.get('/messages', (req, res) => {
    res.render('messages', { audioMessages });
});

// Delete voice clone
app.post('/delete-voice/:id', async (req, res) => {
    try {
        const voiceId = req.params.id;
        
        // Delete from ElevenLabs
        await axios.delete(`${ELEVENLABS_BASE_URL}/voices/${voiceId}`, {
            headers: {
                'xi-api-key': ELEVENLABS_API_KEY
            }
        });

        // Remove from local storage
        voiceClones = voiceClones.filter(voice => voice.id !== voiceId);

        res.redirect('/?deleted=true');
    } catch (error) {
        console.error('Delete voice error:', error.response?.data || error.message);
        res.redirect('/?error=delete_failed');
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        return res.render('index', { 
            voiceClones,
            message: { type: 'error', text: 'File upload error: ' + error.message }
        });
    }
    next(error);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Make sure to set ELEVENLABS_API_KEY environment variable');
});
