/**
 * CareerTwin AI - Audio Intelligence & Speech Capture Module
 */

class AudioProcessor {
  constructor() {
    this.mediaStream = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.audioContext = null;
    this.analyser = null;
    this.animationFrameId = null;
    this.recognition = null;
    this.liveTranscript = '';
    this.isRecording = false;
  }

  async initMic(stream) {
    this.mediaStream = stream;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);
    } catch (e) {
      console.warn('AudioContext initialization failed:', e.message);
    }

    // Init Web Speech API for live transcription preview
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            this.liveTranscript += event.results[i][0].transcript + ' ';
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        if (this.onTranscriptUpdate) {
          this.onTranscriptUpdate(this.liveTranscript + interim);
        }
      };

      this.recognition.onerror = (e) => {
        console.warn('Speech recognition warning:', e.error);
      };
    }
  }

  startRecording(canvasElement) {
    if (!this.mediaStream) return;
    this.audioChunks = [];
    this.liveTranscript = '';
    this.isRecording = true;

    try {
      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '',
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(250); // Slice every 250ms
    } catch (e) {
      console.warn('MediaRecorder audio init error:', e.message);
    }

    if (this.recognition) {
      try {
        this.recognition.start();
      } catch (e) {}
    }

    if (canvasElement && this.analyser) {
      this.drawWaveform(canvasElement);
    }
  }

  stopRecording() {
    this.isRecording = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }

    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve({
          audioBlob: null,
          transcript: this.liveTranscript.trim(),
        });
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        resolve({
          audioBlob,
          transcript: this.liveTranscript.trim(),
        });
      };

      this.mediaRecorder.stop();
    });
  }

  drawWaveform(canvas) {
    const ctx = canvas.getContext('2d');
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      if (!this.isRecording) return;
      this.animationFrameId = requestAnimationFrame(render);

      this.analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;

        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#06b6d4');
        gradient.addColorStop(1, '#6366f1');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    render();
  }

  stopAllTracks() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}

window.AudioProcessor = AudioProcessor;
