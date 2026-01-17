import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  UserPlus,
  Search,
  Filter,
  Trash2,
  Edit,
  Shield,
  GraduationCap,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, Button } from '../../components/ui';
import TeacherLayout from '../../components/layout/TeacherLayout';
import adminService, { User, AdminStats } from '../../services/admin';

// Role badge component
const RoleBadge = ({ role }: { role: string }) => {
  const config = {
    admin: { label: '管理員', color: 'bg-red-100 text-red-700' },
    teacher: { label: '教師', color: 'bg-blue-100 text-blue-700' },
    student: { label: '學生', color: 'bg-green-100 text-green-700' },
  }[role] || { label: role, color: 'bg-gray-100 text-gray-700' };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};

const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state for create/edit
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    role: 'teacher' as 'student' | 'teacher' | 'admin',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Load data
  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [usersResponse, statsResponse] = await Promise.all([
        adminService.listUsers({
          page,
          limit: 10,
          role: roleFilter ? (roleFilter as 'student' | 'teacher' | 'admin') : undefined,
          search: search || undefined,
        }),
        adminService.getStats(),
      ]);
      setUsers(usersResponse.data);
      setTotalPages(usersResponse.pagination.totalPages);
      setStats(statsResponse);
    } catch (err) {
      setError('載入資料失敗');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, roleFilter]);

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Create user
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      await adminService.createUser(formData);
      setShowCreateModal(false);
      setFormData({ email: '', password: '', displayName: '', role: 'teacher' });
      loadData();
    } catch (err: any) {
      setFormError(err.message || '建立使用者失敗');
    } finally {
      setFormLoading(false);
    }
  };

  // Update user
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormLoading(true);
    setFormError('');
    try {
      await adminService.updateUser(selectedUser._id, {
        displayName: formData.displayName,
        role: formData.role,
      });
      setShowEditModal(false);
      setSelectedUser(null);
      loadData();
    } catch (err: any) {
      setFormError(err.message || '更新使用者失敗');
    } finally {
      setFormLoading(false);
    }
  };

  // Delete user
  const handleDelete = async (id: string) => {
    try {
      await adminService.deleteUser(id);
      setDeleteConfirm(null);
      loadData();
    } catch (err: any) {
      alert(err.message || '刪除使用者失敗');
    }
  };

  // Open edit modal
  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: '',
      displayName: user.displayName,
      role: user.role,
    });
    setFormError('');
    setShowEditModal(true);
  };

  return (
    <TeacherLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">使用者管理</h1>
            <p className="text-gray-500 mt-1">管理系統中的所有使用者</p>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              setFormData({ email: '', password: '', displayName: '', role: 'teacher' });
              setFormError('');
              setShowCreateModal(true);
            }}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            新增使用者
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 text-center">
              <div className="text-3xl font-bold text-gray-800">{stats.totalUsers}</div>
              <div className="text-sm text-gray-500">總使用者</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{stats.totalStudents}</div>
              <div className="text-sm text-gray-500">學生</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{stats.totalTeachers}</div>
              <div className="text-sm text-gray-500">教師</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-3xl font-bold text-red-600">{stats.totalAdmins}</div>
              <div className="text-sm text-gray-500">管理員</div>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜尋 Email 或名稱..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">全部角色</option>
                <option value="student">學生</option>
                <option value="teacher">教師</option>
                <option value="admin">管理員</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Users Table */}
        <Card className="overflow-hidden">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 text-center">{error}</div>
          )}

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mx-auto mb-4" />
              <p className="text-gray-500">載入中...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              沒有找到符合條件的使用者
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                        使用者
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                        角色
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                        登入方式
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                        註冊日期
                      </th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                              {user.avatarUrl ? (
                                <img
                                  src={user.avatarUrl}
                                  alt={user.displayName}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                user.displayName[0]
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-gray-800">
                                {user.displayName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <RoleBadge role={user.role} />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {user.googleId ? (
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path
                                  fill="#4285F4"
                                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                  fill="#34A853"
                                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                  fill="#FBBC05"
                                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                />
                                <path
                                  fill="#EA4335"
                                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                              </svg>
                              Google
                            </span>
                          ) : (
                            '密碼'
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(user.createdAt).toLocaleDateString('zh-TW')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(user)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="編輯"
                            >
                              <Edit className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(user._id)}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="刪除"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 p-4 border-t border-gray-200">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm text-gray-600">
                    第 {page} / {totalPages} 頁
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">新增使用者</h2>
              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {formError}
                </div>
              )}
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    電子郵件 *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    顯示名稱 *
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) =>
                      setFormData({ ...formData, displayName: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    密碼（選填，可使用 Google 登入）
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="至少 6 個字元"
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    角色 *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        role: e.target.value as 'student' | 'teacher' | 'admin',
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="student">學生</option>
                    <option value="teacher">教師</option>
                    <option value="admin">管理員</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setShowCreateModal(false)}
                  >
                    取消
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1"
                    loading={formLoading}
                  >
                    建立
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">編輯使用者</h2>
              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {formError}
                </div>
              )}
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    電子郵件
                  </label>
                  <input
                    type="email"
                    value={selectedUser.email}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    顯示名稱 *
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) =>
                      setFormData({ ...formData, displayName: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    角色 *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        role: e.target.value as 'student' | 'teacher' | 'admin',
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="student">學生</option>
                    <option value="teacher">教師</option>
                    <option value="admin">管理員</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedUser(null);
                    }}
                  >
                    取消
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1"
                    loading={formLoading}
                  >
                    更新
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">
                確認刪除使用者？
              </h3>
              <p className="text-gray-500 mb-6">此操作無法復原</p>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setDeleteConfirm(null)}
                >
                  取消
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={() => handleDelete(deleteConfirm)}
                >
                  刪除
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </TeacherLayout>
  );
};

export default AdminUsers;
