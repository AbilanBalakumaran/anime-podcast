/**
 * SPEECH ANALYZER - ANIME PODCAST STUDIO
 * Analyse la structure temporelle de la piste vocale (VAD - Voice Activity Detection),
 * segmente le discours phrase par phrase et attribue dynamiquement les 5 poses
 * selon des règles logiques et des variations naturelles.
 */

export class SpeechAnalyzer {
  constructor(audioManager, onSegmentSelectCallback) {
    this.audioManager = audioManager;
    this.onSegmentSelect = onSegmentSelectCallback;
    this.segments = []; // Array<{ id, start, end, duration, pose, text }>
    this.waveformCanvas = document.getElementById('waveform-canvas');
    this.waveformCtx = this.waveformCanvas ? this.waveformCanvas.getContext('2d') : null;
    this.playheadEl = document.getElementById('timeline-playhead');
    this.segmentsListEl = document.getElementById('segments-scroll-list');
    this.segmentsCountEl = document.getElementById('segments-count');

    this.availablePoses = [
      { id: 'neutre', label: 'Neutre' },
      { id: 'enthousiaste', label: 'Enthousiaste' },
      { id: 'explicative', label: 'Explicative' },
      { id: 'pensive', label: 'Pensive' },
      { id: 'surprise', label: 'Surprise' }
    ];

    this.setupWaveformClick();
  }

  setupWaveformClick() {
    if (this.waveformCanvas) {
      this.waveformCanvas.addEventListener('click', (e) => {
        const rect = this.waveformCanvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const progress = Math.max(0, Math.min(1, clickX / rect.width));
        const duration = this.audioManager.getDuration();
        if (duration > 0) {
          this.audioManager.seek(progress * duration);
        }
      });
    }
  }

  /**
   * Analyse un AudioBuffer pour en extraire les phrases et assigner les poses
   */
  analyzeAudioBuffer(audioBuffer, optionalSentencesText = null) {
    if (!audioBuffer) return [];

    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0);
    const duration = audioBuffer.duration;

    // 1. Calcul d'énergie RMS par fenêtre temporelle de 40ms
    const windowSize = Math.floor(sampleRate * 0.04);
    const numWindows = Math.floor(channelData.length / windowSize);
    const rmsValues = new Float32Array(numWindows);

    let maxRms = 0;
    for (let w = 0; w < numWindows; w++) {
      let sumSquares = 0;
      const startIdx = w * windowSize;
      for (let i = 0; i < windowSize; i++) {
        const val = channelData[startIdx + i];
        sumSquares += val * val;
      }
      const rms = Math.sqrt(sumSquares / windowSize);
      rmsValues[w] = rms;
      if (rms > maxRms) maxRms = rms;
    }

    // Seuil de détection de voix adaptatif
    const threshold = Math.max(0.015, maxRms * 0.14);

    // 2. Détection d'activité vocale (VAD)
    const minSpeechDuration = 0.4; // 400ms minimum pour une phrase
    const minSilenceDuration = 0.28; // 280ms de silence pour marquer une fin de phrase

    const speechWindows = [];
    for (let w = 0; w < numWindows; w++) {
      speechWindows.push(rmsValues[w] >= threshold);
    }

    // Regroupement en segments
    const rawSegments = [];
    let inSpeech = false;
    let segStart = 0;
    let silenceCount = 0;
    const silenceThresholdWindows = Math.floor(minSilenceDuration / 0.04);

    for (let w = 0; w < numWindows; w++) {
      const isVoice = speechWindows[w];
      const time = w * 0.04;

      if (isVoice) {
        if (!inSpeech) {
          inSpeech = true;
          segStart = time;
        }
        silenceCount = 0;
      } else {
        if (inSpeech) {
          silenceCount++;
          if (silenceCount >= silenceThresholdWindows || w === numWindows - 1) {
            const segEnd = (w - silenceCount) * 0.04;
            if ((segEnd - segStart) >= minSpeechDuration) {
              rawSegments.push({
                start: Math.max(0, segStart),
                end: Math.min(duration, segEnd),
                duration: segEnd - segStart
              });
            }
            inSpeech = false;
            silenceCount = 0;
          }
        }
      }
    }

    // Si aucun segment détecté (ex. volume très bas), créer des segments réguliers
    if (rawSegments.length === 0 && duration > 0) {
      const step = Math.min(3.5, duration);
      for (let t = 0; t < duration; t += step) {
        rawSegments.push({
          start: t,
          end: Math.min(duration, t + step),
          duration: Math.min(step, duration - t)
        });
      }
    }

    // 3. Attribution logique & dynamique des poses à chaque phrase
    this.segments = this.assignIntelligentPoses(rawSegments, optionalSentencesText);

    // 4. Rendu visuel de la forme d'onde et de la liste des segments
    this.drawWaveform(rmsValues, maxRms);
    this.renderSegmentsList();

    return this.segments;
  }

  /**
   * Moteur d'attribution des poses :
   * - Alterne logiquement pour éviter de répéter 2 fois la même pose
   * - Utilise les ponctuations (?, !) et la durée pour choisir la pose optimale
   */
  assignIntelligentPoses(rawSegments, optionalSentencesText) {
    const poses = ['enthousiaste', 'explicative', 'pensive', 'surprise', 'neutre'];
    let lastPose = null;

    return rawSegments.map((seg, index) => {
      let chosenPose = 'neutre';
      const text = (optionalSentencesText && optionalSentencesText[index]) 
        ? optionalSentencesText[index].trim() 
        : `Phrase ${index + 1}`;

      if (text.includes('?')) {
        // Question -> pensive ou surprise
        chosenPose = (lastPose === 'pensive') ? 'surprise' : 'pensive';
      } else if (text.includes('!')) {
        // Exclamation -> enthousiaste ou surprise
        chosenPose = (lastPose === 'enthousiaste') ? 'surprise' : 'enthousiaste';
      } else if (seg.duration > 3.2) {
        // Longue explication -> explicative
        chosenPose = (lastPose === 'explicative') ? 'enthousiaste' : 'explicative';
      } else if (index === 0) {
        // Introduction
        chosenPose = 'enthousiaste';
      } else {
        // Alternance naturelle parmi les poses dynamiques
        const candidatePoses = ['enthousiaste', 'explicative', 'pensive', 'surprise'].filter(p => p !== lastPose);
        chosenPose = candidatePoses[Math.floor(Math.random() * candidatePoses.length)];
      }

      lastPose = chosenPose;

      return {
        id: `seg-${index}-${Date.now()}`,
        index: index,
        start: seg.start,
        end: seg.end,
        duration: seg.duration,
        pose: chosenPose,
        text: text
      };
    });
  }

  /**
   * Retourne la pose active correspondant au timestamp de lecture
   */
  getPoseAtTime(currentTime) {
    if (!this.segments || this.segments.length === 0) {
      return 'neutre';
    }

    // Recherche du segment correspondant
    const activeSegment = this.segments.find(seg => currentTime >= seg.start && currentTime <= seg.end);
    if (activeSegment) {
      return activeSegment.pose;
    }

    // Pendant les silences / pauses entre les phrases : posture neutre
    return 'neutre';
  }

  /**
   * Dessine la forme d'onde audio sur le canevas dédié
   */
  drawWaveform(rmsValues, maxRms) {
    if (!this.waveformCanvas || !this.waveformCtx) return;

    const width = this.waveformCanvas.width = this.waveformCanvas.clientWidth * window.devicePixelRatio;
    const height = this.waveformCanvas.height = this.waveformCanvas.clientHeight * window.devicePixelRatio;
    const ctx = this.waveformCtx;

    ctx.clearRect(0, 0, width, height);

    // Fond bleu sombre
    ctx.fillStyle = '#0b1329';
    ctx.fillRect(0, 0, width, height);

    // Barres de forme d'onde en jaune doré et cyan
    const barWidth = 3 * window.devicePixelRatio;
    const gap = 1 * window.devicePixelRatio;
    const totalBars = Math.floor(width / (barWidth + gap));
    const step = rmsValues.length / totalBars;

    for (let i = 0; i < totalBars; i++) {
      const idx = Math.floor(i * step);
      const val = rmsValues[idx] || 0;
      const normalized = maxRms > 0 ? (val / maxRms) : 0;
      const barHeight = Math.max(4, normalized * (height * 0.85));

      const x = i * (barWidth + gap);
      const y = (height - barHeight) / 2;

      // Dégradé doré
      const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
      grad.addColorStop(0, '#fef3c7');
      grad.addColorStop(0.5, '#fbbf24');
      grad.addColorStop(1, '#d97706');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 2 * window.devicePixelRatio);
      ctx.fill();
    }
  }

  /**
   * Met à jour la position de la tête de lecture sur la timeline
   */
  updatePlayhead(currentTime, duration) {
    if (!this.playheadEl || duration <= 0) return;
    const progress = Math.min(1, Math.max(0, currentTime / duration));
    const width = this.waveformCanvas ? this.waveformCanvas.clientWidth : 400;
    this.playheadEl.style.transform = `translateX(${progress * width}px)`;

    // Mettre à jour la classe active sur les segments
    if (this.segmentsListEl) {
      const cards = this.segmentsListEl.querySelectorAll('.segment-card');
      this.segments.forEach((seg, idx) => {
        const card = cards[idx];
        if (card) {
          if (currentTime >= seg.start && currentTime <= seg.end) {
            card.classList.add('active');
          } else {
            card.classList.remove('active');
          }
        }
      });
    }
  }

  /**
   * Rendu de la liste interactive des phrases segmentées avec leurs sélecteurs de poses
   */
  renderSegmentsList() {
    if (!this.segmentsListEl) return;
    this.segmentsListEl.innerHTML = '';

    if (this.segmentsCountEl) {
      this.segmentsCountEl.textContent = `${this.segments.length} phrase${this.segments.length > 1 ? 's' : ''}`;
    }

    if (this.segments.length === 0) {
      this.segmentsListEl.innerHTML = `
        <div class="timeline-empty">
          Importez un fichier audio ou générez un texte pour analyser la voix et segmenter les phrases.
        </div>
      `;
      return;
    }

    this.segments.forEach((seg, idx) => {
      const card = document.createElement('div');
      card.className = 'segment-card';
      card.dataset.index = idx;

      // Affichage du timing
      const timeBox = document.createElement('div');
      timeBox.className = 'segment-time';
      timeBox.innerHTML = `
        <span class="time-start">${this.formatTime(seg.start)}</span>
        <span>→ ${this.formatTime(seg.end)}</span>
      `;

      // Texte de la phrase
      const textBox = document.createElement('div');
      textBox.className = 'segment-text';
      textBox.textContent = seg.text;
      textBox.title = seg.text;

      // Sélecteur de pose personnalisable
      const selectBox = document.createElement('select');
      selectBox.className = 'segment-pose-select';

      this.availablePoses.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.label;
        if (p.id === seg.pose) opt.selected = true;
        selectBox.appendChild(opt);
      });

      selectBox.addEventListener('change', (e) => {
        e.stopPropagation();
        seg.pose = e.target.value;
      });

      card.appendChild(timeBox);
      card.appendChild(textBox);
      card.appendChild(selectBox);

      card.addEventListener('click', () => {
        this.audioManager.seek(seg.start);
        if (this.onSegmentSelect) {
          this.onSegmentSelect(seg);
        }
      });

      this.segmentsListEl.appendChild(card);
    });
  }

  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  }

  getSegments() {
    return this.segments;
  }
}
