
import React, { useState, useEffect } from 'react';
import { Book, ReadingSettings } from './types';
import { MOCK_BOOKS, DEFAULT_SETTINGS } from './constants';
import Library from './components/Library';
import Reader from './components/Reader';

const App: React.FC = () => {
  const [view, setView] = useState<'library' | 'reader'>('library');
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
    // 如果有选中的书籍，同步其最新进度到列表
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
    // 如果当前正在阅读，也同步 selectedBook
    if (selectedBook && selectedBook.id === bookId) {
      setSelectedBook(prev => prev ? { ...prev, progress, lastReadChapterId: chapterId } : null);
    }
  };

  const handleDeleteBook = (id: string) => {
    setBooks(prev => prev.filter(b => b.id !== id));
  };

  return (
    <div className={`h-full w-full transition-colors duration-500 ${settings.theme === 'night' ? 'bg-[#121212] text-white' : 'bg-[#fafafa] dark:bg-[#121212] text-black dark:text-white'}`}>
      {view === 'library' && (
        <Library 
          books={books} 
          onOpenBook={handleOpenBook} 
          onImport={(newBook) => setBooks([newBook, ...books])} 
          onDelete={handleDeleteBook}
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
  );
};

export default App;
