// ============================================
// Project: FORGE - Universal MCP Tool Server
// Author: Telvin Crasta | CC BY-NC 4.0
// ============================================

import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const STORAGE_KEY = 'forge.apiKey';

export const getApiKey = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
};

export const setApiKey = (key) => {
  try {
    if (key) window.localStorage.setItem(STORAGE_KEY, key);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* no-op */
  }
};

const client = axios.create({
  baseURL: BASE,
  timeout: 30000,
});

client.interceptors.request.use((config) => {
  const key = getApiKey();
  if (key) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${key}`;
  }
  return config;
});

export const getTools = async () => (await client.get('/tools')).data;
export const getStats = async () => (await client.get('/stats')).data;
export const getCalls = async (limit = 50) =>
  (await client.get('/calls', { params: { limit } })).data;
export const callTool = async (name, params) =>
  (await client.post(`/call/${encodeURIComponent(name)}`, params || {})).data;
export const getHealth = async () => (await client.get('/health')).data;

export const API_BASE = BASE;
