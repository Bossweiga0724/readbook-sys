
import React, { useState, useEffect } from 'react';
import { Book, BookSource } from '../types';
import { bookParser } from '../services/bookSourceService';

interface Category {
  title: string;
  url: string;
}

interface DiscoverProps {
  onAddBook: (book: Book) => void;
  existingBookTitles: string[];
}

const Discover: React.FC<DiscoverProps> = ({ onAddBook, existingBookTitles }) => {
  const [sources, setSources] = useState<BookSource[]>(() => {
    const saved = localStorage.getItem('pureRead_sources');
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedSource, setSelectedSource] = useState<BookSource | null>(null);
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingBook, setAddingBook] = useState<string | null>(null);
  
  const [showProxySettings, setShowProxySettings] = useState(false);
  const [proxyPrefix, setProxyPrefix] = useState(() => 
    localStorage.getItem('pureRead_proxy_prefix') || 'http://129.204.21.239:88/proxy?url='
  );

  useEffect(() => {
    localStorage.setItem('pureRead_sources', JSON.stringify(sources));
  }, [sources]);

  const handleSaveProxy = () => {
    localStorage.setItem('pureRead_proxy_prefix', proxyPrefix);
    setShowProxySettings(false);
    if (selectedSource && currentCategory) {
      triggerLoad();
    }
  };

  const triggerLoad = async () => {
    if (!selectedSource || !currentCategory) return;
    setLoading(true);
    try {
      const baseUrl = selectedSource.bookSourceUrl || '';
      let finalUrl = currentCategory.url.startsWith('http') 
        ? currentCategory.url 
        : (baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl) + currentCategory.url;
      
      finalUrl = finalUrl.replace('{{page}}', '1');
      const data = await bookParser.fetchBookList(selectedSource, finalUrl);
      setBooks(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    triggerLoad();
  }, [selectedSource, currentCategory]);

  const parseExploreUrl = (exploreUrl?: string): Category[] => {
    if (!exploreUrl) return [];
    try {
      const parsed = JSON.parse(exploreUrl);
      if (Array.isArray(parsed)) {
        return parsed.map(item => ({ title: item.title || '未知', url: item.url || '' })).filter(item => item.url);
      }
    } catch (e) {
      return exploreUrl.split('\n')
        .map(line => {
          const parts = line.split('::');
          return parts.length >= 2 ? { title: parts[0].trim(), url: parts[1].trim() } : null;
        })
        .filter((item): item is Category => item !== null && !!item.url);
    }
    return [];
  };

  const handleImportSources = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const newSources = (Array.isArray(json) ? json : [json]).map(s => ({
          ...s,
          bookSourceName: s.bookSourceName || '未命名书源',
          bookSourceUrl: s.bookSourceUrl || ''
        })).filter(s => s.bookSourceUrl);
        setSources(prev => {
          const combined = [...prev, ...newSources];
          return combined.filter((v, i, a) => a.findIndex(t => t.bookSourceUrl === v.bookSourceUrl) === i);
        });
      } catch (err) { alert("JSON 格式错误"); }
    };
    reader.readAsText(file);
  };

  const handleAddBook = async (item: any) => {
    if (!selectedSource || !item) return;
    setAddingBook(item.title);
    try {
      const result = await bookParser.fetchBookDetail(selectedSource, item.bookUrl);
      const newBook: Book = {
        id: Math.random().toString(36).substr(2, 9),
        title: item.title || '未知书名',
        author: item.author || '未知作者',
        cover: item.coverUrl || `https://picsum.photos/seed/${encodeURIComponent(item.title || 'book')}/400/600`,
        description: result.description || item.description || "暂无简介",
        category: item.category || "网络小说",
        progress: 0,
        sourceUrl: item.bookUrl,
        chapters: (result?.chapters || []).map((c: any, idx: number) => ({
          id: `gen-${idx}`,
          title: c.title || `第 ${idx + 1} 章`,
          content: c.content || ''
        }))
      };
      onAddBook(newBook);
    } catch (err) {
      alert("内容获取失败。请确保服务器 88 端口已放行，并正确配置了 Nginx /proxy 规则。");
    } finally {
      setAddingBook(null);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto px-4 sm:px-8 pb-32">
      <header className="py-12 flex items-end justify-between gap-4">
        <div className="overflow-hidden">
          <h1 className="text-4xl font-black tracking-tight mb-2 bg-gradient-to-r from-blue-600 to-indigo-400 bg-clip-text text-transparent truncate">
            书源中心
          </h1>
          <p className="text-gray-400 font-medium italic truncate">私有服务器：129.204.21.239:88</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowProxySettings(true)}
            className="p-3.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-2xl hover:bg-gray-200 transition-all active:scale-95 shadow-sm"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>

          <label className="flex items-center gap-2 px-6 py-3.5 bg-blue-600 text-white rounded-2xl cursor-pointer transition-all active:scale-95 shrink-0 shadow-lg shadow-blue-500/20">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            <span className="font-black text-sm">导入 JSON</span>
            <input type="file" className="hidden" accept=".json" onChange={handleImportSources} />
          </label>
        </div>
      </header>

      {showProxySettings && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowProxySettings(false)} />
          <div className="relative bg-white dark:bg-gray-900 w-full max-w-md rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-black mb-2">反向代理设置</h2>
            <p className="text-sm text-gray-500 mb-6 font-medium leading-relaxed">抓取外部书籍需要经过 Nginx 代理。请在 88 端口的 server 块内配置 <b>location /proxy</b> 规则。</p>
            
            <div className="space-y-4 mb-8">
              <label className="block">
                <span className="text-xs font-black uppercase text-gray-400 mb-2 block">代理地址 (前缀)</span>
                <input 
                  type="text" 
                  className="w-full px-4 py-3.5 bg-gray-100 dark:bg-gray-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/50 font-mono text-xs"
                  placeholder="例如: http://129.204.21.239:88/proxy?url="
                  value={proxyPrefix}
                  onChange={(e) => setProxyPrefix(e.target.value)}
                />
              </label>
              
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setProxyPrefix('http://129.204.21.239:88/proxy?url=')} className="text-[10px] px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-bold shadow-md shadow-blue-500/20">默认私有服务器 (88端口/proxy)</button>
                <button onClick={() => setProxyPrefix('https://corsproxy.io/?')} className="text-[10px] px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-blue-500/10 hover:text-blue-500 transition-all font-bold">使用公共代理</button>
                <button onClick={() => setProxyPrefix('')} className="text-[10px] px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-all font-bold">禁用代理</button>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setShowProxySettings(false)} className="flex-1 py-3.5 rounded-2xl font-black text-sm bg-gray-100 dark:bg-gray-800">取消</button>
              <button onClick={handleSaveProxy} className="flex-1 py-3.5 rounded-2xl font-black text-sm bg-blue-600 text-white shadow-lg shadow-blue-500/20">保存设置</button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-10">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4 px-1 opacity-60">本地书源库 ({sources.length})</h2>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {sources.map((s, idx) => {
            let hostname = "未知地址";
            try { if (s.bookSourceUrl) hostname = new URL(s.bookSourceUrl).hostname; } catch(e) {}
            const isSelected = selectedSource?.bookSourceUrl === s.bookSourceUrl;
            return (
              <button
                key={idx}
                onClick={() => { setSelectedSource(s); setCurrentCategory(null); setBooks([]); }}
                className={`flex-shrink-0 px-6 py-5 rounded-[32px] border-2 transition-all flex flex-col items-start gap-1 min-w-[180px] group ${
                  isSelected 
                  ? 'border-blue-500 bg-blue-500/5 ring-4 ring-blue-500/5' 
                  : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 opacity-60 hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-2 mb-1 w-full">
                  <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}`} />
                  <span className="text-xs font-black text-gray-400 uppercase tracking-tighter">{s.bookSourceGroup?.split(',')[0] || '书源'}</span>
                </div>
                <span className="text-base font-black truncate w-full text-left">{s.bookSourceName}</span>
                <span className="text-[10px] opacity-40 font-bold truncate w-full text-left font-mono">{hostname}</span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedSource && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-500 mb-10 bg-gray-50 dark:bg-white/5 p-8 rounded-[40px]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black">{selectedSource.bookSourceName}</h2>
              <p className="text-xs text-gray-400 font-bold mt-1">本地解析发现页：</p>
            </div>
            <button onClick={() => {
              const updated = sources.filter(s => s.bookSourceUrl !== selectedSource.bookSourceUrl);
              setSources(updated);
              setSelectedSource(null);
            }} className="p-3 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2.5">
            {parseExploreUrl(selectedSource.exploreUrl).map((cat, i) => (
              <button
                key={i}
                onClick={() => setCurrentCategory(cat)}
                className={`px-6 py-3 rounded-2xl text-sm font-black transition-all transform active:scale-95 ${
                  currentCategory?.url === cat.url 
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20 translate-y-[-2px]' 
                  : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm border border-transparent'
                }`}
              >
                {cat.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800/20 p-6 rounded-[40px] border border-gray-100 dark:border-gray-800 animate-pulse h-52 flex gap-6">
              <div className="w-28 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
              <div className="flex-1 space-y-4 py-2">
                <div className="h-5 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded-2xl w-full mt-6" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-32">
          {books.map((book, idx) => (
            <div key={idx} className="group bg-white dark:bg-gray-800/40 p-6 rounded-[40px] border border-gray-100 dark:border-gray-800 hover:border-blue-500/40 transition-all hover:shadow-2xl flex gap-6 h-full">
               <div className="w-28 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl shrink-0 bg-gray-50 dark:bg-gray-900 transform group-hover:scale-105 transition-transform duration-500">
                  <img src={book.coverUrl || `https://picsum.photos/seed/${encodeURIComponent(book.title || 'book')}/200/300`} className="w-full h-full object-cover" alt={book.title} />
               </div>
               <div className="flex-1 flex flex-col justify-between overflow-hidden">
                  <div>
                    <h3 className="font-black text-xl line-clamp-1 mb-1 group-hover:text-blue-500 transition-colors">{book.title || '未知书名'}</h3>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-bold px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded-lg">{book.category || '小说'}</span>
                      <span className="text-xs text-gray-400 font-bold truncate">{book.author || '未知作者'}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed opacity-70 italic">{book.description || "加载完成，等待录入"}</p>
                  </div>
                  <button 
                    disabled={addingBook === book.title || existingBookTitles.includes(book.title)}
                    onClick={() => handleAddBook(book)}
                    className={`mt-6 py-3.5 rounded-2xl text-xs font-black transition-all active:scale-95 flex items-center justify-center gap-2 ${
                      existingBookTitles.includes(book.title)
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                        : addingBook === book.title
                          ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20'
                    }`}
                  >
                    {existingBookTitles.includes(book.title) ? "已在书架" : addingBook === book.title ? "本地解析中..." : "获取正文"}
                  </button>
               </div>
            </div>
          ))}
          {currentCategory && books.length === 0 && !loading && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center bg-gray-50 dark:bg-white/5 rounded-[40px] text-gray-400">
               <div className="w-20 h-20 mb-6 opacity-20"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg></div>
               <p className="text-xl font-black">未发现内容</p>
               <p className="text-sm mt-2 opacity-60 font-bold">请确认服务器 Nginx 88 端口已放行入站流量</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Discover;
