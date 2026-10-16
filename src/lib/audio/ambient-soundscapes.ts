/**
 * Zero-bandwidth in-browser Web Audio synthesis engine for study soundscapes.
 * Works completely offline with 0kB network footprint.
 */

export type SoundscapeType = "none" | "rain" | "brown" | "binaural" | "waves";

class AmbientSoundEngine {
  private audioCtx: AudioContext | null = null;
  private currentSource: AudioNode | null = null;
  private gainNode: GainNode | null = null;
  private activeType: SoundscapeType = "none";
  private currentVolume: number = 0.5;

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  private isMuted: boolean = false;

  public getActiveType(): SoundscapeType {
    return this.activeType;
  }

  public getVolume(): number {
    return this.currentVolume;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(volume: number): void {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    if (!this.isMuted && this.gainNode && this.audioCtx) {
      this.gainNode.gain.setValueAtTime(this.currentVolume, this.audioCtx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.gainNode && this.audioCtx) {
      const targetGain = this.isMuted ? 0 : this.currentVolume;
      this.gainNode.gain.setValueAtTime(targetGain, this.audioCtx.currentTime);
    }
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.gainNode && this.audioCtx) {
      const targetGain = this.isMuted ? 0 : this.currentVolume;
      this.gainNode.gain.setValueAtTime(targetGain, this.audioCtx.currentTime);
    }
  }

  public stop(): void {
    if (this.currentSource) {
      try {
        if ("stop" in this.currentSource && typeof (this.currentSource as AudioBufferSourceNode).stop === "function") {
          (this.currentSource as AudioBufferSourceNode).stop();
        }
        this.currentSource.disconnect();
      } catch {
        // Safe tear-down
      }
      this.currentSource = null;
    }
    this.activeType = "none";
  }

  public start(type: SoundscapeType, volume: number = 0.5): void {
    if (type === "none") {
      this.stop();
      return;
    }

    const ctx = this.getAudioContext();
    if (!ctx) return;

    this.stop();
    this.activeType = type;
    this.currentVolume = volume;

    this.gainNode = ctx.createGain();
    this.gainNode.gain.setValueAtTime(this.currentVolume, ctx.currentTime);
    this.gainNode.connect(ctx.destination);

    switch (type) {
      case "rain":
        this.createRainSound(ctx, this.gainNode);
        break;
      case "brown":
        this.createBrownNoise(ctx, this.gainNode);
        break;
      case "binaural":
        this.createBinauralBeats(ctx, this.gainNode);
        break;
      case "waves":
        this.createWavesSound(ctx, this.gainNode);
        break;
    }
  }

  /**
   * Gentle Rain: Pink noise with soft bandpass filtering
   */
  private createRainSound(ctx: AudioContext, destination: AudioNode): void {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06;
      b6 = white * 0.115926;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1200, ctx.currentTime);

    noiseSource.connect(filter);
    filter.connect(destination);
    noiseSource.start();
    this.currentSource = noiseSource;
  }

  /**
   * Deep Brown Noise: Relaxing low frequency rumble (ideal for deep focus)
   */
  private createBrownNoise(ctx: AudioContext, destination: AudioNode): void {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5; // Gain boost for brownian slope
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(450, ctx.currentTime);

    noiseSource.connect(filter);
    filter.connect(destination);
    noiseSource.start();
    this.currentSource = noiseSource;
  }

  /**
   * Binaural 40Hz Gamma Focus: Left 200Hz, Right 240Hz
   */
  private createBinauralBeats(ctx: AudioContext, destination: AudioNode): void {
    const merger = ctx.createChannelMerger(2);

    const oscLeft = ctx.createOscillator();
    oscLeft.type = "sine";
    oscLeft.frequency.setValueAtTime(200, ctx.currentTime);

    const oscRight = ctx.createOscillator();
    oscRight.type = "sine";
    oscRight.frequency.setValueAtTime(240, ctx.currentTime); // 40Hz differential

    const gainL = ctx.createGain();
    const gainR = ctx.createGain();
    gainL.gain.setValueAtTime(0.3, ctx.currentTime);
    gainR.gain.setValueAtTime(0.3, ctx.currentTime);

    oscLeft.connect(gainL);
    gainL.connect(merger, 0, 0);

    oscRight.connect(gainR);
    gainR.connect(merger, 0, 1);

    merger.connect(destination);

    oscLeft.start();
    oscRight.start();

    this.currentSource = merger;
  }

  /**
   * Ocean Waves: Filter-swept noise imitating gentle beach waves
   */
  private createWavesSound(ctx: AudioContext, destination: AudioNode): void {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (last + 0.04 * white) / 1.04;
      last = data[i];
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(300, ctx.currentTime);

    // LFO for rhythmic ocean surge
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.12, ctx.currentTime); // ~8 sec wave period

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(350, ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    noiseSource.connect(filter);
    filter.connect(destination);

    noiseSource.start();
    lfo.start();

    this.currentSource = noiseSource;
  }

  /**
   * Gentle Zen Chime when a Pomodoro finishes
   */
  public playChime(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const frequencies = [528, 792, 1056]; // Harmonics
    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

      gain.gain.setValueAtTime(0.15 / (idx + 1), ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.08);
      osc.stop(ctx.currentTime + 2.6);
    });
  }
}

export const soundEngine = new AmbientSoundEngine();
