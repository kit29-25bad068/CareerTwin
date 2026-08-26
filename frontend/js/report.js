/**
 * CareerTwin AI - Post-Interview Report & Video Replay Seeker
 */

const ReportViewer = {
  interview: null,

  async loadReport(interviewId) {
    Utils.showLoading('Loading performance intelligence report...');
    try {
      const res = await API.get(`/interviews/${interviewId}`);
      if (res.success && res.interview) {
        this.interview = res.interview;
        Utils.hideLoading();
        this.renderReport();
      } else {
        throw new Error('Interview report not found.');
      }
    } catch (err) {
      Utils.hideLoading();
      Utils.showToast(err.message || 'Error loading interview report.', 'error');
    }
  },

  renderReport() {
    const inv = this.interview;
    const rep = inv.finalReport || {};

    // Header info
    document.getElementById('report-role-title').textContent = `${inv.role} Simulation Report`;
    document.getElementById('report-company-meta').textContent = `${inv.company} &bull; ${inv.interviewType} &bull; Recruiter: ${inv.recruiterType}`;
    document.getElementById('report-date-meta').textContent = Utils.formatDate(inv.completedAt || inv.createdAt);

    // Privacy badge
    const pBadge = document.getElementById('report-privacy-badge');
    if (inv.privacyMode === 'privacy') {
      pBadge.textContent = '🛡️ Conducted in Privacy Mode (No media stored)';
      pBadge.className = 'badge badge-cyan';
    } else {
      pBadge.textContent = '📹 Conducted in Replay Mode';
      pBadge.className = 'badge badge-amber';
    }

    // Top Metric Scores
    document.getElementById('score-overall').textContent = rep.overallScore || 0;
    document.getElementById('score-technical').textContent = rep.technicalScore || 0;
    document.getElementById('score-communication').textContent = rep.communicationScore || 0;
    document.getElementById('score-problem-solving').textContent = rep.problemSolvingScore || 0;

    // Role readiness
    const readBadge = document.getElementById('role-readiness-badge');
    readBadge.textContent = `Role Readiness: ${rep.roleReadiness || 'Developing'}`;

    // Summary & Key Improvement
    document.getElementById('report-summary-text').textContent = rep.summary || 'Session analyzed.';
    document.getElementById('report-most-important-improvement').textContent = rep.mostImportantImprovement || 'Incorporate concrete technical trade-offs into responses.';

    // Strengths & Weaknesses
    const strList = document.getElementById('report-strengths-list');
    strList.innerHTML = (rep.strengths || ['Demonstrated clear familiarity with core topics']).map((s) => `
      <li style="margin-bottom: 0.5rem;">✅ ${Utils.escapeHTML(s)}</li>
    `).join('');

    const weakList = document.getElementById('report-weaknesses-list');
    weakList.innerHTML = (rep.weaknesses || ['Could provide deeper architectural trade-offs']).map((w) => `
      <li style="margin-bottom: 0.5rem;">⚠️ ${Utils.escapeHTML(w)}</li>
    `).join('');

    // Replay Player Setup
    const replaySection = document.getElementById('video-replay-section');
    const videoPlayer = document.getElementById('replay-video-player');
    const deleteRecBtn = document.getElementById('delete-recording-btn');

    if (inv.recordingPath) {
      replaySection.style.display = 'block';
      videoPlayer.src = inv.recordingPath;
      deleteRecBtn.style.display = 'inline-flex';
    } else {
      replaySection.style.display = 'none';
      deleteRecBtn.style.display = 'none';
    }

    // Render Timestamped Events Timeline
    this.renderTimelineEvents(inv.events || []);

    // Render Question Accordions
    this.renderQuestionsAccordion(inv.questions || []);
  },

  renderTimelineEvents(events) {
    const container = document.getElementById('timeline-events-container');
    if (!events || events.length === 0) {
      container.innerHTML = `<p style="color:var(--text-muted); font-size:0.85rem;">No timestamped events recorded for this session.</p>`;
      return;
    }

    container.innerHTML = events.map((ev) => {
      let badgeClass = 'badge-primary';
      if (ev.type === 'GOOD') badgeClass = 'badge-success';
      if (ev.type === 'NEEDS_IMPROVEMENT') badgeClass = 'badge-danger';

      return `
        <div class="timeline-item" onclick="ReportViewer.seekToTimestamp(${ev.timestampSeconds}, '${Utils.escapeHTML(ev.title)}', '${Utils.escapeHTML(ev.description)}')">
          <span class="timeline-time-badge">⏱️ ${ev.formattedTime}</span>
          <div style="flex:1;">
            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.25rem;">
              <span class="badge ${badgeClass}" style="font-size:0.7rem;">${ev.type}</span>
              <strong style="font-size:0.9rem; color:var(--text-primary);">${Utils.escapeHTML(ev.title)}</strong>
            </div>
            <div style="font-size:0.82rem; color:var(--text-secondary);">${Utils.escapeHTML(ev.description)}</div>
          </div>
        </div>
      `;
    }).join('');
  },

  seekToTimestamp(seconds, title, description) {
    const videoPlayer = document.getElementById('replay-video-player');
    if (videoPlayer && !videoPlayer.paused && videoPlayer.src) {
      videoPlayer.currentTime = seconds;
      videoPlayer.play();
    } else if (videoPlayer && videoPlayer.src) {
      videoPlayer.currentTime = seconds;
    }

    // Display 'Why This Was Highlighted' explanation
    const explainBox = document.getElementById('highlight-explanation-box');
    if (explainBox) {
      explainBox.style.display = 'block';
      explainBox.innerHTML = `
        <div style="font-size:0.85rem; font-weight:700; color:var(--accent-secondary); margin-bottom:0.25rem;">
          🔍 WHY THIS WAS HIGHLIGHTED (${Utils.formatSeconds(seconds)}):
        </div>
        <div style="font-size:0.9rem; font-weight:600; color:var(--text-primary);">${title}</div>
        <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:0.25rem;">${description}</div>
      `;
      explainBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  },

  renderQuestionsAccordion(questions) {
    const container = document.getElementById('questions-accordion-container');
    container.innerHTML = questions.map((q, idx) => `
      <div class="question-accordion-item">
        <div class="question-accordion-header" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'">
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <span class="badge badge-primary">Q${idx + 1}</span>
            <span style="font-weight:600; font-size:0.95rem;">${Utils.escapeHTML(q.questionText)}</span>
          </div>
          <div style="display:flex; align-items:center; gap:1rem;">
            <span style="font-size:0.85rem; color:var(--accent-cyan);">Tech: ${q.evaluation?.technicalScore || 0}/100</span>
            <span style="font-size:0.85rem; color:var(--accent-emerald);">Comm: ${q.evaluation?.communicationScore || 0}/100</span>
            <span>▼</span>
          </div>
        </div>

        <div class="question-accordion-body" style="display: ${idx === 0 ? 'block' : 'none'};">
          <div style="margin-bottom: 1rem;">
            <div style="font-size:0.75rem; text-transform:uppercase; color:var(--text-muted); font-weight:600; margin-bottom:0.25rem;">Candidate Answer</div>
            <div style="background:rgba(0,0,0,0.3); padding:0.85rem; border-radius:var(--radius-sm); font-size:0.9rem; font-style:italic; border-left:3px solid var(--accent-primary);">
              "${Utils.escapeHTML(q.answerText || 'No verbal answer recorded.')}"
            </div>
          </div>

          <!-- Speech & Vision Indicators -->
          <div class="grid grid-cols-2" style="margin-bottom: 1rem; font-size:0.82rem;">
            <div style="background:rgba(255,255,255,0.02); padding:0.75rem; border-radius:var(--radius-sm); border:1px solid var(--border-color);">
              <div style="font-weight:600; color:var(--accent-secondary); margin-bottom:0.35rem;">🎙️ Speech Intelligence</div>
              <div>&bull; Speech Pace: ${q.speechMetrics?.wordsPerMinute || 0} WPM (${q.speechMetrics?.speechRateEvaluation || 'Optimal'})</div>
              <div>&bull; Filler Words: ${q.speechMetrics?.fillerWordsCount || 0} detected (${(q.speechMetrics?.fillerWordsList || []).join(', ') || 'None'})</div>
            </div>

            <div style="background:rgba(255,255,255,0.02); padding:0.75rem; border-radius:var(--radius-sm); border:1px solid var(--border-color);">
              <div style="font-weight:600; color:var(--accent-secondary); margin-bottom:0.35rem;">👁️ Vision Indicators</div>
              <div>&bull; Eye Contact Consistency: ${q.visionMetrics?.eyeContactPercentage || 100}%</div>
              <div>&bull; Camera Framing: ${q.visionMetrics?.framingQuality || 'Good'}</div>
            </div>
          </div>

          <!-- AI Feedback -->
          <div style="font-size:0.88rem;">
            <div style="margin-bottom:0.5rem; color:#34d399;">
              <strong>✅ Correct Elements:</strong> ${(q.evaluation?.whatWasCorrect || ['Good foundational explanation']).join('; ')}
            </div>
            <div style="margin-bottom:0.5rem; color:#fb7185;">
              <strong>⚠️ Missing Aspects:</strong> ${(q.evaluation?.whatWasMissing || ['Could provide more trade-offs']).join('; ')}
            </div>
            <div style="color:#fbbf24;">
              <strong>💡 Improvement Advice:</strong> ${(q.evaluation?.improvementTips || ['Use concrete metrics']).join('; ')}
            </div>
          </div>
        </div>
      </div>
    `).join('');
  },

  async deleteRecording() {
    if (!confirm('Are you sure you want to permanently delete this video recording? Your scores and analysis report will be preserved.')) return;

    try {
      Utils.showLoading('Deleting recording file...');
      const res = await API.delete(`/interviews/${this.interview._id}/recording`);
      Utils.hideLoading();
      if (res.success) {
        Utils.showToast('Recording deleted successfully.', 'success');
        document.getElementById('video-replay-section').style.display = 'none';
        document.getElementById('delete-recording-btn').style.display = 'none';
      }
    } catch (err) {
      Utils.hideLoading();
      Utils.showToast(err.message || 'Failed to delete recording.', 'error');
    }
  },
};

window.ReportViewer = ReportViewer;
