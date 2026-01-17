import { useState, useEffect } from 'react';
import { Package, Clock, Sparkles, AlertCircle } from 'lucide-react';
import { StudentLayout } from '../../components/layout';
import { Card, Button } from '../../components/ui';
import {
  shopService,
  InventoryItem,
  ActiveEffect,
  RARITY_CONFIG,
  EFFECT_TYPE_NAMES,
} from '../../services/shop';

const Inventory = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [activeEffects, setActiveEffects] = useState<ActiveEffect[]>([]);
  const [loading, setLoading] = useState(true);
  const [using, setUsing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load inventory
  useEffect(() => {
    loadInventory();
  }, []);

  // Refresh active effects every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveEffects(prev => prev.map(effect => ({
        ...effect,
        remainingMinutes: Math.max(0, Math.ceil((new Date(effect.expiresAt).getTime() - Date.now()) / 60000)),
      })).filter(effect => effect.remainingMinutes > 0));
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const data = await shopService.getInventory();
      setInventory(data.inventory);
      setActiveEffects(data.activeEffects);
    } catch (error) {
      console.error('Failed to load inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  // Use item handler
  const handleUseItem = async (inventoryItem: InventoryItem) => {
    if (using) return;

    setUsing(inventoryItem.item._id);
    setMessage(null);

    try {
      const result = await shopService.useItem(inventoryItem.item._id);
      setMessage({ type: 'success', text: result.message });

      // Update inventory
      if (result.remainingQuantity === 0) {
        setInventory(prev => prev.filter(i => i.item._id !== inventoryItem.item._id));
      } else {
        setInventory(prev => prev.map(i =>
          i.item._id === inventoryItem.item._id
            ? { ...i, quantity: result.remainingQuantity }
            : i
        ));
      }

      // Reload to get updated active effects
      const data = await shopService.getActiveEffects();
      setActiveEffects(data.activeEffects);

      setTimeout(() => setMessage(null), 3000);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '使用失敗';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setUsing(null);
    }
  };

  // Group items by type
  const consumables = inventory.filter(i => i.item.type === 'consumable');
  const cosmetics = inventory.filter(i => i.item.type === 'cosmetic');

  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto pb-20 md:pb-6 space-y-6">
        {/* Header */}
        <Card
          variant="elevated"
          className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
                <Package className="w-7 h-7" />
                道具庫
              </h1>
              <p className="text-white/80">管理你的道具，使用消耗品增強冒險！</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-white/80">道具數量</div>
              <div className="text-2xl font-bold">
                {inventory.reduce((sum, i) => sum + i.quantity, 0)}
              </div>
            </div>
          </div>
        </Card>

        {/* Message */}
        {message && (
          <Card
            variant="outlined"
            className={message.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}
          >
            <p className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
              {message.text}
            </p>
          </Card>
        )}

        {/* Active Effects */}
        {activeEffects.length > 0 && (
          <Card variant="elevated" padding="lg">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              生效中的效果
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeEffects.map((effect) => (
                <div
                  key={effect._id}
                  className="flex items-center gap-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200"
                >
                  <div className="text-2xl">{effect.item.icon}</div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{effect.item.name}</div>
                    <div className="text-sm text-gray-600">
                      {EFFECT_TYPE_NAMES[effect.effectType] || effect.effectType}
                      {effect.value > 1 && ` x${effect.value}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-amber-600">
                      <Clock className="w-4 h-4" />
                      <span className="font-medium">{effect.remainingMinutes}</span>
                    </div>
                    <div className="text-xs text-gray-500">分鐘</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Loading */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mx-auto mb-4" />
            <p className="text-gray-500">載入道具庫中...</p>
          </div>
        ) : inventory.length === 0 ? (
          <Card variant="outlined" className="text-center py-12">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">你的道具庫是空的</p>
            <p className="text-sm text-gray-400 mt-2">前往商店購買道具吧！</p>
          </Card>
        ) : (
          <>
            {/* Consumables */}
            {consumables.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="text-xl">🧪</span>
                  消耗品
                  <span className="text-sm font-normal text-gray-500">
                    （共 {consumables.reduce((sum, i) => sum + i.quantity, 0)} 個）
                  </span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {consumables.map((inventoryItem) => (
                    <InventoryItemCard
                      key={inventoryItem._id}
                      inventoryItem={inventoryItem}
                      onUse={() => handleUseItem(inventoryItem)}
                      using={using === inventoryItem.item._id}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Cosmetics */}
            {cosmetics.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="text-xl">✨</span>
                  裝飾品
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {cosmetics.map((inventoryItem) => (
                    <InventoryItemCard
                      key={inventoryItem._id}
                      inventoryItem={inventoryItem}
                      showUseButton={false}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Info */}
        <Card variant="outlined" padding="md" className="bg-blue-50 border-blue-200">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">道具使用說明</p>
              <ul className="list-disc list-inside space-y-1 text-blue-600">
                <li>消耗品使用後會立即生效</li>
                <li>效果類道具（如經驗加倍）使用後會有持續時間</li>
                <li>相同效果的道具使用會延長持續時間</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </StudentLayout>
  );
};

// Inventory Item Card Component
const InventoryItemCard = ({
  inventoryItem,
  onUse,
  using = false,
  showUseButton = true,
}: {
  inventoryItem: InventoryItem;
  onUse?: () => void;
  using?: boolean;
  showUseButton?: boolean;
}) => {
  const { item, quantity } = inventoryItem;
  const rarityConfig = RARITY_CONFIG[item.rarity];

  return (
    <Card variant="elevated" padding="md" className="hover:shadow-lg transition-shadow">
      <div className="flex gap-4">
        {/* Icon */}
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl ${rarityConfig.bgColor} relative`}>
          {item.icon}
          {quantity > 1 && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-indigo-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {quantity}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-gray-900 truncate">{item.name}</h3>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${rarityConfig.bgColor} ${rarityConfig.color}`}>
              {rarityConfig.name}
            </span>
          </div>
          <p className="text-sm text-gray-600 line-clamp-2 mb-2">{item.description}</p>

          {/* Effects */}
          {item.effects && item.effects.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {item.effects.map((effect, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded"
                >
                  {EFFECT_TYPE_NAMES[effect.type] || effect.type}
                  {effect.value > 1 && ` x${effect.value}`}
                  {effect.duration && ` (${effect.duration}分鐘)`}
                </span>
              ))}
            </div>
          )}

          {/* Use button */}
          {showUseButton && item.type === 'consumable' && onUse && (
            <div className="flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={onUse}
                disabled={using}
                loading={using}
                className="bg-indigo-500 hover:bg-indigo-600"
              >
                使用
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default Inventory;
