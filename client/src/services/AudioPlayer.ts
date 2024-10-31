class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private readonly SAMPLE_RATE = 24000;

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
      // Wait for the current chunk to finish if it's playing
      if (this.currentSource) {
        return new Promise<void>((resolve) => {
          this.currentSource!.onended = () => {
            this.currentSource = null;
            resolve();
            this.playChunk(pcm16Blob); // Play the new chunk after current one ends
          };
        });
      }

      // Convert Blob to ArrayBuffer
      const arrayBuffer = await pcm16Blob.arrayBuffer();
      const int16Array = new Int16Array(arrayBuffer);
      
      // Convert Int16Array to Float32Array for Web Audio API
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        // Convert from 16-bit integer to float32 (-1 to 1 range)
        float32Array[i] = int16Array[i] / 32767;
      }

      // Create audio buffer
      const audioBuffer = this.audioContext!.createBuffer(
        1, // mono
        float32Array.length,
        this.SAMPLE_RATE
      );
      audioBuffer.getChannelData(0).set(float32Array);

      // Play the audio
      const source = this.audioContext!.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext!.destination);
      this.currentSource = source;
      
      source.onended = () => {
        this.currentSource = null;
      };
      
      source.start();
    } catch (err) {
      console.error('Error playing audio chunk:', err);
    }
  }

  stop() {
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
