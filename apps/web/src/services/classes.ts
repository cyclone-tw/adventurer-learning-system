import api, { ApiResponse } from './api';

// Types
export interface ClassData {
  _id: string;
  name: string;
  description?: string;
  teacherId: {
    _id: string;
    name: string;
    email?: string;
  };
  academicYearId?: {
    _id: string;
    name: string;
  };
  inviteCode: string;
  students: StudentInClass[];
  maxStudents: number;
  studentCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudentInClass {
  _id: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  studentProfile?: {
    level: number;
    exp: number;
  };
}

export interface ClassListItem {
  _id: string;
  name: string;
  description?: string;
  inviteCode: string;
  studentCount: number;
  maxStudents: number;
  isActive: boolean;
  academicYearId?: {
    _id: string;
    name: string;
  };
  createdAt: string;
}

export interface CreateClassInput {
  name: string;
  description?: string;
  academicYearId?: string;
  maxStudents?: number;
}

export interface UpdateClassInput {
  name?: string;
  description?: string;
  maxStudents?: number;
  isActive?: boolean;
}

export interface MyClassItem {
  _id: string;
  name: string;
  description?: string;
  teacherId: {
    _id: string;
    name: string;
    email?: string;
  };
  academicYearId?: {
    _id: string;
    name: string;
  };
  studentCount: number;
}

// Class service
export const classService = {
  // Teacher: List classes
  async listClasses(
    page = 1,
    limit = 20,
    showInactive = false
  ): Promise<{
    classes: ClassListItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (showInactive) {
      params.append('showInactive', 'true');
    }

    const response = await api.get<ApiResponse<ClassListItem[]>>(`/classes?${params}`);
    return {
      classes: response.data.data,
      pagination: response.data.pagination!,
    };
  },

  // Teacher: Get class details
  async getClass(classId: string): Promise<ClassData> {
    const response = await api.get<ApiResponse<ClassData>>(`/classes/${classId}`);
    return response.data.data;
  },

  // Teacher: Create class
  async createClass(input: CreateClassInput): Promise<ClassData> {
    const response = await api.post<ApiResponse<ClassData>>('/classes', input);
    return response.data.data;
  },

  // Teacher: Update class
  async updateClass(classId: string, input: UpdateClassInput): Promise<ClassData> {
    const response = await api.patch<ApiResponse<ClassData>>(`/classes/${classId}`, input);
    return response.data.data;
  },

  // Teacher: Delete class
  async deleteClass(classId: string): Promise<void> {
    await api.delete(`/classes/${classId}`);
  },

  // Teacher: Regenerate invite code
  async regenerateInviteCode(classId: string): Promise<string> {
    const response = await api.post<ApiResponse<{ inviteCode: string }>>(
      `/classes/${classId}/regenerate-code`
    );
    return response.data.data.inviteCode;
  },

  // Teacher: Remove student from class
  async removeStudent(classId: string, studentId: string): Promise<void> {
    await api.delete(`/classes/${classId}/students/${studentId}`);
  },

  // Teacher: Add multiple students to class (batch)
  async addStudents(
    classId: string,
    studentIds: string[]
  ): Promise<{ message: string; added: number; skipped: number; total: number }> {
    const response = await api.post<
      ApiResponse<{ message: string; added: number; skipped: number; total: number }>
    >(`/classes/${classId}/students`, { studentIds });
    return response.data.data;
  },

  // Student: Get my classes
  async getMyClasses(): Promise<MyClassItem[]> {
    const response = await api.get<ApiResponse<MyClassItem[]>>('/classes/my');
    return response.data.data;
  },

  // Student: Join class
  async joinClass(inviteCode: string): Promise<{ message: string; class: { name: string } }> {
    const response = await api.post<ApiResponse<{ message: string; class: { name: string } }>>(
      '/classes/join',
      { inviteCode }
    );
    return response.data.data;
  },

  // Student: Leave class
  async leaveClass(classId: string): Promise<void> {
    await api.post(`/classes/${classId}/leave`);
  },
};

export default classService;
