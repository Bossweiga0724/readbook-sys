
import { Book, ReadingSettings, ThemeMode, PageFlipMode } from './types';

export const DEFAULT_SETTINGS: ReadingSettings = {
  fontSize: 20,
  lineHeight: 1.8,
  letterSpacing: 0.5,
  fontFamily: "'Noto Serif SC', serif",
  theme: ThemeMode.DAY,
  flipMode: PageFlipMode.HORIZONTAL,
  indent: true
};

export const THEME_COLORS = {
  [ThemeMode.DAY]: { bg: 'bg-[#ffffff]', text: 'text-[#1a1a1a]', border: 'border-gray-100', secondary: 'bg-gray-50' },
  [ThemeMode.NIGHT]: { bg: 'bg-[#121212]', text: 'text-[#e0e0e0]', border: 'border-gray-800', secondary: 'bg-[#1e1e1e]' },
  [ThemeMode.EYECARE]: { bg: 'bg-[#f4ecd8]', text: 'text-[#5b4636]', border: 'border-[#e4dcc8]', secondary: 'bg-[#ede3c9]' },
  [ThemeMode.CUSTOM]: { bg: 'bg-[#e3f2fd]', text: 'text-[#0d47a1]', border: 'border-[#bbdefb]', secondary: 'bg-[#d1e9ff]' }
};

export const MOCK_BOOKS: Book[] = [
  {
    id: '1',
    title: '了不起的盖茨比',
    author: 'F·司各特·菲茨杰拉德',
    cover: 'https://images.unsplash.com/photo-1543004218-2c1402ed482c?q=80&w=400&h=600&auto=format&fit=crop',
    description: '二十世纪末最伟大的美国小说之一。',
    category: '经典文学',
    progress: 45,
    chapters: [
      { id: 'c1', title: '第一章', content: '我年纪还轻、阅历不深的时候，父亲教导过我一句话，我至今还经常在脑海里反复琢磨。\n“每逢你想要批评任何人的时候，”他对我说，“你就记住，这个世界上的人并非都具备你拥有的条件。”' },
      { id: 'c2', title: '第二章', content: '在西卵和纽约之间，有一片几乎是荒芜的土地，那是灰烬的谷地。这是一个神奇的农场，灰烬像麦子一样生长成山脊、山丘和奇异的园林。' }
    ]
  }
];

export const FONT_FAMILIES = [
  { name: '默认系统', value: 'system-ui' },
  { name: '思源宋体', value: "'Noto Serif SC', serif" },
  { name: '现代黑体', value: 'sans-serif' },
  { name: '等宽字体', value: 'monospace' },
  { name: '手写体', value: "'Zhi Mang Xing', cursive" }
];
