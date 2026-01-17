import { useState, useEffect } from 'react';
import {
  Megaphone,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Pin,
  Calendar,
  Percent,
  Tag,
  X,
  Gift,
  Clock,
} from 'lucide-react';
import { Card, Button } from '../../components/ui';
import TeacherLayout from '../../components/layout/TeacherLayout';
import {
  announcementService,
  Announcement,
  AnnouncementType,
  DiscountConfig,
  ANNOUNCEMENT_TYPE_NAMES,
  ANNOUNCEMENT_TYPE_COLORS,
  DISCOUNT_TYPE_NAMES,
} from '../../services/announcements';
import { itemService, Item } from '../../services/items';

const EMOJI_OPTIONS = ['📢', '🎉', '🎊', '🔔', '⭐', '🎁', '💰', '🛒', '🌟', '🎯', '🏆', '❤️'];

const Announcements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | AnnouncementType>('all');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'info' as AnnouncementType,
    icon: '📢',
    startDate: '',
    endDate: '',
    isPinned: false,
    showInShop: false,
    enableDiscount: false,
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 20,
    discountItemIds: [] as string[],
  });

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [announcementsData, itemsData] = await Promise.all([
        announcementService.list({ includeInactive: true }),
        itemService.list(),
      ]);
      setAnnouncements(announcementsData);
      setItems(itemsData.filter(i => i.isActive));
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingAnnouncement(null);
    setFormData({
      title: '',
      content: '',
      type: 'info',
      icon: '📢',
      startDate: '',
      endDate: '',
      isPinned: false,
      showInShop: false,
      enableDiscount: false,
      discountType: 'percentage',
      discountValue: 20,
      discountItemIds: [],
    });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      icon: announcement.icon,
      startDate: announcement.startDate ? announcement.startDate.slice(0, 16) : '',
      endDate: announcement.endDate ? announcement.endDate.slice(0, 16) : '',
      isPinned: announcement.isPinned,
      showInShop: announcement.showInShop,
      enableDiscount: !!announcement.discount,
      discountType: announcement.discount?.type || 'percentage',
      discountValue: announcement.discount?.value || 20,
      discountItemIds: announcement.discount?.itemIds || [],
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      const discount: DiscountConfig | undefined = formData.enableDiscount
        ? {
            type: formData.discountType,
            value: formData.discountValue,
            itemIds: formData.discountItemIds.length > 0 ? formData.discountItemIds : undefined,
          }
        : undefined;

      const data = {
        title: formData.title,
        content: formData.content,
        type: formData.type,
        icon: formData.icon,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        isPinned: formData.isPinned,
        showInShop: formData.showInShop,
        discount,
      };

      if (editingAnnouncement) {
        await announcementService.update(editingAnnouncement._id, data);
      } else {
        await announcementService.create(data);
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || '操作失敗');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await announcementService.delete(id);
      setDeleteConfirm(null);
      loadData();
    } catch (err: any) {
      alert(err.message || '刪除失敗');
    }
  };

  const handleToggleActive = async (announcement: Announcement) => {
    try {
      await announcementService.update(announcement._id, { isActive: !announcement.isActive });
      loadData();
    } catch (err) {
      console.error('Failed to toggle announcement:', err);
    }
  };

  const handleTogglePin = async (announcement: Announcement) => {
    try {
      await announcementService.update(announcement._id, { isPinned: !announcement.isPinned });
      loadData();
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  };

  const filteredAnnouncements = announcements.filter((a) => {
    if (filter === 'all') return true;
    return a.type === filter;
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <TeacherLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">公告管理</h1>
            <p className="text-gray-500 mt-1">發布公告、活動和促銷折扣</p>
          </div>
          <Button onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-2" />
            新增公告
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {[
            { value: 'all', label: '全部' },
            { value: 'info', label: '一般公告' },
            { value: 'event', label: '活動' },
            { value: 'promotion', label: '促銷折扣' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value as typeof filter)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === f.value
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Announcements List */}
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mx-auto" />
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <Card className="p-12 text-center">
            <Megaphone className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">尚無公告</h3>
            <p className="text-gray-500 mb-4">建立第一則公告吧！</p>
            <Button onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              新增公告
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredAnnouncements.map((announcement) => {
              const typeColor = ANNOUNCEMENT_TYPE_COLORS[announcement.type];
              const isExpired = announcement.endDate && new Date(announcement.endDate) < new Date();
              const isUpcoming = announcement.startDate && new Date(announcement.startDate) > new Date();

              return (
                <Card
                  key={announcement._id}
                  className={`p-4 ${!announcement.isActive ? 'opacity-60 bg-gray-50' : ''}`}
                >
                  <div className="flex gap-4">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">
                      {announcement.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {announcement.isPinned && (
                          <Pin className="w-4 h-4 text-orange-500" />
                        )}
                        <h3 className="font-bold text-gray-900">{announcement.title}</h3>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${typeColor.bg} ${typeColor.text}`}>
                          {ANNOUNCEMENT_TYPE_NAMES[announcement.type]}
                        </span>
                        {!announcement.isActive && (
                          <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
                            已下架
                          </span>
                        )}
                        {isExpired && announcement.isActive && (
                          <span className="px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded">
                            已過期
                          </span>
                        )}
                        {isUpcoming && announcement.isActive && (
                          <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-600 rounded">
                            尚未開始
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {announcement.content}
                      </p>

                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        {(announcement.startDate || announcement.endDate) && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(announcement.startDate)} ~ {formatDate(announcement.endDate)}
                          </span>
                        )}
                        {announcement.discount && (
                          <span className="flex items-center gap-1 text-amber-600">
                            <Percent className="w-3 h-3" />
                            {announcement.discount.type === 'percentage'
                              ? `${announcement.discount.value}% 折扣`
                              : `減 ${announcement.discount.value} 金幣`}
                            {announcement.discount.itemIds?.length
                              ? ` (${announcement.discount.itemIds.length} 件商品)`
                              : ' (全部商品)'}
                          </span>
                        )}
                        {announcement.showInShop && (
                          <span className="flex items-center gap-1 text-green-600">
                            <Tag className="w-3 h-3" />
                            顯示於商店
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-start gap-1">
                      <button
                        onClick={() => handleTogglePin(announcement)}
                        className={`p-2 rounded-lg ${announcement.isPinned ? 'bg-orange-50 text-orange-500' : 'hover:bg-gray-100 text-gray-400'}`}
                        title={announcement.isPinned ? '取消置頂' : '置頂'}
                      >
                        <Pin className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(announcement)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title={announcement.isActive ? '下架' : '上架'}
                      >
                        {announcement.isActive ? (
                          <Eye className="w-4 h-4 text-green-600" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      <button
                        onClick={() => openEditModal(announcement)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <Edit className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(announcement._id)}
                        className="p-2 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                {editingAnnouncement ? '編輯公告' : '新增公告'}
              </h2>

              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Basic Info */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    標題 *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    內容 *
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    rows={4}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">類型</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as AnnouncementType })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      {Object.entries(ANNOUNCEMENT_TYPE_NAMES).map(([key, name]) => (
                        <option key={key} value={key}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">圖示</label>
                    <div className="flex flex-wrap gap-1">
                      {EMOJI_OPTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setFormData({ ...formData, icon: emoji })}
                          className={`w-8 h-8 rounded border text-lg flex items-center justify-center ${
                            formData.icon === emoji
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-blue-300'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Date Range for Events/Promotions */}
                {(formData.type === 'event' || formData.type === 'promotion') && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Clock className="w-4 h-4 inline mr-1" />
                        開始時間
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        結束時間
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                )}

                {/* Discount Settings for Promotions */}
                {formData.type === 'promotion' && (
                  <div className="p-4 bg-amber-50 rounded-lg space-y-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="enableDiscount"
                        checked={formData.enableDiscount}
                        onChange={(e) => setFormData({ ...formData, enableDiscount: e.target.checked })}
                        className="w-4 h-4 text-amber-600 rounded"
                      />
                      <label htmlFor="enableDiscount" className="font-medium text-amber-800">
                        <Gift className="w-4 h-4 inline mr-1" />
                        啟用商品折扣
                      </label>
                    </div>

                    {formData.enableDiscount && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              折扣類型
                            </label>
                            <select
                              value={formData.discountType}
                              onChange={(e) => setFormData({ ...formData, discountType: e.target.value as 'percentage' | 'fixed' })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            >
                              {Object.entries(DISCOUNT_TYPE_NAMES).map(([key, name]) => (
                                <option key={key} value={key}>{name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              折扣值 {formData.discountType === 'percentage' ? '(%)' : '(金幣)'}
                            </label>
                            <input
                              type="number"
                              value={formData.discountValue}
                              onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                              min={1}
                              max={formData.discountType === 'percentage' ? 99 : 9999}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            適用商品 (不選則全部商品適用)
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                            {items.map((item) => (
                              <label
                                key={item._id}
                                className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${
                                  formData.discountItemIds.includes(item._id)
                                    ? 'border-amber-500 bg-amber-100'
                                    : 'border-gray-200 hover:border-amber-300'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={formData.discountItemIds.includes(item._id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFormData({ ...formData, discountItemIds: [...formData.discountItemIds, item._id] });
                                    } else {
                                      setFormData({ ...formData, discountItemIds: formData.discountItemIds.filter(id => id !== item._id) });
                                    }
                                  }}
                                  className="w-4 h-4 text-amber-600 rounded"
                                />
                                <span className="text-lg">{item.icon}</span>
                                <span className="text-sm truncate">{item.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Options */}
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isPinned}
                      onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <Pin className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">置頂公告</span>
                  </label>
                  {formData.type === 'promotion' && (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.showInShop}
                        onChange={(e) => setFormData({ ...formData, showInShop: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <Tag className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700">顯示在商店頁面</span>
                    </label>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setShowModal(false)}
                  >
                    取消
                  </Button>
                  <Button type="submit" className="flex-1" loading={formLoading}>
                    {editingAnnouncement ? '更新' : '建立'}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">確認刪除公告？</h3>
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
      )}
    </TeacherLayout>
  );
};

export default Announcements;
