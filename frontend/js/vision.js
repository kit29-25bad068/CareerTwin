/**
 * CareerTwin AI - Vision & Eye Contact Intelligence Engine
 * Real-time face detection, pupil/gaze tracking, and framing analysis
 */

class VisionTracker {
  constructor() {
    this.videoElement = null;
    this.canvasElement = null;
    this.hudElement = null;
    this.isTracking = false;

    // Per-question tracking counters
    this.totalFrames = 0;
    this.faceDetectedFrames = 0;
    this.eyeContactFrames = 0;
    this.lookingAwayCount = 0;

    // Gaze state tracking
    this.consecutiveLookingAway = 0;
    this.wasLookingAway = false;
    this.intervalId = null;
    this.nativeDetector = null;

    // Rolling frame history for smooth detection
    this.recentGazeStates = [];
  }

  async init(videoElement, canvasElement, hudElement = null) {
    this.videoElement = videoElement;
    this.canvasElement = canvasElement || document.getElementById('vision-tracker-canvas');
    this.hudElement = hudElement || document.getElementById('camera-gaze-hud');

    // Attempt to use native FaceDetector API (Chromium/Edge)
    if ('FaceDetector' in window) {
      try {
        this.nativeDetector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      } catch (e) {
        this.nativeDetector = null;
      }
    }
  }

  startTracking() {
    if (!this.videoElement) return;
    this.isTracking = true;
    this.resetQuestionCounters();

    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    // High-responsiveness sampling every 250ms (4 FPS for lightweight accurate tracking)
    this.intervalId = setInterval(() => {
      this.analyzeFrame();
    }, 250);
  }

  resetQuestionCounters() {
    this.totalFrames = 0;
    this.faceDetectedFrames = 0;
    this.eyeContactFrames = 0;
    this.lookingAwayCount = 0;
    this.consecutiveLookingAway = 0;
    this.wasLookingAway = false;
    this.recentGazeStates = [];
  }

  async analyzeFrame() {
    if (!this.videoElement || this.videoElement.paused || this.videoElement.ended || !this.isTracking) return;

    this.totalFrames++;

    const sampleWidth = 160;
    const sampleHeight = 120;

    let canvas = this.canvasElement;
    if (!canvas) {
      canvas = document.createElement('canvas');
      this.canvasElement = canvas;
    }
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(this.videoElement, 0, 0, sampleWidth, sampleHeight);

    let isFaceDetected = false;
    let isDirectEyeContact = true;
    let gazeStatusDescription = 'Direct Eye Contact';

    // 1. Try Native FaceDetector first if supported
    if (this.nativeDetector) {
      try {
        const faces = await this.nativeDetector.detect(canvas);
        if (faces && faces.length > 0) {
          isFaceDetected = true;
          const face = faces[0];
          const box = face.boundingBox;

          // Check if face is centered in frame
          const faceCenterX = (box.x + box.width / 2) / sampleWidth;
          const faceCenterY = (box.y + box.height / 2) / sampleHeight;

          // Check head / gaze rotation from landmarks if available
          if (face.landmarks && face.landmarks.length >= 2) {
            const eyes = face.landmarks.filter((l) => l.type === 'eye');
            if (eyes.length >= 2) {
              const eyeMidX = (eyes[0].location.x + eyes[1].location.x) / 2;
              const eyeDeviation = Math.abs(eyeMidX - (box.x + box.width / 2)) / box.width;
              if (eyeDeviation > 0.08) {
                isDirectEyeContact = false;
                gazeStatusDescription = 'Gaze Shifted: Head / Eyes Turned';
              }
            }
          }

          // Off-center framing check
          if (faceCenterX < 0.28 || faceCenterX > 0.72) {
            isDirectEyeContact = false;
            gazeStatusDescription = 'Face Off-Center (Looking Sideways)';
          } else if (faceCenterY < 0.2 || faceCenterY > 0.8) {
            isDirectEyeContact = false;
            gazeStatusDescription = 'Gaze Shifted (Looking Down / Up)';
          }
        }
      } catch (detErr) {
        // Fallback to optical gradient analyzer
      }
    }

    // 2. Optical Spatial Gradient & Pupil/Contrast Analyzer (Universal Fallback)
    if (!isFaceDetected) {
      const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
      const data = imageData.data;

      let skinPixelCount = 0;
      let sumX = 0;
      let sumY = 0;

      // Detect skin-tone chromaticity in RGB space
      for (let y = 0; y < sampleHeight; y++) {
        for (let x = 0; x < sampleWidth; x++) {
          const idx = (y * sampleWidth + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          // Basic Skin color range: R > 60, G > 40, B > 20, R > G, R > B, |R-G| > 15
          if (r > 60 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 12) {
            skinPixelCount++;
            sumX += x;
            sumY += y;
          }
        }
      }

      // If at least 5% of pixels are skin tone, face is present in frame
      const totalPixels = sampleWidth * sampleHeight;
      if (skinPixelCount > totalPixels * 0.05) {
        isFaceDetected = true;
        const faceCenterX = sumX / skinPixelCount / sampleWidth;
        const faceCenterY = sumY / skinPixelCount / sampleHeight;

        // Check if candidate is facing front & centered
        const isHorizontallyCentered = faceCenterX >= 0.32 && faceCenterX <= 0.68;
        const isVerticallyCentered = faceCenterY >= 0.22 && faceCenterY <= 0.78;

        if (!isHorizontallyCentered) {
          isDirectEyeContact = false;
          gazeStatusDescription = faceCenterX < 0.32 ? 'Gaze Shifted: Looking Left' : 'Gaze Shifted: Looking Right';
        } else if (!isVerticallyCentered) {
          isDirectEyeContact = false;
          gazeStatusDescription = faceCenterY > 0.78 ? 'Gaze Shifted: Looking Down' : 'Gaze Shifted: Looking Up';
        } else {
          // Eye strip dark-pupil contrast analysis
          const eyeBandYStart = Math.max(0, Math.floor((faceCenterY - 0.12) * sampleHeight));
          const eyeBandYEnd = Math.min(sampleHeight, Math.floor((faceCenterY + 0.02) * sampleHeight));
          const eyeBandXStart = Math.max(0, Math.floor((faceCenterX - 0.18) * sampleWidth));
          const eyeBandXEnd = Math.min(sampleWidth, Math.floor((faceCenterX + 0.18) * sampleWidth));

          let darkPixelsLeft = 0;
          let darkPixelsRight = 0;
          const midX = (eyeBandXStart + eyeBandXEnd) / 2;

          for (let y = eyeBandYStart; y < eyeBandYEnd; y++) {
            for (let x = eyeBandXStart; x < eyeBandXEnd; x++) {
              const idx = (y * sampleWidth + x) * 4;
              const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
              if (brightness < 55) {
                // Dark pupil / iris region
                if (x < midX) darkPixelsLeft++;
                else darkPixelsRight++;
              }
            }
          }

          // Asymmetry in dark pupil distribution indicates gaze shift to side
          const totalDark = darkPixelsLeft + darkPixelsRight;
          if (totalDark > 15) {
            const ratio = darkPixelsLeft / totalDark;
            if (ratio < 0.25 || ratio > 0.75) {
              isDirectEyeContact = false;
              gazeStatusDescription = 'Eyes Shifted Sideways';
            }
          }
        }
      } else {
        isFaceDetected = false;
        isDirectEyeContact = false;
        gazeStatusDescription = 'Face Not Centered in Camera';
      }
    }

    // 3. Update Rolling Counters & Looking-Away Events
    if (isFaceDetected) {
      this.faceDetectedFrames++;
    }

    // Smooth filtering: require 2 consecutive frames (~0.5s) to confirm looking away (avoids blink false positives)
    this.recentGazeStates.push(isDirectEyeContact);
    if (this.recentGazeStates.length > 4) this.recentGazeStates.shift();

    const directCount = this.recentGazeStates.filter(Boolean).length;
    const isStableDirect = directCount >= 2;

    if (isStableDirect && isFaceDetected) {
      this.eyeContactFrames++;
      this.consecutiveLookingAway = 0;
      this.wasLookingAway = false;
    } else {
      this.consecutiveLookingAway++;
      if (this.consecutiveLookingAway === 2 && !this.wasLookingAway) {
        this.lookingAwayCount++;
        this.wasLookingAway = true;
      }
    }

    // 4. Update Live HUD Indicator
    this.updateHUD(isFaceDetected, isDirectEyeContact, gazeStatusDescription);
  }

  updateHUD(isFaceDetected, isDirectEyeContact, description) {
    const hudContainer = document.getElementById('camera-gaze-hud');
    const statusText = document.getElementById('gaze-status-indicator');
    const pctText = document.getElementById('gaze-percentage-indicator');

    if (!hudContainer || !statusText) return;

    hudContainer.style.display = 'flex';

    const safeTotal = Math.max(this.totalFrames, 1);
    const currentEyePct = Math.round((this.eyeContactFrames / safeTotal) * 100);

    if (pctText) {
      pctText.textContent = `${Math.min(currentEyePct, 100)}% Eye Contact`;
    }

    if (!isFaceDetected) {
      statusText.innerHTML = '🔴 <span style="color:#ef4444; font-weight:600;">Face Not Centered</span>';
      hudContainer.style.borderColor = 'rgba(239, 68, 68, 0.4)';
    } else if (isDirectEyeContact) {
      statusText.innerHTML = '🟢 <span style="color:#10b981; font-weight:600;">Eye Contact: Direct</span>';
      hudContainer.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    } else {
      statusText.innerHTML = `🟡 <span style="color:#f59e0b; font-weight:600;">${description}</span>`;
      hudContainer.style.borderColor = 'rgba(245, 158, 11, 0.4)';
    }
  }

  // Sample metrics for the current question and reset for the next question without stopping camera
  sampleQuestionMetrics() {
    const safeTotal = Math.max(this.totalFrames, 1);
    const facePct = Math.round((this.faceDetectedFrames / safeTotal) * 100);
    const eyePct = Math.round((this.eyeContactFrames / safeTotal) * 100);

    const metrics = {
      faceDetectedPercentage: Math.min(facePct, 100),
      eyeContactPercentage: Math.min(eyePct, 100),
      lookingAwayCount: this.lookingAwayCount,
      framingQuality:
        facePct >= 85 && eyePct >= 75
          ? 'Exceptional Eye Contact & Framing'
          : eyePct >= 50
          ? 'Good Presence with Occasional Gaze Shifts'
          : 'Frequent Looking Away / Off-Center Gaze',
    };

    // Reset counters for the next question
    this.resetQuestionCounters();

    return metrics;
  }

  stopTracking() {
    this.isTracking = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    return this.sampleQuestionMetrics();
  }
}

window.VisionTracker = VisionTracker;
