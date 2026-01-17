import { useState, useEffect } from 'react';
import { User, Sparkles, Check, X, Palette, Package } from 'lucide-react';
import { StudentLayout } from '../../components/layout';
import { Card, Button } from '../../components/ui';
import { AvatarEditor } from '../../components/avatar';
import { useUserStore } from '../../stores/userStore';
import { useNotificationStore } from '../../stores/notificationStore';
import {
  avatarService,
  AvatarConfig,
  EquippableItem,
  EquipmentSlot,
  SLOT_NAMES,
  SLOT_ICONS,
  RARITY_CONFIG,
} from '../../services/avatar';

const SLOTS: EquipmentSlot[] = ['head', 'body', 'accessory', 'background', 'effect', 'title'];

type AvatarTab = 'paperdoll' | 'items';

const Avatar = () => {
  const { user } = useUserStore();
  const { addToast } = useNotificationStore();
  const [activeTab, setActiveTab] = useState<AvatarTab>('paperdoll');
  const [loading, setLoading] = useState(true);
  const [avatar, setAvatar] = useState<AvatarConfig | null>(null);
  const [itemsBySlot, setItemsBySlot] = useState<Record<EquipmentSlot, EquippableItem[]> | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<EquipmentSlot>('head');
  const [isEquipping, setIsEquipping] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [avatarData, itemsData] = await Promise.all([
        avatarService.getAvatar(),
        avatarService.getEquippableItems(),
      ]);
      setAvatar(avatarData.avatar);
      setItemsBySlot(itemsData.bySlot);
    } catch (error) {
      console.error('Failed to load avatar data:', error);
      addToast({
        type: 'error',
        title: '載入失敗',
        message: '無法載入角色資料',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEquip = async (playerItemId: string) => {
    setIsEquipping(true);
    try {
      const result = await avatarService.equipItem(playerItemId);
      addToast({
        type: 'success',
        title: '裝備成功',
        message: result.message,
      });
      // Reload data
      await loadData();
    } catch (error) {
      console.error('Failed to equip item:', error);
      addToast({
        type: 'error',
        title: '裝備失敗',
        message: '無法裝備此道具',
      });
    } finally {
      setIsEquipping(false);
    }
  };

  const handleUnequip = async (playerItemId: string) => {
    setIsEquipping(true);
    try {
      const result = await avatarService.unequipItem(playerItemId);
      addToast({
        type: 'success',
        title: '卸下成功',
        message: result.message,
      });
      // Reload data
      await loadData();
    } catch (error) {
      console.error('Failed to unequip item:', error);
      addToast({
        type: 'error',
        title: '卸下失敗',
        message: '無法卸下此道具',
      });
    } finally {
      setIsEquipping(false);
    }
  };

  const currentItems = itemsBySlot?.[selectedSlot] || [];
  const equippedItem = avatar?.[selectedSlot];

  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto pb-20 md:pb-6 space-y-6">
        {/* Header */}
        <Card
          variant="elevated"
          className="bg-gradient-to-r from-pink-500 to-purple-500 text-white"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-1">角色裝扮</h1>
              <p className="text-white/80">裝備道具，打造獨一無二的角色！</p>
            </div>
          </div>
        </Card>

        {/* Tab Switcher */}
        <div className="flex gap-2 bg-white rounded-xl p-1 shadow-sm">
          <button
            onClick={() => setActiveTab('paperdoll')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'paperdoll'
                ? 'bg-purple-500 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Palette className="w-5 h-5" />
            紙娃娃編輯
          </button>
          <button
            onClick={() => setActiveTab('items')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'items'
                ? 'bg-purple-500 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Package className="w-5 h-5" />
            道具裝備
          </button>
        </div>

        {/* Paper Doll Editor Tab */}
        {activeTab === 'paperdoll' && (
          <AvatarEditor
            onSave={(avatar) => {
              addToast({
                type: 'success',
                title: '儲存成功',
                message: `角色「${avatar.name}」已更新`,
              });
            }}
          />
        )}

        {/* Items Tab */}
        {activeTab === 'items' && (
          loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4" />
              <p className="text-gray-500">載入中...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Avatar Preview */}
            <Card variant="elevated" padding="lg" className="lg:col-span-1">
              <h2 className="text-lg font-bold mb-4 text-center">角色預覽</h2>

              {/* Character Display */}
              <div className="relative mx-auto w-48 h-48 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mb-6 overflow-hidden">
                {/* Background */}
                {avatar?.background && (
                  <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-30">
                    {avatar.background.item.icon}
                  </div>
                )}

                {/* Character Base */}
                <div className="relative z-10 text-center">
                  {/* Head */}
                  {avatar?.head && (
                    <div className="text-4xl mb-1">{avatar.head.item.icon}</div>
                  )}

                  {/* Body/Main */}
                  <div className="text-6xl">
                    {avatar?.body ? avatar.body.item.icon : '🧑'}
                  </div>

                  {/* Accessory */}
                  {avatar?.accessory && (
                    <div className="absolute -right-2 top-1/2 text-2xl">
                      {avatar.accessory.item.icon}
                    </div>
                  )}
                </div>

                {/* Effect */}
                {avatar?.effect && (
                  <div className="absolute inset-0 flex items-center justify-center text-4xl animate-pulse pointer-events-none">
                    {avatar.effect.item.icon}
                  </div>
                )}
              </div>

              {/* Title */}
              {avatar?.title && (
                <div className="text-center mb-4">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${RARITY_CONFIG[avatar.title.item.rarity].bgColor} ${RARITY_CONFIG[avatar.title.item.rarity].color}`}>
                    {avatar.title.item.name}
                  </span>
                </div>
              )}

              {/* Player Info */}
              <div className="text-center">
                <div className="font-bold text-lg">{user?.displayName}</div>
                <div className="text-sm text-gray-500">
                  Lv.{user?.studentProfile?.level || 1}
                </div>
              </div>

              {/* Equipped Summary */}
              <div className="mt-6 grid grid-cols-3 gap-2">
                {SLOTS.map((slot) => {
                  const equipped = avatar?.[slot];
                  return (
                    <div
                      key={slot}
                      className={`p-2 rounded-lg text-center cursor-pointer transition-all ${
                        selectedSlot === slot
                          ? 'bg-purple-100 ring-2 ring-purple-400'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      onClick={() => setSelectedSlot(slot)}
                    >
                      <div className="text-xl mb-1">
                        {equipped ? equipped.item.icon : SLOT_ICONS[slot]}
                      </div>
                      <div className="text-xs text-gray-500">{SLOT_NAMES[slot]}</div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Equipment Selection */}
            <Card variant="elevated" padding="lg" className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <span>{SLOT_ICONS[selectedSlot]}</span>
                  {SLOT_NAMES[selectedSlot]}
                </h2>
                {equippedItem && (
                  <span className="text-sm text-gray-500">
                    已裝備：{equippedItem.item.name}
                  </span>
                )}
              </div>

              {/* Slot Tabs */}
              <div className="flex gap-1 mb-4 overflow-x-auto pb-2">
                {SLOTS.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      selectedSlot === slot
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span>{SLOT_ICONS[slot]}</span>
                    {SLOT_NAMES[slot]}
                    {avatar?.[slot] && (
                      <Check className="w-3 h-3 text-green-500" />
                    )}
                  </button>
                ))}
              </div>

              {/* Items Grid */}
              {currentItems.length === 0 ? (
                <div className="text-center py-12">
                  <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">尚無此類型的道具</p>
                  <p className="text-sm text-gray-400 mt-2">
                    前往商店購買更多裝備吧！
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Unequip option */}
                  {equippedItem && (
                    <button
                      onClick={() => handleUnequip(equippedItem.playerItemId)}
                      disabled={isEquipping}
                      className="p-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-red-300 hover:bg-red-50 transition-all flex items-center gap-3"
                    >
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                        <X className="w-6 h-6 text-gray-400" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-gray-700">卸下裝備</div>
                        <div className="text-sm text-gray-500">移除目前的{SLOT_NAMES[selectedSlot]}</div>
                      </div>
                    </button>
                  )}

                  {currentItems.map((item) => {
                    const rarity = RARITY_CONFIG[item.item.rarity];
                    const isEquipped = item.isEquipped;

                    return (
                      <button
                        key={item.playerItemId}
                        onClick={() => !isEquipped && handleEquip(item.playerItemId)}
                        disabled={isEquipping || isEquipped}
                        className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 text-left ${
                          isEquipped
                            ? 'border-green-400 bg-green-50'
                            : `border-gray-200 hover:${rarity.borderColor} hover:${rarity.bgColor}`
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-lg ${rarity.bgColor} flex items-center justify-center text-2xl`}>
                          {item.item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 truncate">
                              {item.item.name}
                            </span>
                            {isEquipped && (
                              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${rarity.bgColor} ${rarity.color}`}>
                              {rarity.name}
                            </span>
                            {isEquipped && (
                              <span className="text-xs text-green-600">已裝備</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
          )
        )}
      </div>
    </StudentLayout>
  );
};

export default Avatar;
