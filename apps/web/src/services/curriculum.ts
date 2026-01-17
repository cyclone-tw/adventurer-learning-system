import api, { ApiResponse } from './api';

// Types
export interface Subject {
  _id: string;
  name: string;
  code: string;
  icon: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicYear {
  _id: string;
  year: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Unit {
  _id: string;
  name: string;
  subjectId: Subject | string;
  academicYear: string;
  grade: number;
  semester: '上' | '下';
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UnitGrouped {
  subject: {
    _id: string;
    name: string;
    code: string;
    icon: string;
  };
  academicYear: string;
  grade: number;
  semester: '上' | '下';
  gradeLabel: string;
  units: {
    _id: string;
    name: string;
    order: number;
  }[];
}

export interface CreateSubjectData {
  name: string;
  code: string;
  icon?: string;
  order?: number;
}

export interface UpdateSubjectData {
  name?: string;
  code?: string;
  icon?: string;
  order?: number;
  isActive?: boolean;
}

export interface CreateAcademicYearData {
  year: string;
}

export interface UpdateAcademicYearData {
  year?: string;
  isActive?: boolean;
}

export interface CreateUnitData {
  name: string;
  subjectId: string;
  academicYear: string;
  grade: number;
  semester: '上' | '下';
  order?: number;
}

export interface UpdateUnitData {
  name?: string;
  subjectId?: string;
  academicYear?: string;
  grade?: number;
  semester?: '上' | '下';
  order?: number;
  isActive?: boolean;
}

export interface ListUnitsParams {
  subjectId?: string;
  academicYear?: string;
  grade?: number;
  semester?: '上' | '下';
  includeInactive?: boolean;
  page?: number;
  limit?: number;
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

// Subject API
export const subjectService = {
  async list(includeInactive = false): Promise<Subject[]> {
    const response = await api.get<ApiResponse<Subject[]>>('/subjects', {
      params: includeInactive ? { includeInactive: 'true' } : {},
    });
    return response.data.data;
  },

  async get(id: string): Promise<Subject> {
    const response = await api.get<ApiResponse<Subject>>(`/subjects/${id}`);
    return response.data.data;
  },

  async create(data: CreateSubjectData): Promise<Subject> {
    const response = await api.post<ApiResponse<Subject>>('/subjects', data);
    return response.data.data;
  },

  async update(id: string, data: UpdateSubjectData): Promise<Subject> {
    const response = await api.patch<ApiResponse<Subject>>(`/subjects/${id}`, data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/subjects/${id}`);
  },
};

// Academic Year API
export const academicYearService = {
  async list(includeInactive = false): Promise<AcademicYear[]> {
    const response = await api.get<ApiResponse<AcademicYear[]>>('/academic-years', {
      params: includeInactive ? { includeInactive: 'true' } : {},
    });
    return response.data.data;
  },

  async get(id: string): Promise<AcademicYear> {
    const response = await api.get<ApiResponse<AcademicYear>>(`/academic-years/${id}`);
    return response.data.data;
  },

  async create(data: CreateAcademicYearData): Promise<AcademicYear> {
    const response = await api.post<ApiResponse<AcademicYear>>('/academic-years', data);
    return response.data.data;
  },

  async update(id: string, data: UpdateAcademicYearData): Promise<AcademicYear> {
    const response = await api.patch<ApiResponse<AcademicYear>>(`/academic-years/${id}`, data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/academic-years/${id}`);
  },
};

// Unit API
export const unitService = {
  async list(params: ListUnitsParams = {}): Promise<PaginatedResponse<Unit>> {
    const response = await api.get<ApiResponse<Unit[]> & { pagination: PaginatedResponse<Unit>['pagination'] }>('/units', { params });
    return {
      data: response.data.data,
      pagination: response.data.pagination!,
    };
  },

  async listGrouped(): Promise<UnitGrouped[]> {
    const response = await api.get<ApiResponse<UnitGrouped[]>>('/units/grouped');
    return response.data.data;
  },

  async get(id: string): Promise<Unit> {
    const response = await api.get<ApiResponse<Unit>>(`/units/${id}`);
    return response.data.data;
  },

  async create(data: CreateUnitData): Promise<Unit> {
    const response = await api.post<ApiResponse<Unit>>('/units', data);
    return response.data.data;
  },

  async update(id: string, data: UpdateUnitData): Promise<Unit> {
    const response = await api.patch<ApiResponse<Unit>>(`/units/${id}`, data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/units/${id}`);
  },
};

// Combined curriculum service for convenient access
export const curriculumService = {
  // Subject methods
  getSubjects: subjectService.list,
  getSubject: subjectService.get,
  createSubject: subjectService.create,
  updateSubject: subjectService.update,
  deleteSubject: subjectService.delete,

  // Academic Year methods
  getAcademicYears: academicYearService.list,
  getAcademicYear: academicYearService.get,
  createAcademicYear: academicYearService.create,
  updateAcademicYear: academicYearService.update,
  deleteAcademicYear: academicYearService.delete,

  // Unit methods
  getUnits: async (params: { subjectId?: string; academicYear?: string; grade?: number; semester?: '上' | '下' } = {}) => {
    const result = await unitService.list(params);
    return result.data;
  },
  getUnitsGrouped: unitService.listGrouped,
  getUnit: unitService.get,
  createUnit: unitService.create,
  updateUnit: unitService.update,
  deleteUnit: unitService.delete,
};

export default {
  subject: subjectService,
  academicYear: academicYearService,
  unit: unitService,
};
