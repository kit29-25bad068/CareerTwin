/**
 * CareerTwin AI - UI Utilities & Toast Notification Engine
 */

const Utils = {
  // Toast notifications
  showToast(message, type = 'info', duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `
      <span style="font-size: 1.1rem;">${icon}</span>
      <span style="flex: 1;">${this.escapeHTML(message)}</span>
      <button style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:1.1rem;" onclick="this.parentElement.remove()">✕</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }
    }, duration);
  },

  // Escape HTML to prevent XSS
  escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  // Format seconds to mm:ss
  formatSeconds(seconds) {
    if (isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  },

  // Format Date string
  formatDate(dateString) {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  },

  // Show full-screen loading spinner with custom text
  showLoading(text = 'Processing CareerTwin AI Intelligence...') {
    let overlay = document.getElementById('global-loading-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'global-loading-overlay';
      overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(11, 15, 25, 0.85); backdrop-filter: blur(8px);
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        z-index: 99999; transition: opacity 0.2s ease;
      `;
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
      <div class="spinner" style="width: 44px; height: 44px; border-width: 4px; margin-bottom: 1.25rem;"></div>
      <p style="font-size: 1.1rem; font-weight: 600; color: var(--text-primary);" id="loading-text">${this.escapeHTML(text)}</p>
    `;
    overlay.style.display = 'flex';
  },

  hideLoading() {
    const overlay = document.getElementById('global-loading-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  },

  // Render or update conic gradient score dial
  renderScoreDial(containerId, score, label = 'Readiness') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const numericScore = typeof score === 'number' ? Math.round(score) : null;
    const displayScore = numericScore !== null ? numericScore : '--';
    const fillPercent = numericScore !== null ? numericScore : 0;

    container.innerHTML = `
      <div class="score-dial" style="--score: ${fillPercent};">
        <div class="score-dial-inner">
          <div class="score-dial-number">${displayScore}</div>
          <div class="score-dial-label">${this.escapeHTML(label)}</div>
        </div>
      </div>
    `;
  },
};

window.Utils = Utils;
