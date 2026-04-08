
export class AudioStreamer {
  private audioContext: AudioContext | null = null;
  private audioBuffer: Float32Array[] = [];
  private processor: ScriptProcessorNode | null = null;
  private sampleRate: number = 24000;

  constructor() {
    this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
  }

  async play(base64Data: string) {
    if (!this.audioContext) return;
    
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // Initialize processor if not already
    if (!this.processor) {
      this.processor = this.audioContext.createScriptProcessor(4096, 0, 1);
      this.processor.onaudioprocess = (e) => {
        const output = e.outputBuffer.getChannelData(0);
        let sampleIndex = 0;
        while (sampleIndex < output.length && this.audioBuffer.length > 0) {
          const chunk = this.audioBuffer[0];
          const samplesToCopy = Math.min(output.length - sampleIndex, chunk.length);
          output.set(chunk.subarray(0, samplesToCopy), sampleIndex);
          sampleIndex += samplesToCopy;
          
          if (samplesToCopy < chunk.length) {
            this.audioBuffer[0] = chunk.subarray(samplesToCopy);
          } else {
            this.audioBuffer.shift();
          }
        }
        // Fill remaining with silence
        if (sampleIndex < output.length) {
          output.fill(0, sampleIndex);
        }
      };
      this.processor.connect(this.audioContext.destination);
    }

    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    const pcm16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 0x8000;
    }
    
    this.audioBuffer.push(float32);
  }

  stop() {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
    }
    this.audioBuffer = [];
  }
}
