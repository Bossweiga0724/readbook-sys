
import React, { useState, useEffect } from 'react';
import { Book, ReadingSettings, AppView } from './types';
import { MOCK_BOOKS, DEFAULT_SETTINGS } from './constants';
import Library from './components/Library';
import Reader from './components/Reader';
import Discover from './components/Discover';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('library');
  const [books, setBooks] = useState<Book[]>(() => {
    const saved = localStorage.getItem('pureRead_books');
    return saved ? JSON.parse(saved) : MOCK_BOOKS;
  });
  
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [settings, setSettings] = useState<ReadingSettings>(() => {
    const saved = localStorage.getItem('pureRead_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem('pureRead_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('pureRead_books', JSON.stringify(books));
  }, [books]);

  const handleOpenBook = (book: Book) => {
    setSelectedBook(book);
    setView('reader');
  };

  const handleBackToLibrary = () => {
    setView('library');
    if (selectedBook) {
      setBooks(prev => prev.map(b => b.id === selectedBook.id ? selectedBook : b));
    }
    setSelectedBook(null);
  };

  const updateBookProgress = (bookId: string, chapterId: string, progress: number) => {
    setBooks(prev => prev.map(b => {
      if (b.id === bookId) {
        return { ...b, progress, lastReadChapterId: chapterId };
      }
      return b;
    }));
    if (selectedBook && selectedBook.id === bookId) {
      setSelectedBook(prev => prev ? { ...prev, progress, lastReadChapterId: chapterId } : null);
    }
  };

  const handleDeleteBook = (id: string) => {
    setBooks(prev => prev.filter(b => b.id !== id));
  };

  const handleAddFromDiscover = (newBook: Book) => {
    setBooks(prev => [newBook, ...prev]);
    // 自动跳转到新书阅读
    setSelectedBook(newBook);
    setView('reader');
  };

  return (
    <div className={`h-full w-full transition-colors duration-500 overflow-hidden flex flex-col ${settings.theme === 'night' ? 'bg-[#121212] text-white' : 'bg-[#fafafa] dark:bg-[#121212] text-black dark:text-white'}`}>
      
      <div className="flex-1 overflow-y-auto">
        {view === 'library' && (
          <Library 
            books={books} 
            onOpenBook={handleOpenBook} 
            onImport={(newBook) => setBooks([newBook, ...books])} 
            onDelete={handleDeleteBook}
          />
        )}

        {view === 'discover' && (
          <Discover 
            onAddBook={handleAddFromDiscover}
            existingBookTitles={books.map(b => b.title)}
          />
        )}
        
        {view === 'reader' && selectedBook && (
          <Reader
            book={selectedBook}
            settings={settings}
            onUpdateSettings={setSettings}
            onBack={handleBackToLibrary}
            onUpdateProgress={(chapterId, prog) => updateBookProgress(selectedBook.id, chapterId, prog)}
          />
        )}
      </div>

      {/* 底部全局导航 */}
      {view !== 'reader' && (
        <nav className="fixed bottom-0 inset-x-0 h-20 bg-white/80 dark:bg-black/80 backdrop-blur-2xl border-t border-gray-100 dark:border-gray-800 flex items-center justify-around px-8 z-[100]">
          <button 
            onClick={() => setView('library')}
            className={`flex flex-col items-center gap-1.5 transition-all ${view === 'library' ? 'text-blue-500 scale-110' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <svg className="w-6 h-6" fill={view === 'library' ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            <span className="text-[10px] font-black uppercase tracking-widest">书架</span>
          </button>
          
          <button 
            onClick={() => setView('discover')}
            className={`flex flex-col items-center gap-1.5 transition-all ${view === 'discover' ? 'text-blue-500 scale-110' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <svg className="w-6 h-6" fill={view === 'discover' ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <span className="text-[10px] font-black uppercase tracking-widest">发现</span>
          </button>
        </nav>
      )}
    </div>
  );
};

export default App;
