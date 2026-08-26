/**
 * CareerTwin AI - Authentication & Page Guard
 */

const Auth = {
  isPublicPage() {
    const publicPages = ['/', '/index.html', '/login.html', '/register.html'];
    const currentPath = window.location.pathname;
    return publicPages.includes(currentPath) || currentPath.endsWith('index.html') || currentPath.endsWith('login.html') || currentPath.endsWith('register.html');
  },

  isAuthFormPage() {
    const authPages = ['/login.html', '/register.html'];
    const currentPath = window.location.pathname;
    return authPages.some((p) => currentPath.endsWith(p));
  },

  checkAuth() {
    const token = API.getToken();
    const isPublic = this.isPublicPage();
    const isAuthForm = this.isAuthFormPage();

    if (!token && !isPublic) {
      // User is on private page without token
      window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
      return false;
    }

    if (token && isAuthForm) {
      // User is already logged in and visiting login/register
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
