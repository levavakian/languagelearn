type AudioCallback = (chunk: Blob) => void;

class AudioService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private isRecording: boolean = false;
  private onChunkCallback: AudioCallback | null = null;

  async requestPermissions(): Promise<boolean> {
    try {
      const permissions = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      if (permissions.state === 'granted') return true;

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000,
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
          sampleRate: 24000,
        }
      });

      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new AudioContext({ sampleRate: 24000 });
      }

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      
      this.onChunkCallback = onChunk;
      this.mediaRecorder.ondataavailable = this.handleDataAvailable.bind(this);
      this.mediaRecorder.start(100);
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
      const arrayBuffer = await event.data.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      const offlineCtx = new OfflineAudioContext(1, audioBuffer.length, 24000);
      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineCtx.destination);
      source.start();
      
      const renderedBuffer = await offlineCtx.startRendering();
      
      const pcm16 = new Int16Array(renderedBuffer.length);
      const channelData = renderedBuffer.getChannelData(0);
      for (let i = 0; i < renderedBuffer.length; i++) {
        pcm16[i] = Math.max(-1, Math.min(1, channelData[i])) * 0x7FFF;
      }
      
      const pcmBlob = new Blob([pcm16], { type: 'audio/pcm' });
      this.onChunkCallback(pcmBlob);
    } catch (err) {
      console.error('Error processing audio chunk:', err);
    }
  }
}

export const audioService = new AudioService(); 