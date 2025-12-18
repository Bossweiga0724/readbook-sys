
import React, { useState } from 'react';
import { Book, Chapter } from '../types';

interface LibraryProps {
  books: Book[];
  onOpenBook: (book: Book) => void;
  onImport: (book: Book) => void;
  onDelete: (id: string) => void;
}

const Library: React.FC<LibraryProps> = ({ books, onOpenBook, onImport, onDelete }) => {
  const [search, setSearch] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);

  const parseTextToChapters = (text: string): Chapter[] => {
    const chapterRegex = /(第\s*[一二三四五六七八九十百千万\d]+\s*[章节回])|(\n#{1,3}\s+.+)/g;
    const parts = text.split(chapterRegex);
    const chapters: Chapter[] = [];
    
    if (parts.length <= 1) {
      const chunkSize = 5000;
      for (let i = 0; i < text.length; i += chunkSize) {
        chapters.push({
          id: `chunk-${i}`,
          title: i === 0 ? '开始阅读' : `第 ${Math.floor(i/chunkSize) + 1} 部分`,
          content: text.substring(i, i + chunkSize)
        });
      }
      return chapters;
    }

    let currentTitle = '开始阅读';
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;
      if (part.match(chapterRegex)) {
        currentTitle = part.trim();
      } else {
        const content = part.trim();
        if (content) {
          chapters.push({ id: `chapter-${chapters.length}`, title: currentTitle, content });
        }
      }
    }
    return chapters;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      const uint8Array = new Uint8Array(buffer);
      
      let content = "";
      try {
        const decoder = new TextDecoder('utf-8', { fatal: true });
        content = decoder.decode(uint8Array);
      } catch (err) {
        const decoder = new TextDecoder('gbk');
        content = decoder.decode(uint8Array);
      }
      
      try {
        const chapters = parseTextToChapters(content);
        const newBook: Book = {
          id: Math.random().toString(36).substr(2, 9),
          title: file.name.replace(/\.[^/.]+$/, ""),
          author: '本地导入',
          cover: `https://picsum.photos/seed/${encodeURIComponent(file.name)}/400/600`,
          description: `导入时间：${new Date().toLocaleString()}`,
          category: '本地文件',
          progress: 0,
          chapters: chapters
        };
        onImport(newBook);
        setTimeout(() => setIsParsing(false), 500);
      } catch (err) {
        setIsParsing(false);
        alert("解析失败");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const filteredBooks = books.filter(b => 
    b.title.toLowerCase().includes(search.toLowerCase()) || 
    b.author.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto px-4 sm:px-8">
      <header className="py-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h1 className="text-4xl font-black tracking-tight mb-2 bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
            我的书架
          </h1>
          <p className="text-gray-400 font-medium">共 {books.length} 本书籍，继续享受阅读</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative group">
            <input 
              type="text" 
              placeholder="搜索书籍..."
              className="w-full md:w-72 pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-800/50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all border border-transparent focus:border-blue-500/50 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <label className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl cursor-pointer shadow-lg shadow-blue-500/30 transition-all active:scale-95 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            <span className="font-bold text-sm">导入</span>
            <input type="file" className="hidden" accept=".txt,.md" onChange={handleFileUpload} />
          </label>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        {filteredBooks.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-8 gap-y-12">
            {filteredBooks.map(book => (
              <div key={book.id} className="group relative flex flex-col">
                <div 
                  className="relative aspect-[3/4] mb-4 rounded-xl overflow-hidden shadow-[0_10px_30px_-10px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] cursor-pointer transform transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.25)]"
                  onClick={() => onOpenBook(book)}
                >
                  <img src={book.cover} className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500" alt={book.title} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <p className="text-white text-[10px] font-bold uppercase tracking-wider">{book.category}</p>
                  </div>
                  
                  {book.progress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/20 backdrop-blur-sm">
                      <div className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] transition-all duration-1000" style={{ width: `${book.progress}%` }} />
                    </div>
                  )}

                  {/* 删除按钮 */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setBookToDelete(book);
                    }}
                    className="absolute top-2 right-2 p-2 bg-black/40 hover:bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all backdrop-blur-md transform translate-y-2 group-hover:translate-y-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
                <h3 className="text-sm font-bold line-clamp-2 leading-tight px-1 group-hover:text-blue-500 transition-colors">{book.title}</h3>
                <p className="text-[11px] text-gray-400 mt-1.5 px-1 font-medium">{book.author}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-gray-400 opacity-50">
             <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
             <p className="text-lg font-medium">书架空空如也，导入一本开启阅读吧</p>
          </div>
        )}
      </main>

      {/* 删除确认 Modal */}
      {bookToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setBookToDelete(null)} />
          <div className="relative bg-white dark:bg-gray-900 w-full max-w-sm rounded-[32px] p-8 shadow-2xl transform transition-all animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h2 className="text-xl font-bold text-center mb-2">确认移除书籍？</h2>
            <p className="text-gray-500 dark:text-gray-400 text-center text-sm mb-8 leading-relaxed">
              确定要将 <span className="font-bold text-gray-900 dark:text-white">《{bookToDelete.title}》</span> 从书架移除吗？此操作无法撤销，您的阅读进度也将丢失。
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setBookToDelete(null)}
                className="py-3 px-6 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-2xl font-bold text-sm transition-colors"
              >
                取消
              </button>
              <button 
                onClick={() => {
                  onDelete(bookToDelete.id);
                  setBookToDelete(null);
                }}
                className="py-3 px-6 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-red-500/30 transition-all active:scale-95"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {isParsing && (
        <div className="fixed inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl z-[100] flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-800 border-t-blue-500 rounded-full animate-spin mb-6" />
          <h2 className="text-2xl font-black tracking-tight">正在解析...</h2>
          <p className="text-gray-400 mt-2">正在智能处理编码与章节结构</p>
        </div>
      )}
    </div>
  );
};

export default Library;
