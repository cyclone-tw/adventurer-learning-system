import api, { ApiResponse } from './api';

export interface User {
  _id: string;
  email: string;
  displayName: string;
  role: 'student' | 'teacher' | 'admin';
  studentProfile?: {
    level: number;
    exp: number;
    expToNextLevel: number;
    gold: number;
    stats: Record<string, number>;
  };
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface RegisterData {
  email: string;
  password: string;
  displayName: string;
  role: 'student' | 'teacher';
  classJoinCode?: string;
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await api.post<ApiResponse<LoginResponse>>('/auth/login', {
      email,
      password,
    });
    return response.data.data;
  },

  async register(data: RegisterData): Promise<LoginResponse> {
    const response = await api.post<ApiResponse<LoginResponse>>('/auth/register', data);
    return response.data.data;
  },

  async getMe(): Promise<User> {
    const response = await api.get<ApiResponse<User>>('/auth/me');
    return response.data.data;
  },

  logout(): void {
    localStorage.removeItem('token');
  },
};

export default authService;
