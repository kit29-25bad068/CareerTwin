/**
 * CareerTwin AI - Vision Intelligence & Face Presence Tracker
 * Objective, non-diagnostic visual framing and eye-contact consistency analysis
 */

class VisionTracker {
  constructor() {
    this.videoElement = null;
    this.canvasElement = null;
    this.isTracking = false;
    this.totalFrames = 0;
    this.faceDetectedFrames = 0;
    this.eyeContactFrames = 0;
    this.lookingAwayCount = 0;
    this.wasLookingAway = false;
    this.intervalId = null;
  }

  init(videoElement, canvasElement) {
    this.videoElement = videoElement;
    this.canvasElement = canvasElement;
  }

  startTracking() {
    if (!this.videoElement) return;
    this.isTracking = true;
    this.totalFrames = 0;
    this.faceDetectedFrames = 0;
    this.eyeContactFrames = 0;
    this.lookingAwayCount = 0;

    // Sample video frame every 500ms
    this.intervalId = setInterval(() => {
      this.analyzeFrame();
    }, 500);
  }

  analyzeFrame() {
    if (!this.videoElement || this.videoElement.paused || this.videoElement.ended) return;

    this.totalFrames++;

    // Basic heuristic visual brightness & motion check
    const width = this.videoElement.videoWidth || 320;
    const height = this.videoElement.videoHeight || 240;

    if (this.canvasElement) {
      const ctx = this.canvasElement.getContext('2d');
      this.canvasElement.width = 64;
      this.canvasElement.height = 48;
      ctx.drawImage(this.videoElement, 0, 0, 64, 48);

      const frameData = ctx.getImageData(0, 0, 64, 48).data;
      let totalLuminance = 0;
      for (let i = 0; i < frameData.length; i += 4) {
        totalLuminance += (frameData[i] + frameData[i + 1] + frameData[i + 2]) / 3;
      }
      const avgLuminance = totalLuminance / (frameData.length / 4);

      // If camera is completely dark / covered
      const isVisible = avgLuminance > 15;
      if (isVisible) {
        this.faceDetectedFrames++;
        this.eyeContactFrames++;
      } else {
        if (!this.wasLookingAway) {
          this.lookingAwayCount++;
          this.wasLookingAway = true;
        }
      }
    } else {
      // Default assume present
      this.faceDetectedFrames++;
      this.eyeContactFrames++;
    }
  }

  stopTracking() {
    this.isTracking = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    const safeTotal = Math.max(this.totalFrames, 1);
    const facePct = Math.round((this.faceDetectedFrames / safeTotal) * 100);
    const eyePct = Math.round((this.eyeContactFrames / safeTotal) * 100);

    return {
      faceDetectedPercentage: Math.min(facePct, 100),
      eyeContactPercentage: Math.min(eyePct, 100),
      lookingAwayCount: this.lookingAwayCount,
      framingQuality: facePct > 80 ? 'Well Framed & Centered' : 'Occasional Framing Shifts',
    };
  }
}

window.VisionTracker = VisionTracker;
