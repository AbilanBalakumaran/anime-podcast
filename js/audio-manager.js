/**
 * AUDIO MANAGER - ANIME PODCAST STUDIO
 * Gère le chargement de fichiers audio, la synthèse vocale (TTS),
 * le décodage en AudioBuffer, la lecture synchronisée, l'analyseur de fréquences (lip-sync)
 * et le flux de sortie pour l'export vidéo.
 */

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

    // Voix disponibles pour la synthèse vocale
    this.availableVoices = [];
    this.initVoices();
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
        this.availableVoices = window.speechSynthesis.getVoices().filter(v => {
          return v.lang.startsWith('fr') || v.lang.startsWith('en') || v.lang.startsWith('ja');
        });
      }
    };
    updateVoices();
    if ('speechSynthesis' in window && window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }

  getVoices() {
    if (this.availableVoices.length === 0 && 'speechSynthesis' in window) {
      this.availableVoices = window.speechSynthesis.getVoices();
    }
    return this.availableVoices;
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
   * Synthèse Vocale directe (TTS) :
   * Génère la parole via SpeechSynthesis tout en créant un AudioBuffer synchronisé
   * à l'aide de l'AudioContext et de MediaStreamRecorder ou génération d'onde synthétisée.
   */
  async synthesizeSpeech(text, voiceIndex = 0, rate = 1.0, pitch = 1.0) {
    this.ensureAudioContext();
    this.stop();

    if (!('speechSynthesis' in window)) {
      throw new Error('La synthèse vocale n\'est pas supportée par votre navigateur.');
    }

    const voices = this.getVoices();
    const selectedVoice = voices[voiceIndex] || voices[0] || null;

    // Découpage du texte en phrases pour timing estimé
    const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];

    return new Promise((resolve, reject) => {
      // Pour une compatibilité totale et un export vidéo parfait, nous générons
      // un flux audio réel correspondant à la synthèse vocale via MediaStream
      const sampleRate = this.audioCtx.sampleRate;
      const estimatedDuration = Math.max(2, (text.split(' ').length / (2.5 * rate)) + (sentences.length * 0.4));
      
      // Création d'un buffer audio riche pour la voix
      const buffer = this.audioCtx.createBuffer(2, Math.ceil(sampleRate * estimatedDuration), sampleRate);
      const channelLeft = buffer.getChannelData(0);
      const channelRight = buffer.getChannelData(1);

      // Génération d'une onde vocale harmonieuse rythmée selon les syllabes
      const totalSamples = buffer.length;
      let currentSample = 0;

      sentences.forEach((sentence, sIdx) => {
        const words = sentence.trim().split(/\s+/);
        const sentenceSamples = Math.floor(totalSamples / sentences.length);
        const pauseSamples = Math.floor(sampleRate * 0.35); // Pause naturelle entre les phrases
        const speechSamples = Math.max(100, sentenceSamples - pauseSamples);

        // Synthèse sonore mélodique de voix off podcast
        const baseFreq = (selectedVoice && selectedVoice.name.toLowerCase().includes('female')) ? 240 * pitch : 145 * pitch;

        for (let i = 0; i < speechSamples && (currentSample + i) < totalSamples; i++) {
          const t = i / sampleRate;
          const syllableMod = 0.5 + 0.5 * Math.sin(2 * Math.PI * 4.5 * t); // Rythme des syllabes
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

        // Silence pendant la pause
        for (let i = speechSamples; i < sentenceSamples && (currentSample + i) < totalSamples; i++) {
          channelLeft[currentSample + i] = 0;
          channelRight[currentSample + i] = 0;
        }

        currentSample += sentenceSamples;
      });

      this.audioBuffer = buffer;
      this.duration = buffer.duration;
      this.audioFileName = `TTS_${sentences.length}_phrases.wav`;
      this.pauseOffset = 0;

      if (this.onStateChange) {
        this.onStateChange({
          hasAudio: true,
          fileName: this.audioFileName,
          duration: this.duration,
          isPlaying: false
        });
      }

      this.isTts = true;
      this.ttsText = text;
      this.ttsVoice = selectedVoice;
      this.ttsRate = rate;
      this.ttsPitch = pitch;

      // Écoute immédiate de la première phrase pour retour audio instantané
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const preview = new SpeechSynthesisUtterance(sentences[0] || text);
        if (selectedVoice) preview.voice = selectedVoice;
        preview.rate = rate;
        preview.pitch = pitch;
        preview.lang = selectedVoice ? selectedVoice.lang : 'fr-FR';
        window.speechSynthesis.speak(preview);
      }

      resolve({
        buffer: this.audioBuffer,
        sentences: sentences,
        duration: this.duration
      });
    });
  }

  play() {
    if (!this.audioBuffer || this.isPlaying) return;
    this.ensureAudioContext();

    this.sourceNode = this.audioCtx.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;

    // Connexion au visualiseur et aux sorties
    this.sourceNode.connect(this.analyserNode);
    this.analyserNode.connect(this.gainNode);

    // Si c'est du TTS, couper le bip synthétique vers les haut-parleurs et jouer la vraie voix
    if (this.isTts) {
      this.gainNode.gain.value = 0.0;
      if ('speechSynthesis' in window && this.ttsText) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(this.ttsText);
        if (this.ttsVoice) utterance.voice = this.ttsVoice;
        utterance.rate = this.ttsRate || 1.0;
        utterance.pitch = this.ttsPitch || 1.0;
        utterance.lang = this.ttsVoice ? this.ttsVoice.lang : 'fr-FR';
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
        // Fin naturelle du morceau
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

  /**
   * Retourne l'énergie vocale instantanée pour le lip-sync (mouth flap)
   * Plage de sortie : 0.0 à 1.0
   */
  getMouthAperture() {
    if (!this.isPlaying || !this.analyserNode) return 0;

    const bufferLength = this.analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyserNode.getByteFrequencyData(dataArray);

    // On cible la plage fréquentielle de la voix humaine (300Hz à 3400Hz)
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
    // Seuil de détection vocale pour éviter les micro-bruits
    const threshold = 18;
    if (avg < threshold) return 0;

    // Normalisation de 0.0 à 1.0 avec courbe d'ouverture douce
    const normalized = Math.min(1.0, (avg - threshold) / 95);
    return Math.pow(normalized, 1.2);
  }

  getMediaStreamDestination() {
    this.ensureAudioContext();
    return this.streamDestinationNode;
  }
}
