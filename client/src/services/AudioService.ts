type AudioCallback = (chunk: Blob) => void;

class AudioService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private isRecording: boolean = false;
  private onChunkCallback: AudioCallback | null = null;
  private readonly SAMPLE_RATE = 24000;

  async requestPermissions(): Promise<boolean> {
    try {
      const permissions = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      if (permissions.state === 'granted') return true;

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: this.SAMPLE_RATE,
        }
      });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      console.error('Error checking mic permissions:', err);
      return false;
    }
  }

  async startRecording(onChunk: AudioCallback) {
    if (this.isRecording) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: this.SAMPLE_RATE,
        }
      });

      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new AudioContext({ sampleRate: this.SAMPLE_RATE });
      }

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });
      
      this.onChunkCallback = onChunk;
      this.mediaRecorder.ondataavailable = this.handleDataAvailable.bind(this);
      this.mediaRecorder.start(100); // Collect data every 100ms
      this.isRecording = true;

    } catch (err) {
      console.error('Error starting recording:', err);
      throw err;
    }
  }

  stopRecording() {
    if (!this.isRecording || !this.mediaRecorder) return;
    
    this.mediaRecorder.stop();
    this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    this.isRecording = false;
    this.onChunkCallback = null;
  }

  private async handleDataAvailable(event: BlobEvent) {
    if (event.data.size === 0 || !this.onChunkCallback || !this.audioContext) return;

    try {
      // Convert WebM audio to ArrayBuffer
      const arrayBuffer = await event.data.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // Create offline context for processing at exactly 24kHz
      const offlineCtx = new OfflineAudioContext({
        numberOfChannels: 1,
        length: audioBuffer.length * (this.SAMPLE_RATE / audioBuffer.sampleRate),
        sampleRate: this.SAMPLE_RATE
      });

      // Create source and connect
      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineCtx.destination);
      source.start();
      
      // Render to get the resampled audio
      const renderedBuffer = await offlineCtx.startRendering();
      
      // Convert to 16-bit PCM
      const pcm16 = new Int16Array(renderedBuffer.length);
      const channelData = renderedBuffer.getChannelData(0);
      
      // Ensure proper 16-bit PCM conversion with correct scaling
      for (let i = 0; i < renderedBuffer.length; i++) {
        // Clamp between -1 and 1, then scale to 16-bit range
        const sample = Math.max(-1, Math.min(1, channelData[i]));
        pcm16[i] = Math.round(sample * 32767); // Use 32767 for more precise 16-bit conversion
      }
      
      const pcmBlob = new Blob([pcm16.buffer], { type: 'audio/pcm' });
      this.onChunkCallback(pcmBlob);
    } catch (err) {
      console.error('Error processing audio chunk:', err);
    }
  }
}

export const audioService = new AudioService();