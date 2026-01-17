import { useState, useEffect } from 'react';
import { ShoppingBag, Coins, Package, Sparkles, Tag, Clock } from 'lucide-react';
import { StudentLayout } from '../../components/layout';
import { Card, Button } from '../../components/ui';
import { useUserStore } from '../../stores/userStore';
import {
  shopService,
  ShopItem,
  ShopPromotion,
  RARITY_CONFIG,
  EFFECT_TYPE_NAMES,
} from '../../services/shop';

const Shop = () => {
  const { refreshUser } = useUserStore();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [promotions, setPromotions] = useState<ShopPromotion[]>([]);
  const [playerGold, setPlayerGold] = useState(0);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter state
  const [filter, setFilter] = useState<'all' | 'consumable' | 'cosmetic'>('all');

  // Load shop items
  useEffect(() => {
    loadShop();
  }, []);

  const loadShop = async () => {
    setLoading(true);
    try {
      const data = await shopService.getShopItems();
      setItems(data.items);
      setPlayerGold(data.playerGold);
      setPromotions(data.promotions || []);
    } catch (error) {
      console.error('Failed to load shop:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate remaining time for promotion
  const getRemainingTime = (endDate?: string) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    if (diff <= 0) return null;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) return `${Math.floor(hours / 24)} 天`;
    if (hours > 0) return `${hours} 小時 ${minutes} 分`;
    return `${minutes} 分鐘`;
  };

  // Buy item handler
  const handleBuy = async (item: ShopItem) => {
    if (!item.canAfford || buying) return;

    setBuying(item._id);
    setMessage(null);

    try {
      const result = await shopService.buyItem(item._id);
      setMessage({ type: 'success', text: result.message });
      setPlayerGold(result.remainingGold);

      // Update item's owned count
      setItems(prev => prev.map(i =>
        i._id === item._id
          ? { ...i, owned: i.owned + 1, canAfford: result.remainingGold >= i.price }
          : { ...i, canAfford: result.remainingGold >= i.price }
      ));

      // Refresh user data
      await refreshUser();

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '購買失敗';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setBuying(null);
    }
  };

  // Filter items
  const filteredItems = items.filter(item => {
    if (filter === 'all') return true;
    return item.type === filter;
  });

  // Group items by type
  const consumables = filteredItems.filter(i => i.type === 'consumable');
  const cosmetics = filteredItems.filter(i => i.type === 'cosmetic');

  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto pb-20 md:pb-6 space-y-6">
        {/* Header */}
        <Card
          variant="elevated"
          className="bg-gradient-to-r from-amber-500 to-orange-500 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
                <ShoppingBag className="w-7 h-7" />
                冒險商店
              </h1>
              <p className="text-white/80">使用金幣購買道具，增強你的冒險！</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-white/80">我的金幣</div>
              <div className="text-2xl font-bold flex items-center gap-1">
                <Coins className="w-6 h-6" />
                {playerGold}
              </div>
            </div>
          </div>
        </Card>

        {/* Promotions Banner */}
        {promotions.length > 0 && (
          <div className="space-y-2">
            {promotions.map((promo) => (
              <Card
                key={promo._id}
                variant="outlined"
                className="bg-gradient-to-r from-red-50 to-amber-50 border-red-200"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{promo.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-red-600">{promo.title}</span>
                      {promo.discount && (
                        <span className="px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                          {promo.discount.type === 'percentage'
                            ? `${promo.discount.value}% OFF`
                            : `-${promo.discount.value} 金幣`}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{promo.content}</p>
                  </div>
                  {promo.endDate && getRemainingTime(promo.endDate) && (
                    <div className="text-right text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        剩餘 {getRemainingTime(promo.endDate)}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

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

        {/* Filter */}
        <div className="flex gap-2">
          {[
            { value: 'all', label: '全部' },
            { value: 'consumable', label: '消耗品' },
            { value: 'cosmetic', label: '裝飾品' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value as typeof filter)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === f.value
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent mx-auto mb-4" />
            <p className="text-gray-500">載入商店中...</p>
          </div>
        ) : items.length === 0 ? (
          <Card variant="outlined" className="text-center py-12">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">商店尚無商品</p>
            <p className="text-sm text-gray-400 mt-2">請稍後再來看看</p>
          </Card>
        ) : (
          <>
            {/* Consumables */}
            {consumables.length > 0 && (filter === 'all' || filter === 'consumable') && (
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  消耗品
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {consumables.map((item) => (
                    <ItemCard
                      key={item._id}
                      item={item}
                      onBuy={() => handleBuy(item)}
                      buying={buying === item._id}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Cosmetics */}
            {cosmetics.length > 0 && (filter === 'all' || filter === 'cosmetic') && (
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="text-xl">✨</span>
                  裝飾品
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {cosmetics.map((item) => (
                    <ItemCard
                      key={item._id}
                      item={item}
                      onBuy={() => handleBuy(item)}
                      buying={buying === item._id}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </StudentLayout>
  );
};

// Item Card Component
const ItemCard = ({
  item,
  onBuy,
  buying,
}: {
  item: ShopItem;
  onBuy: () => void;
  buying: boolean;
}) => {
  const rarityConfig = RARITY_CONFIG[item.rarity];
  const hasDiscount = !!item.discount;

  return (
    <Card variant="elevated" padding="md" className={`hover:shadow-lg transition-shadow relative ${hasDiscount ? 'ring-2 ring-red-300' : ''}`}>
      {/* Discount Badge */}
      {hasDiscount && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
          <Tag className="w-3 h-3" />
          {item.discount!.type === 'percentage'
            ? `${item.discount!.value}% OFF`
            : `-${item.discount!.value}`}
        </div>
      )}

      <div className="flex gap-4">
        {/* Icon */}
        <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl ${rarityConfig.bgColor}`}>
          {item.icon}
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

          {/* Price & Buy */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {hasDiscount && (
                <span className="text-sm text-gray-400 line-through flex items-center gap-1">
                  <Coins className="w-3 h-3" />
                  {item.discount!.originalPrice}
                </span>
              )}
              <span className={`font-bold flex items-center gap-1 ${hasDiscount ? 'text-red-600' : 'text-yellow-600'}`}>
                <Coins className="w-4 h-4" />
                {item.price}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {item.owned > 0 && (
                <span className="text-xs text-gray-500">已擁有 {item.owned}</span>
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={onBuy}
                disabled={!item.canAfford || buying}
                loading={buying}
                className={item.canAfford ? (hasDiscount ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600') : ''}
              >
                {item.canAfford ? '購買' : '金幣不足'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default Shop;
