import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Menu, 
  Settings, 
  Moon, 
  Sun, 
  Type, 
  FileText, 
  Eye, 
  EyeOff, 
  AlignLeft, 
  AlignCenter, 
  AlignVerticalSpaceAround,
  Download,
  Info,
  Folder,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { EditorView } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { keymap } from '@codemirror/view';
import { StateEffect } from '@codemirror/state';
import { authorshipExtension, addAuthorMark, authorshipField } from './authorship';

// --- Types ---
type Theme = 'light' | 'dark';
type Typography = 'sans' | 'serif' | 'mono';
type ViewMode = 'edit' | 'preview' | 'split';

interface AppSettings {
  theme: Theme;
  typography: Typography;
  focusMode: boolean;
  typewriterMode: boolean;
  viewMode: ViewMode;
  wordCount: boolean;
  readingTime: boolean;
  currentAuthor: string;
  authorColors: Record<string, string>;
}

interface Document {
  id: string;
  content: string;
  updatedAt: number;
  authorshipState?: any;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  typography: 'mono', // iA Writer defaults to a custom mono/duospace font
  focusMode: false,
  typewriterMode: false,
  viewMode: 'edit',
  wordCount: true,
  readingTime: true,
  currentAuthor: 'me',
  authorColors: {
    user1: '#EAB308', // Yellow
    user2: '#3B82F6', // Blue
    user3: '#EC4899', // Pink
  }
};

const DEFAULT_TEXT = `# Welcome to Focus Writer

Focus Writer is a minimalist, distraction-free writing environment inspired by iA Writer.

## Features

*   **Clean Interface:** Everything fades away when you start typing.
*   **Focus Mode:** Highlights only the current sentence or paragraph you are working on.
*   **Typography:** Carefully selected fonts for optimal readability (Sans, Serif, and Mono).
*   **Markdown Support:** Full support for standard Markdown formatting.
*   **Dark Mode:** Easy on the eyes for night-time writing sessions.

## Typography

You can choose between three distinct typographic styles:

1.  **Mono:** A classic typewriter feel, great for technical writing and code.
2.  **Sans:** Clean, modern, and highly legible.
3.  **Serif:** Traditional and elegant, perfect for long-form prose.

## Try it out

Start typing to see the interface fade away. Toggle Focus Mode in the settings menu to concentrate on one thought at a time.

> "The secret of getting ahead is getting started." - Mark Twain

\`\`\`javascript
// Some code here
function write() {
  console.log("Just write.");
}
\`\`\`
`;

export default function App() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [text, setText] = useState('');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [stats, setStats] = useState({ words: 0, chars: 0, readingTime: 0 });
  
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Effects ---

  // Load settings and documents from local storage
  useEffect(() => {
    const savedSettings = localStorage.getItem('focusWriterSettings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
    
    const savedDocs = localStorage.getItem('focusWriterDocuments');
    if (savedDocs) {
      try {
        const parsedDocs = JSON.parse(savedDocs);
        if (parsedDocs.length > 0) {
          setDocuments(parsedDocs);
          
          const savedActiveId = localStorage.getItem('focusWriterActiveDocId');
          if (savedActiveId && parsedDocs.some((d: Document) => d.id === savedActiveId)) {
            setActiveDocId(savedActiveId);
          } else {
            setActiveDocId(parsedDocs[0].id);
          }
        } else {
          migrateOldText();
        }
      } catch (e) {
        console.error("Failed to parse documents", e);
        migrateOldText();
      }
    } else {
      migrateOldText();
    }
  }, []);

  const migrateOldText = () => {
    const savedText = localStorage.getItem('focusWriterText');
    const initialContent = savedText || DEFAULT_TEXT;
    const newDoc = {
      id: crypto.randomUUID(),
      content: initialContent,
      updatedAt: Date.now()
    };
    setDocuments([newDoc]);
    setActiveDocId(newDoc.id);
  };

  // Sync text when active document changes
  useEffect(() => {
    if (activeDocId) {
      const doc = documents.find(d => d.id === activeDocId);
      if (doc) {
        setText(doc.content);
      }
    }
  }, [activeDocId]);

  // Save documents to local storage
  useEffect(() => {
    if (documents.length > 0) {
      localStorage.setItem('focusWriterDocuments', JSON.stringify(documents));
    }
  }, [documents]);

  // Save active doc ID
  useEffect(() => {
    if (activeDocId) {
      localStorage.setItem('focusWriterActiveDocId', activeDocId);
    }
  }, [activeDocId]);

  // Save settings to local storage
  useEffect(() => {
    localStorage.setItem('focusWriterSettings', JSON.stringify(settings));
    
    // Apply theme to document
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Apply author colors
    if (settings.authorColors) {
      Object.entries(settings.authorColors).forEach(([authorId, color]) => {
        document.documentElement.style.setProperty(`--color-${authorId}`, color);
      });
    }
  }, [settings]);

  // Calculate stats
  useEffect(() => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const readingTime = Math.ceil(words / 200); // Avg reading speed 200 wpm
    
    setStats({ words, chars, readingTime });
  }, [text]);

  // Handle typing state for UI fading
  const handleTyping = useCallback(() => {
    setIsTyping(true);
    if (isMenuOpen) setIsMenuOpen(false);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 3000); // UI fades back in after 3 seconds of inactivity
  }, [isMenuOpen]);

  // --- Handlers ---

  const handleEditorChange = useCallback((val: string, viewUpdate: any) => {
    setText(val);
    
    if (activeDocId) {
      // Serialize authorship state
      let authorshipState = undefined;
      try {
        const stateJSON = viewUpdate.state.toJSON({ authorshipField });
        if (stateJSON && stateJSON.authorshipField) {
          authorshipState = stateJSON.authorshipField;
        }
      } catch (e) {
        console.error("Failed to serialize authorship state", e);
      }

      setDocuments(prev => prev.map(doc => 
        doc.id === activeDocId 
          ? { ...doc, content: val, updatedAt: Date.now(), authorshipState } 
          : doc
      ));
    }
    
    handleTyping();
  }, [activeDocId, handleTyping]);

  const createNewDocument = () => {
    const newDoc = {
      id: crypto.randomUUID(),
      content: '# Untitled\n\n',
      updatedAt: Date.now()
    };
    setDocuments(prev => [newDoc, ...prev]);
    setActiveDocId(newDoc.id);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const deleteDocument = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (documents.length <= 1) {
      const newDoc = {
        id: crypto.randomUUID(),
        content: '# Untitled\n\n',
        updatedAt: Date.now()
      };
      setDocuments([newDoc]);
      setActiveDocId(newDoc.id);
      return;
    }
    
    const newDocs = documents.filter(d => d.id !== id);
    setDocuments(newDocs);
    if (activeDocId === id) {
      setActiveDocId(newDocs[0].id);
    }
  };

  const getDocumentTitle = (content: string) => {
    const firstLine = content.split('\n').find(line => line.trim().length > 0);
    if (!firstLine) return 'Untitled';
    return firstLine.replace(/^#+\s*/, '').substring(0, 40) + (firstLine.length > 40 ? '...' : '');
  };

  const toggleSetting = (key: keyof AppSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const setSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([text], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = "document.md";
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
    document.body.removeChild(element);
  };

  // --- Render Helpers ---

  const getFontClass = () => {
    switch (settings.typography) {
      case 'sans': return 'font-sans';
      case 'serif': return 'font-serif';
      case 'mono': return 'font-mono';
      default: return 'font-mono';
    }
  };

  const editorTheme = EditorView.theme({
    "&": {
      color: "inherit",
      backgroundColor: "transparent",
      height: "100%",
      fontSize: "inherit",
      fontFamily: "inherit",
    },
    ".cm-content": {
      caretColor: settings.theme === 'dark' ? '#F5F6F8' : '#1A1A1A',
      padding: "2rem 1rem",
      maxWidth: "800px",
      margin: "0 auto",
    },
    "&.cm-focused .cm-cursor": {
      borderLeftColor: settings.theme === 'dark' ? '#F5F6F8' : '#1A1A1A',
      borderLeftWidth: "2px",
    },
    "&.cm-focused .cm-selectionBackground, ::selection": {
      backgroundColor: "rgba(0, 122, 255, 0.3)"
    },
    ".cm-line": {
      padding: "0",
      lineHeight: "1.8",
    },
    ".cm-scroller": {
      fontFamily: "inherit",
    }
  }, {dark: settings.theme === 'dark'});

  const editorHighlightStyle = HighlightStyle.define([
    {tag: t.heading1, fontSize: "2.25em", fontWeight: "bold", lineHeight: "1.3"},
    {tag: t.heading2, fontSize: "1.5em", fontWeight: "bold", lineHeight: "1.3"},
    {tag: t.heading3, fontSize: "1.25em", fontWeight: "bold", lineHeight: "1.3"},
    {tag: t.heading4, fontSize: "1.1em", fontWeight: "bold", lineHeight: "1.3"},
    {tag: t.heading, fontWeight: "bold"},
    {tag: t.strong, fontWeight: "bold"},
    {tag: t.emphasis, fontStyle: "italic"},
    {tag: t.link, color: "#007AFF", textDecoration: "underline"},
    {tag: t.url, color: "#007AFF"},
    {tag: t.quote, fontStyle: "italic", color: settings.theme === 'dark' ? '#9CA3AF' : '#6B7280'},
    {tag: t.keyword, color: "#007AFF"},
    {tag: t.comment, color: settings.theme === 'dark' ? '#9CA3AF' : '#6B7280', fontStyle: "italic"},
    {tag: t.punctuation, color: settings.theme === 'dark' ? '#6B7280' : '#9CA3AF'},
    {tag: t.processingInstruction, color: settings.theme === 'dark' ? '#6B7280' : '#9CA3AF'},
    {tag: t.meta, color: settings.theme === 'dark' ? '#6B7280' : '#9CA3AF'},
  ]);

  const renderEditor = () => {
    const activeDoc = documents.find(d => d.id === activeDocId);
    
    return (
      <div className={`w-full h-full flex flex-col ${settings.focusMode ? 'focus-mode' : ''} ${settings.typewriterMode ? 'typewriter-mode' : ''} ${getFontClass()}`}>
        <CodeMirror
          key={activeDocId}
          value={text}
          theme={settings.theme === 'dark' ? 'dark' : 'light'}
          initialState={
            activeDoc?.authorshipState ? {
              json: { 
                doc: text, 
                selection: { ranges: [{ anchor: 0, head: 0 }], main: 0 },
                authorshipField: activeDoc.authorshipState 
              },
              fields: { authorshipField }
            } : undefined
          }
          onChange={handleEditorChange}
          onFocus={() => setIsTyping(false)}
          className="flex-1 w-full text-lg md:text-xl overflow-hidden"
          extensions={[
            markdown({ base: markdownLanguage, codeLanguages: languages }),
            EditorView.lineWrapping,
            editorTheme,
            syntaxHighlighting(editorHighlightStyle),
            authorshipExtension(settings.currentAuthor),
            settings.typewriterMode ? EditorView.updateListener.of((update) => {
              if (update.selectionSet || update.docChanged) {
                const pos = update.state.selection.main.head;
                update.view.dispatch({
                  effects: EditorView.scrollIntoView(pos, { y: "center" })
                });
              }
            }) : [],
            keymap.of([
              {
                key: "Mod-Shift-v",
                run: (view) => {
                  navigator.clipboard.readText().then(clipText => {
                    if (!clipText) return;
                    const from = view.state.selection.main.from;
                    const to = view.state.selection.main.to;
                    view.dispatch({
                      changes: { from, to, insert: clipText },
                      effects: addAuthorMark.of({ from, to: from + clipText.length, authorId: 'ai' })
                    });
                  }).catch(err => {
                    console.error("Failed to read clipboard", err);
                  });
                  return true;
                }
              }
            ])
          ]}
          basicSetup={{
            lineNumbers: false,
            foldGutter: false,
            highlightActiveLine: settings.focusMode,
            highlightActiveLineGutter: false,
            dropCursor: false,
            allowMultipleSelections: false,
            indentOnInput: false,
            searchKeymap: false,
            autocompletion: false,
            bracketMatching: false,
            closeBrackets: false,
            history: true,
            drawSelection: true,
          }}
        />
      </div>
    );
  };

  const renderPreview = () => (
    <div className={`w-full h-full overflow-y-auto p-4 md:p-8 lg:p-12 hide-scrollbar-when-idle ${getFontClass()}`}>
      <div className="prose dark:prose-invert max-w-[65ch] mx-auto">
        <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen w-full flex flex-col transition-colors duration-300 ${settings.theme === 'dark' ? 'bg-[#1A1A1A] text-[#F5F6F8]' : 'bg-[#F5F6F8] text-[#1A1A1A]'}`}>
      
      {/* Top Navigation / Toolbar */}
      <motion.header 
        className="fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-50 bg-opacity-90 backdrop-blur-sm"
        initial={{ y: 0, opacity: 1 }}
        animate={{ 
          y: isTyping ? -60 : 0,
          opacity: isTyping ? 0 : 1
        }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            aria-label="Files"
          >
            <Folder size={20} />
          </button>
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            aria-label="Menu"
          >
            <Menu size={20} />
          </button>
          <span className="font-medium text-sm tracking-widest uppercase opacity-50 hidden sm:inline-block ml-2">Focus</span>
        </div>

        <div className="flex items-center space-x-1">
          <button 
            onClick={() => setSetting('viewMode', 'edit')}
            className={`p-2 rounded-md transition-colors ${settings.viewMode === 'edit' ? 'bg-black/10 dark:bg-white/20' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
            title="Edit Mode"
          >
            <AlignLeft size={18} />
          </button>
          <button 
            onClick={() => setSetting('viewMode', 'split')}
            className={`p-2 rounded-md transition-colors hidden md:block ${settings.viewMode === 'split' ? 'bg-black/10 dark:bg-white/20' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
            title="Split Mode"
          >
            <AlignCenter size={18} />
          </button>
          <button 
            onClick={() => setSetting('viewMode', 'preview')}
            className={`p-2 rounded-md transition-colors ${settings.viewMode === 'preview' ? 'bg-black/10 dark:bg-white/20' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
            title="Preview Mode"
          >
            <Eye size={18} />
          </button>
        </div>
      </motion.header>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
            />
            <motion.div 
              className={`fixed top-0 left-0 bottom-0 w-80 shadow-2xl z-50 flex flex-col border-r ${settings.theme === 'dark' ? 'bg-[#1A1A1A] border-white/10' : 'bg-[#F5F6F8] border-black/5'}`}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div className="h-14 flex items-center justify-between px-4 border-b border-black/5 dark:border-white/5 shrink-0">
                <span className="font-medium text-sm tracking-widest uppercase opacity-50">Files</span>
                <div className="flex items-center space-x-1">
                  <button 
                    onClick={createNewDocument}
                    className="p-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    title="New Document"
                  >
                    <Plus size={18} />
                  </button>
                  <button 
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto py-2 hide-scrollbar-when-idle">
                {[...documents].sort((a, b) => b.updatedAt - a.updatedAt).map(doc => (
                  <div 
                    key={doc.id}
                    onClick={() => {
                      setActiveDocId(doc.id);
                      if (window.innerWidth < 768) setIsSidebarOpen(false);
                    }}
                    className={`group px-4 py-3 mx-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                      activeDocId === doc.id 
                        ? (settings.theme === 'dark' ? 'bg-white/10' : 'bg-black/5') 
                        : 'hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className={`text-sm font-medium truncate ${activeDocId === doc.id ? '' : 'opacity-80'}`}>
                        {getDocumentTitle(doc.content)}
                      </div>
                      <div className="text-xs opacity-50 truncate mt-0.5">
                        {new Date(doc.updatedAt).toLocaleDateString()} • {doc.content.trim() ? doc.content.trim().split(/\s+/).length : 0} words
                      </div>
                    </div>
                    <button 
                      onClick={(e) => deleteDocument(doc.id, e)}
                      className="p-1.5 rounded-md opacity-0 group-hover:opacity-50 hover:!opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-all text-red-500 shrink-0"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Settings Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
            />
            <motion.div 
              className={`fixed top-14 left-4 w-72 rounded-xl shadow-2xl z-50 overflow-hidden border ${settings.theme === 'dark' ? 'bg-[#2A2A2A] border-white/10' : 'bg-white border-black/5'}`}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <div className="p-4 space-y-6">
                
                {/* Theme Toggle */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider opacity-50">Appearance</h3>
                  <div className="flex bg-black/5 dark:bg-white/5 rounded-lg p-1">
                    <button 
                      onClick={() => setSetting('theme', 'light')}
                      className={`flex-1 flex items-center justify-center space-x-2 py-1.5 rounded-md text-sm transition-all ${settings.theme === 'light' ? 'bg-white shadow-sm dark:bg-[#3A3A3A]' : 'opacity-70 hover:opacity-100'}`}
                    >
                      <Sun size={14} />
                      <span>Light</span>
                    </button>
                    <button 
                      onClick={() => setSetting('theme', 'dark')}
                      className={`flex-1 flex items-center justify-center space-x-2 py-1.5 rounded-md text-sm transition-all ${settings.theme === 'dark' ? 'bg-white shadow-sm dark:bg-[#4A4A4A]' : 'opacity-70 hover:opacity-100'}`}
                    >
                      <Moon size={14} />
                      <span>Dark</span>
                    </button>
                  </div>
                </div>

                {/* Typography */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider opacity-50">Typography</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {(['sans', 'serif', 'mono'] as Typography[]).map((font) => (
                      <button
                        key={font}
                        onClick={() => setSetting('typography', font)}
                        className={`py-2 rounded-lg border text-sm capitalize transition-all ${
                          settings.typography === font 
                            ? (settings.theme === 'dark' ? 'border-white/30 bg-white/10' : 'border-black/30 bg-black/5') 
                            : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5'
                        } font-${font}`}
                      >
                        {font}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Authorship */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider opacity-50">Current Author</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'me', label: 'Me', color: 'currentColor' },
                      { id: 'user1', label: 'U1', color: settings.authorColors?.user1 || '#EAB308' },
                      { id: 'user2', label: 'U2', color: settings.authorColors?.user2 || '#3B82F6' },
                      { id: 'user3', label: 'U3', color: settings.authorColors?.user3 || '#EC4899' }
                    ].map((author) => (
                      <div key={author.id} className="flex flex-col space-y-1">
                        <button
                          onClick={() => setSetting('currentAuthor', author.id)}
                          className={`py-1.5 rounded-lg border text-xs font-medium flex items-center justify-center space-x-1 transition-all ${
                            settings.currentAuthor === author.id 
                              ? (settings.theme === 'dark' ? 'border-white/30 bg-white/10' : 'border-black/30 bg-black/5') 
                              : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5'
                          }`}
                          title={`Write as ${author.label}`}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: author.color }}></span>
                          <span>{author.label}</span>
                        </button>
                        {author.id !== 'me' && (
                          <input 
                            type="color" 
                            value={author.color}
                            onChange={(e) => {
                              setSettings(prev => ({
                                ...prev,
                                authorColors: {
                                  ...prev.authorColors,
                                  [author.id]: e.target.value
                                }
                              }));
                            }}
                            className="w-full h-4 p-0 border-0 rounded cursor-pointer opacity-50 hover:opacity-100 transition-opacity"
                            title={`Change color for ${author.label}`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] opacity-50 leading-tight">
                    Use <kbd className="px-1 py-0.5 bg-black/10 dark:bg-white/10 rounded">Ctrl+Shift+V</kbd> to paste text as AI (gradient).
                  </p>
                </div>

                {/* Features */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider opacity-50">Features</h3>
                  
                  <button 
                    onClick={() => toggleSetting('focusMode')}
                    className="w-full flex items-center justify-between py-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg px-2 -mx-2 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <EyeOff size={16} className="opacity-70" />
                      <span className="text-sm">Focus Mode</span>
                    </div>
                    <div className={`w-8 h-4 rounded-full transition-colors relative ${settings.focusMode ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${settings.focusMode ? 'left-4.5' : 'left-0.5'}`} />
                    </div>
                  </button>

                  <button 
                    onClick={() => toggleSetting('typewriterMode')}
                    className="w-full flex items-center justify-between py-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg px-2 -mx-2 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <AlignVerticalSpaceAround size={16} className="opacity-70" />
                      <span className="text-sm">Typewriter Mode</span>
                    </div>
                    <div className={`w-8 h-4 rounded-full transition-colors relative ${settings.typewriterMode ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${settings.typewriterMode ? 'left-4.5' : 'left-0.5'}`} />
                    </div>
                  </button>

                  <button 
                    onClick={() => toggleSetting('wordCount')}
                    className="w-full flex items-center justify-between py-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg px-2 -mx-2 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <Type size={16} className="opacity-70" />
                      <span className="text-sm">Word Count</span>
                    </div>
                    <div className={`w-8 h-4 rounded-full transition-colors relative ${settings.wordCount ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${settings.wordCount ? 'left-4.5' : 'left-0.5'}`} />
                    </div>
                  </button>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-black/10 dark:border-white/10">
                  <button 
                    onClick={handleDownload}
                    className="w-full flex items-center space-x-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg px-2 -mx-2 transition-colors text-sm"
                  >
                    <Download size={16} className="opacity-70" />
                    <span>Export Markdown</span>
                  </button>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col pt-14 pb-10 relative overflow-hidden">
        
        {settings.viewMode === 'edit' && (
          <div className="flex-1 w-full h-full flex flex-col">
            {renderEditor()}
          </div>
        )}

        {settings.viewMode === 'preview' && (
          <div className="flex-1 max-w-[800px] mx-auto w-full h-full flex flex-col">
            {renderPreview()}
          </div>
        )}

        {settings.viewMode === 'split' && (
          <div className="flex-1 flex w-full h-full">
            <div className="flex-1 border-r border-black/10 dark:border-white/10 flex flex-col">
              {renderEditor()}
            </div>
            <div className="flex-1 bg-black/5 dark:bg-white/5 flex flex-col">
              {renderPreview()}
            </div>
          </div>
        )}

      </main>

      {/* Bottom Status Bar */}
      <motion.footer 
        className="fixed bottom-0 left-0 right-0 h-10 flex items-center justify-between px-4 z-40 text-xs opacity-60 font-mono"
        initial={{ y: 0, opacity: 0.6 }}
        animate={{ 
          y: isTyping ? 40 : 0,
          opacity: isTyping ? 0 : 0.6
        }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center space-x-4">
          {settings.wordCount && (
            <span>{stats.words} words</span>
          )}
          {settings.wordCount && (
            <span>{stats.chars} chars</span>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {settings.readingTime && (
            <span>{stats.readingTime} min read</span>
          )}
        </div>
      </motion.footer>

    </div>
  );
}
