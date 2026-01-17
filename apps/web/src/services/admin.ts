import api, { ApiResponse } from './api';

export interface User {
  _id: string;
  email: string;
  displayName: string;
  role: 'student' | 'teacher' | 'admin';
  googleId?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
  studentProfile?: {
    level: number;
    exp: number;
    gold: number;
  };
  teacherProfile?: {
    school?: string;
    classIds: string[];
  };
}

export interface AdminStats {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalAdmins: number;
  recentUsers: Pick<User, '_id' | 'displayName' | 'email' | 'role' | 'createdAt'>[];
}

export interface CreateUserData {
  email: string;
  password?: string;
  displayName: string;
  role: 'student' | 'teacher' | 'admin';
}

export interface UpdateUserData {
  displayName?: string;
  role?: 'student' | 'teacher' | 'admin';
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
  role?: 'student' | 'teacher' | 'admin';
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const adminService = {
  // Get dashboard statistics
  async getStats(): Promise<AdminStats> {
    const response = await api.get<ApiResponse<AdminStats>>('/admin/stats');
    return response.data.data;
  },

  // List users with pagination
  async listUsers(params: ListUsersParams = {}): Promise<PaginatedResponse<User>> {
    const response = await api.get<ApiResponse<User[]> & { pagination: PaginatedResponse<User>['pagination'] }>('/admin/users', { params });
    return {
      data: response.data.data,
      pagination: response.data.pagination!,
    };
  },

  // Get single user
  async getUser(id: string): Promise<User> {
    const response = await api.get<ApiResponse<User>>(`/admin/users/${id}`);
    return response.data.data;
  },

  // Create new user
  async createUser(data: CreateUserData): Promise<User> {
    const response = await api.post<ApiResponse<User>>('/admin/users', data);
    return response.data.data;
  },

  // Update user
  async updateUser(id: string, data: UpdateUserData): Promise<User> {
    const response = await api.patch<ApiResponse<User>>(`/admin/users/${id}`, data);
    return response.data.data;
  },

  // Delete user
  async deleteUser(id: string): Promise<void> {
    await api.delete(`/admin/users/${id}`);
  },
};

export default adminService;
