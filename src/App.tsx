import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Download, CheckCircle, Clock, XCircle, Link as LinkIcon, Loader2, MessageSquare, History, Plus, ChevronRight, Bookmark, Trash2, LayoutDashboard, Upload, Save, TrendingUp } from 'lucide-react';
import { generateContextQuestion, generateGuide, Guide } from './lib/gemini';
import { downloadGuide } from './lib/download';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

type Step = 'input' | 'manual_input' | 'chat1' | 'chat2' | 'generating' | 'result';
type View = 'main' | 'history' | 'links' | 'dashboard';

export interface SavedGuide {
  id: string;
  url: string;
  date: string;
  guide: Guide;
  status: 'applied' | 'pending' | 'irrelevant';
}

export type LinkCategory = 'Finanzas' | 'Espiritual' | 'Crecimiento personal' | 'Recetas' | 'Inspiración' | 'Música' | 'Historia' | 'Otros';

export interface SavedLink {
  id: string;
  url: string;
  category: LinkCategory;
  date: string;
  used: boolean;
}

const CATEGORIES: LinkCategory[] = [
  'Finanzas', 'Espiritual', 'Crecimiento personal', 'Recetas', 
  'Inspiración', 'Música', 'Historia', 'Otros'
];

const STATUS_COLORS = {
  applied: '#10b981', // green-500
  pending: '#f97316', // orange-500
  irrelevant: '#9ca3af' // gray-400
};

const CATEGORY_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', 
  '#f59e0b', '#10b981', '#14b8a6', '#64748b'
];

export default function App() {
  const [view, setView] = useState<View>('main');
  const [history, setHistory] = useState<SavedGuide[]>([]);
  const [savedLinks, setSavedLinks] = useState<SavedLink[]>([]);
  const [activeGuideId, setActiveGuideId] = useState<string | null>(null);

  // Guide Generation State
  const [step, setStep] = useState<Step>('input');
  const [inputContent, setInputContent] = useState('');
  const [url, setUrl] = useState('');
  const [platform, setPlatform] = useState<'x' | 'instagram' | 'text' | null>(null);
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [question1, setQuestion1] = useState('');
  const [answer1, setAnswer1] = useState('');
  const [question2, setQuestion2] = useState('');
  const [answer2, setAnswer2] = useState('');
  const [guide, setGuide] = useState<Guide | null>(null);
  const [userStatus, setUserStatus] = useState<'applied' | 'pending' | 'irrelevant'>('pending');

  // New Link State
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkCategory, setNewLinkCategory] = useState<LinkCategory>('Otros');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    const savedHistory = localStorage.getItem('kaizenkawa_history');
    if (savedHistory) {
      try { setHistory(JSON.parse(savedHistory)); } catch (e) { console.error(e); }
    }

    const savedLinksData = localStorage.getItem('kaizenkawa_links');
    if (savedLinksData) {
      try { setSavedLinks(JSON.parse(savedLinksData)); } catch (e) { console.error(e); }
    }
  }, []);

  // --- History Functions ---
  const saveToHistory = (newGuide: Guide, postUrl: string) => {
    const newEntry: SavedGuide = {
      id: Date.now().toString(),
      url: postUrl,
      date: new Date().toISOString(),
      guide: newGuide,
      status: newGuide.suggested_status === 'irrelevant' ? 'irrelevant' : 'pending'
    };
    const updated = [newEntry, ...history];
    setHistory(updated);
    localStorage.setItem('kaizenkawa_history', JSON.stringify(updated));
    return newEntry.id;
  };

  const updateHistoryStatus = (id: string, newStatus: 'applied' | 'pending' | 'irrelevant') => {
    const updated = history.map(h => h.id === id ? { ...h, status: newStatus } : h);
    setHistory(updated);
    localStorage.setItem('kaizenkawa_history', JSON.stringify(updated));
  };

  // --- Links Functions ---
  const handleSaveLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkUrl) return;
    const newLink: SavedLink = {
      id: Date.now().toString(),
      url: newLinkUrl,
      category: newLinkCategory,
      date: new Date().toISOString(),
      used: false
    };
    const updated = [newLink, ...savedLinks];
    setSavedLinks(updated);
    localStorage.setItem('kaizenkawa_links', JSON.stringify(updated));
    setNewLinkUrl('');
    setNewLinkCategory('Otros');
  };

  const toggleLinkUsed = (id: string) => {
    const updated = savedLinks.map(l => l.id === id ? { ...l, used: !l.used } : l);
    setSavedLinks(updated);
    localStorage.setItem('kaizenkawa_links', JSON.stringify(updated));
  };

  const deleteLink = (id: string) => {
    const updated = savedLinks.filter(l => l.id !== id);
    setSavedLinks(updated);
    localStorage.setItem('kaizenkawa_links', JSON.stringify(updated));
  };

  const handleResetApp = () => {
    setHistory([]);
    setSavedLinks([]);
    localStorage.removeItem('kaizenkawa_history');
    localStorage.removeItem('kaizenkawa_links');
    setShowResetConfirm(false);
  };

  // --- Guide Generation Functions ---
  const handleInputSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!inputContent.trim()) return;

    setIsLoading(true);

    const isUrl = /^https?:\/\//i.test(inputContent.trim());

    if (isUrl) {
      const urlToProcess = inputContent.trim();
      setUrl(urlToProcess);
      
      try {
        const res = await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: urlToProcess })
        });
        const data = await res.json();

        if (data.error && !data.platform) {
          setError(data.error);
          setIsLoading(false);
          return;
        }

        setPlatform(data.platform);

        if (data.platform === 'instagram' || (data.platform === 'x' && !data.content)) {
          setStep('manual_input');
        } else {
          setContent(data.content);
          await askFirstQuestion(data.content, data.platform);
        }
      } catch (err) {
        setError('Error al procesar la URL. Por favor intenta de nuevo.');
      } finally {
        setIsLoading(false);
      }
    } else {
      // It's raw text
      setUrl('Texto manual');
      setPlatform('text');
      setContent(inputContent);
      await askFirstQuestion(inputContent, 'texto');
      setIsLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content) return;
    setIsLoading(true);
    await askFirstQuestion(content, platform || 'unknown');
    setIsLoading(false);
  };

  const askFirstQuestion = async (postContent: string, postPlatform: string) => {
    try {
      const q1 = await generateContextQuestion(postContent, postPlatform, 1);

      setQuestion1(q1);
      setStep('chat1');
    } catch (err) {
      setError('Error al generar la pregunta.');
    }
  };

  const handleAnswer1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer1) return;
    setIsLoading(true);
    try {
      const q2 = await generateContextQuestion(content, platform || 'unknown', 2, answer1);
      setQuestion2(q2);
      setStep('chat2');
    } catch (err) {
      setError('Error al generar la pregunta.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer2) return;
    setStep('generating');
    try {
      const generatedGuide = await generateGuide(content, platform || 'unknown', answer1, answer2);
      setGuide(generatedGuide);
      const newId = saveToHistory(generatedGuide, url);
      setActiveGuideId(newId);
      setUserStatus(generatedGuide.suggested_status === 'irrelevant' ? 'irrelevant' : 'pending');
      setStep('result');
    } catch (err) {
      setError('Error al generar la guía.');
      setStep('chat2');
    }
  };

  const openHistoryItem = (item: SavedGuide) => {
    setGuide(item.guide);
    setUrl(item.url);
    setActiveGuideId(item.id);
    setUserStatus(item.status);
    setStep('result');
    setView('main');
  };

  const resetFlow = () => {
    setStep('input');
    setInputContent('');
    setUrl('');
    setContent('');
    setGuide(null);
    setAnswer1('');
    setAnswer2('');
    setActiveGuideId(null);
    setView('main');
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('es-ES', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const pendingLinksCount = savedLinks.filter(l => !l.used).length;

  // --- Dashboard Data Preparation ---
  const statusData = [
    { name: 'Aplicado', value: history.filter(h => h.status === 'applied').length, color: STATUS_COLORS.applied },
    { name: 'Pendiente', value: history.filter(h => h.status === 'pending').length, color: STATUS_COLORS.pending },
    { name: 'Irrelevante', value: history.filter(h => h.status === 'irrelevant').length, color: STATUS_COLORS.irrelevant },
  ].filter(d => d.value > 0);

  const categoryData = CATEGORIES.map((cat, index) => ({
    name: cat,
    value: savedLinks.filter(l => l.category === cat).length,
    fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
  })).filter(d => d.value > 0);

  // --- Backup Functions ---
  const exportBackup = () => {
    const data = {
      history,
      savedLinks,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kaizenkawa_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.history && Array.isArray(data.history)) {
          setHistory(data.history);
          localStorage.setItem('kaizenkawa_history', JSON.stringify(data.history));
        }
        if (data.savedLinks && Array.isArray(data.savedLinks)) {
          setSavedLinks(data.savedLinks);
          localStorage.setItem('kaizenkawa_links', JSON.stringify(data.savedLinks));
        }
        alert('Backup restaurado correctamente.');
      } catch (err) {
        alert('Error al leer el archivo de backup. Asegúrate de que sea un archivo válido.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <header className="mb-8 text-center w-full max-w-3xl">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 bg-primary-kaizen rounded-xl flex items-center justify-center text-accent-kaizen text-2xl font-bold shadow-md">
            改
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-primary-kaizen">Kaizenkawa</h1>
        </div>
        <p className="text-gray-kaizen max-w-md mx-auto mb-8">
          Convierte el scroll pasivo en pasos accionables o guarda enlaces para después.
        </p>

        <div className="flex flex-wrap justify-center gap-2 bg-gray-200/50 p-1 rounded-xl w-fit mx-auto">
          <button
            onClick={() => setView('main')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer flex items-center gap-2 ${view === 'main' ? 'bg-white text-primary-kaizen shadow-sm' : 'text-gray-500 hover:text-primary-kaizen'}`}
          >
            <Plus className="w-4 h-4" /> Crear Guía
          </button>
          <button
            onClick={() => setView('links')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer flex items-center gap-2 ${view === 'links' ? 'bg-white text-primary-kaizen shadow-sm' : 'text-gray-500 hover:text-primary-kaizen'}`}
          >
            <Bookmark className="w-4 h-4" /> Enlaces ({pendingLinksCount})
          </button>
          <button
            onClick={() => setView('history')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer flex items-center gap-2 ${view === 'history' ? 'bg-white text-primary-kaizen shadow-sm' : 'text-gray-500 hover:text-primary-kaizen'}`}
          >
            <History className="w-4 h-4" /> Historial ({history.length})
          </button>
          <button
            onClick={() => setView('dashboard')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer flex items-center gap-2 ${view === 'dashboard' ? 'bg-white text-primary-kaizen shadow-sm' : 'text-gray-500 hover:text-primary-kaizen'}`}
          >
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </button>
        </div>
      </header>

      <main className="w-full max-w-3xl">
        <AnimatePresence mode="wait">
          {view === 'dashboard' ? (
            <motion.div
              key="dashboard_view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-black/5 flex flex-col items-center justify-center text-center">
                  <span className="text-gray-500 text-sm font-medium mb-1">Guías Creadas</span>
                  <span className="text-3xl font-bold text-primary-kaizen">{history.length}</span>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-black/5 flex flex-col items-center justify-center text-center">
                  <span className="text-gray-500 text-sm font-medium mb-1">Enlaces Guardados</span>
                  <span className="text-3xl font-bold text-primary-kaizen">{savedLinks.length}</span>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-black/5 flex flex-col items-center justify-center text-center">
                  <span className="text-gray-500 text-sm font-medium mb-1">Enlaces Pendientes</span>
                  <span className="text-3xl font-bold text-orange-kaizen">{pendingLinksCount}</span>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Status Pie Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-kaizen mb-6 text-center">Estado de Guías</h3>
                  {history.length === 0 ? (
                    <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">No hay datos suficientes</div>
                  ) : (
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                            itemStyle={{ color: '#111827', fontWeight: 500 }}
                          />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Category Bar Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-kaizen mb-6 text-center">Enlaces por Categoría</h3>
                  {savedLinks.length === 0 ? (
                    <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">No hay datos suficientes</div>
                  ) : (
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={categoryData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={60} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                          <Tooltip 
                            cursor={{ fill: '#f3f4f6' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                          />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>

              {/* Backup Section */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-kaizen mb-4 flex items-center gap-2">
                  <Save className="w-4 h-4" /> Copia de Seguridad
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Exporta tus guías y enlaces guardados para no perderlos, o impórtalos si cambias de navegador.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={exportBackup}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-primary-kaizen text-white rounded-xl text-sm font-medium hover:bg-primary-kaizen/90 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" /> Exportar Backup
                  </button>
                  <label className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-200 text-primary-kaizen rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer">
                    <Upload className="w-4 h-4" /> Importar Backup
                    <input 
                      type="file" 
                      accept=".json" 
                      onChange={importBackup} 
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>

              {/* Reset App Section */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-100">
                <h3 className="text-sm font-bold uppercase tracking-wider text-red-600 mb-4 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" /> Zona de Peligro
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Borra todos los enlaces y guías guardadas. Esta acción no se puede deshacer.
                </p>
                {showResetConfirm ? (
                  <div className="flex flex-col sm:flex-row gap-4 items-center bg-red-50 p-4 rounded-xl border border-red-100">
                    <p className="text-sm text-red-800 font-medium flex-1">¿Estás seguro? Se borrará todo.</p>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => setShowResetConfirm(false)}
                        className="flex-1 sm:flex-none py-2 px-4 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleResetApp}
                        className="flex-1 sm:flex-none py-2 px-4 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors cursor-pointer"
                      >
                        Sí, borrar todo
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" /> Reiniciar Aplicación
                  </button>
                )}
              </div>
            </motion.div>
          ) : view === 'links' ? (
            <motion.div
              key="links_view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Add New Link Form */}
              <form onSubmit={handleSaveLink} className="bg-white p-5 rounded-2xl shadow-sm border border-black/5 flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LinkIcon className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="url"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    placeholder="Pega el enlace aquí..."
                    className="block w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent-kaizen focus:border-accent-kaizen text-sm bg-gray-50"
                    required
                  />
                </div>
                <select
                  value={newLinkCategory}
                  onChange={(e) => setNewLinkCategory(e.target.value as LinkCategory)}
                  className="py-2.5 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent-kaizen focus:border-accent-kaizen text-sm bg-gray-50 text-gray-700"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="py-2.5 px-5 bg-primary-kaizen text-white rounded-xl text-sm font-medium hover:bg-primary-kaizen/90 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Guardar
                </button>
              </form>

              {/* Links List */}
              <div className="space-y-3">
                {savedLinks.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-black/5 shadow-sm">
                    <Bookmark className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-primary-kaizen">No hay enlaces guardados</h3>
                    <p className="text-gray-500 mt-1 text-sm">Guarda videos o posts para verlos más tarde.</p>
                  </div>
                ) : (
                  savedLinks.map((link) => (
                    <div 
                      key={link.id}
                      className={`bg-white p-4 rounded-2xl shadow-sm border border-black/5 transition-all flex items-center justify-between group ${link.used ? 'opacity-60 bg-gray-50' : ''}`}
                    >
                      <div className="flex items-center gap-4 overflow-hidden">
                        <button 
                          onClick={() => toggleLinkUsed(link.id)}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors cursor-pointer ${link.used ? 'bg-green-kaizen border-green-kaizen' : 'border-gray-300 hover:border-green-kaizen'}`}
                        >
                          {link.used && <CheckCircle className="w-4 h-4 text-white" />}
                        </button>
                        
                        <div className="min-w-0">
                          <a 
                            href={link.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className={`text-sm font-medium truncate block mb-1 hover:text-accent-kaizen transition-colors ${link.used ? 'line-through text-gray-400' : 'text-primary-kaizen'}`}
                          >
                            {link.url}
                          </a>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
                              {link.category}
                            </span>
                            <span className="text-xs text-gray-400">{formatDate(link.date)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => deleteLink(link.id)}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                        title="Eliminar enlace"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          ) : view === 'history' ? (
            <motion.div
              key="history_view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {history.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-black/5 shadow-sm">
                  <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-primary-kaizen">No hay guías guardadas</h3>
                  <p className="text-gray-500 mt-1">Tus guías generadas aparecerán aquí.</p>
                  <button 
                    onClick={resetFlow}
                    className="mt-4 text-accent-kaizen font-medium hover:underline cursor-pointer"
                  >
                    Crear mi primera guía
                  </button>
                </div>
              ) : (
                history.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => openHistoryItem(item)}
                    className="bg-white p-5 rounded-2xl shadow-sm border border-black/5 hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex-1 pr-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-kaizen bg-gray-100 px-2 py-1 rounded-md">
                          {item.guide.topic_tag}
                        </span>
                        <span className="text-xs text-gray-400">{formatDate(item.date)}</span>
                        {item.status === 'applied' && <CheckCircle className="w-4 h-4 text-green-kaizen" />}
                        {item.status === 'pending' && <Clock className="w-4 h-4 text-orange-kaizen" />}
                        {item.status === 'irrelevant' && <XCircle className="w-4 h-4 text-gray-400" />}
                      </div>
                      <p className="text-primary-kaizen font-medium line-clamp-2 text-sm">
                        {item.guide.summary}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-accent-kaizen transition-colors" />
                  </div>
                ))
              )}
            </motion.div>
          ) : (
            <>
              {step === 'input' && (
                <motion.div
                  key="input"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white p-8 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-black/5"
                >
                  <form onSubmit={handleInputSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="inputContent" className="block text-sm font-medium text-primary-kaizen mb-2">
                        Pega el texto extenso del post o un enlace (X/Instagram)
                      </label>
                      <div className="relative">
                        <textarea
                          id="inputContent"
                          rows={6}
                          value={inputContent}
                          onChange={(e) => setInputContent(e.target.value)}
                          className="block w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent-kaizen focus:border-accent-kaizen transition-colors bg-gray-50 resize-none"
                          placeholder="Pega aquí todo el contenido del hilo, post, o el enlace (https://x.com/...)"
                          required
                        />
                      </div>
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-primary-kaizen hover:bg-primary-kaizen/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-kaizen disabled:opacity-70 transition-all cursor-pointer"
                    >
                      {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Analizar Contenido'}
                    </button>
                  </form>
                </motion.div>
              )}

              {step === 'manual_input' && (
                <motion.div
                  key="manual_input"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white p-8 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-black/5"
                >
                  <form onSubmit={handleManualSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="content" className="block text-sm font-medium text-primary-kaizen mb-2">
                        {platform === 'instagram' 
                          ? "No pudimos leer el video. Describe brevemente de qué trata (1-2 líneas):"
                          : "No pudimos extraer el texto. Por favor pega el contenido del post aquí:"}
                      </label>
                      <textarea
                        id="content"
                        rows={4}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="block w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent-kaizen focus:border-accent-kaizen transition-colors bg-gray-50 resize-none"
                        placeholder="El post habla sobre..."
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-primary-kaizen hover:bg-primary-kaizen/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-kaizen disabled:opacity-70 transition-all cursor-pointer"
                    >
                      {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Continuar'}
                    </button>
                  </form>
                </motion.div>
              )}

              {step === 'chat1' && (
                <motion.div
                  key="chat1"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white p-8 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-black/5"
                >
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-8 h-8 rounded-full bg-accent-kaizen/20 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-4 h-4 text-accent-kaizen" />
                    </div>
                    <p className="text-lg font-medium text-primary-kaizen pt-1">{question1}</p>
                  </div>
                  <form onSubmit={handleAnswer1Submit} className="space-y-4">
                    <input
                      type="text"
                      value={answer1}
                      onChange={(e) => setAnswer1(e.target.value)}
                      className="block w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent-kaizen focus:border-accent-kaizen transition-colors bg-gray-50"
                      placeholder="Tu respuesta..."
                      autoFocus
                      required
                    />
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-primary-kaizen hover:bg-primary-kaizen/90 disabled:opacity-70 transition-all cursor-pointer"
                    >
                      {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Siguiente'}
                    </button>
                  </form>
                </motion.div>
              )}

              {step === 'chat2' && (
                <motion.div
                  key="chat2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white p-8 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-black/5"
                >
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-8 h-8 rounded-full bg-accent-kaizen/20 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-4 h-4 text-accent-kaizen" />
                    </div>
                    <p className="text-lg font-medium text-primary-kaizen pt-1">{question2}</p>
                  </div>
                  <form onSubmit={handleAnswer2Submit} className="space-y-4">
                    <input
                      type="text"
                      value={answer2}
                      onChange={(e) => setAnswer2(e.target.value)}
                      className="block w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent-kaizen focus:border-accent-kaizen transition-colors bg-gray-50"
                      placeholder="Tu respuesta..."
                      autoFocus
                      required
                    />
                    <button
                      type="submit"
                      className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-primary-kaizen hover:bg-primary-kaizen/90 transition-all cursor-pointer"
                    >
                      Generar Guía
                    </button>
                  </form>
                </motion.div>
              )}

              {step === 'generating' && (
                <motion.div
                  key="generating"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-12"
                >
                  <Loader2 className="w-12 h-12 text-accent-kaizen animate-spin mb-4" />
                  <p className="text-lg font-medium text-primary-kaizen">Creando tu guía personalizada...</p>
                  <p className="text-sm text-gray-kaizen mt-2">Aplicando principios Kaizen a tu contexto</p>
                </motion.div>
              )}

              {step === 'result' && guide && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Status Bar */}
                  <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-black/5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-kaizen bg-gray-100 px-2 py-1 rounded-md">
                        {guide.topic_tag}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setUserStatus('applied');
                          if (activeGuideId) updateHistoryStatus(activeGuideId, 'applied');
                        }}
                        className={`p-2 rounded-full transition-colors cursor-pointer ${userStatus === 'applied' ? 'bg-green-kaizen/20 text-green-kaizen' : 'text-gray-400 hover:bg-gray-100'}`}
                        title="Aplicado"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setUserStatus('pending');
                          if (activeGuideId) updateHistoryStatus(activeGuideId, 'pending');
                        }}
                        className={`p-2 rounded-full transition-colors cursor-pointer ${userStatus === 'pending' ? 'bg-orange-kaizen/20 text-orange-kaizen' : 'text-gray-400 hover:bg-gray-100'}`}
                        title="Pendiente"
                      >
                        <Clock className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setUserStatus('irrelevant');
                          if (activeGuideId) updateHistoryStatus(activeGuideId, 'irrelevant');
                        }}
                        className={`p-2 rounded-full transition-colors cursor-pointer ${userStatus === 'irrelevant' ? 'bg-gray-200 text-gray-600' : 'text-gray-400 hover:bg-gray-100'}`}
                        title="Irrelevante"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-gray-kaizen mb-3">Resumen Detallado</h2>
                    <p className="text-primary-kaizen leading-relaxed whitespace-pre-wrap">{guide.summary}</p>
                  </div>

                  {/* Data Points */}
                  {guide.data_points && guide.data_points.length > 0 && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
                      <h2 className="text-sm font-bold uppercase tracking-wider text-blue-600 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" /> Datos Clave
                      </h2>
                      <ul className="space-y-3">
                        {guide.data_points.map((point, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium mt-0.5">
                              {i + 1}
                            </span>
                            <span className="text-primary-kaizen leading-relaxed">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Steps */}
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
                      <h2 className="text-sm font-bold uppercase tracking-wider text-orange-kaizen mb-4 flex items-center gap-2">
                        <Clock className="w-4 h-4" /> En lo Personal
                      </h2>
                      <ul className="space-y-3">
                        {guide.steps_short.map((step, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-kaizen/10 text-orange-kaizen flex items-center justify-center text-sm font-medium mt-0.5">
                              {i + 1}
                            </span>
                            <span className="text-primary-kaizen text-sm leading-relaxed">{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
                      <h2 className="text-sm font-bold uppercase tracking-wider text-primary-kaizen mb-4 flex items-center gap-2">
                        <ArrowRight className="w-4 h-4" /> En lo Laboral / Profesional
                      </h2>
                      <ul className="space-y-3">
                        {guide.steps_long.map((step, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-sm font-medium mt-0.5">
                              {i + 1}
                            </span>
                            <span className="text-primary-kaizen text-sm leading-relaxed">{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Activation */}
                  <div className="bg-accent-kaizen/10 border border-accent-kaizen/20 p-6 rounded-2xl text-center">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-accent-kaizen mb-3">Takeaway Final + Acción Inmediata</h2>
                    <p className="text-xl font-medium text-primary-kaizen">{guide.activation_question}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={resetFlow}
                      className="flex-1 py-3 px-4 border border-gray-200 rounded-xl shadow-sm text-sm font-medium text-primary-kaizen bg-white hover:bg-gray-50 transition-all cursor-pointer"
                    >
                      Nueva Guía
                    </button>
                    <button
                      onClick={() => downloadGuide(guide, url)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-primary-kaizen hover:bg-primary-kaizen/90 transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4" /> Descargar .txt
                    </button>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
