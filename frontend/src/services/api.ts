import axios from 'axios';
import {
  MediaItem,
  Transcript,
  TranscriptSegment,
  Bookmark,
  Note,
  SearchResponse,
  User,
} from '../types';

const API_BASE = '/api';

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Set Authorization token if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // Auth
  auth: {
    login: async (email: string, password: string) => {
      const res = await apiClient.post('/auth/login', { email, password });
      return res.data;
    },
    register: async (email: string, password: string, fullName?: string) => {
      const res = await apiClient.post('/auth/register', { email, password, full_name: fullName });
      return res.data;
    },
    getMe: async (): Promise<User> => {
      const res = await apiClient.get('/auth/me');
      return res.data;
    },
  },

  // Media
  media: {
    list: async (params?: { search?: string; source?: string; status?: string }): Promise<MediaItem[]> => {
      const res = await apiClient.get('/media/', { params });
      return res.data;
    },
    get: async (id: number): Promise<MediaItem> => {
      const res = await apiClient.get(`/media/${id}`);
      return res.data;
    },
    getStatus: async (id: number) => {
      const res = await apiClient.get(`/media/${id}/status`);
      return res.data;
    },
    upload: async (file: File, title?: string, language: string = 'en', onProgress?: (pct: number) => void): Promise<MediaItem> => {
      const formData = new FormData();
      formData.append('file', file);
      if (title) formData.append('title', title);
      formData.append('language', language);

      const res = await apiClient.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(pct);
          }
        },
      });
      return res.data;
    },
    submitUrl: async (url: string, title?: string): Promise<MediaItem> => {
      const res = await apiClient.post('/media/url', { url, title });
      return res.data;
    },
    update: async (id: number, data: { title?: string; language?: string }): Promise<MediaItem> => {
      const res = await apiClient.patch(`/media/${id}`, data);
      return res.data;
    },
    reprocess: async (id: number): Promise<MediaItem> => {
      const res = await apiClient.post(`/media/${id}/reprocess`);
      return res.data;
    },
    delete: async (id: number): Promise<void> => {
      await apiClient.delete(`/media/${id}`);
    },
  },

  // Transcripts
  transcripts: {
    get: async (mediaId: number): Promise<Transcript> => {
      const res = await apiClient.get(`/transcripts/${mediaId}`);
      return res.data;
    },
    update: async (mediaId: number, data: { full_text?: string; language?: string }): Promise<Transcript> => {
      const res = await apiClient.patch(`/transcripts/${mediaId}`, data);
      return res.data;
    },
    updateSegment: async (segmentId: number, data: { text: string; speaker?: string | null }): Promise<TranscriptSegment> => {
      const res = await apiClient.patch(`/transcripts/segments/${segmentId}`, data);
      return res.data;
    },
    deleteSegment: async (segmentId: number): Promise<void> => {
      await apiClient.delete(`/transcripts/segments/${segmentId}`);
    },
  },

  // Bookmarks
  bookmarks: {
    list: async (mediaId: number): Promise<Bookmark[]> => {
      const res = await apiClient.get(`/bookmarks/${mediaId}`);
      return res.data;
    },
    create: async (mediaId: number, data: { timestamp: number; label: string; note?: string }): Promise<Bookmark> => {
      const res = await apiClient.post(`/bookmarks/${mediaId}`, data);
      return res.data;
    },
    update: async (bookmarkId: number, data: { label?: string; note?: string }): Promise<Bookmark> => {
      const res = await apiClient.patch(`/bookmarks/${bookmarkId}`, data);
      return res.data;
    },
    delete: async (bookmarkId: number): Promise<void> => {
      await apiClient.delete(`/bookmarks/${bookmarkId}`);
    },
  },

  // Notes
  notes: {
    list: async (mediaId: number): Promise<Note[]> => {
      const res = await apiClient.get(`/notes/${mediaId}`);
      return res.data;
    },
    create: async (mediaId: number, data: { timestamp?: number; content: string }): Promise<Note> => {
      const res = await apiClient.post(`/notes/${mediaId}`, data);
      return res.data;
    },
    update: async (noteId: number, data: { timestamp?: number; content: string }): Promise<Note> => {
      const res = await apiClient.patch(`/notes/${noteId}`, data);
      return res.data;
    },
    delete: async (noteId: number): Promise<void> => {
      await apiClient.delete(`/notes/${noteId}`);
    },
  },

  // Favourites & Pins
  favourites: {
    list: async (): Promise<MediaItem[]> => {
      const res = await apiClient.get('/favourites/');
      return res.data;
    },
    add: async (mediaId: number) => {
      const res = await apiClient.post(`/favourites/${mediaId}`);
      return res.data;
    },
    remove: async (mediaId: number) => {
      await apiClient.delete(`/favourites/${mediaId}`);
    },
  },

  pins: {
    list: async (): Promise<MediaItem[]> => {
      const res = await apiClient.get('/pins/');
      return res.data;
    },
    add: async (mediaId: number) => {
      const res = await apiClient.post(`/pins/${mediaId}`);
      return res.data;
    },
    remove: async (mediaId: number) => {
      await apiClient.delete(`/pins/${mediaId}`);
    },
  },

  // Global Search
  search: {
    query: async (q: string): Promise<SearchResponse> => {
      const res = await apiClient.get('/search/', { params: { q } });
      return res.data;
    },
  },

  // AI Insights
  ai: {
    getFullInsights: async (mediaId: number) => {
      const res = await apiClient.post(`/ai/${mediaId}/insights`);
      return res.data;
    },
    getSummary: async (mediaId: number) => {
      const res = await apiClient.post(`/ai/${mediaId}/summary`);
      return res.data;
    },
    getKeyPoints: async (mediaId: number) => {
      const res = await apiClient.post(`/ai/${mediaId}/key-points`);
      return res.data;
    },
    getKeywords: async (mediaId: number) => {
      const res = await apiClient.post(`/ai/${mediaId}/keywords`);
      return res.data;
    },
    getImportantSections: async (mediaId: number) => {
      const res = await apiClient.post(`/ai/${mediaId}/important-sections`);
      return res.data;
    },
  },

  // Export URLs
  exports: {
    getDownloadUrl: (mediaId: number, format: 'txt' | 'csv' | 'srt' | 'pdf' | 'docx', timestamps = true) => {
      return `${API_BASE}/export/${mediaId}/${format}?timestamps=${timestamps}`;
    },
  },
};
