class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private readonly SAMPLE_RATE = 24000;
  private isPlaying = false;
  private audioQueue: Array<{ buffer: AudioBuffer, responseId: string }> = [];
  private currentResponseId: string | null = null;
  private ignoredResponseId: string | null = null;
  private hasPlayedAudio = false;

  async init() {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      try {
        this.audioContext = new AudioContext({ sampleRate: this.SAMPLE_RATE });
      } catch (e) {
        await this.requestUserInteraction();
        this.audioContext = new AudioContext({ sampleRate: this.SAMPLE_RATE });
      }
    }
    
    if (this.audioContext.state === 'suspended') {
      await this.requestUserInteraction();
      await this.audioContext.resume();
    }
  }

  private async requestUserInteraction(): Promise<void> {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      `;

      const button = document.createElement('button');
      button.textContent = 'Click to Enable Audio';
      button.style.cssText = `
        padding: 16px 32px;
        font-size: 18px;
        cursor: pointer;
      `;

      button.onclick = () => {
        document.body.removeChild(overlay);
        resolve();
      };

      overlay.appendChild(button);
      document.body.appendChild(overlay);
    });
  }

  async playChunk(pcm16Blob: Blob, responseId: string) {
    if (responseId === this.ignoredResponseId) {
      console.log('🔇 Ignoring response ID:', responseId);
      return;
    }

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

      // Add to queue with responseId
      this.audioQueue.push({ 
        buffer: audioBuffer, 
        responseId 
      });
      
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
    const { buffer, responseId } = this.audioQueue.shift()!;
    this.currentResponseId = responseId;
    this.hasPlayedAudio = true;
    
    const source = this.audioContext!.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext!.destination);
    
    this.currentSource = source;
    
    source.onended = () => {
      if (this.currentSource === source) {
        this.currentSource = null;
        this.playNextChunk();
      }
    };
    
    source.start();
  }

  stopAndIgnoreResponse(responseId: string) {
    this.ignoredResponseId = responseId;
    this.stop();
  }

  stop() {
    if (this.audioQueue.length > 0 || this.hasPlayedAudio) {
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
}

export const audioPlayer = new AudioPlayer();
