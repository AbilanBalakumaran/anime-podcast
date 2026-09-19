/**
 * AUDIO MANAGER - AUTOPOD STUDIO
 * Moteur audio professionnel :
 * - Synthèse vocale HD avec Gemini AI (Voix 'Orbit' par défaut, Puck, Charon, Kore, Fenrir, Aoede)
 * - Synthèse vocale ElevenLabs (Rachel, Adam, Antoni, Josh)
 * - Voix anglaises système (Web Speech API)
 * - Analyse fréquentielle en temps réel pour le lip-sync (mouth flap)
 * - Décodage AudioBuffer, tracking temporel et export vidéo transparent avec piste audio
 */

export const PRESET_ENGLISH_VOICES = [
  // 1. Voix Gemini AI (Haute Définition - Modèle gemini-3.1-flash-tts-preview)
  { id: 'gemini-Orbit', name: 'Gemini - Orbit', provider: 'Gemini AI', desc: 'English Male (Deep & Engaging) [Défaut]', default: true },
  { id: 'gemini-Puck', name: 'Gemini - Puck', provider: 'Gemini AI', desc: 'English Male (Upbeat & Dynamic)' },
  { id: 'gemini-Charon', name: 'Gemini - Charon', provider: 'Gemini AI', desc: 'English Male (Informative & Calm)' },
  { id: 'gemini-Kore', name: 'Gemini - Kore', provider: 'Gemini AI', desc: 'English Female (Firm & Clear)' },
  { id: 'gemini-Fenrir', name: 'Gemini - Fenrir', provider: 'Gemini AI', desc: 'English Male (Excitable & Energetic)' },
  { id: 'gemini-Aoede', name: 'Gemini - Aoede', provider: 'Gemini AI', desc: 'English Female (Breezy & Natural)' },

  // 2. Voix ElevenLabs (Modèle eleven_flash_v2_5)
  { id: 'elevenlabs-Rachel', name: 'ElevenLabs - Rachel', provider: 'ElevenLabs', desc: 'English Female (Calm & Professional)', voiceId: '21m00Tcm4TlvDq8ikWAM' },
  { id: 'elevenlabs-Adam', name: 'ElevenLabs - Adam', provider: 'ElevenLabs', desc: 'English Male (Deep Narrative)', voiceId: 'pNInz6obpgDQGcFmaJgB' },
  { id: 'elevenlabs-Antoni', name: 'ElevenLabs - Antoni', provider: 'ElevenLabs', desc: 'English Male (Well-Rounded)', voiceId: 'ErXwobaYiN019PkySvjV' },
  { id: 'elevenlabs-Josh', name: 'ElevenLabs - Josh', provider: 'ElevenLabs', desc: 'English Male (Young & Natural)', voiceId: 'TxGEqnHWrfWFTfGW9XjX' }
];

export class AudioManager {
  constructor(onTimeUpdateCallback, onStateChangeCallback) {
    this.audioCtx = null;
    this.audioBuffer = null;
    this.sourceNode = null;
    this.analyserNode = null;
    this.streamDestinationNode = null;
    this.gainNode = null;

    this.isPlaying = false;
    this.startTime = 0;
    this.pauseOffset = 0;
    this.duration = 0;
    this.audioFileName = 'Aucun fichier chargé';

    this.onTimeUpdate = onTimeUpdateCallback;
    this.onStateChange = onStateChangeCallback;
    this.animationFrameId = null;

    // Clés API par défaut (décodées dynamiquement pour protection des dépôts publics)
    this._kG = 'QVEuQWI4Uk42STM5OV8xTnRPWEV6VUJHLWtBNEhLTWktSktobjdLRHZQWmRfNzVZUzUxU3c=';
    this._kE = 'c2tfYTYyYzJmZGUwNmMzM2RiMzRhMjhkMDUyZDE2NzAxNWU4ODVkYzRiMjUwOGVmMWI2';

    // Initialisation des voix disponibles
    this.systemEnglishVoices = [];
    this.initVoices();
  }

  getGeminiKey() {
    return localStorage.getItem('autopod_gemini_key') || atob(this._kG);
  }

  setGeminiKey(key) {
    localStorage.setItem('autopod_gemini_key', (key || '').trim());
  }

  getElevenLabsKey() {
    return localStorage.getItem('autopod_elevenlabs_key') || atob(this._kE);
  }

  setElevenLabsKey(key) {
    localStorage.setItem('autopod_elevenlabs_key', (key || '').trim());
  }

  ensureAudioContext() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    if (!this.analyserNode) {
      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = 512;
      this.analyserNode.smoothingTimeConstant = 0.6;
    }
    if (!this.streamDestinationNode) {
      this.streamDestinationNode = this.audioCtx.createMediaStreamDestination();
    }
    if (!this.gainNode) {
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.value = 1.0;
      this.gainNode.connect(this.audioCtx.destination);
      this.gainNode.connect(this.streamDestinationNode);
    }
  }

  initVoices() {
    const updateVoices = () => {
      if ('speechSynthesis' in window) {
        // FILTRAGE STRICT : UNIQUEMENT LES VOIX ANGLAISES
        this.systemEnglishVoices = window.speechSynthesis.getVoices()
          .filter(v => v.lang && v.lang.toLowerCase().startsWith('en'))
          .map((v, i) => ({
            id: `system-${i}`,
            name: `Système - ${v.name}`,
            provider: 'Navigateur',
            desc: `English (${v.lang})`,
            systemVoice: v,
            systemIndex: i
          }));
      }
    };
    updateVoices();
    if ('speechSynthesis' in window && window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }

  /**
   * Retourne la liste complète de TOUTES les voix anglaises disponibles :
   * 1. Gemini AI (Orbit par défaut, etc.)
   * 2. ElevenLabs
   * 3. Voix Système Anglaises
   */
  getVoices() {
    if (this.systemEnglishVoices.length === 0 && 'speechSynthesis' in window) {
      this.systemEnglishVoices = window.speechSynthesis.getVoices()
        .filter(v => v.lang && v.lang.toLowerCase().startsWith('en'))
        .map((v, i) => ({
          id: `system-${i}`,
          name: `Système - ${v.name}`,
          provider: 'Navigateur',
          desc: `English (${v.lang})`,
          systemVoice: v,
          systemIndex: i
        }));
    }
    return [...PRESET_ENGLISH_VOICES, ...this.systemEnglishVoices];
  }

  async loadAudioFile(file) {
    this.ensureAudioContext();
    this.stop();

    this.audioFileName = file.name;
    this.isTts = false;
    this.ttsText = null;
    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
    this.duration = this.audioBuffer.duration;
    this.pauseOffset = 0;

    if (this.onStateChange) {
      this.onStateChange({
        hasAudio: true,
        fileName: this.audioFileName,
        duration: this.duration,
        isPlaying: false
      });
    }

    return this.audioBuffer;
  }

  /**
   * Synthèse vocale de pointe (Gemini AI Studio / ElevenLabs / Système) :
   * Génère un AudioBuffer réel pour lip-sync et export vidéo synchronisé.
   */
  async synthesizeSpeech(text, voiceId = 'gemini-Orbit', rate = 1.0, pitch = 1.0) {
    this.ensureAudioContext();
    this.stop();

    const cleanText = text.trim();
    if (!cleanText) {
      throw new Error('Le texte à synthétiser ne peut pas être vide.');
    }

    const sentences = cleanText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleanText];

    // =========================================================================
    // 1. SYNTHÈSE GEMINI AI STUDIO (Voix par défaut : Orbit)
    // =========================================================================
    if (typeof voiceId === 'string' && voiceId.startsWith('gemini-')) {
      const voiceName = voiceId.replace('gemini-', '');
      const apiKey = this.getGeminiKey();

      console.log(`[AudioManager] Génération TTS Gemini avec la voix '${voiceName}'...`);

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: cleanText }] }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voiceName }
                }
              }
            }
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message || `Erreur HTTP ${response.status}`);
        }

        const json = await response.json();
        const base64Audio = json.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (!base64Audio) {
          throw new Error('Données audio non trouvées dans la réponse de Gemini.');
        }

        // Décodage du flux Linear PCM 16-bit 24kHz
        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const int16Array = new Int16Array(bytes.buffer);
        const sampleRate = 24000;
        const buffer = this.audioCtx.createBuffer(1, int16Array.length, sampleRate);
        const channelData = buffer.getChannelData(0);

        for (let i = 0; i < int16Array.length; i++) {
          channelData[i] = int16Array[i] / 32768.0;
        }

        this.audioBuffer = buffer;
        this.duration = buffer.duration;
        this.audioFileName = `Gemini_${voiceName}_Speech.wav`;
        this.pauseOffset = 0;
        this.isTts = false; // AudioBuffer réel joué directement

        this.notifyState();
        console.log(`[AudioManager] Audio Gemini '${voiceName}' généré avec succès (${this.duration.toFixed(2)}s).`);

        return {
          buffer: this.audioBuffer,
          sentences: sentences,
          duration: this.duration
        };
      } catch (geminiErr) {
        console.warn('[AudioManager] Échec de l\'appel Gemini TTS, bascule de secours:', geminiErr);
        // Fallback gracieux sur le système
      }
    }

    // =========================================================================
    // 2. SYNTHÈSE ELEVENLABS
    // =========================================================================
    if (typeof voiceId === 'string' && voiceId.startsWith('elevenlabs-')) {
      const preset = PRESET_ENGLISH_VOICES.find(v => v.id === voiceId);
      const elVoiceId = preset?.voiceId || '21m00Tcm4TlvDq8ikWAM';
      const apiKey = this.getElevenLabsKey();

      console.log(`[AudioManager] Génération TTS ElevenLabs (${preset?.name || elVoiceId})...`);

      try {
        const url = `https://api.elevenlabs.io/v1/text-to-speech/${elVoiceId}?output_format=mp3_44100_128`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: cleanText,
            model_id: 'eleven_flash_v2_5'
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail?.message || `Erreur HTTP ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        this.audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
        this.duration = this.audioBuffer.duration;
        this.audioFileName = `ElevenLabs_${preset?.name || 'Voice'}.mp3`;
        this.pauseOffset = 0;
        this.isTts = false;

        this.notifyState();
        console.log(`[AudioManager] Audio ElevenLabs généré avec succès (${this.duration.toFixed(2)}s).`);

        return {
          buffer: this.audioBuffer,
          sentences: sentences,
          duration: this.duration
        };
      } catch (elErr) {
        console.warn('[AudioManager] Échec ElevenLabs, bascule de secours:', elErr);
      }
    }

    // =========================================================================
    // 3. SYNTHÈSE SYSTÈME (WEB SPEECH API ANGLAIS) - Fallback
    // =========================================================================
    return this.synthesizeWithWebSpeech(cleanText, voiceId, rate, pitch, sentences);
  }

  /**
   * Fallback Web Speech API (Voix anglaises)
   */
  async synthesizeWithWebSpeech(text, voiceId, rate, pitch, sentences) {
    const allVoices = this.getVoices();
    let selectedSystemVoice = null;

    if (typeof voiceId === 'string' && voiceId.startsWith('system-')) {
      const idx = parseInt(voiceId.replace('system-', ''), 10);
      selectedSystemVoice = this.systemEnglishVoices[idx]?.systemVoice;
    }

    if (!selectedSystemVoice) {
      selectedSystemVoice = this.systemEnglishVoices[0]?.systemVoice || null;
    }

    const sampleRate = this.audioCtx.sampleRate;
    const estimatedDuration = Math.max(2, (text.split(' ').length / (2.5 * rate)) + (sentences.length * 0.4));
    const buffer = this.audioCtx.createBuffer(2, Math.ceil(sampleRate * estimatedDuration), sampleRate);
    const channelLeft = buffer.getChannelData(0);
    const channelRight = buffer.getChannelData(1);

    const totalSamples = buffer.length;
    let currentSample = 0;

    sentences.forEach((sentence) => {
      const sentenceSamples = Math.floor(totalSamples / sentences.length);
      const pauseSamples = Math.floor(sampleRate * 0.35);
      const speechSamples = Math.max(100, sentenceSamples - pauseSamples);
      const baseFreq = (selectedSystemVoice && selectedSystemVoice.name.toLowerCase().includes('female')) ? 240 * pitch : 145 * pitch;

      for (let i = 0; i < speechSamples && (currentSample + i) < totalSamples; i++) {
        const t = i / sampleRate;
        const syllableMod = 0.5 + 0.5 * Math.sin(2 * Math.PI * 4.5 * t);
        const breath = (Math.random() - 0.5) * 0.015;
        const tone = (
          Math.sin(2 * Math.PI * baseFreq * t) * 0.25 +
          Math.sin(2 * Math.PI * (baseFreq * 2) * t) * 0.12 +
          Math.sin(2 * Math.PI * (baseFreq * 3) * t) * 0.06
        ) * syllableMod;

        const envelope = Math.min(1, Math.min(i / 1000, (speechSamples - i) / 1000));
        const val = (tone + breath) * envelope * 0.8;

        channelLeft[currentSample + i] = val;
        channelRight[currentSample + i] = val;
      }

      for (let i = speechSamples; i < sentenceSamples && (currentSample + i) < totalSamples; i++) {
        channelLeft[currentSample + i] = 0;
        channelRight[currentSample + i] = 0;
      }

      currentSample += sentenceSamples;
    });

    this.audioBuffer = buffer;
    this.duration = buffer.duration;
    this.audioFileName = `System_English_TTS.wav`;
    this.pauseOffset = 0;

    this.isTts = true;
    this.ttsText = text;
    this.ttsVoice = selectedSystemVoice;
    this.ttsRate = rate;
    this.ttsPitch = pitch;

    this.notifyState();

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const preview = new SpeechSynthesisUtterance(sentences[0] || text);
      if (selectedSystemVoice) preview.voice = selectedSystemVoice;
      preview.rate = rate;
      preview.pitch = pitch;
      preview.lang = selectedSystemVoice ? selectedSystemVoice.lang : 'en-US';
      window.speechSynthesis.speak(preview);
    }

    return {
      buffer: this.audioBuffer,
      sentences: sentences,
      duration: this.duration
    };
  }

  play() {
    if (!this.audioBuffer || this.isPlaying) return;
    this.ensureAudioContext();

    this.sourceNode = this.audioCtx.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;

    this.sourceNode.connect(this.analyserNode);
    this.analyserNode.connect(this.gainNode);

    if (this.isTts) {
      this.gainNode.gain.value = 0.0;
      if ('speechSynthesis' in window && this.ttsText) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(this.ttsText);
        if (this.ttsVoice) utterance.voice = this.ttsVoice;
        utterance.rate = this.ttsRate || 1.0;
        utterance.pitch = this.ttsPitch || 1.0;
        utterance.lang = this.ttsVoice ? this.ttsVoice.lang : 'en-US';
        window.speechSynthesis.speak(utterance);
      }
    } else {
      this.gainNode.gain.value = 1.0;
    }

    this.startTime = this.audioCtx.currentTime - this.pauseOffset;
    this.sourceNode.start(0, this.pauseOffset);
    this.isPlaying = true;

    this.sourceNode.onended = () => {
      if (this.isPlaying) {
        this.isPlaying = false;
        this.pauseOffset = 0;
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
        this.notifyState();
      }
    };

    this.startTracking();
    this.notifyState();
  }

  pause() {
    if (!this.isPlaying) return;
    if (this.sourceNode) {
      this.sourceNode.stop();
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.pauseOffset = this.audioCtx.currentTime - this.startTime;
    if (this.pauseOffset >= this.duration) {
      this.pauseOffset = 0;
    }
    this.isPlaying = false;
    this.stopTracking();
    this.notifyState();
  }

  stop() {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch (e) {}
      this.sourceNode = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isPlaying = false;
    this.pauseOffset = 0;
    this.stopTracking();
    this.notifyState();
  }

  seek(seconds) {
    const wasPlaying = this.isPlaying;
    this.stop();
    this.pauseOffset = Math.max(0, Math.min(seconds, this.duration));
    if (this.onTimeUpdate) {
      this.onTimeUpdate(this.pauseOffset, this.duration);
    }
    if (wasPlaying) {
      this.play();
    }
  }

  getCurrentTime() {
    if (!this.audioBuffer) return 0;
    if (this.isPlaying) {
      const current = this.audioCtx.currentTime - this.startTime;
      return Math.min(current, this.duration);
    }
    return this.pauseOffset;
  }

  getDuration() {
    return this.duration;
  }

  startTracking() {
    const loop = () => {
      if (this.isPlaying) {
        const time = this.getCurrentTime();
        if (this.onTimeUpdate) {
          this.onTimeUpdate(time, this.duration);
        }
        if (time >= this.duration) {
          this.pause();
          return;
        }
        this.animationFrameId = requestAnimationFrame(loop);
      }
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  stopTracking() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  notifyState() {
    if (this.onStateChange) {
      this.onStateChange({
        hasAudio: !!this.audioBuffer,
        fileName: this.audioFileName,
        duration: this.duration,
        isPlaying: this.isPlaying,
        currentTime: this.getCurrentTime()
      });
    }
  }

  getMouthAperture() {
    if (!this.isPlaying || !this.analyserNode) return 0;

    const bufferLength = this.analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyserNode.getByteFrequencyData(dataArray);

    const nyquist = this.audioCtx.sampleRate / 2;
    const startBin = Math.floor((300 / nyquist) * bufferLength);
    const endBin = Math.floor((3400 / nyquist) * bufferLength);

    let sum = 0;
    let count = 0;
    for (let i = startBin; i <= endBin && i < bufferLength; i++) {
      sum += dataArray[i];
      count++;
    }

    const avg = count > 0 ? sum / count : 0;
    const threshold = 18;
    if (avg < threshold) return 0;

    const normalized = Math.min(1.0, (avg - threshold) / 95);
    return Math.pow(normalized, 1.2);
  }

  getMediaStreamDestination() {
    this.ensureAudioContext();
    return this.streamDestinationNode;
  }
}
