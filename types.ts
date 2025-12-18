
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
}

export type AppView = 'library' | 'reader' | 'discover';
