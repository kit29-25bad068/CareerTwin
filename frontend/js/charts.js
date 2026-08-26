/**
 * CareerTwin AI - Chart.js Visualizer Presets
 */

const Charts = {
  // 1. Radar Chart for 360-Degree Career Readiness
  renderReadinessRadar(canvasId, breakdown = []) {
    const ctx = document.getElementById(canvasId);
    if (!ctx || typeof Chart === 'undefined') return null;

    const labels = breakdown.map((b) => b.dimension.replace('&', '\n&'));
    const dataValues = breakdown.map((b) => b.score || 0);

    return new Chart(ctx, {
      type: 'radar',
      data: {
        labels,
        datasets: [
          {
            label: 'Readiness Score (0-100)',
            data: dataValues,
            backgroundColor: 'rgba(99, 102, 241, 0.25)',
            borderColor: '#6366f1',
            borderWidth: 2,
            pointBackgroundColor: '#06b6d4',
            pointBorderColor: '#ffffff',
            pointHoverBackgroundColor: '#ffffff',
            pointHoverBorderColor: '#06b6d4',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
            grid: { color: 'rgba(255, 255, 255, 0.08)' },
            pointLabels: {
              color: '#9ca3af',
              font: { size: 11, family: 'Inter' },
            },
            ticks: {
              backdropColor: 'transparent',
              color: '#6b7280',
              stepSize: 20,
              min: 0,
              max: 100,
            },
          },
        },
        plugins: {
          legend: { display: false },
        },
      },
    });
  },

  // 2. Line Chart for Historical Performance (Career Memory)
  renderMemoryTrend(canvasId, timeline = []) {
    const ctx = document.getElementById(canvasId);
    if (!ctx || typeof Chart === 'undefined') return null;

    if (!timeline || timeline.length === 0) {
      // Empty state
      return null;
    }

    const labels = timeline.map((t, idx) => `Session ${idx + 1}`);
    const techScores = timeline.map((t) => t.technicalScore || 0);
    const commScores = timeline.map((t) => t.communicationScore || 0);
    const overallScores = timeline.map((t) => t.overallScore || 0);

    return new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Overall Score',
            data: overallScores,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            fill: true,
            tension: 0.35,
            borderWidth: 3,
          },
          {
            label: 'Technical Depth',
            data: techScores,
            borderColor: '#06b6d4',
            borderDash: [5, 5],
            tension: 0.35,
            borderWidth: 2,
          },
          {
            label: 'Communication & Speech',
            data: commScores,
            borderColor: '#10b981',
            tension: 0.35,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#9ca3af' },
          },
          y: {
            min: 0,
            max: 100,
            grid: { color: 'rgba(255, 255, 255, 0.08)' },
            ticks: { color: '#9ca3af' },
          },
        },
        plugins: {
          legend: {
            labels: { color: '#e5e7eb', font: { family: 'Inter' } },
          },
        },
      },
    });
  },

  // 3. Doughnut Chart for Skill Coverage
  renderSkillCoverageDoughnut(canvasId, verifiedCount = 0, gapsCount = 0) {
    const ctx = document.getElementById(canvasId);
    if (!ctx || typeof Chart === 'undefined') return null;

    return new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Verified Competencies', 'Skill Gaps to Learn'],
        datasets: [
          {
            data: [verifiedCount || 0, gapsCount || 0],
            backgroundColor: ['#10b981', '#f59e0b'],
            borderColor: '#111827',
            borderWidth: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#9ca3af' },
          },
        },
      },
    });
  },
};

window.Charts = Charts;
