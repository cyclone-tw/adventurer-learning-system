import api, { ApiResponse } from './api';
import { Question, QuestionFormData, QuestionFilters, Category, Subject } from '../types/question';

// ============ Categories API ============

export interface SubjectInfo {
  subject: Subject;
  name: string;
  categoryCount: number;
  questionCount: number;
}

export const getSubjects = async (): Promise<SubjectInfo[]> => {
  const response = await api.get<ApiResponse<SubjectInfo[]>>('/categories/subjects');
  return response.data.data;
};

export const getCategories = async (subject?: Subject, includeCount = true): Promise<Category[]> => {
  const params = new URLSearchParams();
  if (subject) params.append('subject', subject);
  if (includeCount) params.append('includeCount', 'true');

  const response = await api.get<ApiResponse<Category[]>>(`/categories?${params.toString()}`);
  return response.data.data;
};

export const createCategory = async (data: {
  subject: Subject;
  name: string;
  description?: string;
  order?: number;
}): Promise<Category> => {
  const response = await api.post<ApiResponse<Category>>('/categories', data);
  return response.data.data;
};

// ============ Questions API ============

export interface QuestionsResponse {
  questions: Question[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const getQuestions = async (filters: QuestionFilters = {}): Promise<QuestionsResponse> => {
  const params = new URLSearchParams();
  // New hierarchy fields
  if (filters.subjectId) params.append('subjectId', filters.subjectId);
  if (filters.unitId) params.append('unitId', filters.unitId);
  // Legacy fields
  if (filters.subject) params.append('subject', filters.subject);
  if (filters.categoryId) params.append('categoryId', filters.categoryId);
  if (filters.difficulty) params.append('difficulty', filters.difficulty);
  if (filters.type) params.append('type', filters.type);
  if (filters.search) params.append('search', filters.search);
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());

  const response = await api.get<ApiResponse<Question[]>>(`/questions?${params.toString()}`);
  return {
    questions: response.data.data,
    pagination: response.data.pagination!,
  };
};

export const getQuestion = async (id: string): Promise<Question> => {
  const response = await api.get<ApiResponse<Question>>(`/questions/${id}`);
  return response.data.data;
};

export const createQuestion = async (data: QuestionFormData): Promise<Question> => {
  const response = await api.post<ApiResponse<Question>>('/questions', data);
  return response.data.data;
};

export const updateQuestion = async (id: string, data: Partial<QuestionFormData>): Promise<Question> => {
  const response = await api.put<ApiResponse<Question>>(`/questions/${id}`, data);
  return response.data.data;
};

export const deleteQuestion = async (id: string): Promise<void> => {
  await api.delete(`/questions/${id}`);
};

// ============ Import/Export API ============

export const downloadTemplate = async (): Promise<Blob> => {
  const response = await api.get('/questions/template', {
    responseType: 'blob',
  });
  return response.data;
};

export interface ImportResult {
  row: number;
  success: boolean;
  error?: string;
  question?: string;
}

export interface ImportResponse {
  summary: {
    total: number;
    success: number;
    failed: number;
  };
  results: ImportResult[];
}

export const importQuestions = async (file: File): Promise<ImportResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<ApiResponse<ImportResponse>>('/questions/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.data;
};

// ============ Upload API ============

export interface UploadResult {
  type: 'image' | 'audio' | 'video';
  url: string;
  publicId: string;
  format: string;
  width?: number;
  height?: number;
  duration?: number;
  bytes: number;
}

export const uploadMedia = async (file: File): Promise<UploadResult> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<ApiResponse<UploadResult>>('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.data;
};

export const deleteMedia = async (publicId: string, resourceType: 'image' | 'video' = 'image'): Promise<void> => {
  await api.delete(`/upload/${encodeURIComponent(publicId)}?resourceType=${resourceType}`);
};

export default {
  getSubjects,
  getCategories,
  createCategory,
  getQuestions,
  getQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  downloadTemplate,
  importQuestions,
  uploadMedia,
  deleteMedia,
};
