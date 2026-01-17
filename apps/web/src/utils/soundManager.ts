/**
 * 音效管理器
 * 管理遊戲中的所有音效播放
 */

type SoundType =
  | 'button_click'
  | 'correct'
  | 'wrong'
  | 'level_up'
  | 'coin'
  | 'item_get'
  | 'chest_open'
  | 'attack'
  | 'monster_hurt'
  | 'victory'
  | 'defeat'
  | 'notification';

// 音效 URL 映射（使用免費音效或 placeholder）
const SOUND_URLS: Record<SoundType, string> = {
  button_click: '/sounds/button_click.mp3',
  correct: '/sounds/correct.mp3',
  wrong: '/sounds/wrong.mp3',
  level_up: '/sounds/level_up.mp3',
  coin: '/sounds/coin.mp3',
  item_get: '/sounds/item_get.mp3',
  chest_open: '/sounds/chest_open.mp3',
  attack: '/sounds/attack.mp3',
  monster_hurt: '/sounds/monster_hurt.mp3',
  victory: '/sounds/victory.mp3',
  defeat: '/sounds/defeat.mp3',
  notification: '/sounds/notification.mp3',
};

class SoundManager {
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private volume: number = 0.5;
  private muted: boolean = false;
  private enabled: boolean = true;

  constructor() {
    // 從 localStorage 載入設定
    if (typeof window !== 'undefined') {
      const savedVolume = localStorage.getItem('soundVolume');
      const savedMuted = localStorage.getItem('soundMuted');
      const savedEnabled = localStorage.getItem('soundEnabled');

      if (savedVolume) this.volume = parseFloat(savedVolume);
      if (savedMuted) this.muted = savedMuted === 'true';
      if (savedEnabled) this.enabled = savedEnabled !== 'false';
    }
  }

  /**
   * 預載音效
   */
  preload(sounds: SoundType[]): void {
    sounds.forEach((sound) => {
      this.loadSound(sound);
    });
  }

  /**
   * 載入單個音效
   */
  private loadSound(type: SoundType): HTMLAudioElement | null {
    const url = SOUND_URLS[type];
    if (!url) return null;

    if (this.audioCache.has(url)) {
      return this.audioCache.get(url)!;
    }

    try {
      const audio = new Audio(url);
      audio.volume = this.volume;
      audio.preload = 'auto';
      this.audioCache.set(url, audio);
      return audio;
    } catch (error) {
      console.warn(`Failed to load sound: ${type}`, error);
      return null;
    }
  }

  /**
   * 播放音效
   */
  play(type: SoundType, options?: { volume?: number; loop?: boolean }): void {
    if (!this.enabled || this.muted) return;

    const audio = this.loadSound(type);
    if (!audio) return;

    try {
      // 克隆 audio 節點以支援同時播放多個相同音效
      const clone = audio.cloneNode(true) as HTMLAudioElement;
      clone.volume = (options?.volume ?? 1) * this.volume;
      clone.loop = options?.loop ?? false;

      clone.play().catch((error) => {
        // 忽略自動播放被阻擋的錯誤
        if (error.name !== 'NotAllowedError') {
          console.warn(`Failed to play sound: ${type}`, error);
        }
      });

      // 播放完畢後清理
      if (!options?.loop) {
        clone.onended = () => {
          clone.remove();
        };
      }
    } catch (error) {
      console.warn(`Failed to play sound: ${type}`, error);
    }
  }

  /**
   * 停止所有音效
   */
  stopAll(): void {
    this.audioCache.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
  }

  /**
   * 設定音量 (0-1)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('soundVolume', this.volume.toString());

    this.audioCache.forEach((audio) => {
      audio.volume = this.volume;
    });
  }

  /**
   * 取得音量
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * 設定靜音
   */
  setMuted(muted: boolean): void {
    this.muted = muted;
    localStorage.setItem('soundMuted', muted.toString());
  }

  /**
   * 取得靜音狀態
   */
  isMuted(): boolean {
    return this.muted;
  }

  /**
   * 切換靜音
   */
  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /**
   * 啟用/停用音效
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    localStorage.setItem('soundEnabled', enabled.toString());
  }

  /**
   * 取得啟用狀態
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// 單例
export const soundManager = new SoundManager();

// 便捷方法
export const playSound = (type: SoundType, options?: { volume?: number; loop?: boolean }) => {
  soundManager.play(type, options);
};

export default soundManager;
