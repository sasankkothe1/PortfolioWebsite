import axios from 'axios';

// In local dev: VITE_API_URL is not set, so requests go to /api
// which Vite proxies to the backend container.
// In production: VITE_API_URL is the Render backend URL
// (e.g. https://portfolio-backend.onrender.com), so requests go there directly.
export const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const client = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

export default client;
