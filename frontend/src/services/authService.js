import api from './api';

class AuthService {
  async register(username, email, password) {
    try {
      const response = await api.post('/auth/register/', {
        username,
        email,
        password,
        password2: password,
      }, { auth: false });

      if (response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
      }

      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async login(email, password) {
    try {
      const response = await api.post('/auth/login/', {
        email,
        password,
      }, { auth: false });

      if (response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('refresh', response.refresh);
        localStorage.setItem('user', JSON.stringify(response.user));
      }

      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async logout() {
    try {
      const refresh = localStorage.getItem('refresh');
      if (refresh) {
        await api.post('/auth/logout/', { refresh });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refresh');
      localStorage.removeItem('user');
    }
  }

  async refreshToken() {
    try {
      const refresh = localStorage.getItem('refresh');
      if (!refresh) {
        throw new Error('No refresh token');
      }

      const response = await api.post('/auth/token/refresh/', {
        refresh,
      }, { auth: false });

      localStorage.setItem('token', response.access);
      return { success: true, token: response.access };
    } catch (error) {
      this.logout();
      return { success: false, error: error.message };
    }
  }

  async getCurrentUser() {
    try {
      const response = await api.get('/auth/me/');
      localStorage.setItem('user', JSON.stringify(response));
      return { success: true, user: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async updateProfile(data) {
    try {
      const response = await api.patch('/auth/profile/update/', data);
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = { ...currentUser, ...response };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return { success: true, user: updatedUser };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async changePassword(oldPassword, newPassword) {
    try {
      await api.post('/auth/password/change/', {
        old_password: oldPassword,
        new_password: newPassword,
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getToken() {
    return localStorage.getItem('token');
  }

  getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated() {
    return !!this.getToken();
  }

  async googleLogin(googleToken) {
    try {
      const response = await api.post('/auth/google/', {
        token: googleToken,
      }, { auth: false });

      if (response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('refresh', response.refresh);
        localStorage.setItem('user', JSON.stringify(response.user));
      }

      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new AuthService();