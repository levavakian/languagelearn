class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private readonly SAMPLE_RATE = 24000;
  private isPlaying = false;
  private audioQueue: AudioBuffer[] = [];

  async init() {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new AudioContext({ sampleRate: this.SAMPLE_RATE });
    }
    
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  async playChunk(pcm16Blob: Blob) {
    if (!this.audioContext) {
      await this.init();
    }

    try {
      // Convert Blob to ArrayBuffer
      const arrayBuffer = await pcm16Blob.arrayBuffer();
      const int16Array = new Int16Array(arrayBuffer);
      
      // Validate audio data
      if (int16Array.length === 0) {
        console.warn('Received empty audio chunk, skipping playback');
        return;
      }
      
      // Convert Int16Array to Float32Array for Web Audio API
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32767;
      }

      // Create audio buffer
      const audioBuffer = this.audioContext!.createBuffer(
        1, // mono
        float32Array.length,
        this.SAMPLE_RATE
      );
      audioBuffer.getChannelData(0).set(float32Array);

      // Add to queue and play if not already playing
      this.audioQueue.push(audioBuffer);
      if (!this.isPlaying) {
        this.playNextChunk();
      }
    } catch (err) {
      console.error('Error playing audio chunk:', err);
    }
  }

  private playNextChunk() {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioBuffer = this.audioQueue.shift()!;
    const source = this.audioContext!.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext!.destination);
    
    this.currentSource = source;
    
    source.onended = () => {
      if (this.currentSource === source) {
        this.currentSource = null;
        this.playNextChunk(); // Play next chunk when current one ends
      }
    };
    
    source.start();
  }

  stop() {
    this.audioQueue = []; // Clear the queue
    this.isPlaying = false;
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export const audioPlayer = new AudioPlayer();
