
import React, { useState, useEffect, useRef } from 'react';
import { Book, ReadingSettings, Chapter, ThemeMode, PageFlipMode } from '../types';
import { THEME_COLORS, FONT_FAMILIES } from '../constants';
import { summarizeChapter } from '../services/geminiService';

interface ReaderProps {
  book: Book;
  settings: ReadingSettings;
  onUpdateSettings: (settings: ReadingSettings) => void;
  onBack: () => void;
  onUpdateProgress: (chapterId: string, progress: number) => void;
}

const Reader: React.FC<ReaderProps> = ({ book, settings, onUpdateSettings, onBack, onUpdateProgress }) => {
  const [currentChapterIdx, setCurrentChapterIdx] = useState(() => {
    const idx = book.chapters.findIndex(c => c.id === book.lastReadChapterId);
    return idx === -1 ? 0 : idx;
  });
  
  const [showControls, setShowControls] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [viewWidth, setViewWidth] = useState(window.innerWidth);
  
  // 用于标记跳转章节后是否需要定位到最后一页
  const pendingLastPageRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLDivElement>(null);

  const chapter = book.chapters[currentChapterIdx];
  const theme = THEME_COLORS[settings.theme];

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => setViewWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 核心：计算总页数并处理跨章定位
  useEffect(() => {
    const calculatePages = () => {
      if (settings.flipMode === PageFlipMode.HORIZONTAL && articleRef.current && containerRef.current) {
        const scrollWidth = articleRef.current.scrollWidth;
        const clientWidth = containerRef.current.clientWidth;
        if (clientWidth === 0) return;
        
        const pages = Math.round(scrollWidth / clientWidth);
        const finalTotal = Math.max(1, pages);
        setTotalPages(finalTotal);

        if (pendingLastPageRef.current) {
          setCurrentPage(finalTotal - 1);
          pendingLastPageRef.current = false;
        } else {
          setCurrentPage(0);
        }
      }
    };

    // 给 DOM 渲染留出微小缓冲时间以获取准确的 scrollWidth
    const timer = setTimeout(calculatePages, 50);
    return () => clearTimeout(timer);
  }, [currentChapterIdx, settings.flipMode, settings.fontSize, settings.fontFamily, settings.lineHeight, viewWidth]);

  useEffect(() => {
    const progress = Math.round(((currentChapterIdx + 1) / book.chapters.length) * 100);
    onUpdateProgress(chapter.id, progress);
  }, [currentChapterIdx, chapter.id]);

  const toggleControls = () => setShowControls(!showControls);

  const handlePrev = () => {
    if (settings.flipMode === PageFlipMode.HORIZONTAL) {
      if (currentPage > 0) {
        setCurrentPage(currentPage - 1);
      } else if (currentChapterIdx > 0) {
        // 跨章回退：设置标记，等 useEffect 计算完新章节页数后跳转到末页
        pendingLastPageRef.current = true;
        setCurrentChapterIdx(currentChapterIdx - 1);
      }
    } else {
      if (currentChapterIdx > 0) {
        setCurrentChapterIdx(currentChapterIdx - 1);
        // 滚动模式下直接跳到顶部
        containerRef.current?.scrollTo(0, 0);
      }
    }
  };

  const handleNext = () => {
    if (settings.flipMode === PageFlipMode.HORIZONTAL) {
      if (currentPage < totalPages - 1) {
        setCurrentPage(currentPage + 1);
      } else if (currentChapterIdx < book.chapters.length - 1) {
        pendingLastPageRef.current = false;
        setCurrentChapterIdx(currentChapterIdx + 1);
      }
    } else {
      if (currentChapterIdx < book.chapters.length - 1) {
        setCurrentChapterIdx(currentChapterIdx + 1);
        containerRef.current?.scrollTo(0, 0);
      }
    }
  };

  const handleCenterClick = (e: React.MouseEvent) => {
    const { clientX } = e;
    const width = window.innerWidth;
    if (clientX > width * 0.3 && clientX < width * 0.7) {
      toggleControls();
    } else if (clientX <= width * 0.3) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  const updateSetting = <K extends keyof ReadingSettings>(key: K, value: ReadingSettings[K]) => {
    onUpdateSettings({ ...settings, [key]: value });
  };

  return (
    <div className={`fixed inset-0 flex flex-col select-none overflow-hidden ${theme.bg} ${theme.text} transition-colors duration-500`}>
      {/* 顶部控制条 */}
      <div className={`fixed top-0 left-0 right-0 p-4 flex items-center justify-between z-[60] transition-all duration-300 transform ${showControls ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'} ${theme.bg} border-b ${theme.border} backdrop-blur-md bg-opacity-90`}>
        <button onClick={onBack} className="p-2.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-full active:scale-95 transition-all">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex flex-col items-center">
          <h2 className="text-[10px] opacity-40 uppercase tracking-[0.2em] font-bold">{book.title}</h2>
          <p className="text-sm font-black truncate max-w-[180px] mt-0.5">{chapter.title}</p>
        </div>
        <button onClick={async () => {
          setIsSummarizing(true);
          const res = await summarizeChapter(chapter.content);
          setSummary(res);
          setIsSummarizing(false);
          setShowControls(false);
        }} className="p-2.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        </button>
      </div>

      {/* 阅读核心容器 */}
      <div 
        ref={containerRef}
        className={`flex-1 relative ${settings.flipMode === PageFlipMode.SCROLL ? 'overflow-y-auto scroll-smooth' : 'overflow-hidden'}`}
        onClick={handleCenterClick}
      >
        <div 
          ref={articleRef}
          className="h-full transition-transform duration-300 ease-out"
          style={settings.flipMode === PageFlipMode.HORIZONTAL ? {
            columnWidth: '100vw',
            columnGap: '0',
            height: '100%',
            transform: `translateX(-${currentPage * 100}%)`,
          } : {
            padding: '80px 24px'
          }}
        >
          <article 
            className="max-w-2xl mx-auto px-6"
            style={{
              fontSize: `${settings.fontSize}px`,
              lineHeight: settings.lineHeight,
              letterSpacing: `${settings.letterSpacing}px`,
              fontFamily: settings.fontFamily,
              textAlign: 'justify',
              paddingTop: settings.flipMode === PageFlipMode.HORIZONTAL ? '60px' : '0',
              paddingBottom: settings.flipMode === PageFlipMode.HORIZONTAL ? '60px' : '0',
              height: settings.flipMode === PageFlipMode.HORIZONTAL ? '100%' : 'auto',
            }}
          >
            {summary && (
              <div className="mb-10 p-5 bg-blue-500/5 dark:bg-blue-400/10 border-l-4 border-blue-500 rounded-xl text-sm relative break-inside-avoid shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                 <p className="font-bold text-blue-500 mb-2 flex items-center gap-2">
                   <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
                   AI 章节导读
                 </p>
                 <p className="leading-relaxed opacity-90">{summary}</p>
                 <button onClick={(e) => {e.stopPropagation(); setSummary(null)}} className="absolute top-3 right-3 text-xs opacity-40 hover:opacity-100 transition-opacity">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>
            )}
            <h1 className="text-3xl font-black mb-12 opacity-90 break-inside-avoid leading-tight">{chapter.title}</h1>
            <div className={`${settings.indent ? 'indent-[2em]' : ''} space-y-8`}>
              {chapter.content.split('\n').filter(p => p.trim()).map((p, i) => (
                <p key={i} className="mb-6">{p.trim()}</p>
              ))}
            </div>
          </article>
        </div>

        {/* 底部指示条 */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-between px-10 text-[10px] font-bold opacity-30 pointer-events-none tracking-widest">
          <span className="truncate max-w-[150px]">{chapter.title}</span>
          {settings.flipMode === PageFlipMode.HORIZONTAL && (
            <span>{currentPage + 1} / {totalPages}</span>
          )}
          <span>{Math.round(((currentChapterIdx + 1)/book.chapters.length)*100)}%</span>
        </div>
      </div>

      {/* 底部主控制面板 */}
      <div className={`fixed bottom-0 left-0 right-0 z-[60] transition-all duration-500 transform ${showControls ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'} ${theme.bg} border-t ${theme.border} pb-safe shadow-[0_-20px_50px_rgba(0,0,0,0.1)]`}>
        <div className="max-w-2xl mx-auto p-6 space-y-8">
          <div className="flex items-center gap-6">
             <button onClick={handlePrev} className="p-2 opacity-40 hover:opacity-100"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg></button>
             <input 
               type="range" 
               min="0" 
               max={book.chapters.length - 1} 
               value={currentChapterIdx} 
               onChange={(e) => setCurrentChapterIdx(parseInt(e.target.value))} 
               className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full appearance-none cursor-pointer accent-blue-500" 
             />
             <button onClick={handleNext} className="p-2 opacity-40 hover:opacity-100"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg></button>
          </div>

          <div className="flex justify-around items-center">
            <button onClick={() => setShowSettings(!showSettings)} className={`flex flex-col items-center gap-2 transition-all ${showSettings ? 'text-blue-500 scale-110' : 'opacity-40 hover:opacity-100'}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
              <span className="text-[10px] font-bold">显示设置</span>
            </button>
            <button onClick={() => updateSetting('flipMode', settings.flipMode === PageFlipMode.SCROLL ? PageFlipMode.HORIZONTAL : PageFlipMode.SCROLL)} className="flex flex-col items-center gap-2 opacity-40 hover:opacity-100 transition-all">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
              <span className="text-[10px] font-bold">{settings.flipMode === PageFlipMode.SCROLL ? '分页阅读' : '滚动阅读'}</span>
            </button>
            <button className="flex flex-col items-center gap-2 opacity-40 hover:opacity-100" onClick={() => setShowControls(false)}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              <span className="text-[10px] font-bold">沉浸模式</span>
            </button>
          </div>
        </div>
      </div>

      {/* 偏好设置面板抽屉 */}
      <div className={`fixed inset-x-0 bottom-0 z-[70] transition-all duration-500 transform ${showSettings ? 'translate-y-0' : 'translate-y-full'} ${theme.bg} border-t ${theme.border} rounded-t-[40px] p-8 sm:p-10 shadow-2xl max-h-[85vh] overflow-y-auto`}>
        <div className="max-w-xl mx-auto space-y-10">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black">个性化阅读</h3>
            <button onClick={() => setShowSettings(false)} className="bg-blue-500/10 text-blue-500 px-5 py-2.5 rounded-2xl text-xs font-bold active:scale-95 transition-all">完成配置</button>
          </div>
          
          <div className="grid gap-10">
            {/* 字体选择 */}
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <p className="font-bold">正文字体</p>
                <p className="text-[10px] opacity-40 font-bold uppercase tracking-wider">Typography Select</p>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2">
                {FONT_FAMILIES.map(f => (
                  <button 
                    key={f.value} 
                    onClick={() => updateSetting('fontFamily', f.value)}
                    className={`flex-shrink-0 px-6 py-3 rounded-2xl text-sm border-2 transition-all ${settings.fontFamily === f.value ? 'border-blue-500 bg-blue-500/5 text-blue-500' : 'border-transparent bg-gray-100 dark:bg-gray-800'}`}
                    style={{ fontFamily: f.value }}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold mb-1">字号大小</p>
                <p className="text-[10px] opacity-40 font-bold uppercase tracking-wider">Font Size Control</p>
              </div>
              <div className="flex items-center gap-6">
                <button onClick={() => updateSetting('fontSize', Math.max(12, settings.fontSize - 1))} className="w-12 h-12 bg-black/5 dark:bg-white/5 rounded-2xl flex items-center justify-center text-xl font-bold active:scale-90 transition-all text-blue-500">-</button>
                <span className="w-8 text-center font-black text-lg">{settings.fontSize}</span>
                <button onClick={() => updateSetting('fontSize', Math.min(48, settings.fontSize + 1))} className="w-12 h-12 bg-black/5 dark:bg-white/5 rounded-2xl flex items-center justify-center text-xl font-bold active:scale-90 transition-all text-blue-500">+</button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold mb-1">视觉主题</p>
                <p className="text-[10px] opacity-40 font-bold uppercase tracking-wider">Color Themes</p>
              </div>
              <div className="flex gap-3">
                {Object.values(ThemeMode).map(m => (
                  <button 
                    key={m} 
                    onClick={() => updateSetting('theme', m)} 
                    className={`w-12 h-12 rounded-2xl border-4 transition-all transform ${settings.theme === m ? 'border-blue-500 scale-110 shadow-lg' : 'border-transparent opacity-60'} ${THEME_COLORS[m].bg}`} 
                  />
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold mb-1">首行缩进</p>
                <p className="text-[10px] opacity-40 font-bold uppercase tracking-wider">Paragraph Indentation</p>
              </div>
              <button 
                onClick={() => updateSetting('indent', !settings.indent)}
                className={`w-14 h-8 rounded-full transition-all relative ${settings.indent ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-800'}`}
              >
                <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-sm transition-all ${settings.indent ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {isSummarizing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[100] flex items-center justify-center">
           <div className="bg-white dark:bg-gray-900 px-10 py-8 rounded-[40px] flex flex-col items-center shadow-2xl animate-in zoom-in-90">
              <div className="w-12 h-12 border-4 border-gray-100 dark:border-gray-800 border-t-blue-500 rounded-full animate-spin mb-6" />
              <p className="font-black text-xl tracking-tight">Gemini 正在深度阅读...</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default Reader;
