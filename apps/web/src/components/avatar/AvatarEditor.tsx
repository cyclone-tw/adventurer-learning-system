import { useState, useEffect, useCallback } from 'react';
import { Check, Palette, RefreshCw, Save, X } from 'lucide-react';
import AvatarRenderer from './AvatarRenderer';
import paperDollService, {
  AvatarCategory,
  AvatarPart,
  ColorPresets,
  EquippedParts,
  StudentAvatar,
  CATEGORY_LABELS,
  RARITY_COLORS,
} from '../../services/paperDoll';
import { Card, Button } from '../ui';

interface AvatarEditorProps {
  initialAvatar?: StudentAvatar;
  onSave?: (avatar: StudentAvatar) => void;
  onCancel?: () => void;
}

// 顏色選擇器元件
interface ColorPickerProps {
  label: string;
  value: string;
  presets: string[];
  onChange: (color: string) => void;
}

const ColorPicker = ({ label, value, presets, onChange }: ColorPickerProps) => {
  const [showCustom, setShowCustom] = useState(false);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex flex-wrap gap-2">
        {presets.map((color) => (
          <button
            key={color}
            onClick={() => onChange(color)}
            className={`w-8 h-8 rounded-full border-2 transition-all ${
              value === color
                ? 'border-purple-500 ring-2 ring-purple-200'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
        <button
          onClick={() => setShowCustom(!showCustom)}
          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
            showCustom ? 'border-purple-500' : 'border-gray-300'
          }`}
        >
          <Palette className="w-4 h-4 text-gray-500" />
        </button>
      </div>
      {showCustom && (
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-10 rounded cursor-pointer"
        />
      )}
    </div>
  );
};

// 部件選擇器元件
interface PartSelectorProps {
  category: AvatarCategory;
  parts: AvatarPart[];
  selectedId?: string;
  onSelect: (part: AvatarPart) => void;
}

const PartSelector = ({ category, parts, selectedId, onSelect }: PartSelectorProps) => {
  if (parts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        此類別尚無可用部件
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
      {parts.map((part) => {
        const isSelected = selectedId === part._id;
        const rarityColor = RARITY_COLORS[part.rarity];

        return (
          <button
            key={part._id}
            onClick={() => onSelect(part)}
            className={`
              relative p-2 rounded-lg border-2 transition-all
              ${isSelected ? 'border-purple-500 bg-purple-50' : `border-gray-200 hover:border-gray-300`}
              ${rarityColor.bg}
            `}
          >
            {/* 預覽圖 */}
            <div className="aspect-square bg-white rounded overflow-hidden mb-1">
              {part.assets.idle ? (
                <img
                  src={part.assets.idle}
                  alt={part.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">
                  🎭
                </div>
              )}
            </div>

            {/* 名稱 */}
            <div className="text-xs text-center truncate">{part.name}</div>

            {/* 稀有度標籤 */}
            <div
              className={`
                absolute top-1 right-1 px-1 text-xs rounded
                ${rarityColor.text} ${rarityColor.bg}
              `}
            >
              {part.rarity === 'legendary' && '⭐'}
              {part.rarity === 'epic' && '💎'}
              {part.rarity === 'rare' && '💠'}
            </div>

            {/* 選中標記 */}
            {isSelected && (
              <div className="absolute bottom-1 right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

const AvatarEditor = ({ initialAvatar, onSave, onCancel }: AvatarEditorProps) => {
  // 狀態
  const [avatar, setAvatar] = useState<StudentAvatar | null>(initialAvatar || null);
  const [equipped, setEquipped] = useState<EquippedParts | null>(
    initialAvatar?.equipped || null
  );
  const [colorPresets, setColorPresets] = useState<ColorPresets | null>(null);
  const [parts, setParts] = useState<Record<AvatarCategory, AvatarPart[]>>({} as Record<AvatarCategory, AvatarPart[]>);
  const [selectedCategory, setSelectedCategory] = useState<AvatarCategory>('hair');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarName, setAvatarName] = useState(initialAvatar?.name || '冒險者');

  // 可編輯的類別
  const editableCategories: AvatarCategory[] = [
    'body',
    'face',
    'eyes',
    'mouth',
    'hair',
    'outfit',
    'armor',
    'weapon',
    'accessory',
    'effects',
  ];

  // 載入資料
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        // 取得角色資料
        const avatarData = await paperDollService.getAvatar();
        setAvatar(avatarData.avatar);
        setEquipped(avatarData.avatar.equipped);
        setColorPresets(avatarData.colorPresets);
        setAvatarName(avatarData.avatar.name);

        // 取得可用部件
        const partsData = await paperDollService.getParts();
        setParts(partsData.byCategory as Record<AvatarCategory, AvatarPart[]>);
      } catch (err) {
        console.error('Failed to load avatar data:', err);
        setError('載入資料失敗');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 更新顏色
  const handleColorChange = useCallback((field: 'skinTone' | 'hairColor' | 'eyeColor', value: string) => {
    if (!equipped) return;
    setEquipped({
      ...equipped,
      [field]: value,
    });
  }, [equipped]);

  // 裝備部件
  const handleEquipPart = useCallback(async (part: AvatarPart) => {
    if (!equipped) return;

    try {
      await paperDollService.equipPart(part._id);

      // 更新本地狀態
      const categoryKey = part.category as keyof EquippedParts;
      setEquipped({
        ...equipped,
        [categoryKey]: part,
      });
    } catch (err) {
      console.error('Failed to equip part:', err);
    }
  }, [equipped]);

  // 儲存角色
  const handleSave = async () => {
    if (!equipped) return;

    setSaving(true);
    try {
      const updatedAvatar = await paperDollService.updateAvatar({
        name: avatarName,
        skinTone: equipped.skinTone,
        hairColor: equipped.hairColor,
        eyeColor: equipped.eyeColor,
      });

      if (onSave) {
        onSave(updatedAvatar);
      }
    } catch (err) {
      console.error('Failed to save avatar:', err);
      setError('儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  // 重置
  const handleReset = () => {
    if (initialAvatar) {
      setEquipped(initialAvatar.equipped);
      setAvatarName(initialAvatar.name);
    }
  };

  // 獲取當前選中部件的 ID
  const getSelectedPartId = (): string | undefined => {
    if (!equipped) return undefined;
    const part = equipped[selectedCategory as keyof EquippedParts];
    if (typeof part === 'object' && part !== null && '_id' in part) {
      return part._id;
    }
    return undefined;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">載入角色編輯器...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card variant="elevated" className="text-center py-12">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>重新載入</Button>
      </Card>
    );
  }

  if (!equipped || !colorPresets) {
    return (
      <Card variant="elevated" className="text-center py-12">
        <p className="text-gray-500">無法載入角色資料</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 左側：角色預覽 */}
      <div className="lg:col-span-1">
        <Card variant="elevated" padding="lg" className="sticky top-4">
          <h3 className="font-bold text-lg mb-4 text-center">角色預覽</h3>

          {/* Canvas 預覽 */}
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl p-4">
              <AvatarRenderer
                equipped={equipped}
                width={200}
                height={200}
                className="mx-auto"
              />
            </div>
          </div>

          {/* 角色名稱 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              角色名稱
            </label>
            <input
              type="text"
              value={avatarName}
              onChange={(e) => setAvatarName(e.target.value)}
              placeholder="輸入角色名稱"
              maxLength={20}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* 顏色選擇 */}
          <div className="space-y-4">
            <ColorPicker
              label="膚色"
              value={equipped.skinTone}
              presets={colorPresets.skinTone}
              onChange={(c) => handleColorChange('skinTone', c)}
            />
            <ColorPicker
              label="髮色"
              value={equipped.hairColor}
              presets={colorPresets.hairColor}
              onChange={(c) => handleColorChange('hairColor', c)}
            />
            <ColorPicker
              label="眼睛顏色"
              value={equipped.eyeColor}
              presets={colorPresets.eyeColor}
              onChange={(c) => handleColorChange('eyeColor', c)}
            />
          </div>

          {/* 動作按鈕 */}
          <div className="flex gap-3 mt-6">
            <Button
              variant="ghost"
              onClick={handleReset}
              leftIcon={<RefreshCw className="w-4 h-4" />}
              className="flex-1"
            >
              重置
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              loading={saving}
              leftIcon={<Save className="w-4 h-4" />}
              className="flex-1"
            >
              儲存
            </Button>
          </div>

          {onCancel && (
            <Button
              variant="secondary"
              onClick={onCancel}
              leftIcon={<X className="w-4 h-4" />}
              className="w-full mt-3"
            >
              取消
            </Button>
          )}
        </Card>
      </div>

      {/* 右側：部件選擇 */}
      <div className="lg:col-span-2">
        <Card variant="elevated" padding="lg">
          {/* 類別標籤 */}
          <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-gray-200">
            {editableCategories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${
                    selectedCategory === category
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                {CATEGORY_LABELS[category]}
              </button>
            ))}
          </div>

          {/* 部件列表 */}
          <div className="min-h-[300px]">
            <h3 className="font-bold text-gray-800 mb-4">
              選擇{CATEGORY_LABELS[selectedCategory]}
            </h3>
            <PartSelector
              category={selectedCategory}
              parts={parts[selectedCategory] || []}
              selectedId={getSelectedPartId()}
              onSelect={handleEquipPart}
            />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AvatarEditor;
