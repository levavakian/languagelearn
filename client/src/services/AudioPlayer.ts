class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private readonly SAMPLE_RATE = 24000;

  async playPCM16(audioBlob: Blob): Promise<void> {
    try {
      // Create audio context if needed
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new AudioContext({ sampleRate: this.SAMPLE_RATE });
      }

      // Convert blob to array buffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      const int16Array = new Int16Array(arrayBuffer);

      // Create audio buffer
      const audioBuffer = this.audioContext.createBuffer(1, int16Array.length, this.SAMPLE_RATE);
      const channelData = audioBuffer.getChannelData(0);

      // Convert Int16 to Float32 for audio playback
      for (let i = 0; i < int16Array.length; i++) {
        channelData[i] = int16Array[i] / 32768.0;
      }

      // Create and play audio source
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      source.start();

    } catch (err) {
      console.error('Error playing audio:', err);
      throw err;
    }
  }

  stop() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export const audioPlayer = new AudioPlayer();
