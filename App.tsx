
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Trophy, 
  Users, 
  Calendar, 
  Settings, 
  LogIn, 
  LogOut, 
  Menu, 
  X,
  ChevronRight,
  Plus,
  ArrowLeft,
  Trash2,
  Edit,
  Camera,
  Activity,
  ChevronLeft,
  Dices,
  MousePointer2,
  CheckCircle2,
  AlertCircle,
  Layers,
  Save,
  UserPlus,
  Image as ImageIcon,
  RotateCcw,
  Search,
  Filter,
  Check,
  LayoutGrid,
  Cloud,
  CloudOff,
  RefreshCw,
  Loader2,
  ArrowRight,
  Database,
  Copy,
  CheckCircle,
  Link as LinkIcon,
  Sparkles,
  Upload
} from 'lucide-react';
import { createClient } from 'https://esm.sh/@supabase/supabase-js';
import { 
  CompStatus, 
  GameStatus, 
  Phase, 
  Competition, 
  Team, 
  Player, 
  Game 
} from './types';
import { COMP_STATUS_ORDER, APP_NAME, DEFAULT_ADMIN } from './constants';

// --- Supabase Configuration ---
const SUPABASE_URL = 'https://pkwprsdejfyfokgscwdl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrd3Byc2RlamZ5Zm9rZ3Njd2RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzI5ODksImV4cCI6MjA4NDE0ODk4OX0.Ak4ytUV3HmULv5q-ZMOr5UYFrePQgo6uJU1910xLRfc'; 
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DB_KEYS = {
  SESSION: 'ec_logged_session',
};

// SQL Atualizado com a coluna 'league'
const SQL_SETUP = `-- 1. Criar Tabela de Equipes
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo TEXT,
  league TEXT, -- Novo campo de liga/campeonato
  player_ids TEXT[] DEFAULT '{}'
);

-- 2. Criar Tabela de Competições
CREATE TABLE IF NOT EXISTS competitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  date_time TEXT,
  status TEXT,
  phase TEXT,
  team_ids TEXT[] DEFAULT '{}'
);

-- 3. Criar Tabela de Jogos
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  competition_id TEXT REFERENCES competitions(id) ON DELETE CASCADE,
  home_team_id TEXT REFERENCES teams(id),
  away_team_id TEXT REFERENCES teams(id),
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  status TEXT,
  date TEXT,
  time TEXT
);

-- 4. Habilitar Acesso Público
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE competitions DISABLE ROW LEVEL SECURITY;
ALTER TABLE games DISABLE ROW LEVEL SECURITY;`;

const useDB = () => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setDbError(null);
    try {
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .order('name');
      
      if (teamsError) {
        if (teamsError.code === 'PGRST116' || teamsError.message.includes('relation "public.teams" does not exist') || teamsError.message.includes('schema cache')) {
          throw new Error("Tabelas não encontradas. Execute o script SQL no Supabase.");
        }
        throw teamsError;
      }

      const { data: compsData, error: compsError } = await supabase
        .from('competitions')
        .select('*')
        .order('id', { ascending: false });

      if (compsError) throw compsError;

      const mappedTeams = (teamsData || []).map(t => ({
        id: t.id,
        name: t.name,
        logo: t.logo,
        league: t.league,
        playerIds: t.player_ids || []
      }));

      const mappedComps = (compsData || []).map(c => ({
        id: c.id,
        name: c.name,
        dateTime: c.date_time,
        status: c.status,
        phase: c.phase,
        teamIds: c.team_ids || []
      }));

      setTeams(mappedTeams);
      setCompetitions(mappedComps);
    } catch (err: any) {
      console.error('Erro de Sincronização:', err.message);
      setDbError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const saveTeam = async (team: Team) => {
    setSyncing(true);
    try {
      const dbTeam = {
        id: team.id,
        name: team.name,
        logo: team.logo,
        league: team.league,
        player_ids: team.playerIds
      };
      const { error } = await supabase.from('teams').upsert(dbTeam);
      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      alert('Erro ao salvar equipe: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const deleteTeam = async (id: string) => {
    if (!confirm('Deseja excluir esta equipe?')) return;
    setSyncing(true);
    try {
      const { error } = await supabase.from('teams').delete().eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const bulkAddTeams = async (newTeams: Team[]) => {
    setSyncing(true);
    try {
      const dbTeams = newTeams.map(t => ({
        id: t.id,
        name: t.name,
        league: t.league,
        logo: t.logo,
        player_ids: t.playerIds
      }));
      const { error } = await supabase.from('teams').insert(dbTeams);
      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      alert('Erro no lote: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const saveCompetition = async (comp: Competition) => {
    setSyncing(true);
    try {
      const dbComp = {
        id: comp.id,
        name: comp.name,
        date_time: comp.dateTime,
        status: comp.status,
        phase: comp.phase,
        team_ids: comp.teamIds
      };
      const { error } = await supabase.from('competitions').upsert(dbComp);
      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      alert('Erro ao salvar torneio: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const deleteCompetition = async (id: string) => {
    if (!confirm('Excluir este campeonato?')) return;
    setSyncing(true);
    try {
      const { error } = await supabase.from('competitions').delete().eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  return { 
    competitions, saveCompetition, deleteCompetition,
    teams, saveTeam, deleteTeam, bulkAddTeams,
    loading, syncing, fetchData, dbError
  };
};

const BrandLogo = ({ className = "h-10" }: { className?: string }) => (
  <img src="logo.png" alt="Esporte Coxim" className={className} onError={(e) => {
    e.currentTarget.src = "https://via.placeholder.com/150x50?text=ESPORTE+COXIM";
  }} />
);

export default function App() {
  const db = useDB();
  const [isLogged, setIsLogged] = useState(() => localStorage.getItem(DB_KEYS.SESSION) === 'true');
  const [view, setView] = useState<'user' | 'admin' | 'login' | 'setup'>(() => {
    return localStorage.getItem(DB_KEYS.SESSION) === 'true' ? 'admin' : 'user';
  });
  const [adminSection, setAdminSection] = useState<'comp' | 'games' | 'teams'>('comp');
  const [loginForm, setLoginForm] = useState({ phone: '', password: '', stayLoggedIn: false });
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [teamForm, setTeamForm] = useState({ name: '', league: '', logo: '' });
  const [copied, setCopied] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.phone.trim() === DEFAULT_ADMIN.phone && loginForm.password.trim() === DEFAULT_ADMIN.password) {
      setIsLogged(true);
      if (loginForm.stayLoggedIn) localStorage.setItem(DB_KEYS.SESSION, 'true');
      setView('admin');
    } else {
      alert("Acesso Negado!");
    }
  };

  const handleLogout = () => {
    setIsLogged(false);
    localStorage.removeItem(DB_KEYS.SESSION);
    setView('user');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(SQL_SETUP);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTeamForm(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamForm.name) return;
    await db.saveTeam({ 
      id: Date.now().toString(), 
      name: teamForm.name, 
      league: teamForm.league,
      logo: teamForm.logo,
      playerIds: [] 
    });
    setTeamForm({ name: '', league: '', logo: '' });
    setIsTeamModalOpen(false);
  };

  const CompetitionWizard = ({ onClose }: { onClose: () => void }) => {
    const [step, setStep] = useState(1);
    const [wizardData, setWizardData] = useState({
      name: '', dateTime: '', status: CompStatus.ATIVA, phaseType: Phase.GRUPOS,
      activeTeamIds: []
    });

    const finalize = async (quick: boolean = false) => {
      const newComp: Competition = {
        id: Date.now().toString(),
        name: wizardData.name,
        dateTime: wizardData.dateTime,
        status: wizardData.status,
        phase: wizardData.phaseType,
        teamIds: wizardData.activeTeamIds
      };
      await db.saveCompetition(newComp);
      onClose();
    };

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
        <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
          <div className="sport-gradient p-10 text-white flex justify-between items-center">
            <div>
              <h3 className="text-3xl font-black uppercase italic tracking-tighter">Cadastro de Torneio</h3>
              <span className="bg-white/20 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mt-2 inline-block">
                {step === 1 ? 'Informações Básicas' : `Passo ${step} de 3`}
              </span>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-full transition"><X size={24}/></button>
          </div>

          <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
            {step === 1 && (
              <div className="space-y-12 animate-in slide-in-from-bottom-4">
                <div className="bg-blue-50/50 p-8 rounded-[2rem] border border-blue-100 flex items-center gap-6">
                   <div className="p-4 bg-white rounded-2xl text-blue-600 shadow-sm"><Sparkles size={32}/></div>
                   <div>
                      <h4 className="font-black text-slate-800 uppercase italic">Início Rápido</h4>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Preencha o nome e a data para salvar agora e configurar os detalhes depois.</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Campeonato</label>
                    <input autoFocus value={wizardData.name} onChange={e => setWizardData({...wizardData, name: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[1.5rem] border-none font-black text-xl shadow-inner focus:ring-2 focus:ring-[#003b95] transition-all" placeholder="Ex: Copa Coxim 2024" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Data e Hora de Início</label>
                    <input type="datetime-local" value={wizardData.dateTime} onChange={e => setWizardData({...wizardData, dateTime: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[1.5rem] border-none font-black text-xl shadow-inner focus:ring-2 focus:ring-[#003b95] transition-all" />
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 pt-6">
                   <button 
                     onClick={() => finalize(true)} 
                     disabled={!wizardData.name || db.syncing}
                     className="flex-1 bg-green-600 text-white py-6 rounded-[2rem] font-black uppercase text-xs shadow-xl hover:bg-green-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                   >
                     {db.syncing ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}
                     Salvar e Finalizar Depois
                   </button>
                   <button 
                     onClick={() => setStep(2)} 
                     disabled={!wizardData.name}
                     className="flex-1 bg-[#003b95] text-white py-6 rounded-[2rem] font-black uppercase text-xs shadow-xl hover:bg-slate-900 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                   >
                     Configurar Detalhes Agora <ChevronRight size={20}/>
                   </button>
                </div>
              </div>
            )}
            
            {step === 2 && (
              <div className="space-y-10 animate-in slide-in-from-right-4">
                 <h4 className="text-xl font-black text-slate-800 uppercase italic mb-8">Tipo de Competição</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button onClick={() => setWizardData({...wizardData, phaseType: Phase.GRUPOS})} className={`p-12 rounded-[2.5rem] border-4 transition-all flex flex-col items-center gap-4 ${wizardData.phaseType === Phase.GRUPOS ? 'border-[#003b95] bg-blue-50/50' : 'border-slate-100 opacity-40 hover:opacity-100'}`}>
                      <LayoutGrid size={48} className="text-[#003b95]" />
                      <span className="font-black uppercase italic text-xl">Fase de Grupos</span>
                    </button>
                    <button onClick={() => setWizardData({...wizardData, phaseType: Phase.PLAYOFFS})} className={`p-12 rounded-[2.5rem] border-4 transition-all flex flex-col items-center gap-4 ${wizardData.phaseType === Phase.PLAYOFFS ? 'border-[#d90429] bg-red-50/50' : 'border-slate-100 opacity-40 hover:opacity-100'}`}>
                      <Activity size={48} className="text-[#d90429]" />
                      <span className="font-black uppercase italic text-xl">Mata-Mata Direto</span>
                    </button>
                 </div>
                 <div className="flex justify-between pt-10">
                    <button onClick={() => setStep(1)} className="px-10 py-5 font-black uppercase text-xs text-slate-400">Voltar</button>
                    <button onClick={() => setStep(3)} className="bg-[#003b95] text-white px-16 py-5 rounded-2xl font-black uppercase text-xs shadow-xl">Próximo</button>
                 </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-8 animate-in slide-in-from-right-4">
                 <div className="flex justify-between items-center">
                    <h4 className="font-black text-slate-800 uppercase italic">Convocar Equipes</h4>
                    <span className="text-[10px] font-black uppercase p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">{wizardData.activeTeamIds.length} Equipes Selecionadas</span>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                   {db.teams.map(t => {
                     const active = wizardData.activeTeamIds.includes(t.id);
                     return (
                       <button key={t.id} onClick={() => setWizardData(prev => ({ ...prev, activeTeamIds: active ? prev.activeTeamIds.filter(id=>id!==t.id) : [...prev.activeTeamIds, t.id] }))} className={`p-5 rounded-[2rem] border-2 flex items-center gap-4 transition-all ${active ? 'border-[#003b95] bg-blue-50' : 'border-slate-100 opacity-50'}`}>
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${active ? 'bg-[#003b95] text-white' : 'bg-slate-100 text-slate-300'}`}>
                            {active ? <Check size={16}/> : <Users size={16}/>}
                         </div>
                         <span className="font-black text-xs uppercase text-left truncate">{t.name}</span>
                       </button>
                     );
                   })}
                   {db.teams.length === 0 && <div className="col-span-full py-10 text-center text-slate-300 uppercase font-black text-xs">Nenhuma equipe cadastrada no sistema.</div>}
                 </div>
                 <div className="flex justify-between pt-6 border-t border-slate-50">
                    <button onClick={() => setStep(2)} className="px-10 py-5 font-black uppercase text-xs text-slate-400">Voltar</button>
                    <button onClick={() => finalize()} disabled={db.syncing} className="bg-[#d90429] text-white px-16 py-5 rounded-2xl font-black uppercase text-xs shadow-xl flex items-center gap-2">
                       {db.syncing ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle size={16}/>}
                       Publicar Completo
                    </button>
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-inter">
      <nav className="sticky top-0 z-50 glass-nav border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-8 h-24 flex items-center justify-between">
          <div className="flex items-center gap-5 cursor-pointer" onClick={() => setView('user')}>
            <BrandLogo className="h-14" />
            <div className="hidden lg:block border-l-2 border-slate-100 pl-5">
              <h1 className="text-2xl font-black italic tracking-tighter text-slate-900 leading-none">{APP_NAME}</h1>
              <p className="text-[9px] font-black text-[#d90429] uppercase tracking-[0.5em] mt-1">Sincronização Cloud Ativa</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isLogged ? (
              <div className="flex items-center gap-3">
                <button onClick={() => { setAdminSection('comp'); setView('admin'); }} className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${view === 'admin' ? 'bg-[#003b95] text-white' : 'text-slate-500'}`}>Painel</button>
                <button onClick={handleLogout} className="p-3 bg-red-50 text-[#d90429] rounded-2xl"><LogOut size={20} /></button>
              </div>
            ) : (
              <button onClick={() => setView('login')} className="bg-slate-900 text-white px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-2xl">Acesso</button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-12 flex-grow w-full">
        {db.loading && (
          <div className="fixed inset-0 z-[200] bg-white/50 backdrop-blur-sm flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-[#003b95] mb-4" size={48} />
            <p className="font-black uppercase text-xs tracking-widest text-[#003b95]">Sincronizando...</p>
          </div>
        )}

        {(db.dbError || view === 'setup') && (
          <div className="animate-in zoom-in duration-500 max-w-4xl mx-auto">
            <div className="bg-white border-2 border-slate-100 p-12 rounded-[4rem] shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-3 sport-gradient"></div>
               <div className="flex items-center gap-6 mb-10">
                  <div className="p-5 bg-red-50 text-red-600 rounded-[2rem]"><Database size={40}/></div>
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Configuração de Banco</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Execute o script abaixo no SQL Editor do seu projeto Supabase.</p>
                  </div>
               </div>
               
               <div className="space-y-8">
                  <div className="p-8 bg-slate-900 rounded-[2.5rem] relative group border-4 border-slate-800">
                     <div className="flex justify-between items-center mb-6">
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">Script SQL (Vínculo Competição)</span>
                        <button onClick={copyToClipboard} className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase ${copied ? 'bg-green-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                           {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copiado!' : 'Copiar'}
                        </button>
                     </div>
                     <pre className="text-blue-300 text-[11px] font-mono leading-relaxed overflow-x-auto custom-scrollbar">
                        {SQL_SETUP}
                     </pre>
                  </div>

                  <button onClick={() => db.fetchData()} className="w-full sport-gradient text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl hover:scale-105 active:scale-95 transition-all">
                     Verificar Novamente
                  </button>
               </div>
            </div>
          </div>
        )}

        {view === 'user' && !db.dbError && (
          <div className="space-y-16 pb-20 animate-in fade-in duration-700">
            <div className="relative h-[30rem] sport-gradient rounded-[4rem] overflow-hidden flex items-end p-16 shadow-2xl">
              <div className="absolute inset-0 opacity-30 mix-blend-overlay scale-110">
                <img src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=2000" className="w-full h-full object-cover" />
              </div>
              <div className="relative z-10 text-white max-w-3xl">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-2 h-10 bg-red-500 rounded-full"></div>
                  <span className="bg-white/10 px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.4em] backdrop-blur-sm border border-white/10">Coxim MS • Esporte Cloud</span>
                </div>
                <h2 className="text-7xl font-black italic uppercase tracking-tighter mb-6 leading-[0.9] drop-shadow-2xl">CONECTE-SE AO<br/><span className="text-red-500">GRAMADO</span></h2>
                <p className="text-blue-100 text-xl font-medium opacity-80 max-w-xl">Dados oficiais das competições em tempo real na palma da sua mão.</p>
              </div>
            </div>

            <div className="space-y-10">
              <div className="flex justify-between items-center">
                <h3 className="text-3xl font-black text-slate-900 uppercase italic flex items-center gap-4">
                  <div className="p-2 bg-red-500 rounded-xl text-white"><Trophy size={28}/></div>
                  Campeonatos Ativos
                </h3>
              </div>
              
              {db.competitions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                   {db.competitions.map(c => (
                     <div key={c.id} className="group bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden cursor-pointer hover:shadow-2xl hover:-translate-y-3 transition-all duration-500 relative">
                        <div className="h-4 bg-slate-50 border-b border-slate-50 group-hover:bg-[#003b95] transition-colors"></div>
                        <div className="p-10">
                          <h4 className="text-3xl font-black text-slate-900 mb-8 uppercase italic leading-tight group-hover:text-[#003b95] transition-colors">{c.name}</h4>
                          <div className="flex items-center gap-8 text-[11px] font-black text-slate-400 uppercase tracking-widest border-t border-slate-50 pt-8">
                             <div className="flex items-center gap-3"><Users size={18} className="text-red-500" /> {c.teamIds?.length || 0} Equipes</div>
                             <div className="flex items-center gap-3"><Cloud size={18} className="text-blue-500" /> Cloud</div>
                          </div>
                        </div>
                     </div>
                   ))}
                </div>
              ) : (
                <div className="p-24 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-100 flex flex-col items-center gap-6">
                   <div className="p-10 bg-slate-50 rounded-full text-slate-200"><RefreshCw size={80} className="animate-spin-slow"/></div>
                   <p className="font-black text-slate-300 uppercase italic tracking-widest text-xl">Sincronizando banco de dados...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'admin' && isLogged && (
          <div className="space-y-12 animate-in fade-in duration-500 pb-20">
             <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-b border-slate-100 pb-12">
                <div>
                   <p className="text-[11px] font-black uppercase text-red-500 tracking-[0.3em] mb-2">Painel Administrativo</p>
                   <h2 className="text-5xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Administração</h2>
                </div>
                <div className="flex gap-3 p-2 bg-slate-100 rounded-[2rem] shadow-inner">
                   {(['comp', 'teams', 'games'] as const).map(sec => (
                     <button key={sec} onClick={() => setAdminSection(sec)} className={`px-10 py-4 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest transition-all ${adminSection === sec ? 'bg-[#003b95] text-white shadow-2xl scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
                        {sec === 'comp' ? 'Torneios' : sec === 'teams' ? 'Equipes' : 'Jogos'}
                     </button>
                   ))}
                </div>
             </div>

             {adminSection === 'comp' && (
               <div className="space-y-10 animate-in slide-in-from-bottom-4">
                 <button onClick={() => setIsWizardOpen(true)} className="sport-gradient px-12 py-6 rounded-[2rem] text-white font-black uppercase text-xs flex items-center gap-4 shadow-2xl hover:scale-105 transition-all group">
                    <Plus size={24} className="group-hover:rotate-90 transition-transform" /> Novo Campeonato
                 </button>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {db.competitions.map(c => (
                      <div key={c.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 flex justify-between items-center group hover:shadow-xl transition-all border-l-8 border-l-[#003b95]">
                         <div>
                            <p className="text-[10px] font-black text-slate-300 uppercase mb-1 tracking-widest">{c.phase || 'A Definir'}</p>
                            <p className="text-xl font-black text-slate-900 uppercase italic leading-tight">{c.name}</p>
                         </div>
                         <button onClick={() => db.deleteCompetition(c.id)} className="p-3 text-slate-100 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100"><Trash2 size={24} /></button>
                      </div>
                    ))}
                 </div>
               </div>
             )}

             {adminSection === 'teams' && (
               <div className="space-y-10 animate-in slide-in-from-bottom-4">
                  <div className="bg-white p-10 rounded-[4rem] shadow-sm border border-slate-100">
                     <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
                        <div className="flex items-center gap-6">
                           <div className="p-5 bg-blue-50 text-[#003b95] rounded-3xl"><Users size={32}/></div>
                           <h3 className="text-2xl font-black text-slate-900 uppercase italic leading-none">Equipes Vinculadas</h3>
                        </div>
                        <div className="flex gap-4">
                           <button onClick={() => setIsTeamModalOpen(true)} className="bg-[#003b95] text-white px-10 py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl flex items-center gap-2">
                             <Plus size={16}/> Novo Cadastro
                           </button>
                           <button 
                             disabled={db.syncing}
                             onClick={() => {
                               const leagueName = prompt('Nome do campeonato para este lote?');
                               const countStr = prompt('Quantas equipes no lote?', '8');
                               const count = parseInt(countStr || '0');
                               if(count > 0) {
                                 const ts: Team[] = [];
                                 for(let i=1; i<=count; i++) ts.push({ id: (Date.now()+i).toString(), name: `Equipe Cloud ${String(db.teams.length+i).padStart(2,'0')}`, league: leagueName || '', playerIds: [] });
                                 db.bulkAddTeams(ts);
                               }
                             }} className="bg-red-500 text-white px-10 py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl">
                             Gerar Lote
                           </button>
                        </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {db.teams.map(t => (
                           <div key={t.id} className="p-6 bg-slate-50 rounded-[2.5rem] border border-transparent hover:border-slate-200 hover:shadow-2xl transition-all group flex flex-col gap-4">
                              <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-5">
                                    <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center border border-slate-100 p-2 shadow-sm overflow-hidden">
                                       {t.logo ? <img src={t.logo} className="w-full h-full object-cover" /> : <Users className="text-slate-200" size={32} />}
                                    </div>
                                    <p className="font-black text-sm text-slate-900 uppercase italic tracking-tight">{t.name}</p>
                                 </div>
                                 <button onClick={() => db.deleteTeam(t.id)} className="p-3 text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={20}/></button>
                              </div>
                              <div className="flex items-center gap-2 mt-2 px-4 py-2 bg-white rounded-2xl border border-slate-100">
                                 <LinkIcon size={12} className="text-blue-500" />
                                 <span className="text-[10px] font-black uppercase text-slate-400 truncate">{t.league || 'Sem Campeonato'}</span>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
             )}
             
             {adminSection === 'games' && (
               <div className="p-32 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-100 opacity-20"><Calendar size={80} className="mx-auto mb-8"/><p className="font-black uppercase italic tracking-widest text-2xl">Módulo de Jogos em breve</p></div>
             )}
          </div>
        )}

        {view === 'login' && (
           <div className="max-w-md mx-auto pt-20">
             <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-slate-100 relative overflow-hidden animate-in zoom-in duration-500">
               <div className="absolute top-0 left-0 w-full h-3 sport-gradient"></div>
               <div className="text-center mb-12"><BrandLogo className="h-20 mx-auto mb-8" /><h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Login de Acesso</h2></div>
               <form onSubmit={handleLogin} className="space-y-8">
                  <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone</label><input type="text" value={loginForm.phone} onChange={e => setLoginForm({...loginForm, phone: e.target.value})} className="w-full p-5 bg-slate-50 border-none rounded-[1.5rem] font-black text-lg focus:ring-2 focus:ring-[#003b95]" placeholder="67..." /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label><input type="password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full p-5 bg-slate-50 border-none rounded-[1.5rem] font-black text-lg focus:ring-2 focus:ring-[#003b95]" /></div>
                  <button type="submit" className="w-full bg-[#003b95] text-white py-6 rounded-[2rem] font-black uppercase text-[12px] tracking-widest shadow-2xl hover:bg-slate-900 transition-all active:scale-95">Entrar no Sistema</button>
               </form>
               <button onClick={() => setView('user')} className="w-full mt-10 text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-600 transition-colors">Voltar</button>
             </div>
           </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-100 py-16">
        <div className="max-w-7xl mx-auto px-8 flex flex-col items-center gap-10">
           <div className="flex items-center gap-4 text-blue-500 font-black uppercase text-[11px] tracking-widest"><Cloud size={20} /> Supabase Cloud-Native</div>
           <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.6em]">© 2024 ESPORTE COXIM</p>
        </div>
      </footer>

      {/* MODAL DE CADASTRO DE EQUIPE COM UPLOAD DE BRASÃO */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95">
              <div className="sport-gradient p-8 text-white flex justify-between items-center">
                 <h3 className="text-2xl font-black uppercase italic tracking-tighter">Nova Equipe</h3>
                 <button onClick={() => setIsTeamModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={20}/></button>
              </div>
              <form onSubmit={handleAddTeam} className="p-10 space-y-6">
                 {/* Upload de Brasão */}
                 <div className="flex flex-col items-center gap-4">
                    <div 
                       onClick={() => logoInputRef.current?.click()}
                       className="w-32 h-32 bg-slate-50 border-4 border-dashed border-slate-200 rounded-full flex flex-col items-center justify-center cursor-pointer hover:border-[#003b95] hover:bg-blue-50 transition-all overflow-hidden group relative"
                    >
                       {teamForm.logo ? (
                          <>
                             <img src={teamForm.logo} className="w-full h-full object-cover" />
                             <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Upload size={24} className="text-white" />
                             </div>
                          </>
                       ) : (
                          <>
                             <ImageIcon size={32} className="text-slate-300 mb-2" />
                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Brasão</span>
                          </>
                       )}
                    </div>
                    <input 
                       ref={logoInputRef}
                       type="file" 
                       accept="image/*" 
                       onChange={handleLogoUpload} 
                       className="hidden" 
                    />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clique para enviar o logo</p>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Equipe</label>
                    <input autoFocus required value={teamForm.name} onChange={e => setTeamForm({...teamForm, name: e.target.value})} className="w-full p-5 bg-slate-50 rounded-[1.5rem] border-none font-black text-lg shadow-inner" placeholder="Ex: Santos Coxim" />
                 </div>
                 
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vincular Campeonato</label>
                    <select value={teamForm.league} onChange={e => setTeamForm({...teamForm, league: e.target.value})} className="w-full p-5 bg-slate-50 rounded-[1.5rem] border-none font-black text-lg appearance-none cursor-pointer shadow-inner">
                       <option value="">Selecione um Campeonato</option>
                       {db.competitions.map(c => (
                         <option key={c.id} value={c.name}>{c.name}</option>
                       ))}
                    </select>
                 </div>
                 <div className="pt-4">
                    <button type="submit" disabled={db.syncing || !teamForm.name} className="w-full bg-[#003b95] text-white py-5 rounded-[1.5rem] font-black uppercase text-xs shadow-xl flex items-center justify-center gap-2 hover:bg-slate-900 transition-all">
                       {db.syncing ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                       Salvar na Nuvem
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {isWizardOpen && <CompetitionWizard onClose={() => setIsWizardOpen(false)} />}
      
      <style>{`
        .animate-spin-slow { animation: spin 10s linear infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
}
