const DEV_URL  = 'https://test-milk-app-api.vercel.app';
const PROD_URL = 'https://milk-app-api.vercel.app';

export const BASE_URL = __DEV__ ? DEV_URL : PROD_URL;
export const ENV = __DEV__ ? 'development' : 'production';
export const API_TIMEOUT = 10000;