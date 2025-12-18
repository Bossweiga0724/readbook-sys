
export enum ThemeMode {
  DAY = 'day',
  NIGHT = 'night',
  EYECARE = 'eyecare',
  CUSTOM = 'custom'
}

export enum PageFlipMode {
  SCROLL = 'scroll',      // 上下滚动
  HORIZONTAL = 'horizontal', // 左右平铺翻页
}

export interface ReadingSettings {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  fontFamily: string;
  theme: ThemeMode;
  customBg?: string;
  flipMode: PageFlipMode;
  indent: boolean;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  cover: string;
  description: string;
  chapters: Chapter[];
  category: string;
  progress: number;
  lastReadChapterId?: string;
}
