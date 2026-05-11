import axios from 'axios';

export const getBackendApiUrl = (path) => {
  const envUrl = process.env.REACT_APP_API_URL || '';
  const axiosBaseUrl = axios.defaults.baseURL || '';
  const baseUrl = envUrl || axiosBaseUrl || window.location.origin;
  const normalizedBase = baseUrl.replace(/\/$/, '').replace(/\/api$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};
