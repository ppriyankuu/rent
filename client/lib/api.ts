import axios from "axios";

// Extend axios config to include skipAuthRedirect option
declare module "axios" {
  interface AxiosRequestConfig {
    skipAuthRedirect?: boolean;
  }
}

const api = axios.create({
  // baseURL: process.env.NEXT_PUBLIC_API_URL || "https://rent.ppriyankuu.workers.dev",
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787",
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 responses globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login") &&
      // Don't redirect for optional API calls (e.g., public pages fetching settings)
      !error.config?.skipAuthRedirect
    ) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
