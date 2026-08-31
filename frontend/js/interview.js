/**
 * CareerTwin AI - Live Interactive Interview Orchestrator
 */

class InterviewOrchestrator {
  constructor() {
    this.interview = null;
    this.currentQuestion = null;
    this.audioProcessor = new AudioProcessor();
    this.visionTracker = new VisionTracker();
    this.mediaStream = null;
    this.timerInterval = null;
    this.totalElapsedSeconds = 0;
    this.questionElapsedSeconds = 0;
    this.isAnswering = false;
    this.fullRecordingChunks = [];
    this.fullMediaRecorder = null;
  }

  async startInterviewSession(config) {
    Utils.showLoading('Connecting with AI Interview Twin & initializing room...');

    try {
      // 1. Request Media Permissions if enabled
      let stream = null;
      const constraints = {
        audio: config.micEnabled !== false,
        video: config.cameraEnabled ? { width: 640, height: 480 } : false,
      };

      if (constraints.audio || constraints.video) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          this.mediaStream = stream;
        } catch (permErr) {
          console.warn('Camera/Mic permission warning:', permErr.message);
          Utils.showToast('Microphone/Camera permission not granted. Running in text-fallback mode.', 'info');
        }
      }

      // 2. Initialize Camera Viewfinder & Audio Processor
      if (this.mediaStream) {
        if (config.cameraEnabled) {
          const videoEl = document.getElementById('camera-preview-video');
          const canvasEl = document.getElementById('vision-tracker-canvas');
          if (videoEl) {
            videoEl.srcObject = this.mediaStream;
            videoEl.play();
            document.getElementById('camera-off-view').style.display = 'none';
            videoEl.style.display = 'block';
            this.visionTracker.init(videoEl, canvasEl);
            this.visionTracker.startTracking();
          }
        }

        if (config.micEnabled !== false) {
          await this.audioProcessor.initMic(this.mediaStream);
          this.audioProcessor.onTranscriptUpdate = (text) => {
            const liveEl = document.getElementById('live-transcript-preview');
            if (liveEl) liveEl.value = text;
          };
        }

        // If Replay Mode is active, initialize full video MediaRecorder
        if (config.privacyMode === 'replay') {
          try {
            this.fullMediaRecorder = new MediaRecorder(this.mediaStream, {
              mimeType: MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : '',
            });
            this.fullMediaRecorder.ondataavailable = (e) => {
              if (e.data.size > 0) this.fullRecordingChunks.push(e.data);
            };
            this.fullMediaRecorder.start(1000);
          } catch (e) {
            console.warn('Replay full recorder error:', e.message);
          }
        }
      }

      // 3. Create Interview session on backend
      const res = await API.post('/interviews', config);
      if (res.success && res.interview) {
        this.interview = res.interview;
        this.currentQuestion = res.currentQuestion;

        Utils.hideLoading();
        this.renderInterviewUI();
        this.startTimer();
      }
    } catch (err) {
      Utils.hideLoading();
      Utils.showToast(err.message || 'Failed to initialize interview session.', 'error');
    }
  }

  renderInterviewUI() {
    document.getElementById('setup-modal').style.display = 'none';
    document.getElementById('interview-active-room').style.display = 'grid';

    // Recruiter & Company headers
    document.getElementById('interviewer-name-display').textContent = this.interview.recruiterType;
    document.getElementById('interviewer-role-display').textContent = `${this.interview.role} Interview &bull; ${this.interview.company}`;
    document.getElementById('company-tag-badge').textContent = `🏢 ${this.interview.company}`;
    document.getElementById('difficulty-tag-badge').textContent = `⚡ ${this.interview.difficulty}`;
    
    // Privacy pill
    const privPill = document.getElementById('room-privacy-mode-pill');
    if (this.interview.privacyMode === 'privacy') {
      privPill.textContent = '🛡️ Privacy Mode (No media stored)';
      privPill.className = 'badge badge-cyan';
    } else {
      privPill.textContent = '📹 Replay Mode (Securely recording)';
      privPill.className = 'badge badge-amber';
    }

    this.displayCurrentQuestion();
  }

  displayCurrentQuestion() {
    const qIndex = this.interview.questions.findIndex((q) => q.questionText === this.currentQuestion.questionText) + 1;
    document.getElementById('question-counter-badge').textContent = `Question ${qIndex} of 5`;
    document.getElementById('current-question-text').textContent = this.currentQuestion.questionText;

    const transcriptInput = document.getElementById('live-transcript-preview');
    if (transcriptInput) transcriptInput.value = '';

    // Reset speech visualizer
    const canvas = document.getElementById('waveform-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    this.questionElapsedSeconds = 0;
    this.isAnswering = false;
    this.updateAnswerButtonState();
  }

  toggleAnswering() {
    const canvas = document.getElementById('waveform-canvas');
    if (!this.isAnswering) {
      // Start recording answer
      this.isAnswering = true;
      this.audioProcessor.startRecording(canvas);
      this.updateAnswerButtonState();
    } else {
      // Finish answer and submit
      this.submitCurrentAnswer();
    }
  }

  updateAnswerButtonState() {
    const btn = document.getElementById('answer-toggle-btn');
    if (!btn) return;
    if (this.isAnswering) {
      btn.className = 'btn btn-danger btn-lg';
      btn.innerHTML = '⏹️ Stop & Submit Answer';
    } else {
      btn.className = 'btn btn-cyan btn-lg';
      btn.innerHTML = '🎙️ Start Answering';
    }
  }

  async submitCurrentAnswer() {
    Utils.showLoading('Analyzing speech pacing, technical depth, and response structure...');

    try {
      // 1. Stop audio & collect transcript
      const { audioBlob, transcript } = await this.audioProcessor.stopRecording();
      this.isAnswering = false;
      this.updateAnswerButtonState();

      const manualTranscript = document.getElementById('live-transcript-preview')?.value || '';
      const finalAnswerText = manualTranscript || transcript || 'Provided verbal explanation.';

      // 2. Collect vision metrics for current question
      const visionMetrics = this.visionTracker.sampleQuestionMetrics();

      // 3. Package Form Data
      const formData = new FormData();
      if (audioBlob && audioBlob.size > 0) {
        formData.append('audio', audioBlob, 'answer.webm');
      }
      formData.append('answerText', finalAnswerText);
      formData.append('durationSeconds', this.questionElapsedSeconds || 30);
      formData.append('currentTimestampSeconds', this.totalElapsedSeconds);
      formData.append('visionMetrics', JSON.stringify(visionMetrics));

      // 4. Send to backend
      const res = await API.post(`/interviews/${this.interview._id}/answer`, formData);

      if (res.success) {
        Utils.hideLoading();

        if (res.isComplete) {
          // Finished all questions! Conclude interview
          await this.concludeInterviewSession();
        } else {
          // Move to next adaptive question
          this.currentQuestion = res.nextQuestion;
          this.interview.questions.push(res.nextQuestion);
          this.displayCurrentQuestion();
          Utils.showToast('Answer evaluated. Next question loaded.', 'success');
        }
      }
    } catch (err) {
      Utils.hideLoading();
      Utils.showToast(err.message || 'Error submitting answer.', 'error');
    }
  }

  async concludeInterviewSession() {
    Utils.showLoading('Generating comprehensive post-interview performance report...');
    this.stopTimer();
    this.visionTracker.stopTracking();

    try {
      // 1. If Replay Mode, upload full video recording
      if (this.interview.privacyMode === 'replay' && this.fullMediaRecorder) {
        await new Promise((resolve) => {
          this.fullMediaRecorder.onstop = async () => {
            const videoBlob = new Blob(this.fullRecordingChunks, { type: 'video/webm' });
            const formData = new FormData();
            formData.append('recording', videoBlob, 'interview-replay.webm');
            try {
              await API.post(`/interviews/${this.interview._id}/recording`, formData);
            } catch (e) {
              console.warn('Could not save replay recording:', e.message);
            }
            resolve();
          };
          this.fullMediaRecorder.stop();
        });
      }

      // 2. Call end interview API
      const res = await API.post(`/interviews/${this.interview._id}/end`, {
        totalDurationSeconds: this.totalElapsedSeconds,
      });

      if (res.success) {
        this.cleanupMedia();
        window.location.href = `/interview-report.html?id=${this.interview._id}`;
      }
    } catch (err) {
      Utils.hideLoading();
      Utils.showToast(err.message || 'Error concluding interview session.', 'error');
    }
  }

  startTimer() {
    this.totalElapsedSeconds = 0;
    this.questionElapsedSeconds = 0;
    this.timerInterval = setInterval(() => {
      this.totalElapsedSeconds++;
      if (this.isAnswering) this.questionElapsedSeconds++;

      const timerEl = document.getElementById('interview-timer-text');
      if (timerEl) {
        timerEl.textContent = Utils.formatSeconds(this.totalElapsedSeconds);
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  cleanupMedia() {
    this.stopTimer();
    this.audioProcessor.stopAllTracks();
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
    }
  }
}

window.InterviewOrchestrator = InterviewOrchestrator;
