import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  register: async (data) => {
    const response = await api.post('/auth/register', data);
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  login: async (data) => {
    const response = await api.post('/auth/login', data);
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export const templateService = {
  getAll: async () => {
    const response = await api.get('/templates');
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/templates/${id}`);
    return response.data;
  },

  create: async (formData) => {
    const response = await api.post('/templates', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/templates/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/templates/${id}`);
    return response.data;
  },

  getImage: (id) => `${API}/templates/${id}/image`,
};

export const certificateService = {
  getAll: async (skip = 0, limit = 100) => {
    const response = await api.get(`/certificates?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/certificates/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/certificates', data);
    return response.data;
  },

  createBatch: async (templateId, eventName, courseName, file) => {
    const formData = new FormData();
    formData.append('template_id', templateId);
    if (eventName) formData.append('event_name', eventName);
    if (courseName) formData.append('course_name', courseName);
    formData.append('file', file);

    const response = await api.post('/certificates/batch', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  download: (id) => `${API}/certificates/${id}/download`,
  
  downloadBatchPdf: async (certificateIds) => {
    const response = await api.post('/certificates/batch-pdf', certificateIds, {
      responseType: 'blob',
    });
    return response.data;
  },
  
  verify: async (code) => {
    const response = await axios.get(`${API}/verify/${code}`);
    return response.data;
  },
};

export const statsService = {
  get: async () => {
    const response = await api.get('/stats');
    return response.data;
  },
};

export const userService = {
  getAll: async () => {
    const response = await api.get('/users');
    return response.data;
  },
};

export default api;
