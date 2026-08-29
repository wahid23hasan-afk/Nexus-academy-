// Web Audio API Procedural Sound FX Synthesizer (No external audio files needed)

class SoundFXService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // Load mute preference from localStorage
    try {
      const saved = localStorage.getItem('nexus_sound_fx_muted');
      if (saved !== null) {
        this.isMuted = saved === 'true';
      }
    } catch (e) {
      // ignore
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('nexus_sound_fx_muted', String(this.isMuted));
    } catch (e) {
      // ignore
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    try {
      localStorage.setItem('nexus_sound_fx_muted', String(this.isMuted));
    } catch (e) {
      // ignore
    }
  }

  // Play subtle, high-quality chime for badge selection / unlock
  public playBadgeChime() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [698.46, 1046.5]; // F5, C6 notes
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.001, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.18, now + idx * 0.08 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.4);
    });
  }

  // Play crisp level up / unlock fanfare
  public playUnlock() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      gain.gain.setValueAtTime(0.001, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.2, now + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.4);
    });
  }

  // Play crisp XP chime
  public playXP() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now); // A5
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12); // E6

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  // Play chest open chime
  public playChestOpen() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880, 1108.73];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.001, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.15, now + idx * 0.06 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.45);
    });
  }

  // Play subtle click
  public playClick() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  // Timer complete gong/chime
  public playTimerComplete() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const chord = [523.25, 659.25, 783.99]; // C Major
    chord.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.exponentialRampToValueAtTime(0.2, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 2.0);
    });
  }

  // Play subtle error buzzer / negative feedback sound
  public playError() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.15);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  // --- PROCEDURAL BACKGROUND AMBIENT SOUNDSCAPES ---
  private ambientGainNode: GainNode | null = null;
  private ambientSourceNodes: AudioNode[] = [];
  private ambientInterval: any = null;
  private currentAmbientType: string = 'none';

  public stopAmbientSound() {
    if (this.ambientInterval) {
      clearInterval(this.ambientInterval);
      this.ambientInterval = null;
    }
    if (this.ambientGainNode && this.ctx) {
      try {
        this.ambientGainNode.gain.setValueAtTime(this.ambientGainNode.gain.value, this.ctx.currentTime);
        this.ambientGainNode.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.3);
      } catch (e) {
        // ignore
      }
    }
    setTimeout(() => {
      this.ambientSourceNodes.forEach(node => {
        try {
          if ((node as any).stop) (node as any).stop();
          node.disconnect();
        } catch (e) {}
      });
      this.ambientSourceNodes = [];
      this.ambientGainNode = null;
      this.currentAmbientType = 'none';
    }, 350);
  }

  public playAmbientSound(type: 'none' | 'rain' | 'lofi' | 'cafe' | 'forest') {
    this.stopAmbientSound();
    if (type === 'none') return;

    const ctx = this.getContext();
    if (!ctx) return;

    this.currentAmbientType = type;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
    masterGain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.5);
    masterGain.connect(ctx.destination);
    this.ambientGainNode = masterGain;

    if (type === 'rain') {
      // Procedural Rain Noise (Pink noise filtered)
      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        output[i] *= 0.05;
        b6 = white * 0.115926;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, ctx.currentTime);

      whiteNoise.connect(filter);
      filter.connect(masterGain);
      whiteNoise.start(0);
      this.ambientSourceNodes.push(whiteNoise, filter);
    } else if (type === 'lofi') {
      // Procedural Warm Lo-Fi Chords progression (Dm7 - G7 - Cmaj7 - Am7)
      const chords = [
        [293.66, 349.23, 440.00, 523.25], // Dm7
        [392.00, 493.88, 587.33, 698.46], // G7
        [261.63, 329.63, 392.00, 493.88], // Cmaj7
        [220.00, 261.63, 329.63, 392.00]  // Am7
      ];
      let chordIndex = 0;

      const playLofiChord = () => {
        if (!this.ctx || this.currentAmbientType !== 'lofi') return;
        const currentChord = chords[chordIndex];
        chordIndex = (chordIndex + 1) % chords.length;
        const now = this.ctx.currentTime;

        currentChord.forEach((freq, idx) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          const filter = this.ctx!.createBiquadFilter();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.03);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(600, now);

          gain.gain.setValueAtTime(0.0001, now + idx * 0.03);
          gain.gain.exponentialRampToValueAtTime(0.04, now + idx * 0.03 + 0.3);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.03 + 3.2);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(masterGain);

          osc.start(now + idx * 0.03);
          osc.stop(now + idx * 0.03 + 3.5);
        });
      };

      playLofiChord();
      this.ambientInterval = setInterval(playLofiChord, 3600);
    } else if (type === 'cafe') {
      // Cozy Cafe ambient murmur & gentle low-frequency warmth
      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.04;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(450, ctx.currentTime);
      bandpass.Q.setValueAtTime(1.2, ctx.currentTime);

      noise.connect(bandpass);
      bandpass.connect(masterGain);
      noise.start(0);
      this.ambientSourceNodes.push(noise, bandpass);
    } else if (type === 'forest') {
      // Forest Stream (Brown noise + gentle water trickles)
      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 0.25;
      }
      const brownNoise = ctx.createBufferSource();
      brownNoise.buffer = noiseBuffer;
      brownNoise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(550, ctx.currentTime);

      brownNoise.connect(filter);
      filter.connect(masterGain);
      brownNoise.start(0);
      this.ambientSourceNodes.push(brownNoise, filter);
    }
  }
}

export const soundFxService = new SoundFXService();
