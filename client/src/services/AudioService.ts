import { audioPlayer } from "./AudioPlayer";

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
      console.log('Starting audio recording...');
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

      // Create a MediaStreamSource and connect it to a ScriptProcessor
      const source = this.audioContext.createMediaStreamSource(stream);
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      source.connect(processor);
      processor.connect(this.audioContext.destination);

      processor.onaudioprocess = (e) => {
        const channelData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(channelData.length);
        
        // Convert float32 to 16-bit PCM
        for (let i = 0; i < channelData.length; i++) {
          const sample = Math.max(-1, Math.min(1, channelData[i]));
          pcm16[i] = Math.round(sample * 32767);
        }

        const pcmBlob = new Blob([pcm16.buffer], { type: 'audio/pcm' });
        
        if (this.onChunkCallback) {
          this.onChunkCallback(pcmBlob);
        }
      };

      this.mediaRecorder = { 
        stream,
        stop: () => {
          source.disconnect();
          processor.disconnect();
          stream.getTracks().forEach(track => track.stop());
        }
      } as any;
      
      this.onChunkCallback = onChunk;
      this.isRecording = true;
      console.log('Audio recording started successfully');

    } catch (err) {
      console.error('Error starting recording:', err);
      throw err;
    }
  }

  stopRecording() {
    if (!this.isRecording || !this.mediaRecorder) return;
    
    console.log('Stopping audio recording...');
    this.mediaRecorder.stop();
    this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    this.isRecording = false;
    this.onChunkCallback = null;
    console.log('Audio recording stopped successfully');
  }
}

export const audioService = new AudioService();