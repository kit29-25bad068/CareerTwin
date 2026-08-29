/**
 * CareerTwin AI - Dynamic Shared Sidebar & Topbar Component
 */

const Navbar = {
  navLinks: [
    { label: 'Dashboard', url: '/dashboard.html', icon: '📊' },
    { label: 'Career Twin', url: '/career-twin.html', icon: '🧬' },
    { label: 'Mock Interviews', url: '/interview.html', icon: '🎙️' },
    { label: 'Resume Intelligence', url: '/resume.html', icon: '📄' },
    { label: 'GitHub Signals', url: '/github.html', icon: '🐙' },
    { label: 'Project Evaluator', url: '/projects.html', icon: '🚀' },
    { label: 'Skill Matrix', url: '/skills.html', icon: '⚡' },
    { label: 'Career Roadmap', url: '/roadmap.html', icon: '🗺️' },
    { label: 'Career Goals', url: '/goals.html', icon: '🎯' },
    { label: 'Mentor AI', url: '/mentor.html', icon: '🤖' },
    { label: 'Career Memory', url: '/progress.html', icon: '📈' },
    { label: 'Privacy & Settings', url: '/settings.html', icon: '⚙️' },
  ],

  renderSidebar() {
    const currentPath = window.location.pathname;
    const sidebarEl = document.getElementById('sidebar-container');
    if (!sidebarEl) return;

    const linksHtml = this.navLinks
      .map((link) => {
        const cleanUrl = link.url.replace('.html', '');
        const isActive =
          currentPath === link.url ||
          currentPath === cleanUrl ||
          currentPath.endsWith(link.url.replace(/^\//, '')) ||
          currentPath.endsWith(cleanUrl.replace(/^\//, ''));
        return `
          <a href="${link.url}" class="nav-link ${isActive ? 'active' : ''}">
            <span class="nav-icon">${link.icon}</span>
            <span>${link.label}</span>
          </a>
        `;
      })
      .join('');

    sidebarEl.innerHTML = `
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-logo">CT</div>
          <div>
            <div class="sidebar-title gradient-text">CareerTwin AI</div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">Digital Career Twin</div>
          </div>
        </div>

        <nav class="sidebar-nav">
          ${linksHtml}
        </nav>

        <div class="sidebar-footer">
          <div style="display:flex; flex-direction:column; overflow:hidden;">
            <span class="user-display-name" style="font-size:0.875rem; font-weight:600; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">User</span>
            <span class="badge badge-cyan user-privacy-mode-badge" style="margin-top:0.25rem; font-size:0.65rem; width:fit-content;">🛡️ Privacy Mode</span>
          </div>
          <button class="btn btn-outline btn-sm" onclick="API.logout()" title="Log out" style="padding: 0.35rem 0.55rem;">
            🚪
          </button>
        </div>
      </aside>
    `;
  },

  renderTopbar(pageTitle = 'CareerTwin AI') {
    const topbarEl = document.getElementById('topbar-container');
    if (!topbarEl) return;

    topbarEl.innerHTML = `
      <header class="topbar">
        <div class="topbar-left">
          <button class="btn btn-secondary btn-sm mobile-menu-btn" style="display:none;" onclick="Navbar.toggleMobileSidebar()">☰</button>
          <h2>${pageTitle}</h2>
        </div>

        <div class="topbar-right">
          <div class="user-pill" style="display:flex; align-items:center; gap:0.75rem; background:var(--bg-tertiary); padding:0.4rem 0.85rem; border-radius:var(--radius-full); border:1px solid var(--border-color);">
            <div style="width:28px; height:28px; border-radius:50%; background:var(--accent-primary); display:flex; align-items:center; justify-content:center; font-size:0.8rem; font-weight:700;">
              👤
            </div>
            <span class="user-display-name" style="font-size:0.875rem; font-weight:500;">User</span>
          </div>
        </div>
      </header>
    `;
  },

  toggleMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      sidebar.classList.toggle('open');
    }
  },

  init(pageTitle) {
    this.renderSidebar();
    this.renderTopbar(pageTitle);
  },
};

window.Navbar = Navbar;
