
import React, { useState, useEffect } from 'react';
import { fetchBookRankings, getBookFullContent } from '../services/geminiService';
import { Book } from '../types';

interface DiscoverProps {
  onAddBook: (book: Book) => void;
  existingBookTitles: string[];
}

const Discover: React.FC<DiscoverProps> = ({ onAddBook, existingBookTitles }) => {
  const [rankings, setRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await fetchBookRankings();
      setRankings(data);
      setLoading(false);
    };
    load();
  }, []);

  const handleAddBook = async (item: any) => {
    if (addingId) return;
    setAddingId(item.title);
    
    try {
      // 快速调用内容获取接口
      const result = await getBookFullContent(item.title, item.author);
      
      const newBook: Book = {
        id: Math.random().toString(36).substr(2, 9),
        title: item.title,
        author: item.author,
        cover: `https://picsum.photos/seed/${encodeURIComponent(item.title)}/400/600`,
        description: item.description,
        category: item.category,
        progress: 0,
        chapters: result.chapters && result.chapters.length > 0 ? result.chapters.map((c: any, idx: number) => ({
          id: `gen-${idx}`,
          title: c.title || `第 ${idx + 1} 章`,
          content: c.content
        })) : [
          { id: 'placeholder', title: '暂无正文', content: '书籍内容正在云端整理中，请稍后再试。' }
        ]
      };
      
      onAddBook(newBook);
    } catch (err) {
      console.error("添加图书失败:", err);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto px-4 sm:px-8 pb-32">
      <header className="py-12">
        <h1 className="text-4xl font-black tracking-tight mb-2 bg-gradient-to-r from-blue-600 to-indigo-400 bg-clip-text text-transparent">
          发现中国名著
        </h1>
        <p className="text-gray-400 font-medium italic">Gemini 智选国内经典文学与公版资源，整理章节一键入库</p>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1,2,3,4,5,6,7,8,9].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800/20 p-6 rounded-[32px] border border-gray-100 dark:border-gray-800/50 animate-pulse flex gap-4 h-52">
              <div className="w-24 bg-gray-100 dark:bg-gray-800 rounded-xl" />
              <div className="flex-1 space-y-4 py-2">
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-2xl w-full mt-4" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {rankings.map((item, idx) => {
            const isAdded = existingBookTitles.includes(item.title);
            const isProcessing = addingId === item.title;

            return (
              <div key={idx} className="group relative bg-white dark:bg-gray-800/40 p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 hover:border-blue-500/40 transition-all hover:shadow-2xl hover:shadow-blue-500/10 flex gap-4 h-full">
                <div className="w-24 aspect-[3/4] rounded-xl overflow-hidden shadow-lg shrink-0">
                  <img src={`https://picsum.photos/seed/${encodeURIComponent(item.coverKeyword || item.title)}/200/300`} className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all" alt={item.title} />
                </div>
                <div className="flex-1 flex flex-col justify-between overflow-hidden">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1 inline-block">{item.category}</span>
                    <h3 className="font-black text-lg line-clamp-1 leading-tight mb-0.5">{item.title}</h3>
                    <p className="text-sm text-gray-400 font-medium truncate mb-2">{item.author}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed opacity-80">{item.description}</p>
                  </div>
                  
                  <button 
                    disabled={isProcessing || isAdded}
                    onClick={() => handleAddBook(item)}
                    className={`mt-4 py-2.5 rounded-2xl text-xs font-black transition-all active:scale-95 flex items-center justify-center gap-2 ${
                      isAdded 
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-default' 
                        : isProcessing 
                          ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' 
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30'
                    }`}
                  >
                    {isAdded ? (
                      <>已在书架</>
                    ) : isProcessing ? (
                      <>
                        <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        资源整理中...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                        加入书架
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Discover;
