# doctor-voice-clone

🗣️ Doctor Voice Cloning & Message Generator
This is a Node.js + Express web application that integrates with ElevenLabs API to:

Clone a doctor’s voice from uploaded audio samples

Generate personalized voice messages for patients

Host generated MP3s locally and generate QR codes for instant access

🚀 Features
Voice Cloning – Upload an audio file and create a custom voice clone using ElevenLabs

Text-to-Speech Message Generation – Convert patient-specific messages into MP3 audio

QR Code Generator – Generate QR codes linking directly to the audio file

Local File Hosting – Host generated audio files under /public/uploads

Voice Management – View, list, and delete cloned voices

Message Archive – Browse all generated voice messages

⚙️ API Endpoints
1️⃣ Clone Voice
POST /clone-voice

Form fields: doctorName, description, audioFile

Description: Upload an audio file and create a cloned voice in ElevenLabs.

2️⃣ Generate Message
POST /generate-message

Form fields: voiceId, messageText, patientName

Description: Generate an MP3 message using a cloned voice, save it locally, and create a QR code.

3️⃣ List Messages
GET /messages – Displays all generated messages.

4️⃣ Delete Voice
POST /delete-voice/:id – Deletes a cloned voice both locally and in ElevenLabs.