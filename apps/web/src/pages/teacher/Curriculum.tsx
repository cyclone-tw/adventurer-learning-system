import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Calendar,
  FolderTree,
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  FileQuestion,
} from 'lucide-react';
import { Card, Button } from '../../components/ui';
import TeacherLayout from '../../components/layout/TeacherLayout';
import {
  subjectService,
  academicYearService,
  unitService,
  Subject,
  AcademicYear,
  Unit,
} from '../../services/curriculum';

type Tab = 'subjects' | 'years' | 'units';

const Curriculum = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('subjects');

  // Subjects state
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);

  // Academic Years state
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [yearsLoading, setYearsLoading] = useState(true);

  // Units state
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [unitFilters, setUnitFilters] = useState({
    subjectId: '',
    academicYear: '',
    grade: '',
    semester: '',
  });

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingItem, setEditingItem] = useState<Subject | AcademicYear | Unit | null>(null);
  const [formData, setFormData] = useState<Record<string, string | number>>({});
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Load subjects
  const loadSubjects = async () => {
    setSubjectsLoading(true);
    try {
      const data = await subjectService.list(true);
      setSubjects(data);
    } catch (err) {
      console.error('Failed to load subjects:', err);
    } finally {
      setSubjectsLoading(false);
    }
  };

  // Load academic years
  const loadYears = async () => {
    setYearsLoading(true);
    try {
      const data = await academicYearService.list(true);
      setYears(data);
    } catch (err) {
      console.error('Failed to load academic years:', err);
    } finally {
      setYearsLoading(false);
    }
  };

  // Load units
  const loadUnits = async () => {
    setUnitsLoading(true);
    try {
      const response = await unitService.list({
        subjectId: unitFilters.subjectId || undefined,
        academicYear: unitFilters.academicYear || undefined,
        grade: unitFilters.grade ? Number(unitFilters.grade) : undefined,
        semester: unitFilters.semester ? (unitFilters.semester as '上' | '下') : undefined,
        includeInactive: true,
        limit: 100,
      });
      setUnits(response.data);
    } catch (err) {
      console.error('Failed to load units:', err);
    } finally {
      setUnitsLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
    loadYears();
  }, []);

  useEffect(() => {
    loadUnits();
  }, [unitFilters]);

  // Open create modal
  const openCreateModal = () => {
    setModalMode('create');
    setEditingItem(null);
    setFormError('');

    if (activeTab === 'subjects') {
      setFormData({ name: '', code: '', icon: '📚', order: 0 });
    } else if (activeTab === 'years') {
      setFormData({ year: '' });
    } else {
      setFormData({
        name: '',
        subjectId: '',
        academicYear: '',
        grade: 1,
        semester: '上',
        order: 0,
      });
    }
    setShowModal(true);
  };

  // Open edit modal
  const openEditModal = (item: Subject | AcademicYear | Unit) => {
    setModalMode('edit');
    setEditingItem(item);
    setFormError('');

    if (activeTab === 'subjects') {
      const subject = item as Subject;
      setFormData({
        name: subject.name,
        code: subject.code,
        icon: subject.icon,
        order: subject.order,
      });
    } else if (activeTab === 'years') {
      const year = item as AcademicYear;
      setFormData({ year: year.year });
    } else {
      const unit = item as Unit;
      setFormData({
        name: unit.name,
        subjectId: typeof unit.subjectId === 'string' ? unit.subjectId : unit.subjectId._id,
        academicYear: unit.academicYear,
        grade: unit.grade,
        semester: unit.semester,
        order: unit.order,
      });
    }
    setShowModal(true);
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      if (activeTab === 'subjects') {
        if (modalMode === 'create') {
          await subjectService.create({
            name: formData.name as string,
            code: formData.code as string,
            icon: formData.icon as string,
            order: formData.order as number,
          });
        } else {
          await subjectService.update((editingItem as Subject)._id, {
            name: formData.name as string,
            code: formData.code as string,
            icon: formData.icon as string,
            order: formData.order as number,
          });
        }
        loadSubjects();
      } else if (activeTab === 'years') {
        if (modalMode === 'create') {
          await academicYearService.create({ year: formData.year as string });
        } else {
          await academicYearService.update((editingItem as AcademicYear)._id, {
            year: formData.year as string,
          });
        }
        loadYears();
      } else {
        if (modalMode === 'create') {
          await unitService.create({
            name: formData.name as string,
            subjectId: formData.subjectId as string,
            academicYear: formData.academicYear as string,
            grade: formData.grade as number,
            semester: formData.semester as '上' | '下',
            order: formData.order as number,
          });
        } else {
          await unitService.update((editingItem as Unit)._id, {
            name: formData.name as string,
            subjectId: formData.subjectId as string,
            academicYear: formData.academicYear as string,
            grade: formData.grade as number,
            semester: formData.semester as '上' | '下',
            order: formData.order as number,
          });
        }
        loadUnits();
      }
      setShowModal(false);
    } catch (err: any) {
      setFormError(err.message || '操作失敗');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      if (activeTab === 'subjects') {
        await subjectService.delete(id);
        loadSubjects();
      } else if (activeTab === 'years') {
        await academicYearService.delete(id);
        loadYears();
      } else {
        await unitService.delete(id);
        loadUnits();
      }
      setDeleteConfirm(null);
    } catch (err: any) {
      alert(err.message || '刪除失敗');
    }
  };

  // Render subjects tab
  const renderSubjectsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-gray-600">管理系統中的科目分類</p>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-2" />
          新增科目
        </Button>
      </div>

      {subjectsLoading ? (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mx-auto" />
        </div>
      ) : subjects.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          尚無科目，請新增第一個科目
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject) => (
            <Card key={subject._id} className={`p-4 ${!subject.isActive ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{subject.icon}</span>
                  <div>
                    <h3 className="font-semibold">{subject.name}</h3>
                    <p className="text-sm text-gray-500">代碼: {subject.code}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEditModal(subject)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <Edit className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(subject._id)}
                    className="p-2 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // Render academic years tab
  const renderYearsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-gray-600">管理學年度設定</p>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-2" />
          新增學年度
        </Button>
      </div>

      {yearsLoading ? (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mx-auto" />
        </div>
      ) : years.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          尚無學年度，請新增第一個學年度
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {years.map((year) => (
            <Card key={year._id} className={`p-4 text-center ${!year.isActive ? 'opacity-50' : ''}`}>
              <div className="text-2xl font-bold text-blue-600 mb-2">{year.year}</div>
              <div className="flex justify-center gap-1">
                <button
                  onClick={() => openEditModal(year)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <Edit className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={() => setDeleteConfirm(year._id)}
                  className="p-2 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // Render units tab
  const renderUnitsTab = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <p className="text-gray-600">管理課程單元</p>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-2" />
          新增單元
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <select
            value={unitFilters.subjectId}
            onChange={(e) => setUnitFilters({ ...unitFilters, subjectId: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">全部科目</option>
            {subjects.map((s) => (
              <option key={s._id} value={s._id}>
                {s.icon} {s.name}
              </option>
            ))}
          </select>
          <select
            value={unitFilters.academicYear}
            onChange={(e) => setUnitFilters({ ...unitFilters, academicYear: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">全部學年度</option>
            {years.map((y) => (
              <option key={y._id} value={y.year}>
                {y.year}
              </option>
            ))}
          </select>
          <select
            value={unitFilters.grade}
            onChange={(e) => setUnitFilters({ ...unitFilters, grade: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">全部年級</option>
            {[1, 2, 3, 4, 5, 6].map((g) => (
              <option key={g} value={g}>
                {g} 年級
              </option>
            ))}
          </select>
          <select
            value={unitFilters.semester}
            onChange={(e) => setUnitFilters({ ...unitFilters, semester: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">全部學期</option>
            <option value="上">上學期</option>
            <option value="下">下學期</option>
          </select>
        </div>
      </Card>

      {unitsLoading ? (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mx-auto" />
        </div>
      ) : units.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          {unitFilters.subjectId || unitFilters.academicYear || unitFilters.grade || unitFilters.semester
            ? '沒有符合條件的單元'
            : '尚無單元，請新增第一個單元'}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">單元名稱</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">科目</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">學年/年級</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">排序</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {units.map((unit) => {
                const subject = typeof unit.subjectId === 'object' ? unit.subjectId : null;
                return (
                  <tr
                    key={unit._id}
                    className={`hover:bg-gray-50 cursor-pointer ${!unit.isActive ? 'opacity-50' : ''}`}
                    onClick={() => navigate(`/teacher/curriculum/units/${unit._id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{unit.name}</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {subject ? (
                        <span className="flex items-center gap-1">
                          {subject.icon} {subject.name}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {unit.academicYear}_{unit.grade}{unit.semester}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{unit.order}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(unit);
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                          <Edit className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm(unit._id);
                          }}
                          className="p-2 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );

  // Render modal
  const renderModal = () => {
    if (!showModal) return null;

    const title = {
      subjects: modalMode === 'create' ? '新增科目' : '編輯科目',
      years: modalMode === 'create' ? '新增學年度' : '編輯學年度',
      units: modalMode === 'create' ? '新增單元' : '編輯單元',
    }[activeTab];

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">{title}</h2>
            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {formError}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              {activeTab === 'subjects' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      科目名稱 *
                    </label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      科目代碼 * <span className="text-gray-400">(小寫英文)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.code || ''}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase() })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      pattern="[a-z0-9_]+"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">圖示</label>
                    <input
                      type="text"
                      value={formData.icon || ''}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                    <input
                      type="number"
                      value={formData.order || 0}
                      onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      min={0}
                    />
                  </div>
                </>
              )}

              {activeTab === 'years' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    學年度 * <span className="text-gray-400">(例如: 114)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.year || ''}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
              )}

              {activeTab === 'units' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      單元名稱 *
                    </label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">科目 *</label>
                    <select
                      value={formData.subjectId || ''}
                      onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    >
                      <option value="">請選擇科目</option>
                      {subjects.filter((s) => s.isActive).map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.icon} {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">學年度 *</label>
                      <select
                        value={formData.academicYear || ''}
                        onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        required
                      >
                        <option value="">選擇</option>
                        {years.filter((y) => y.isActive).map((y) => (
                          <option key={y._id} value={y.year}>
                            {y.year}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">年級 *</label>
                      <select
                        value={formData.grade || 1}
                        onChange={(e) => setFormData({ ...formData, grade: Number(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        required
                      >
                        {[1, 2, 3, 4, 5, 6].map((g) => (
                          <option key={g} value={g}>
                            {g} 年級
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">學期 *</label>
                      <select
                        value={formData.semester || '上'}
                        onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        required
                      >
                        <option value="上">上學期</option>
                        <option value="下">下學期</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                    <input
                      type="number"
                      value={formData.order || 0}
                      onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      min={0}
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setShowModal(false)}
                >
                  取消
                </Button>
                <Button type="submit" variant="primary" className="flex-1" loading={formLoading}>
                  {modalMode === 'create' ? '建立' : '更新'}
                </Button>
              </div>
            </form>
          </div>
        </Card>
      </div>
    );
  };

  // Render delete confirmation
  const renderDeleteConfirm = () => {
    if (!deleteConfirm) return null;

    const itemName = {
      subjects: '科目',
      years: '學年度',
      units: '單元',
    }[activeTab];

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-sm">
          <div className="p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">確認刪除{itemName}？</h3>
            <p className="text-gray-500 mb-6">此操作無法復原</p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setDeleteConfirm(null)}>
                取消
              </Button>
              <Button variant="danger" className="flex-1" onClick={() => handleDelete(deleteConfirm)}>
                刪除
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <TeacherLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">課程管理</h1>
          <p className="text-gray-500 mt-1">管理科目、學年度與單元設定</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('subjects')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === 'subjects'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            科目
          </button>
          <button
            onClick={() => setActiveTab('years')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === 'years'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Calendar className="w-4 h-4" />
            學年度
          </button>
          <button
            onClick={() => setActiveTab('units')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === 'units'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            單元
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'subjects' && renderSubjectsTab()}
        {activeTab === 'years' && renderYearsTab()}
        {activeTab === 'units' && renderUnitsTab()}
      </div>

      {renderModal()}
      {renderDeleteConfirm()}
    </TeacherLayout>
  );
};

export default Curriculum;
