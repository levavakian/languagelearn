class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.sampleRate = 24000; // Target sample rate
    this.buffer = [];
    this.bufferSize = 2048; // Process audio in chunks
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const inputData = input[0];
    
    // Downsample to 24kHz if needed
    const downsampleRatio = sampleRate / this.sampleRate;
    const processedData = new Float32Array(Math.floor(inputData.length / downsampleRatio));
    
    for (let i = 0; i < processedData.length; i++) {
      processedData[i] = inputData[Math.floor(i * downsampleRatio)];
    }

    // Add processed samples to buffer
    this.buffer.push(...processedData);

    // When buffer reaches target size, send it to main thread
    while (this.buffer.length >= this.bufferSize) {
      const audioChunk = this.buffer.slice(0, this.bufferSize);
      this.buffer = this.buffer.slice(this.bufferSize);
      
      this.port.postMessage({
        type: 'audio',
        buffer: audioChunk
      });
    }

    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
