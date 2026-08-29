/**
 * CareerTwin AI - Authentication & Page Guard
 */

const Auth = {
  getNormalizedPath() {
    let path = window.location.pathname.toLowerCase().trim();
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    return path;
  },

  isPublicPage() {
    const path = this.getNormalizedPath();
    const publicPaths = [
      '',
      '/',
      '/index',
      '/index.html',
      '/login',
      '/login.html',
      '/register',
      '/register.html',
    ];
    return (
      publicPaths.includes(path) ||
      path.endsWith('/index') ||
      path.endsWith('/index.html') ||
      path.endsWith('/login') ||
      path.endsWith('/login.html') ||
      path.endsWith('/register') ||
      path.endsWith('/register.html')
    );
  },

  isAuthFormPage() {
    const path = this.getNormalizedPath();
    const authPaths = ['/login', '/login.html', '/register', '/register.html'];
    return (
      authPaths.includes(path) ||
      path.endsWith('/login') ||
      path.endsWith('/login.html') ||
      path.endsWith('/register') ||
      path.endsWith('/register.html')
    );
  },

  checkAuth() {
    const token = API.getToken();
    const isPublic = this.isPublicPage();
    const isAuthForm = this.isAuthFormPage();

    if (!token && !isPublic) {
      const currentPath = window.location.pathname;
      if (!currentPath.toLowerCase().includes('login') && !currentPath.toLowerCase().includes('register')) {
        window.location.href = `/login.html?redirect=${encodeURIComponent(currentPath)}`;
      }
      return false;
    }

    if (token && isAuthForm) {
      window.location.href = '/dashboard.html';
      return true;
    }

    return true;
  },

  async fetchCurrentUser() {
    try {
      const data = await API.get('/auth/me');
      if (data.success && data.user) {
        API.setUser(data.user);
        this.updateUserUI(data.user);
        return data.user;
      }
    } catch (err) {
      console.warn('Failed to fetch user session:', err.message);
    }
    return null;
  },

  updateUserUI(user) {
    if (!user) return;
    const nameEls = document.querySelectorAll('.user-display-name');
    nameEls.forEach((el) => {
      el.textContent = user.name || 'User';
    });

    const emailEls = document.querySelectorAll('.user-display-email');
    emailEls.forEach((el) => {
      el.textContent = user.email || '';
    });

    const modeEls = document.querySelectorAll('.user-privacy-mode-badge');
    modeEls.forEach((el) => {
      const mode = user.privacySettings?.defaultPrivacyMode || 'privacy';
      el.textContent = mode === 'privacy' ? '🛡️ Privacy Mode' : '📹 Replay Mode';
      el.className = `badge ${mode === 'privacy' ? 'badge-cyan' : 'badge-amber'} user-privacy-mode-badge`;
    });
  },

  init() {
    this.checkAuth();
    if (API.getToken()) {
      this.fetchCurrentUser();
    }
  },
};

// Run check on DOM load
document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
});

window.Auth = Auth;
