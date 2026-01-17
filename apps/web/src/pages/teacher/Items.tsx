import { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Coins,
  Sparkles,
  X,
} from 'lucide-react';
import { Card, Button } from '../../components/ui';
import TeacherLayout from '../../components/layout/TeacherLayout';
import {
  itemService,
  Item,
  ItemType,
  ItemRarity,
  EquipmentSlot,
  ItemEffect,
  ITEM_TYPE_NAMES,
  RARITY_CONFIG,
  SLOT_NAMES,
  EFFECT_TYPE_NAMES,
} from '../../services/items';

const EMOJI_OPTIONS = ['🧪', '💰', '💎', '💡', '⏭️', '🛡️', '🎁', '👑', '🏅', '🎯', '⚔️', '🌟', '✨', '🔮', '🏰', '🐉', '🌲', '🌌', '🪵', '🥇', '🥈', '📖', '🏷️'];

const Items = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | ItemType>('all');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'consumable' as ItemType,
    rarity: 'common' as ItemRarity,
    slot: '' as EquipmentSlot | '',
    icon: '🧪',
    price: 50,
    maxStack: 99,
    order: 0,
    effects: [] as ItemEffect[],
  });

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await itemService.list();
      setItems(data);
    } catch (err) {
      console.error('Failed to load items:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      description: '',
      type: 'consumable',
      rarity: 'common',
      slot: '',
      icon: '🧪',
      price: 50,
      maxStack: 99,
      order: items.length,
      effects: [],
    });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (item: Item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      type: item.type,
      rarity: item.rarity,
      slot: item.slot || '',
      icon: item.icon,
      price: item.price,
      maxStack: item.maxStack,
      order: item.order,
      effects: item.effects || [],
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      const data = {
        ...formData,
        slot: formData.slot || undefined,
        effects: formData.effects.length > 0 ? formData.effects : undefined,
      };

      if (editingItem) {
        await itemService.update(editingItem._id, data);
      } else {
        await itemService.create(data);
      }
      setShowModal(false);
      loadItems();
    } catch (err: any) {
      setFormError(err.message || '操作失敗');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await itemService.delete(id);
      setDeleteConfirm(null);
      loadItems();
    } catch (err: any) {
      alert(err.message || '刪除失敗');
    }
  };

  const handleToggleActive = async (item: Item) => {
    try {
      await itemService.update(item._id, { isActive: !item.isActive });
      loadItems();
    } catch (err) {
      console.error('Failed to toggle item:', err);
    }
  };

  const addEffect = () => {
    setFormData({
      ...formData,
      effects: [...formData.effects, { type: 'exp_boost', value: 2, duration: 30 }],
    });
  };

  const removeEffect = (index: number) => {
    setFormData({
      ...formData,
      effects: formData.effects.filter((_, i) => i !== index),
    });
  };

  const updateEffect = (index: number, field: string, value: any) => {
    const newEffects = [...formData.effects];
    newEffects[index] = { ...newEffects[index], [field]: value };
    setFormData({ ...formData, effects: newEffects });
  };

  const filteredItems = items.filter((item) => {
    if (filter === 'all') return true;
    return item.type === filter;
  });

  return (
    <TeacherLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">商品管理</h1>
            <p className="text-gray-500 mt-1">管理商店中的道具和裝飾品</p>
          </div>
          <Button onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-2" />
            新增商品
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {[
            { value: 'all', label: '全部' },
            { value: 'consumable', label: '消耗品' },
            { value: 'cosmetic', label: '裝飾品' },
            { value: 'equipment', label: '裝備' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value as typeof filter)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === f.value
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Items List */}
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent mx-auto" />
          </div>
        ) : filteredItems.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">尚無商品</h3>
            <p className="text-gray-500 mb-4">建立第一個商品吧！</p>
            <Button onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              新增商品
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => {
              const rarityConfig = RARITY_CONFIG[item.rarity];
              return (
                <Card
                  key={item._id}
                  className={`p-4 ${!item.isActive ? 'opacity-60 bg-gray-50' : ''}`}
                >
                  <div className="flex gap-4">
                    {/* Icon */}
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl ${rarityConfig.bgColor}`}>
                      {item.icon}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900 truncate">{item.name}</h3>
                        {!item.isActive && (
                          <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
                            下架
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${rarityConfig.bgColor} ${rarityConfig.color}`}>
                          {rarityConfig.name}
                        </span>
                        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                          {ITEM_TYPE_NAMES[item.type]}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-1 mb-2">{item.description}</p>
                      <div className="flex items-center gap-1 text-yellow-600 font-bold">
                        <Coins className="w-4 h-4" />
                        {item.price}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-1 mt-3 pt-3 border-t">
                    <button
                      onClick={() => handleToggleActive(item)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                      title={item.isActive ? '下架' : '上架'}
                    >
                      {item.isActive ? (
                        <Eye className="w-4 h-4 text-green-600" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <Edit className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(item._id)}
                      className="p-2 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
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
                {editingItem ? '編輯商品' : '新增商品'}
              </h2>

              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      商品名稱 *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      價格 (金幣) *
                    </label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      min={0}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    描述 *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    rows={2}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">類型 *</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as ItemType })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      {Object.entries(ITEM_TYPE_NAMES).map(([key, name]) => (
                        <option key={key} value={key}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">稀有度</label>
                    <select
                      value={formData.rarity}
                      onChange={(e) => setFormData({ ...formData, rarity: e.target.value as ItemRarity })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      {Object.entries(RARITY_CONFIG).map(([key, config]) => (
                        <option key={key} value={key}>{config.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">最大數量</label>
                    <input
                      type="number"
                      value={formData.maxStack}
                      onChange={(e) => setFormData({ ...formData, maxStack: Number(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      min={1}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                    <input
                      type="number"
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      min={0}
                    />
                  </div>
                </div>

                {/* Slot (for cosmetic/equipment) */}
                {(formData.type === 'cosmetic' || formData.type === 'equipment') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">裝備位置</label>
                    <select
                      value={formData.slot}
                      onChange={(e) => setFormData({ ...formData, slot: e.target.value as EquipmentSlot })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">無</option>
                      {Object.entries(SLOT_NAMES).map(([key, name]) => (
                        <option key={key} value={key}>{name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Icon */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">圖示</label>
                  <div className="flex flex-wrap gap-2">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon: emoji })}
                        className={`w-10 h-10 rounded-lg border-2 text-xl flex items-center justify-center transition-all ${
                          formData.icon === emoji
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Effects (for consumables) */}
                {formData.type === 'consumable' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        <Sparkles className="w-4 h-4 inline mr-1" />
                        效果
                      </label>
                      <Button type="button" variant="secondary" size="sm" onClick={addEffect}>
                        <Plus className="w-3 h-3 mr-1" />
                        新增效果
                      </Button>
                    </div>
                    {formData.effects.map((effect, index) => (
                      <div key={index} className="flex items-center gap-2 mb-2 p-3 bg-gray-50 rounded-lg">
                        <select
                          value={effect.type}
                          onChange={(e) => updateEffect(index, 'type', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          {Object.entries(EFFECT_TYPE_NAMES).map(([key, name]) => (
                            <option key={key} value={key}>{name}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          value={effect.value}
                          onChange={(e) => updateEffect(index, 'value', Number(e.target.value))}
                          className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="數值"
                          min={1}
                        />
                        <input
                          type="number"
                          value={effect.duration || ''}
                          onChange={(e) => updateEffect(index, 'duration', e.target.value ? Number(e.target.value) : undefined)}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="分鐘"
                          min={1}
                        />
                        <button
                          type="button"
                          onClick={() => removeEffect(index)}
                          className="p-2 hover:bg-red-50 rounded-lg"
                        >
                          <X className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    ))}
                    {formData.effects.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        尚未設定效果
                      </p>
                    )}
                  </div>
                )}

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
                    {editingItem ? '更新' : '建立'}
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
              <h3 className="text-lg font-bold text-gray-800 mb-2">確認刪除商品？</h3>
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

export default Items;
