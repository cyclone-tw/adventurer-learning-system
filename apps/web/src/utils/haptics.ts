/**
 * 觸覺回饋工具
 * 提供各種震動模式用於觸控操作回饋
 */

export const haptics = {
  /**
   * 輕微震動（按鈕點擊）
   */
  light: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },

  /**
   * 中等震動（成功操作）
   */
  medium: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
  },

  /**
   * 強烈震動（重要提示）
   */
  heavy: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 30, 50]);
    }
  },

  /**
   * 成功模式（答對、購買成功）
   */
  success: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([30, 50, 30]);
    }
  },

  /**
   * 錯誤模式（答錯、購買失敗）
   */
  error: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 30, 100, 30, 100]);
    }
  },

  /**
   * 升級慶祝
   */
  levelUp: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 50, 50, 50, 100, 100, 200]);
    }
  },

  /**
   * 獲得物品
   */
  itemGet: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([20, 20, 40]);
    }
  },

  /**
   * 攻擊
   */
  attack: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([80]);
    }
  },

  /**
   * 受傷
   */
  hurt: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([30, 20, 50]);
    }
  },

  /**
   * 自訂模式
   */
  custom: (pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  },

  /**
   * 停止震動
   */
  stop: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  },

  /**
   * 檢查是否支援震動
   */
  isSupported: () => {
    return 'vibrate' in navigator;
  },
};

export default haptics;
