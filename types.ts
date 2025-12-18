
export enum ThemeMode {
  DAY = 'day',
  NIGHT = 'night',
  EYECARE = 'eyecare',
  CUSTOM = 'custom'
}

export enum PageFlipMode {
  SCROLL = 'scroll',      
  HORIZONTAL = 'horizontal', 
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
  sourceUrl?: string; // 记录来源
}

// 模拟 Legado (阅读) 书源结构
export interface BookSource {
  bookSourceName: string;
  bookSourceUrl: string;
  bookSourceGroup?: string;
  exploreUrl?: string;
  ruleExplore?: any;
  ruleSearch?: any;
  ruleToc?: any;
  ruleContent?: any;
  // Added ruleBookInfo property to fix type mismatch in bookSourceService.ts
  ruleBookInfo?: any;
  searchUrl?: string;
}

export type AppView = 'library' | 'reader' | 'discover';
