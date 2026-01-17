import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, Gift, Calendar, Clock, ChevronRight, X } from 'lucide-react';
import { Card } from '../ui';
import {
  announcementService,
  Announcement,
  ANNOUNCEMENT_TYPE_COLORS,
} from '../../services/announcements';

interface AnnouncementBannerProps {
  maxItems?: number;
  showPromotions?: boolean;
}

const AnnouncementBanner = ({ maxItems = 3, showPromotions = true }: AnnouncementBannerProps) => {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [promotions, setPromotions] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      const data = await announcementService.getActive();
      setAnnouncements(data.announcements.slice(0, maxItems));
      if (showPromotions) {
        setPromotions(data.promotions);
      }
    } catch (error) {
      console.error('Failed to load announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const dismissAnnouncement = (id: string) => {
    setDismissed(prev => new Set(prev).add(id));
  };

  const getRemainingTime = (endDate?: string) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    if (diff <= 0) return null;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) return `${Math.floor(hours / 24)} 天`;
    if (hours > 0) return `${hours} 小時`;
    return `${minutes} 分鐘`;
  };

  const visibleAnnouncements = announcements.filter(a => !dismissed.has(a._id));
  const visiblePromotions = promotions.filter(p => !dismissed.has(p._id));

  if (loading) return null;
  if (visibleAnnouncements.length === 0 && visiblePromotions.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Promotions - Special display */}
      {visiblePromotions.map((promo) => (
        <Card
          key={promo._id}
          variant="elevated"
          padding="md"
          className="bg-gradient-to-r from-red-500 to-amber-500 text-white relative overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/student/shop')}
        >
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-3xl shrink-0">
              {promo.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Gift className="w-4 h-4" />
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">限時優惠</span>
                {promo.discount && (
                  <span className="text-xs bg-white/30 px-2 py-0.5 rounded-full font-bold">
                    {promo.discount.type === 'percentage'
                      ? `${promo.discount.value}% OFF`
                      : `-${promo.discount.value} 金幣`}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-lg truncate">{promo.title}</h3>
              <p className="text-white/80 text-sm line-clamp-1">{promo.content}</p>
            </div>
            <div className="text-right shrink-0">
              {promo.endDate && getRemainingTime(promo.endDate) && (
                <div className="text-xs bg-white/20 px-2 py-1 rounded-lg mb-1">
                  <Clock className="w-3 h-3 inline mr-1" />
                  剩餘 {getRemainingTime(promo.endDate)}
                </div>
              )}
              <ChevronRight className="w-5 h-5 ml-auto" />
            </div>
          </div>

          {/* Dismiss button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              dismissAnnouncement(promo._id);
            }}
            className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </Card>
      ))}

      {/* Regular announcements */}
      {visibleAnnouncements.length > 0 && (
        <Card variant="elevated" padding="md">
          <div className="flex items-center gap-2 mb-3">
            <Megaphone className="w-5 h-5 text-blue-500" />
            <h3 className="font-bold text-gray-800">最新公告</h3>
          </div>
          <div className="space-y-2">
            {visibleAnnouncements.map((announcement) => {
              const typeColor = ANNOUNCEMENT_TYPE_COLORS[announcement.type];
              return (
                <div
                  key={announcement._id}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors relative group"
                >
                  <span className="text-xl">{announcement.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-gray-900">{announcement.title}</span>
                      {announcement.isPinned && (
                        <span className="px-1.5 py-0.5 text-xs bg-orange-100 text-orange-600 rounded">
                          置頂
                        </span>
                      )}
                      {announcement.type !== 'info' && (
                        <span className={`px-1.5 py-0.5 text-xs rounded ${typeColor.bg} ${typeColor.text}`}>
                          {announcement.type === 'event' ? '活動' : '促銷'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{announcement.content}</p>
                    {announcement.startDate && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                        <Calendar className="w-3 h-3" />
                        {new Date(announcement.startDate).toLocaleDateString('zh-TW')}
                        {announcement.endDate && ` ~ ${new Date(announcement.endDate).toLocaleDateString('zh-TW')}`}
                      </div>
                    )}
                  </div>

                  {/* Dismiss button */}
                  <button
                    onClick={() => dismissAnnouncement(announcement._id)}
                    className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded-full transition-all"
                  >
                    <X className="w-3 h-3 text-gray-400" />
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};

export default AnnouncementBanner;
