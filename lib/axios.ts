import axios from "axios";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const api = axios.create({
  baseURL: "/api",
});
