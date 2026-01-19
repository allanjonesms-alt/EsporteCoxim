
import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Trophy, 
  Users, 
  Calendar, 
  Shield, 
  Activity, 
  Loader2, 
  TrophyIcon,
  Plus, 
  Trash2,
  LogIn,
  LogOut,
  Gamepad2,
  ChevronRight,
  Info,
  History,
  AlertCircle,
  Clock,
  CheckCircle2,
  X,
  Target,
  ChevronDown,
  RefreshCw,
  PlusCircle,
  Edit3,
  Layers,
  Settings2,
  ArrowRight,
  UserPlus
} from 'lucide-react';
import { Competition, Team, Game, CompStatus, GameStatus, Phase } from './types';
import { DEFAULT_ADMIN } from './constants';

// Configuração Supabase
const SUPABASE_URL = 'https://pkwprsdejfyfokgscwdl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrd3Byc2RlamZ5Zm9rZ3Njd2RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzI5ODksImV4cCI6MjA4NDE0ODk4OX0.Ak4ytUV3HmULv5q-ZMOr5UYFrePQgo6uJU1910xLRfc';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedCompId, setSelectedCompId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'classificacao' | 'jogos' | 'times'>('classificacao');
  
  // Modal State
  const [isCompModalOpen, setIsCompModalOpen] = useState(false);
  const [editingCompId, setEditingCompId] = useState<string | null>(null);
  
  // Phase Modal States
  const [isPhaseModalOpen, setIsPhaseModalOpen] = useState(false);
  const [isPhaseListModalOpen, setIsPhaseListModalOpen] = useState(false);
  const [newPhaseData, setNewPhaseData] = useState({
    name: '',
    type: 'Fase de Grupos' as 'Fase de Grupos' | 'Mata-Mata'
  });

  // Group Configuration Logic
  const [configuringPhase, setConfiguringPhase] = useState<Phase | null>(null);
  const [groupConfigStep, setGroupConfigStep] = useState<'list' | 'setup' | 'slots'>('list');
  const [numGroups, setNumGroups] = useState<number>(2);
  const [groupAssignments, setGroupAssignments] = useState<Record<string, string[]>>({});
  const [selectedTeamForAssignment, setSelectedTeamForAssignment] = useState<string | null>(null);

  // Admin State
  const [view, setView] = useState<'user' | 'admin' | 'login'>('user');
  const [adminTab, setAdminTab] = useState<'comps' | 'teams' | 'games'>('comps');
  const [isLogged, setIsLogged] = useState(() => localStorage.getItem('ec_session') === 'true');
  const [loginForm, setLoginForm] = useState({ phone: '', pass: '' });

  // Admin Forms State
  const [newTeamName, setNewTeamName] = useState('');
  
  // New/Edit Comp Form State (Modal)
  const [newCompData, setNewCompData] = useState({
    name: '',
    date: '',
    status: CompStatus.AGENDADA,
    phase: 'Fase de Grupos',
    teams: [] as string[]
  });
  
  // Game Creation State
  const [newGame, setNewGame] = useState({
    compId: '',
    homeId: '',
    awayId: '',
    date: ''
  });

  // Busca de dados
  const fetchData = async () => {
    setLoading(true);
    try {
      const [cRes, tRes, gRes, pRes] = await Promise.all([
        supabase.from('leagues').select('*').order('id', { ascending: false }),
        supabase.from('teams').select('*').order('name'),
        supabase.from('games').select('*').order('game_date', { ascending: true }),
        supabase.from('phases').select('*').order('name')
      ]);

      if (cRes.data) setCompetitions(cRes.data);
      if (tRes.data) setTeams(tRes.data);
      if (gRes.data) setGames(gRes.data);
      if (pRes.data) setPhases(pRes.data);
      
      if (cRes.data && cRes.data.length > 0 && !selectedCompId) {
        setSelectedCompId(cRes.data[0].id.toString());
      }
    } catch (error: any) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Handlers Administrativos
  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGame.compId || !newGame.homeId || !newGame.awayId) return alert("Selecione o campeonato e os dois times.");
    if (newGame.homeId === newGame.awayId) return alert("Um time não pode jogar contra ele mesmo.");

    setSyncing(true);
    try {
      const { error } = await supabase.from('games').insert({
        competition_id: newGame.compId,
        home_team_id: newGame.homeId,
        away_team_id: newGame.awayId,
        home_score: 0,
        away_score: 0,
        status: GameStatus.AGENDADO,
        game_date: newGame.date || new Date().toISOString()
      });
      if (error) throw error;
      setNewGame({ ...newGame, homeId: '', awayId: '' });
      await fetchData();
    } catch (err: any) { 
      alert("Erro ao criar partida: " + (err.message || "Erro desconhecido")); 
    } finally { 
      setSyncing(false); 
    }
  };

  const handleUpdateGame = async (gameId: string, h: number, a: number, status: GameStatus) => {
    setSyncing(true);
    try {
      const { error } = await supabase.from('games').update({ home_score: h, away_score: a, status }).eq('id', gameId);
      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      alert("Erro ao atualizar jogo: " + (err.message || "Erro desconhecido"));
    } finally { 
      setSyncing(false); 
    }
  };

  const handleDeleteGame = async (id: string) => {
    if (!confirm("Excluir esta partida?")) return;
    setSyncing(true);
    try {
      const { error } = await supabase.from('games').delete().eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      alert("Erro ao excluir jogo: " + (err.message || "Erro desconhecido"));
    } finally { 
      setSyncing(false); 
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName) return;
    setSyncing(true);
    try {
      const { error } = await supabase.from('teams').insert({ name: newTeamName });
      if (error) throw error;
      setNewTeamName('');
      await fetchData();
    } catch (err: any) {
      alert("Erro ao criar time: " + (err.message || "Erro desconhecido"));
    } finally { 
      setSyncing(false); 
    }
  };

  const handleDeleteTeam = async (id: string) => {
    if (!confirm("Excluir este clube?")) return;
    setSyncing(true);
    try {
      const { error } = await supabase.from('teams').delete().eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      alert("Erro ao excluir time: " + (err.message || "Erro desconhecido"));
    } finally { 
      setSyncing(false); 
    }
  };

  const handleSaveComp = async () => {
    if (!newCompData.name) return alert("Preencha o nome do campeonato.");
    setSyncing(true);
    try {
      const payload = {
        name: newCompData.name,
        status: newCompData.status,
        date: newCompData.date || new Date().toISOString().split('T')[0],
        current_phase: newCompData.phase
      };

      if (editingCompId) {
        const { error } = await supabase.from('leagues').update(payload).eq('id', Number(editingCompId));
        if (error) throw error;
      } else {
        const manualId = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);
        const { error } = await supabase.from('leagues').insert({ ...payload, id: manualId });
        if (error) throw error;
      }
      
      handleCloseCompModal();
      await fetchData();
    } catch (err: any) {
      console.error(err);
      alert("Erro ao salvar campeonato: " + (err.message || "Erro de conexão"));
    } finally { 
      setSyncing(false); 
    }
  };

  const handleSavePhase = async () => {
    if (!newPhaseData.name || !editingCompId) return alert("Preencha o nome da fase.");
    setSyncing(true);
    try {
      const manualId = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);
      const { error } = await supabase.from('phases').insert({
        id: manualId,
        competitions_id: Number(editingCompId),
        name: newPhaseData.name,
        type: newPhaseData.type
      });
      
      if (error) throw error;
      
      alert("Fase criada com sucesso!");
      setNewPhaseData({ name: '', type: 'Fase de Grupos' });
      setIsPhaseModalOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      alert("Erro ao criar fase: " + (err.message || "Erro desconhecido"));
    } finally { 
      setSyncing(false); 
    }
  };

  const handleDeletePhase = async (phaseId: string | number) => {
    if (!confirm("Excluir esta fase permanentemente?")) return;
    setSyncing(true);
    try {
      const { error } = await supabase.from('phases').delete().eq('id', phaseId);
      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      alert("Erro ao excluir fase: " + (err.message || "Erro desconhecido"));
    } finally {
      setSyncing(false);
    }
  };

  const handleEditCompClick = (comp: Competition) => {
    setEditingCompId(comp.id.toString());
    setNewCompData({
      name: comp.name,
      date: comp.date || '',
      status: comp.status,
      phase: comp.current_phase || 'Fase de Grupos',
      teams: comp.team_ids || []
    });
    setIsCompModalOpen(true);
  };

  const handleCloseCompModal = () => {
    setIsCompModalOpen(false);
    setEditingCompId(null);
    setNewCompData({
      name: '',
      date: '',
      status: CompStatus.AGENDADA,
      phase: 'Fase de Grupos',
      teams: []
    });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const inputPhone = loginForm.phone.replace(/\D/g, '');
    const adminPhone = DEFAULT_ADMIN.phone.replace(/\D/g, '');
    if (inputPhone === adminPhone && loginForm.pass === DEFAULT_ADMIN.password) {
      setIsLogged(true);
      localStorage.setItem('ec_session', 'true');
      setView('admin');
    } else {
      alert("Credenciais inválidas.");
    }
  };

  const activeComp = useMemo(() => 
    competitions.find(c => c.id.toString() === selectedCompId.toString()), 
  [competitions, selectedCompId]);

  // Fases do campeonato em edição
  const activeCompPhases = useMemo(() => {
    if (!editingCompId) return [];
    return phases.filter(p => p.competitions_id.toString() === editingCompId.toString());
  }, [phases, editingCompId]);

  // Equipes vinculadas ao campeonato em edição
  const activeCompTeams = useMemo(() => {
    if (!editingCompId) return [];
    return teams.filter(t => 
      newCompData.teams.map(String).includes(t.id.toString()) || 
      (t.league && t.league.toLowerCase() === newCompData.name.toLowerCase())
    );
  }, [teams, newCompData.teams, newCompData.name, editingCompId]);

  // MOTOR DE CLASSIFICAÇÃO ADAPTÁVEL
  const standings = useMemo(() => {
    if (!activeComp) return [];
    
    const compIdStr = activeComp.id.toString();
    const compGames = games.filter(g => 
      g.competition_id.toString() === compIdStr && 
      g.status === GameStatus.ENCERRADO
    );
    
    const stats: Record<string, any> = {};

    let teamList: string[] = [];
    if (activeComp.team_ids && Array.isArray(activeComp.team_ids)) {
      teamList = activeComp.team_ids.map(String);
    } else if (activeComp.team_ids && typeof activeComp.team_ids === 'string') {
      try { teamList = JSON.parse(activeComp.team_ids).map(String); } catch(e) { teamList = []; }
    } else {
      const compAllGames = games.filter(g => g.competition_id.toString() === compIdStr);
      const uniqueTeams = new Set<string>();
      compAllGames.forEach(g => {
        uniqueTeams.add(g.home_team_id.toString());
        uniqueTeams.add(g.away_team_id.toString());
      });
      teamList = Array.from(uniqueTeams);
    }

    teamList.forEach(tid => {
      const team = teams.find(t => t.id.toString() === tid);
      stats[tid] = { 
        id: tid, 
        name: team?.name || 'Clube Desconhecido', 
        pts: 0, pj: 0, v: 0, e: 0, d: 0, gf: 0, ga: 0, sg: 0, pperc: '0.0'
      };
    });

    compGames.forEach(g => {
      const hId = g.home_team_id.toString();
      const aId = g.away_team_id.toString();

      if (stats[hId] && stats[aId]) {
        stats[hId].pj++; stats[aId].pj++;
        stats[hId].gf += g.home_score; stats[hId].ga += g.away_score;
        stats[aId].gf += g.away_score; stats[aId].ga += g.home_score;
        
        if (g.home_score > g.away_score) { 
          stats[hId].pts += 3; stats[hId].v++; stats[aId].d++; 
        } else if (g.home_score < g.away_score) { 
          stats[aId].pts += 3; stats[aId].v++; stats[hId].d++; 
        } else { 
          stats[hId].pts += 1; stats[aId].pts += 1; 
          stats[hId].e++; stats[aId].e++; 
        }
      }
    });

    return Object.values(stats)
      .map(s => {
        const saldo = s.gf - s.ga;
        const totalPossivel = s.pj * 3;
        const aproveitamento = totalPossivel > 0 ? (s.pts / totalPossivel) * 100 : 0;
        return { ...s, sg: saldo, pperc: aproveitamento.toFixed(1) };
      })
      .sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts; 
        if (b.v !== a.v) return b.v - a.v;         
        if (b.sg !== a.sg) return b.sg - a.sg;     
        if (b.gf !== a.gf) return b.gf - a.gf;     
        return a.ga - b.ga;                        
      });
  }, [activeComp, games, teams]);

  // Agrupamento de jogos por status
  const groupedGames = useMemo(() => {
    const filtered = games.filter(g => g.competition_id.toString() === selectedCompId.toString());
    return {
      ao_vivo: filtered.filter(g => g.status === GameStatus.AO_VIVO),
      agendado: filtered.filter(g => g.status === GameStatus.AGENDADO),
      encerrado: filtered.filter(g => g.status === GameStatus.ENCERRADO)
    };
  }, [games, selectedCompId]);

  const totalFinishedGames = useMemo(() => 
    games.filter(g => g.competition_id.toString() === selectedCompId.toString() && g.status === GameStatus.ENCERRADO).length
  , [games, selectedCompId]);

  // Lógica de Gerenciamento de Fases (Grupos)
  const handlePhaseClick = (phase: Phase) => {
    if (phase.type === 'Fase de Grupos') {
      setConfiguringPhase(phase);
      setGroupConfigStep('setup');
      setNumGroups(2);
      setGroupAssignments({});
      setSelectedTeamForAssignment(null);
    }
  };

  const handleGenerateGroupStructure = () => {
    const numParticipants = activeCompTeams.length;
    if (numParticipants % numGroups !== 0) {
      alert(`O número de participantes (${numParticipants}) não é divisível por ${numGroups} grupos. Por favor, ajuste.`);
      return;
    }

    const slotsPerGroup = numParticipants / numGroups;
    const initialAssignments: Record<string, string[]> = {};
    for (let i = 0; i < numGroups; i++) {
      const groupLetter = String.fromCharCode(65 + i);
      initialAssignments[groupLetter] = new Array(slotsPerGroup).fill('');
    }

    setGroupAssignments(initialAssignments);
    setGroupConfigStep('slots');
  };

  const handleAssignTeamToSlot = (groupLetter: string, slotIndex: number) => {
    if (!selectedTeamForAssignment) {
      // Se clicar num slot já ocupado, remove o time para o pool
      if (groupAssignments[groupLetter][slotIndex]) {
        const newAssignments = { ...groupAssignments };
        newAssignments[groupLetter][slotIndex] = '';
        setGroupAssignments(newAssignments);
      }
      return;
    }

    // Verifica se o time já está em algum grupo
    const alreadyAssigned = Object.values(groupAssignments).some(group => group.includes(selectedTeamForAssignment));
    if (alreadyAssigned) {
      alert("Este time já foi escalado em um grupo.");
      setSelectedTeamForAssignment(null);
      return;
    }

    const newAssignments = { ...groupAssignments };
    newAssignments[groupLetter][slotIndex] = selectedTeamForAssignment;
    setGroupAssignments(newAssignments);
    setSelectedTeamForAssignment(null);
  };

  const assignedTeamIds = useMemo(() => {
    return Object.values(groupAssignments).flat().filter(id => id !== '');
  }, [groupAssignments]);

  const availableTeams = useMemo(() => {
    return activeCompTeams.filter(t => !assignedTeamIds.includes(t.id.toString()));
  }, [activeCompTeams, assignedTeamIds]);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      <header className="bg-[#003b95] text-white shadow-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => setView('user')} className="flex items-center gap-3 group transition-transform active:scale-95">
            <div className="bg-white p-1.5 rounded-xl">
              <Trophy className="text-[#003b95] w-6 h-6" />
            </div>
            <div className="flex flex-col leading-none text-left font-sport uppercase italic">
              <span className="text-xl font-black">Esporte</span>
              <span className="text-xl font-black text-[#d90429]">Coxim</span>
            </div>
          </button>
          
          <div className="flex items-center gap-4">
            {isLogged ? (
              <div className="flex items-center gap-2 bg-white/10 p-1 rounded-2xl">
                <button onClick={() => setView(view === 'admin' ? 'user' : 'admin')} className={`px-5 py-2 rounded-xl font-black text-[10px] uppercase transition-all ${view === 'admin' ? 'bg-white text-[#003b95] shadow-lg' : 'text-white'}`}>
                  {view === 'admin' ? 'Ver Tabela' : 'Gerenciar'}
                </button>
                <button onClick={() => { setIsLogged(false); localStorage.removeItem('ec_session'); setView('user'); }} className="p-2 text-red-200 hover:text-white transition-colors">
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <button onClick={() => setView('login')} className="bg-[#d90429] hover:bg-[#b90324] text-white px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase shadow-xl transition-all">
                Acesso Restrito
              </button>
            )}
          </div>
        </div>
        
        {view === 'user' && (
          <div className="bg-[#002b6d] border-t border-white/5 px-4 py-2">
            <div className="max-w-6xl mx-auto flex items-center gap-4 overflow-x-auto no-scrollbar py-1">
              {competitions.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCompId(c.id.toString())}
                  className={`whitespace-nowrap px-5 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                    selectedCompId.toString() === c.id.toString() 
                      ? 'bg-[#d90429] text-white shadow-lg scale-105' 
                      : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="flex-grow max-w-6xl mx-auto w-full p-4 md:p-8">
        {loading && !competitions.length ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="animate-spin text-[#003b95] mb-4" size={56} />
            <p className="font-black text-slate-300 uppercase animate-pulse">Sincronizando competições...</p>
          </div>
        ) : view === 'login' ? (
          <div className="max-w-sm mx-auto pt-20">
            <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100 text-center">
              <Shield className="text-[#003b95] w-12 h-12 mx-auto mb-6" />
              <h2 className="text-3xl font-black text-slate-800 uppercase italic mb-8">Portal do Gestor</h2>
              <form onSubmit={handleLogin} className="space-y-5 text-left">
                <input type="text" placeholder="Celular" className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-2xl font-bold focus:border-[#003b95] outline-none" value={loginForm.phone} onChange={e => setLoginForm({...loginForm, phone: e.target.value})} />
                <input type="password" placeholder="Senha" className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-2xl font-bold focus:border-[#003b95] outline-none" value={loginForm.pass} onChange={e => setLoginForm({...loginForm, pass: e.target.value})} />
                <button type="submit" className="w-full bg-[#003b95] text-white py-5 rounded-2xl font-black uppercase text-xs shadow-lg active:scale-95 transition-all">Entrar no Painel</button>
              </form>
            </div>
          </div>
        ) : view === 'admin' ? (
          <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h1 className="text-3xl font-black text-slate-900 uppercase italic font-sport">Dashboard de Controle</h1>
              <div className="flex p-1.5 bg-slate-200/50 rounded-2xl shadow-inner border border-slate-200">
                <button onClick={() => setAdminTab('comps')} className={`px-6 py-2 rounded-xl font-black text-[10px] uppercase transition-all ${adminTab === 'comps' ? 'bg-[#003b95] text-white shadow-lg scale-105' : 'text-slate-500 hover:text-slate-700'}`}>Torneios</button>
                <button onClick={() => setAdminTab('teams')} className={`px-6 py-2 rounded-xl font-black text-[10px] uppercase transition-all ${adminTab === 'teams' ? 'bg-[#003b95] text-white shadow-lg scale-105' : 'text-slate-500 hover:text-slate-700'}`}>Clubes</button>
                <button onClick={() => setAdminTab('games')} className={`px-6 py-2 rounded-xl font-black text-[10px] uppercase transition-all ${adminTab === 'games' ? 'bg-[#003b95] text-white shadow-lg scale-105' : 'text-slate-500 hover:text-slate-700'}`}>Partidas</button>
              </div>
            </div>

            {adminTab === 'games' && (
              <div className="space-y-8">
                {/* Simplified Games Admin View for brevity */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                  <h3 className="font-black text-slate-800 uppercase italic text-lg mb-6 flex items-center gap-2">Agendar Nova Partida</h3>
                  <form onSubmit={handleCreateGame} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Torneio</label>
                      <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" value={newGame.compId} onChange={e => setNewGame({...newGame, compId: e.target.value})}>
                        <option value="">Selecione...</option>
                        {competitions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Time Casa</label>
                      <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" value={newGame.homeId} onChange={e => setNewGame({...newGame, homeId: e.target.value})}>
                        <option value="">Selecione...</option>
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Time Visitante</label>
                      <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" value={newGame.awayId} onChange={e => setNewGame({...newGame, awayId: e.target.value})}>
                        <option value="">Selecione...</option>
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <button type="submit" className="bg-[#003b95] text-white py-4 rounded-2xl font-black uppercase text-xs shadow-md active:scale-95 transition-all">Criar Jogo</button>
                  </form>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {games.map(g => {
                    const comp = competitions.find(c => c.id.toString() === g.competition_id.toString());
                    const hTeam = teams.find(t => t.id.toString() === g.home_team_id.toString());
                    const aTeam = teams.find(t => t.id.toString() === g.away_team_id.toString());
                    return (
                      <div key={g.id} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-50 group hover:border-[#003b95]/20 transition-all">
                         <div className="flex justify-between items-center mb-6">
                            <span className="text-[10px] font-black uppercase text-slate-400">{comp?.name || '---'}</span>
                            <div className="flex items-center gap-2">
                              <select value={g.status} onChange={e => handleUpdateGame(g.id, g.home_score, g.away_score, e.target.value as GameStatus)} className={`rounded-xl px-4 py-1.5 text-[9px] font-black uppercase outline-none transition-colors ${g.status === GameStatus.AO_VIVO ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100'}`}>
                                {Object.values(GameStatus).map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                              <button onClick={() => handleDeleteGame(g.id)} className="text-slate-300 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                            </div>
                         </div>
                         <div className="flex items-center justify-between gap-4">
                            <div className="text-center flex-1">
                              <p className="text-[10px] font-black uppercase mb-3 truncate text-slate-800">{hTeam?.name}</p>
                              <input type="number" value={g.home_score} onChange={e => handleUpdateGame(g.id, parseInt(e.target.value) || 0, g.away_score, g.status)} className="w-16 h-12 text-center text-2xl font-black bg-slate-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#003b95]/10 outline-none transition-all text-[#002255]" />
                            </div>
                            <span className="text-slate-200 font-black italic">X</span>
                            <div className="text-center flex-1">
                              <p className="text-[10px] font-black uppercase mb-3 truncate text-slate-800">{aTeam?.name}</p>
                              <input type="number" value={g.away_score} onChange={e => handleUpdateGame(g.id, g.home_score, parseInt(e.target.value) || 0, g.status)} className="w-16 h-12 text-center text-2xl font-black bg-slate-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#003b95]/10 outline-none transition-all text-[#002255]" />
                            </div>
                         </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {adminTab === 'comps' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="space-y-1">
                    <h3 className="font-black text-slate-800 uppercase italic text-lg leading-none">Gestão de Torneios</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clique no card para editar</p>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => fetchData()}
                      className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-[#003b95] hover:shadow-md transition-all active:scale-95"
                    >
                      <RefreshCw size={20}/>
                    </button>
                    <button 
                      onClick={() => { setEditingCompId(null); setIsCompModalOpen(true); }}
                      className="flex items-center gap-3 bg-[#003b95] text-white px-8 py-4 rounded-[1.5rem] font-black uppercase text-[10px] shadow-xl hover:shadow-[#003b95]/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      <PlusCircle size={16}/> Novo Campeonato
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {competitions.map(c => (
                    <button 
                      key={c.id} 
                      onClick={() => handleEditCompClick(c)}
                      className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-50 group hover:border-[#003b95] hover:shadow-[#003b95]/5 transition-all flex flex-col justify-between text-left relative overflow-hidden active:scale-95"
                    >
                      <div className="absolute top-4 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Edit3 className="text-[#003b95]" size={18} />
                      </div>
                      <div>
                        <div className="flex justify-between items-start mb-6">
                          <div className="bg-blue-50 p-4 rounded-3xl text-[#003b95] group-hover:scale-110 transition-transform"><TrophyIcon size={24}/></div>
                          <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase ${c.status === CompStatus.ATIVA ? 'bg-green-50 text-green-500' : 'bg-slate-100 text-slate-400'}`}>{c.status}</div>
                        </div>
                        <h4 className="font-black text-slate-800 uppercase text-lg tracking-tight mb-2 leading-none">{c.name}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2 mb-6">
                          <Target size={12}/> {c.current_phase || 'Indefinida'}
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                        <span className="text-[9px] font-black text-[#003b95] uppercase tracking-widest">Toque para Editar</span>
                        <ChevronRight size={14} className="text-[#003b95]"/>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {adminTab === 'teams' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                  <h3 className="font-black text-slate-800 uppercase italic text-lg mb-8">Novo Clube</h3>
                  <form onSubmit={handleCreateTeam} className="space-y-6">
                    <input placeholder="Ex: Esporte Clube Coxim" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-[#d90429]/10 transition-all" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} />
                    <button type="submit" className="w-full bg-[#d90429] text-white py-5 rounded-2xl font-black uppercase text-xs shadow-lg active:scale-95 transition-all">Registrar Clube</button>
                  </form>
                </div>
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teams.map(t => (
                    <div key={t.id} className="bg-white p-5 rounded-3xl border border-slate-50 flex items-center justify-between group hover:shadow-md transition-all">
                      <div className="flex items-center gap-3">
                         <div className="bg-slate-50 p-2 rounded-xl text-slate-200"><Shield size={18}/></div>
                         <span className="font-black text-[11px] uppercase text-slate-700">{t.name}</span>
                      </div>
                      <button onClick={() => handleDeleteTeam(t.id)} className="text-slate-300 hover:text-red-500 p-2"><Trash2 size={14}/></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-10 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h1 className="text-5xl font-black text-slate-900 uppercase italic font-sport leading-none tracking-tight">{activeComp?.name || 'Selecione um Torneio'}</h1>
                <p className="text-xs font-bold text-[#d90429] uppercase mt-3 tracking-widest flex items-center gap-2">
                  <Activity size={12}/> Coxim, Mato Grosso do Sul | Temporada 2025
                </p>
              </div>
              <div className="flex bg-slate-200/50 backdrop-blur-md p-1.5 rounded-[1.5rem] shadow-inner border border-slate-200/50">
                <button onClick={() => setActiveTab('classificacao')} className={`px-7 py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${activeTab === 'classificacao' ? 'bg-[#003b95] text-white shadow-xl scale-105' : 'text-slate-500 hover:text-slate-700'}`}>Tabela</button>
                <button onClick={() => setActiveTab('jogos')} className={`px-7 py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${activeTab === 'jogos' ? 'bg-[#003b95] text-white shadow-xl scale-105' : 'text-slate-500 hover:text-slate-700'}`}>Jogos</button>
                <button onClick={() => setActiveTab('times')} className={`px-7 py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${activeTab === 'times' ? 'bg-[#003b95] text-white shadow-xl scale-105' : 'text-slate-500 hover:text-slate-700'}`}>Times</button>
              </div>
            </div>

            <div className="animate-in slide-in-from-bottom-4 duration-700">
              {activeTab === 'classificacao' && (
                <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
                  <div className="bg-[#003b95] px-10 py-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <TrophyIcon size={24} className="text-white" />
                      <div>
                         <h3 className="font-black italic uppercase text-white tracking-wider text-lg leading-none">{activeComp?.current_phase || 'Classificação'}</h3>
                         <span className="text-[8px] text-blue-200 font-black uppercase tracking-widest mt-1">{totalFinishedGames} resultados processados</span>
                      </div>
                    </div>
                  </div>
                  {/* Standings Table Rendering */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-400 font-black uppercase border-b border-slate-100">
                        <tr>
                          <th className="px-10 py-5 w-20 text-center">#</th>
                          <th className="px-6 py-5 min-w-[200px]">Clube</th>
                          <th className="px-4 py-5 text-center text-slate-800 bg-slate-100/50">P</th>
                          <th className="px-4 py-5 text-center">J</th>
                          <th className="px-4 py-5 text-center">V</th>
                          <th className="px-4 py-5 text-center">E</th>
                          <th className="px-4 py-5 text-center">D</th>
                          <th className="px-4 py-5 text-center">GP</th>
                          <th className="px-4 py-5 text-center">GC</th>
                          <th className="px-4 py-5 text-center font-black text-[#003b95]">SG</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {standings.map((team, idx) => (
                          <tr key={team.id} className="hover:bg-blue-50/30 group transition-colors">
                            <td className={`px-10 py-6 text-center font-black text-xl transition-colors ${idx < 4 ? 'border-l-4 border-blue-400 text-slate-800 group-hover:text-[#003b95]' : 'text-slate-300'}`}>{idx + 1}</td>
                            <td className="px-6 py-6">
                               <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 shadow-inner group-hover:scale-110 transition-all">
                                     <Shield size={20} className="text-slate-200 group-hover:text-[#003b95] transition-colors"/>
                                  </div>
                                  <span className="font-black text-slate-800 uppercase text-sm tracking-tight">{team.name}</span>
                               </div>
                            </td>
                            <td className="px-4 py-6 text-center bg-slate-50/50 font-black text-base text-slate-900">{team.pts}</td>
                            <td className="px-4 py-6 text-center font-bold text-slate-500">{team.pj}</td>
                            <td className="px-4 py-6 text-center font-bold text-slate-500">{team.v}</td>
                            <td className="px-4 py-6 text-center font-bold text-slate-500">{team.e}</td>
                            <td className="px-4 py-6 text-center font-bold text-slate-500">{team.d}</td>
                            <td className="px-4 py-6 text-center font-bold text-slate-500">{team.gf}</td>
                            <td className="px-4 py-6 text-center font-bold text-slate-500">{team.ga}</td>
                            <td className={`px-4 py-6 text-center font-black text-sm ${team.sg > 0 ? 'text-green-500' : team.sg < 0 ? 'text-red-400' : 'text-slate-400'}`}>{team.sg > 0 ? `+${team.sg}` : team.sg}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tabs Content: Jogos and Times (Omitted for brevity, kept from original) */}
              {activeTab === 'jogos' && (
                <div className="space-y-12 animate-in fade-in duration-500">
                  {groupedGames.ao_vivo.length > 0 && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 border-l-4 border-red-500 pl-4 py-1">
                        <div className="relative">
                           <div className="w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                           <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full"></div>
                        </div>
                        <h2 className="text-xl font-black uppercase italic font-sport text-slate-900 tracking-tight">Ao Vivo Agora</h2>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {groupedGames.ao_vivo.map(game => (
                          <GameCard key={game.id} game={game} teams={teams} />
                        ))}
                      </div>
                    </div>
                  )}

                  {groupedGames.agendado.length > 0 && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 border-l-4 border-blue-500 pl-4 py-1">
                        <Clock className="text-blue-500" size={20} />
                        <h2 className="text-xl font-black uppercase italic font-sport text-slate-900 tracking-tight">Próximas Partidas</h2>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {groupedGames.agendado.map(game => (
                          <GameCard key={game.id} game={game} teams={teams} />
                        ))}
                      </div>
                    </div>
                  )}

                  {groupedGames.encerrado.length > 0 && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 border-l-4 border-slate-400 pl-4 py-1">
                        <CheckCircle2 className="text-slate-400" size={20} />
                        <h2 className="text-xl font-black uppercase italic font-sport text-slate-900 tracking-tight">Resultados Finais</h2>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {groupedGames.encerrado.map(game => (
                          <GameCard key={game.id} game={game} teams={teams} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'times' && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                  {teams.filter(t => activeComp?.team_ids?.map(String).includes(t.id.toString()) || standings.some(s => s.id === t.id.toString())).map(team => (
                    <div key={team.id} className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 flex flex-col items-center text-center group hover:shadow-2xl hover:translate-y-[-8px] transition-all relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-[#003b95] opacity-0 group-hover:opacity-100 transition-all"></div>
                      <div className="w-16 h-16 bg-slate-50 rounded-full mb-4 flex items-center justify-center border border-slate-100 shadow-inner group-hover:bg-[#003b95]/5 transition-colors">
                        <Shield size={32} className="text-slate-200 group-hover:text-[#003b95] transition-colors" />
                      </div>
                      <h4 className="font-black text-[12px] uppercase text-slate-800 tracking-tight leading-tight group-hover:text-[#003b95] transition-colors">{team.name}</h4>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal Moderno: Cadastro/Edição de Campeonato */}
      {isCompModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300"
            onClick={handleCloseCompModal}
          ></div>
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="bg-slate-50 px-10 py-8 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="bg-[#003b95] p-3 rounded-2xl text-white shadow-lg"><TrophyIcon size={20}/></div>
                 <div className="text-left">
                   <h3 className="text-xl font-black text-slate-800 uppercase italic leading-none">{editingCompId ? 'Editar Campeonato' : 'Novo Campeonato'}</h3>
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ajuste os detalhes do torneio</span>
                 </div>
              </div>
              <button onClick={handleCloseCompModal} className="p-3 text-slate-300 hover:text-slate-600 hover:bg-white rounded-full transition-all active:scale-95">
                <X size={24}/>
              </button>
            </div>

            <div className="px-10 py-10 space-y-8 max-h-[70vh] overflow-y-auto no-scrollbar">
               {/* Comp Form Fields (Omitted for brevity, kept from original) */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2 text-left">
                   <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nome do Torneio</label>
                   <input 
                    type="text" 
                    placeholder="Ex: Copa Coxim 2025"
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-[#003b95]/10 transition-all"
                    value={newCompData.name}
                    onChange={e => setNewCompData({...newCompData, name: e.target.value})}
                   />
                 </div>
                 <div className="space-y-2 text-left">
                   <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Fase Atual</label>
                   <div className="flex flex-col gap-2">
                     <select 
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-[#003b95]/10 transition-all cursor-pointer appearance-none"
                      value={newCompData.phase}
                      onChange={e => setNewCompData({...newCompData, phase: e.target.value})}
                     >
                       <option value="Fase de Grupos">Fase de Grupos</option>
                       <option value="Mata-Mata">Mata-Mata</option>
                       <option value="Final">Final</option>
                     </select>
                     {editingCompId && (
                       <div className="flex flex-col gap-2 mt-2">
                         <button 
                          onClick={() => setIsPhaseModalOpen(true)}
                          className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-[#003b95] py-3 rounded-2xl font-black uppercase text-[9px] transition-all active:scale-95"
                         >
                           <Layers size={14}/> Criar Fases
                         </button>
                         {activeCompPhases.length > 0 && (
                           <button 
                            onClick={() => { setIsPhaseListModalOpen(true); setGroupConfigStep('list'); }}
                            className="flex items-center justify-center gap-2 bg-white border-2 border-slate-100 hover:border-[#003b95]/20 hover:bg-slate-50 text-slate-500 py-3 rounded-2xl font-black uppercase text-[9px] transition-all active:scale-95"
                           >
                             <Settings2 size={14}/> Gerenciar Fases
                           </button>
                         )}
                       </div>
                     )}
                   </div>
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2 text-left">
                   <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Data de Início</label>
                   <input 
                    type="date" 
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-[#003b95]/10 transition-all text-slate-600"
                    value={newCompData.date}
                    onChange={e => setNewCompData({...newCompData, date: e.target.value})}
                   />
                 </div>
                 <div className="space-y-2 text-left">
                   <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Status Inicial</label>
                   <select 
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-[#003b95]/10 transition-all appearance-none cursor-pointer"
                    value={newCompData.status}
                    onChange={e => setNewCompData({...newCompData, status: e.target.value as CompStatus})}
                   >
                     <option value={CompStatus.AGENDADA}>Agendada</option>
                     <option value={CompStatus.ATIVA}>Ativo</option>
                     <option value={CompStatus.EM_BREVE}>Em Breve</option>
                     <option value={CompStatus.ENCERRADA}>Encerrado</option>
                   </select>
                 </div>
               </div>

               {/* Equipes Card Grid 3 Columns */}
               {editingCompId && (
                 <div className="space-y-4 text-left animate-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2 flex items-center gap-2">
                        <Users size={12} className="text-[#003b95]"/> Equipes Inscritas ({activeCompTeams.length})
                      </label>
                    </div>
                    
                    <div className="bg-slate-50/50 p-6 rounded-[2.5rem] border border-slate-100 shadow-inner">
                      {activeCompTeams.length === 0 ? (
                        <div className="py-8 text-center opacity-40 italic text-[10px]">Sem equipes registradas para este torneio.</div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {activeCompTeams.map(team => (
                            <div 
                              key={team.id} 
                              className="bg-white px-4 py-3 rounded-2xl border border-slate-100 flex items-center gap-3 shadow-sm hover:border-[#003b95]/20 transition-all"
                            >
                              <div className="bg-slate-50 p-1.5 rounded-lg text-slate-200"><Shield size={14}/></div>
                              <span className="text-[9px] font-black uppercase text-slate-700 truncate">{team.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                 </div>
               )}
            </div>

            <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex gap-4">
               <button onClick={handleCloseCompModal} className="flex-1 py-5 rounded-2xl font-black uppercase text-[10px] text-slate-400 hover:text-slate-600 transition-all">Cancelar</button>
               <button 
                onClick={handleSaveComp}
                className="flex-[2] bg-[#003b95] text-white py-5 rounded-2xl font-black uppercase text-[10px] shadow-xl hover:shadow-[#003b95]/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
               >
                 <CheckCircle2 size={16}/> {editingCompId ? 'Salvar Alterações' : 'Finalizar Cadastro'}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cadastro de Nova Fase */}
      {isPhaseModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setIsPhaseModalOpen(false)}
          ></div>
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="bg-[#d90429] p-2.5 rounded-xl text-white shadow-lg"><Layers size={18}/></div>
                 <h3 className="text-lg font-black text-slate-800 uppercase italic leading-none">Criar Nova Fase</h3>
              </div>
              <button onClick={() => setIsPhaseModalOpen(false)} className="p-2 text-slate-300 hover:text-slate-600 rounded-full transition-all">
                <X size={20}/>
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nome da Fase</label>
                <input 
                  type="text" 
                  placeholder="Ex: Oitavas de Final"
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-[#d90429]/10 transition-all"
                  value={newPhaseData.name}
                  onChange={e => setNewPhaseData({...newPhaseData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Tipo de Disputa</label>
                <select 
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-[#d90429]/10 transition-all cursor-pointer appearance-none"
                  value={newPhaseData.type}
                  onChange={e => setNewPhaseData({...newPhaseData, type: e.target.value as any})}
                >
                  <option value="Fase de Grupos">Fase de Grupos</option>
                  <option value="Mata-Mata">Mata-Mata</option>
                </select>
              </div>
            </div>

            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex flex-col gap-3">
              <button 
                onClick={handleSavePhase}
                className="w-full bg-[#d90429] text-white py-4 rounded-xl font-black uppercase text-[10px] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={14}/> Gravar Fase
              </button>
              <button onClick={() => setIsPhaseModalOpen(false)} className="w-full py-2 font-black uppercase text-[10px] text-slate-400 hover:text-slate-600 transition-colors">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Listagem e Gerenciamento de Fases (Configuração de Grupos) */}
      {isPhaseListModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setIsPhaseListModalOpen(false)}
          ></div>
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="bg-[#003b95] p-2.5 rounded-xl text-white shadow-lg">
                  {groupConfigStep === 'list' ? <Settings2 size={18}/> : <Layers size={18}/>}
                 </div>
                 <div>
                  <h3 className="text-lg font-black text-slate-800 uppercase italic leading-none">
                    {groupConfigStep === 'list' ? 'Gerenciar Fases' : 
                     groupConfigStep === 'setup' ? `Configurar: ${configuringPhase?.name}` : 
                     `Sorteio de Grupos: ${configuringPhase?.name}`}
                  </h3>
                  {groupConfigStep !== 'list' && (
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Torneio: {activeComp?.name}</span>
                  )}
                 </div>
              </div>
              <button onClick={() => setIsPhaseListModalOpen(false)} className="p-2 text-slate-300 hover:text-slate-600 rounded-full transition-all">
                <X size={20}/>
              </button>
            </div>

            <div className="flex-grow p-8 overflow-y-auto no-scrollbar">
              {groupConfigStep === 'list' && (
                <div className="space-y-4">
                  {activeCompPhases.length === 0 ? (
                    <div className="text-center py-20 opacity-20 flex flex-col items-center">
                      <Layers size={56} className="mb-4"/>
                      <p className="font-black uppercase text-sm tracking-widest">Nenhuma fase registrada</p>
                    </div>
                  ) : (
                    activeCompPhases.map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => handlePhaseClick(p)}
                        className={`flex items-center justify-between p-6 bg-slate-50 rounded-3xl border-2 border-slate-100 group transition-all cursor-pointer ${p.type === 'Fase de Grupos' ? 'hover:border-[#003b95] hover:bg-white' : 'hover:border-slate-300 opacity-80'}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-2xl shadow-sm group-hover:scale-110 transition-all ${p.type === 'Fase de Grupos' ? 'bg-blue-100 text-[#003b95]' : 'bg-slate-200 text-slate-500'}`}>
                            {p.type === 'Fase de Grupos' ? <Gamepad2 size={24}/> : <Target size={24}/>}
                          </div>
                          <div className="text-left">
                            <p className="text-base font-black text-slate-800 uppercase leading-none mb-1">{p.name}</p>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.type}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeletePhase(p.id); }}
                            className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                          >
                            <Trash2 size={20}/>
                          </button>
                          {p.type === 'Fase de Grupos' && <ChevronRight className="text-[#003b95] group-hover:translate-x-1 transition-transform"/>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {groupConfigStep === 'setup' && (
                <div className="max-w-md mx-auto space-y-8 py-10 text-center animate-in zoom-in-95 duration-300">
                  <div className="bg-slate-50 p-8 rounded-[3rem] border border-slate-100 shadow-inner">
                    <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-md border border-slate-50">
                      <Users className="text-[#003b95]" size={32}/>
                    </div>
                    <h4 className="font-black text-slate-800 uppercase text-lg mb-2">Estrutura da Fase</h4>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-8">
                      {activeCompTeams.length} Equipes participando
                    </p>
                    
                    <div className="space-y-4">
                      <div className="text-left">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-4 mb-2 block">Quantidade de Grupos</label>
                        <input 
                          type="number" 
                          min="1"
                          max={activeCompTeams.length}
                          className="w-full p-5 bg-white border-2 border-slate-100 rounded-[1.5rem] font-black text-2xl text-center outline-none focus:border-[#003b95] transition-all"
                          value={numGroups}
                          onChange={e => setNumGroups(parseInt(e.target.value) || 1)}
                        />
                      </div>
                      
                      {activeCompTeams.length % numGroups !== 0 && (
                        <div className="flex items-center gap-3 bg-red-50 text-red-500 p-4 rounded-2xl border border-red-100">
                          <AlertCircle size={18}/>
                          <span className="text-[9px] font-black uppercase tracking-widest text-left">O número de times deve ser divisível pela quantidade de grupos.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button 
                    disabled={activeCompTeams.length % numGroups !== 0}
                    onClick={handleGenerateGroupStructure}
                    className={`w-full py-5 rounded-[2rem] font-black uppercase text-xs shadow-xl transition-all flex items-center justify-center gap-3 ${
                      activeCompTeams.length % numGroups !== 0 
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                      : 'bg-[#003b95] text-white hover:scale-[1.02] active:scale-95'
                    }`}
                  >
                    Gerar Grupos <ArrowRight size={16}/>
                  </button>
                </div>
              )}

              {groupConfigStep === 'slots' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-in slide-in-from-right-4 duration-500">
                  <div className="lg:col-span-1 space-y-4">
                    <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 sticky top-0">
                      <h4 className="font-black text-slate-800 uppercase text-[10px] tracking-widest mb-4 flex items-center gap-2">
                        <UserPlus size={14} className="text-[#003b95]"/> Times Disponíveis ({availableTeams.length})
                      </h4>
                      <div className="space-y-2 max-h-[50vh] overflow-y-auto no-scrollbar pr-1">
                        {availableTeams.map(t => (
                          <button
                            key={t.id}
                            onClick={() => setSelectedTeamForAssignment(selectedTeamForAssignment === t.id.toString() ? null : t.id.toString())}
                            className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${
                              selectedTeamForAssignment === t.id.toString() 
                              ? 'bg-[#003b95] text-white border-[#003b95] shadow-lg ring-4 ring-[#003b95]/10' 
                              : 'bg-white border-slate-100 text-slate-700 hover:border-[#003b95]/40'
                            }`}
                          >
                            <Shield size={14} className={selectedTeamForAssignment === t.id.toString() ? 'text-white' : 'text-slate-200'}/>
                            <span className="text-[9px] font-black uppercase truncate">{t.name}</span>
                          </button>
                        ))}
                        {availableTeams.length === 0 && (
                          <div className="py-10 text-center opacity-30 italic text-[9px]">Todos escalados!</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {Object.keys(groupAssignments).map(letter => (
                        <div key={letter} className="bg-white p-6 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                            <span className="text-8xl font-black italic">{letter}</span>
                          </div>
                          <h5 className="font-black text-[#003b95] uppercase italic text-xl mb-6 relative z-10">Grupo {letter}</h5>
                          
                          <div className="space-y-3 relative z-10">
                            {groupAssignments[letter].map((assignedId, idx) => {
                              const assignedTeam = teams.find(t => t.id.toString() === assignedId);
                              return (
                                <button
                                  key={`${letter}-${idx}`}
                                  onClick={() => handleAssignTeamToSlot(letter, idx)}
                                  className={`w-full min-h-[56px] rounded-3xl border-2 border-dashed flex items-center justify-between px-6 py-3 transition-all ${
                                    assignedId 
                                    ? 'bg-slate-50 border-transparent shadow-inner group/slot hover:bg-slate-100' 
                                    : 'border-slate-100 text-slate-300 hover:border-[#003b95]/30 hover:bg-blue-50/30'
                                  }`}
                                >
                                  {assignedId ? (
                                    <>
                                      <div className="flex items-center gap-3">
                                        <Shield size={16} className="text-[#003b95]"/>
                                        <span className="text-[10px] font-black uppercase text-slate-800">{assignedTeam?.name}</span>
                                      </div>
                                      <Trash2 size={14} className="text-slate-200 group-hover/slot:text-red-400 opacity-0 group-hover/slot:opacity-100 transition-all"/>
                                    </>
                                  ) : (
                                    <div className="flex items-center gap-3 w-full justify-center">
                                      <Plus size={14} className="opacity-40"/>
                                      <span className="text-[9px] font-bold uppercase tracking-widest italic opacity-40">Posição {idx + 1}</span>
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex gap-4">
              {groupConfigStep === 'list' ? (
                <button onClick={() => setIsPhaseListModalOpen(false)} className="w-full py-5 bg-slate-800 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl active:scale-95 transition-all">
                  Fechar Gerenciamento
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => {
                      if (groupConfigStep === 'setup') setGroupConfigStep('list');
                      if (groupConfigStep === 'slots') setGroupConfigStep('setup');
                    }}
                    className="flex-1 py-5 rounded-2xl font-black uppercase text-[10px] text-slate-400 hover:text-slate-600 transition-all"
                  >
                    Voltar
                  </button>
                  {groupConfigStep === 'slots' && (
                    <button 
                      onClick={() => { 
                        alert("Configuração de grupos salva temporariamente! (Mock)");
                        setIsPhaseListModalOpen(false); 
                      }}
                      className="flex-[2] bg-[#d90429] text-white py-5 rounded-2xl font-black uppercase text-[10px] shadow-xl hover:shadow-red-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                      <CheckCircle2 size={16}/> Salvar Configuração de Grupos
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {syncing && (
        <div className="fixed bottom-10 right-10 bg-slate-900/90 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 z-[400] border border-white/10 backdrop-blur-md animate-in slide-in-from-right-10">
          <Loader2 className="animate-spin text-blue-400" size={20} />
          <span className="text-[11px] font-black uppercase tracking-widest">Sincronizando Sistema...</span>
        </div>
      )}
      
      <footer className="bg-slate-900 py-16 px-4 mt-20 relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#003b95] via-[#d90429] to-[#003b95]"></div>
         <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 opacity-50">
            <div className="flex items-center gap-3 grayscale">
               <Trophy className="text-white w-6 h-6" />
               <div className="font-sport uppercase italic text-white text-xl">
                  <span className="font-black">Esporte</span>
                  <span className="text-[#d90429] ml-1">Coxim</span>
               </div>
            </div>
            <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.4em]">© 2025 - Portal Oficial do Esporte em Coxim, MS</p>
         </div>
      </footer>
    </div>
  );
}

interface GameCardProps {
  game: Game;
  teams: Team[];
  key?: React.Key;
}

function GameCard({ game, teams }: GameCardProps) {
  const homeTeam = teams.find(t => t.id.toString() === game.home_team_id.toString());
  const awayTeam = teams.find(t => t.id.toString() === game.away_team_id.toString());

  const isLive = game.status === GameStatus.AO_VIVO;
  const isFinished = game.status === GameStatus.ENCERRADO;

  return (
    <div className={`bg-white p-8 rounded-[3rem] shadow-xl border transition-all group relative overflow-hidden ${
      isLive ? 'border-red-500 shadow-red-500/10 scale-[1.02] ring-4 ring-red-500/5' : 
      isFinished ? 'border-slate-50 grayscale-[0.3]' : 'border-slate-100 hover:border-[#003b95]/20'
    }`}>
      <div className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-10 -z-0 ${
        isLive ? 'bg-red-500' : isFinished ? 'bg-slate-500' : 'bg-[#003b95]'
      }`}></div>

      <div className="flex justify-between items-center mb-8 border-b border-slate-50 pb-4 relative z-10">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter flex items-center gap-2">
          <Calendar size={12} className={isLive ? 'text-red-500' : 'text-[#003b95]'} /> 
          {game.game_date ? new Date(game.game_date).toLocaleDateString('pt-BR') : 'Agendado'}
        </span>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all ${
          isLive ? 'bg-red-500 text-white shadow-lg' : 
          isFinished ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-500 shadow-sm'
        }`}>
          {isLive && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>}
          {game.status}
        </div>
      </div>

      <div className="flex items-center justify-between gap-6 relative z-10">
        <div className="flex-1 text-center">
          <div className={`w-14 h-14 mx-auto mb-2 rounded-2xl flex items-center justify-center border shadow-inner transition-all group-hover:rotate-3 ${
            isLive ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100 group-hover:bg-slate-100'
          }`}>
            <Shield size={28} className={isLive ? 'text-red-300' : 'text-slate-100 group-hover:text-slate-200'} />
          </div>
          <p className={`text-[10px] font-black uppercase tracking-tight leading-tight min-h-[24px] ${isLive ? 'text-red-900' : 'text-slate-800'}`}>
            {homeTeam?.name || '...'}
          </p>
        </div>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-3">
            <span className={`text-5xl font-black italic font-sport tracking-tighter transition-all ${
              isFinished ? 'text-[#002255]' : isLive ? 'text-red-600 scale-110' : 'text-slate-300'
            }`}>
              {game.home_score}
            </span>
            <span className="text-slate-200 font-black italic text-xs opacity-50">X</span>
            <span className={`text-5xl font-black italic font-sport tracking-tighter transition-all ${
              isFinished ? 'text-[#002255]' : isLive ? 'text-red-600 scale-110' : 'text-slate-300'
            }`}>
              {game.away_score}
            </span>
          </div>
        </div>

        <div className="flex-1 text-center">
          <div className={`w-14 h-14 mx-auto mb-2 rounded-2xl flex items-center justify-center border shadow-inner transition-all group-hover:-rotate-3 ${
            isLive ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100 group-hover:bg-slate-100'
          }`}>
            <Shield size={28} className={isLive ? 'text-red-300' : 'text-slate-100 group-hover:text-slate-200'} />
          </div>
          <p className={`text-[10px] font-black uppercase tracking-tight leading-tight min-h-[24px] ${isLive ? 'text-red-900' : 'text-slate-800'}`}>
            {awayTeam?.name || '...'}
          </p>
        </div>
      </div>
    </div>
  );
}
