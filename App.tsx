
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
  UserPlus,
  Hash,
  Swords
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
  const [groupConfigStep, setGroupConfigStep] = useState<'list' | 'setup' | 'capacity_setup' | 'slots'>('list');
  const [numGroups, setNumGroups] = useState<number>(2);
  const [groupCapacities, setGroupCapacities] = useState<Record<string, number>>({});
  const [groupAssignments, setGroupAssignments] = useState<Record<string, string[]>>({});
  const [selectedTeamForAssignment, setSelectedTeamForAssignment] = useState<string | null>(null);

  // Confrontos Gerados Modal
  const [isGeneratedGamesModalOpen, setIsGeneratedGamesModalOpen] = useState(false);
  const [generatedGamesPreview, setGeneratedGamesPreview] = useState<{group: string, home: string, away: string}[]>([]);
  const [groupsSummary, setGroupsSummary] = useState<Record<string, string[]>>({});

  // Admin State
  const [view, setView] = useState<'user' | 'admin' | 'login'>('user');
  const [adminTab, setAdminTab] = useState<'comps' | 'teams' | 'games'>('comps');
  const [isLogged, setIsLogged] = useState(() => localStorage.getItem('ec_session') === 'true');
  const [loginForm, setLoginForm] = useState({ phone: '', pass: '' });

  // Admin Forms State
  const [newTeamName, setNewTeamName] = useState('');
  
  const [newCompData, setNewCompData] = useState({
    name: '',
    date: '',
    status: CompStatus.AGENDADA,
    phase: 'Fase de Grupos',
    teams: [] as string[]
  });
  
  const [newGame, setNewGame] = useState({
    compId: '',
    homeId: '',
    awayId: '',
    date: ''
  });

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
        const { error } = await supabase.from('leagues').update(payload).eq('id', editingCompId.toString());
        if (error) throw error;
      } else {
        const manualId = (Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000)).toString();
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
      const manualId = (Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000)).toString();
      const { error } = await supabase.from('phases').insert({
        id: manualId,
        competitions_id: editingCompId.toString(),
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
      const { error } = await supabase.from('phases').delete().eq('id', phaseId.toString());
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

  const activeCompPhases = useMemo(() => {
    if (!editingCompId) return [];
    return phases.filter(p => p.competitions_id.toString() === editingCompId.toString());
  }, [phases, editingCompId]);

  const activeCompTeams = useMemo(() => {
    if (!editingCompId) return [];
    return teams.filter(t => 
      newCompData.teams.map(String).includes(t.id.toString()) || 
      (t.league && t.league.toLowerCase() === newCompData.name.toLowerCase())
    );
  }, [teams, newCompData.teams, newCompData.name, editingCompId]);

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

  const handlePhaseClick = (phase: Phase) => {
    if (phase.type === 'Fase de Grupos') {
      setConfiguringPhase(phase);
      setGroupConfigStep('setup');
      setNumGroups(2);
      setGroupAssignments({});
      setGroupCapacities({});
      setSelectedTeamForAssignment(null);
    }
  };

  const handleGenerateGroupStructure = () => {
    const numParticipants = activeCompTeams.length;
    
    if (numParticipants % numGroups === 0) {
      const slotsPerGroup = numParticipants / numGroups;
      const initialAssignments: Record<string, string[]> = {};
      for (let i = 0; i < numGroups; i++) {
        const groupLetter = String.fromCharCode(65 + i);
        initialAssignments[groupLetter] = new Array(slotsPerGroup).fill('');
      }
      setGroupAssignments(initialAssignments);
      setGroupConfigStep('slots');
    } else {
      const initialCapacities: Record<string, number> = {};
      for (let i = 0; i < numGroups; i++) {
        const groupLetter = String.fromCharCode(65 + i);
        initialCapacities[groupLetter] = Math.floor(numParticipants / numGroups);
      }
      setGroupCapacities(initialCapacities);
      setGroupConfigStep('capacity_setup');
    }
  };

  const handleFinalizeCapacities = () => {
    const totalCapacity = (Object.values(groupCapacities) as number[]).reduce((a: number, b: number) => a + b, 0);
    const numParticipants = activeCompTeams.length;

    if (totalCapacity !== numParticipants) {
      alert(`A soma das vagas (${totalCapacity}) deve ser igual ao número total de participantes (${numParticipants}).`);
      return;
    }

    const initialAssignments: Record<string, string[]> = {};
    (Object.entries(groupCapacities) as [string, number][]).forEach(([letter, cap]) => {
      initialAssignments[letter] = new Array(cap).fill('');
    });

    setGroupAssignments(initialAssignments);
    setGroupConfigStep('slots');
  };

  const handleAssignTeamToSlot = (groupLetter: string, slotIndex: number) => {
    if (!selectedTeamForAssignment) {
      if (groupAssignments[groupLetter][slotIndex]) {
        const newAssignments = { ...groupAssignments };
        newAssignments[groupLetter][slotIndex] = '';
        setGroupAssignments(newAssignments);
      }
      return;
    }

    const alreadyAssigned = (Object.values(groupAssignments) as string[][]).some(group => group.includes(selectedTeamForAssignment as string));
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

  const handleSaveGroupConfiguration = async () => {
    const allTeamsAssigned = Object.values(groupAssignments).flat().every(id => id !== '');
    if (!allTeamsAssigned) {
      if (!confirm("Existem vagas vazias. Gerar confrontos apenas para times alocados?")) return;
    }

    setSyncing(true);
    try {
      const newGamesToInsert: any[] = [];
      const previewList: {group: string, home: string, away: string}[] = [];
      const summary: Record<string, string[]> = {};

      Object.entries(groupAssignments).forEach(([groupLetter, assignedIds]) => {
        const validIds = (assignedIds as string[]).filter(id => id !== '');
        summary[groupLetter] = validIds.map(id => teams.find(t => t.id.toString() === id.toString())?.name || '---');

        for (let i = 0; i < validIds.length; i++) {
          for (let j = i + 1; j < validIds.length; j++) {
            const hId = validIds[i];
            const aId = validIds[j];
            
            const hTeam = teams.find(t => t.id.toString() === hId.toString());
            const aTeam = teams.find(t => t.id.toString() === aId.toString());

            newGamesToInsert.push({
              competition_id: editingCompId?.toString(),
              home_team_id: hId.toString(),
              away_team_id: aId.toString(),
              home_score: 0,
              away_score: 0,
              status: GameStatus.AGENDADO,
              game_date: new Date().toISOString()
            });

            previewList.push({
              group: groupLetter,
              home: hTeam?.name || 'Clube A',
              away: aTeam?.name || 'Clube B'
            });
          }
        }
      });

      if (newGamesToInsert.length === 0) {
        alert("Sem times suficientes para confrontos.");
        setSyncing(false);
        return;
      }

      const { error } = await supabase.from('games').insert(newGamesToInsert);
      if (error) throw error;

      setGeneratedGamesPreview(previewList);
      setGroupsSummary(summary);
      setIsGeneratedGamesModalOpen(true);
      setIsPhaseListModalOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      alert("Erro ao gerar confrontos: " + (err.message || "Erro desconhecido"));
    } finally {
      setSyncing(false);
    }
  };

  const assignedTeamIds = useMemo(() => {
    return (Object.values(groupAssignments).flat() as string[]).filter(id => id !== '');
  }, [groupAssignments]);

  const availableTeams = useMemo(() => {
    return activeCompTeams.filter(t => !assignedTeamIds.includes(t.id.toString()));
  }, [activeCompTeams, assignedTeamIds]);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      <header className="bg-[#003b95] text-white shadow-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => setView('user')} className="flex items-center gap-3 group transition-transform active:scale-95 text-left">
            <div className="bg-white p-1.5 rounded-xl">
              <Trophy className="text-[#003b95] w-6 h-6" />
            </div>
            <div className="flex flex-col leading-none font-sport uppercase italic">
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
              <h2 className="text-3xl font-black text-slate-800 uppercase italic mb-8 leading-tight">Portal do Gestor</h2>
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
              <h1 className="text-3xl font-black text-slate-900 uppercase italic font-sport leading-none">Dashboard de Controle</h1>
              <div className="flex p-1.5 bg-slate-200/50 rounded-2xl shadow-inner border border-slate-200">
                <button onClick={() => setAdminTab('comps')} className={`px-6 py-2 rounded-xl font-black text-[10px] uppercase transition-all ${adminTab === 'comps' ? 'bg-[#003b95] text-white shadow-lg scale-105' : 'text-slate-500 hover:text-slate-700'}`}>Torneios</button>
                <button onClick={() => setAdminTab('teams')} className={`px-6 py-2 rounded-xl font-black text-[10px] uppercase transition-all ${adminTab === 'teams' ? 'bg-[#003b95] text-white shadow-lg scale-105' : 'text-slate-500 hover:text-slate-700'}`}>Clubes</button>
                <button onClick={() => setAdminTab('games')} className={`px-6 py-2 rounded-xl font-black text-[10px] uppercase transition-all ${adminTab === 'games' ? 'bg-[#003b95] text-white shadow-lg scale-105' : 'text-slate-500 hover:text-slate-700'}`}>Partidas</button>
              </div>
            </div>

            {adminTab === 'games' && (
              <div className="space-y-8">
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
                              <button onClick={() => handleDeleteGame(g.id)} className="text-slate-300 hover:text-red-500 p-2 transition-colors"><Trash2 size={16}/></button>
                            </div>
                         </div>
                         <div className="flex items-center justify-between gap-4">
                            <div className="text-center flex-1 min-w-0">
                              <p className="text-[10px] font-black uppercase mb-3 truncate text-slate-800">{hTeam?.name}</p>
                              <input type="number" value={g.home_score} onChange={e => handleUpdateGame(g.id, parseInt(e.target.value) || 0, g.away_score, g.status)} className="w-16 h-12 text-center text-2xl font-black bg-slate-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#003b95]/10 outline-none transition-all text-[#002255]" />
                            </div>
                            <span className="text-slate-200 font-black italic">X</span>
                            <div className="text-center flex-1 min-w-0">
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
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Toque para configurar</p>
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
                        <span className="text-[9px] font-black text-[#003b95] uppercase tracking-widest">Configurar Torneio</span>
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
                      <button onClick={() => handleDeleteTeam(t.id)} className="text-slate-300 hover:text-red-500 p-2 transition-colors"><Trash2 size={14}/></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-10 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="text-left">
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
                      <div className="text-left">
                         <h3 className="font-black italic uppercase text-white tracking-wider text-lg leading-none">{activeComp?.current_phase || 'Classificação'}</h3>
                         <span className="text-[8px] text-blue-200 font-black uppercase tracking-widest mt-1">{totalFinishedGames} resultados processados</span>
                      </div>
                    </div>
                  </div>
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
                  {teams.filter(t => standings.some(s => s.id === t.id.toString())).map(team => (
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

      {/* Modal: Cadastro/Edição de Campeonato */}
      {isCompModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300" onClick={handleCloseCompModal}></div>
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="bg-slate-50 px-10 py-8 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4 text-left">
                 <div className="bg-[#003b95] p-3 rounded-2xl text-white shadow-lg"><TrophyIcon size={20}/></div>
                 <div>
                   <h3 className="text-xl font-black text-slate-800 uppercase italic leading-none">{editingCompId ? 'Editar Campeonato' : 'Novo Campeonato'}</h3>
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Painel de Configuração</span>
                 </div>
              </div>
              <button onClick={handleCloseCompModal} className="p-3 text-slate-300 hover:text-slate-600 hover:bg-white rounded-full transition-all">
                <X size={24}/>
              </button>
            </div>

            <div className="px-10 py-10 space-y-8 max-h-[70vh] overflow-y-auto no-scrollbar">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2 text-left">
                   <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nome do Torneio</label>
                   <input type="text" placeholder="Copa Coxim" className="w-full p-4 bg-slate-50 rounded-2xl font-bold focus:ring-2 focus:ring-[#003b95]/10 outline-none" value={newCompData.name} onChange={e => setNewCompData({...newCompData, name: e.target.value})} />
                 </div>
                 <div className="space-y-2 text-left">
                   <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Fase Atual</label>
                   <div className="flex flex-col gap-2">
                     <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none appearance-none cursor-pointer" value={newCompData.phase} onChange={e => setNewCompData({...newCompData, phase: e.target.value})} >
                       <option value="Fase de Grupos">Fase de Grupos</option>
                       <option value="Mata-Mata">Mata-Mata</option>
                       <option value="Final">Final</option>
                     </select>
                     {editingCompId && (
                       <div className="flex flex-col gap-2 mt-2">
                         <button onClick={() => setIsPhaseModalOpen(true)} className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-[#003b95] py-3 rounded-2xl font-black uppercase text-[9px] transition-all"><Layers size={14}/> Criar Fases</button>
                         {activeCompPhases.length > 0 && (
                           <button onClick={() => { setIsPhaseListModalOpen(true); setGroupConfigStep('list'); }} className="flex items-center justify-center gap-2 bg-white border-2 border-slate-100 hover:bg-slate-50 text-slate-500 py-3 rounded-2xl font-black uppercase text-[9px] transition-all"><Settings2 size={14}/> Sortear Grupos</button>
                         )}
                       </div>
                     )}
                   </div>
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2 text-left">
                   <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Data de Início</label>
                   <input type="date" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" value={newCompData.date} onChange={e => setNewCompData({...newCompData, date: e.target.value})} />
                 </div>
                 <div className="space-y-2 text-left">
                   <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Status</label>
                   <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none appearance-none" value={newCompData.status} onChange={e => setNewCompData({...newCompData, status: e.target.value as CompStatus})} >
                     <option value={CompStatus.AGENDADA}>Agendada</option>
                     <option value={CompStatus.ATIVA}>Ativo</option>
                     <option value={CompStatus.ENCERRADA}>Encerrado</option>
                   </select>
                 </div>
               </div>
            </div>

            <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex gap-4">
               <button onClick={handleCloseCompModal} className="flex-1 py-5 rounded-2xl font-black uppercase text-[10px] text-slate-400 hover:text-slate-600 transition-all">Cancelar</button>
               <button onClick={handleSaveComp} className="flex-[2] bg-[#003b95] text-white py-5 rounded-2xl font-black uppercase text-[10px] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"><CheckCircle2 size={16}/> {editingCompId ? 'Salvar Torneio' : 'Finalizar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Sorteio de Grupos */}
      {isPhaseListModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsPhaseListModalOpen(false)}></div>
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3 text-left">
                 <div className="bg-[#003b95] p-2.5 rounded-xl text-white shadow-lg"><Layers size={18}/></div>
                 <div>
                  <h3 className="text-lg font-black text-slate-800 uppercase italic leading-none">{groupConfigStep === 'list' ? 'Selecione a Fase' : 'Sorteio de Grupos'}</h3>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{activeComp?.name}</span>
                 </div>
              </div>
              <button onClick={() => setIsPhaseListModalOpen(false)} className="p-2 text-slate-300 hover:text-slate-600 rounded-full transition-all"><X size={20}/></button>
            </div>

            <div className="flex-grow p-8 overflow-y-auto no-scrollbar">
              {groupConfigStep === 'list' && (
                <div className="space-y-4">
                  {activeCompPhases.filter(p => p.type === 'Fase de Grupos').map(p => (
                    <button key={p.id} onClick={() => handlePhaseClick(p)} className="w-full flex items-center justify-between p-6 bg-slate-50 rounded-3xl border-2 border-slate-100 hover:border-[#003b95] hover:bg-white group transition-all">
                      <div className="flex items-center gap-4 text-left">
                        <div className="p-3 rounded-2xl bg-blue-100 text-[#003b95] group-hover:scale-110 transition-all"><Gamepad2 size={24}/></div>
                        <div>
                          <p className="text-base font-black text-slate-800 uppercase leading-none mb-1">{p.name}</p>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clique para sortear</span>
                        </div>
                      </div>
                      <ChevronRight className="text-[#003b95] group-hover:translate-x-1 transition-transform"/>
                    </button>
                  ))}
                </div>
              )}

              {groupConfigStep === 'setup' && (
                <div className="max-w-md mx-auto py-10 text-center animate-in zoom-in-95">
                  <div className="bg-slate-50 p-8 rounded-[3rem] border border-slate-100 mb-8">
                    <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-md"><Users className="text-[#003b95]" size={32}/></div>
                    <h4 className="font-black text-slate-800 uppercase text-lg mb-2">Estrutura da Fase</h4>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-8">{activeCompTeams.length} Clubes para distribuir</p>
                    <div className="text-left space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Quantidade de Grupos</label>
                      <input type="number" min="1" max={activeCompTeams.length} className="w-full p-5 bg-white border-2 border-slate-100 rounded-[1.5rem] font-black text-2xl text-center focus:border-[#003b95] outline-none" value={numGroups} onChange={e => setNumGroups(parseInt(e.target.value) || 1)} />
                    </div>
                  </div>
                  <button onClick={handleGenerateGroupStructure} className="w-full py-5 bg-[#003b95] text-white rounded-[2rem] font-black uppercase text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">Configurar Vagas <ArrowRight size={16}/></button>
                </div>
              )}

              {groupConfigStep === 'capacity_setup' && (
                <div className="max-w-xl mx-auto py-6 animate-in slide-in-from-right-4">
                  <div className="bg-slate-50 p-8 rounded-[3rem] border border-slate-100 mb-8">
                    <h4 className="font-black text-slate-800 uppercase text-lg mb-8 leading-none">Distribuição de Vagas</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {Object.keys(groupCapacities).map(letter => (
                        <div key={letter} className="bg-white p-5 rounded-[2rem] border border-slate-100 flex items-center justify-between">
                          <span className="font-black text-[#003b95] text-xl italic">Grupo {letter}</span>
                          <div className="flex items-center gap-3">
                            <button onClick={() => setGroupCapacities({...groupCapacities, [letter]: Math.max(1, groupCapacities[letter] - 1)})} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">-</button>
                            <span className="w-8 text-center font-black text-slate-800">{groupCapacities[letter]}</span>
                            <button onClick={() => setGroupCapacities({...groupCapacities, [letter]: groupCapacities[letter] + 1})} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">+</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button onClick={handleFinalizeCapacities} className="w-full py-5 bg-[#003b95] text-white rounded-[2rem] font-black uppercase text-xs shadow-xl active:scale-95 transition-all">Definir Escalações</button>
                </div>
              )}

              {groupConfigStep === 'slots' && (
                <div className="space-y-10 animate-in slide-in-from-top-4 text-left">
                  <div className="bg-slate-50 p-8 rounded-[3rem] border border-slate-100 shadow-inner">
                    <h4 className="font-black text-slate-800 uppercase text-[11px] tracking-widest flex items-center gap-2 mb-6"><UserPlus size={16} className="text-[#003b95]"/> Times Disponíveis ({availableTeams.length})</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[300px] overflow-y-auto no-scrollbar p-1">
                      {availableTeams.map(t => (
                        <button key={t.id} onClick={() => setSelectedTeamForAssignment(selectedTeamForAssignment === t.id.toString() ? null : t.id.toString())} className={`flex items-center gap-4 p-4 rounded-[1.5rem] border-2 transition-all ${selectedTeamForAssignment === t.id.toString() ? 'bg-[#003b95] text-white border-[#003b95] shadow-xl scale-[1.02]' : 'bg-white border-slate-100 text-slate-700 hover:border-[#003b95]/30'}`}>
                          <Shield size={18} className={selectedTeamForAssignment === t.id.toString() ? 'text-white' : 'text-slate-300'}/>
                          <span className="text-[10px] font-black uppercase truncate leading-none">{t.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.keys(groupAssignments).map(letter => (
                      <div key={letter} className="bg-white p-6 rounded-[3rem] border border-slate-100 relative group">
                        <h5 className="font-black text-[#003b95] uppercase italic text-xl mb-6 flex items-center gap-2"><div className="w-2 h-6 bg-[#d90429] rounded-full"></div> Grupo {letter}</h5>
                        <div className="space-y-3">
                          {(groupAssignments[letter] as string[]).map((assignedId, idx) => {
                            const team = teams.find(t => t.id.toString() === assignedId);
                            return (
                              <button key={`${letter}-${idx}`} onClick={() => handleAssignTeamToSlot(letter, idx)} className={`w-full min-h-[60px] rounded-[1.5rem] border-2 border-dashed flex items-center justify-between px-6 py-3 transition-all ${assignedId ? 'bg-slate-50 border-transparent' : 'border-slate-100 hover:border-[#003b95]/30 hover:bg-blue-50/20'}`}>
                                {assignedId ? (
                                  <div className="flex items-center gap-3">
                                    <Shield size={16} className="text-[#003b95]"/>
                                    <span className="text-[10px] font-black uppercase text-slate-800 truncate">{team?.name}</span>
                                  </div>
                                ) : (
                                  <span className="text-[9px] font-bold uppercase tracking-widest italic opacity-30 mx-auto">Vaga {idx + 1}</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex gap-4">
               {groupConfigStep !== 'list' && (
                 <button onClick={() => setGroupConfigStep('list')} className="flex-1 py-5 rounded-2xl font-black uppercase text-[10px] text-slate-400 hover:text-slate-600">Voltar</button>
               )}
               {groupConfigStep === 'slots' && (
                 <button onClick={handleSaveGroupConfiguration} className="flex-[2] bg-[#d90429] text-white py-5 rounded-2xl font-black uppercase text-[10px] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"><CheckCircle2 size={16}/> Salvar e Gerar Jogos</button>
               )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Visualização de Confrontos Gerados */}
      {isGeneratedGamesModalOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#002255]/80 backdrop-blur-md animate-in fade-in duration-500" onClick={() => setIsGeneratedGamesModalOpen(false)}></div>
          <div className="bg-white w-full max-w-4xl rounded-[4rem] shadow-2xl relative z-10 overflow-hidden border border-white/20 animate-in zoom-in-95 duration-500 flex flex-col max-h-[85vh]">
            <div className="bg-[#003b95] px-12 py-10 flex items-center justify-between text-white text-left">
              <div className="flex items-center gap-5">
                 <div className="bg-white p-4 rounded-3xl text-[#003b95] shadow-xl"><Swords size={28}/></div>
                 <div>
                  <h3 className="text-2xl font-black uppercase italic leading-none tracking-tight">Confrontos Gerados</h3>
                  <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mt-2">Gravação concluída na tabela 'games'</p>
                 </div>
              </div>
              <button onClick={() => setIsGeneratedGamesModalOpen(false)} className="p-4 bg-white/10 hover:bg-white/20 rounded-full transition-all"><X size={24}/></button>
            </div>

            <div className="flex-grow p-12 overflow-y-auto no-scrollbar bg-slate-50/50 text-left">
              <div className="space-y-12">
                {(Object.entries(groupsSummary) as [string, string[]][]).map(([group, memberNames]) => (
                  <div key={group} className="space-y-6 animate-in slide-in-from-left-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[#003b95] text-white rounded-xl flex items-center justify-center font-black italic text-xl shadow-md">{group}</div>
                      <h4 className="font-black text-slate-800 uppercase text-lg tracking-tight">Grupo {group}</h4>
                      <div className="flex-grow h-[2px] bg-slate-200 rounded-full"></div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 mb-6">
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Escalação do Grupo</p>
                      <div className="flex flex-wrap gap-2">
                        {memberNames.map((name, i) => (
                          <div key={i} className="px-4 py-2 bg-slate-50 rounded-xl text-[10px] font-black text-slate-600 uppercase border border-slate-100">{name}</div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {generatedGamesPreview.filter(g => g.group === group).map((game, i) => (
                        <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group transition-all">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Shield className="text-slate-100 group-hover:text-[#003b95] shrink-0" size={18}/>
                            <span className="text-[10px] font-black uppercase text-slate-800 truncate">{game.home}</span>
                          </div>
                          <div className="px-5 font-black italic text-[#d90429] text-xs">VS</div>
                          <div className="flex items-center gap-3 flex-1 min-w-0 text-right justify-end">
                            <span className="text-[10px] font-black uppercase text-slate-800 truncate">{game.away}</span>
                            <Shield className="text-slate-100 group-hover:text-[#003b95] shrink-0" size={18}/>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-12 py-10 bg-white border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3 text-slate-400">
                <Info size={16}/>
                <span className="text-[9px] font-bold uppercase tracking-widest">Partidas adicionadas com status 'AGENDADO'</span>
              </div>
              <button onClick={() => setIsGeneratedGamesModalOpen(false)} className="bg-[#003b95] text-white px-12 py-5 rounded-3xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all flex items-center gap-3">Concluir <CheckCircle2 size={18}/></button>
            </div>
          </div>
        </div>
      )}

      {syncing && (
        <div className="fixed bottom-10 right-10 bg-slate-900/90 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 z-[500] animate-in slide-in-from-right-10">
          <Loader2 className="animate-spin text-blue-400" size={20} />
          <span className="text-[11px] font-black uppercase tracking-widest">Sincronizando...</span>
        </div>
      )}
    </div>
  );
}

// Interface corrigida para incluir a prop key reservada para arrays em JSX
interface GameCardProps {
  game: Game;
  teams: Team[];
  key?: React.Key;
}

// Componente GameCard usando React.FC para garantir tratamento correto de props
const GameCard: React.FC<GameCardProps> = ({ game, teams }) => {
  const homeTeam = teams.find(t => t.id.toString() === game.home_team_id.toString());
  const awayTeam = teams.find(t => t.id.toString() === game.away_team_id.toString());
  const isLive = game.status === GameStatus.AO_VIVO;
  const isFinished = game.status === GameStatus.ENCERRADO;

  return (
    <div className={`bg-white p-8 rounded-[3rem] shadow-xl border transition-all relative overflow-hidden ${isLive ? 'border-red-500 ring-4 ring-red-500/5' : 'border-slate-100'}`}>
      <div className="flex justify-between items-center mb-8 border-b border-slate-50 pb-4 relative z-10 text-left">
        <span className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2">
          <Calendar size={12} className={isLive ? 'text-red-500' : 'text-[#003b95]'} /> 
          {game.game_date ? new Date(game.game_date).toLocaleDateString('pt-BR') : 'Agendado'}
        </span>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase ${isLive ? 'bg-red-500 text-white animate-pulse' : isFinished ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-500'}`}>
          {game.status}
        </div>
      </div>
      <div className="flex items-center justify-between gap-6 relative z-10">
        <div className="flex-1 text-center min-w-0">
          <Shield size={28} className="mx-auto mb-2 text-slate-100" />
          <p className="text-[10px] font-black uppercase truncate text-slate-800">{homeTeam?.name || '...'}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-5xl font-black italic font-sport ${isFinished ? 'text-[#002255]' : isLive ? 'text-red-600' : 'text-slate-200'}`}>{game.home_score}</span>
          <span className="text-slate-200 font-black italic text-xs opacity-50">X</span>
          <span className={`text-5xl font-black italic font-sport ${isFinished ? 'text-[#002255]' : isLive ? 'text-red-600' : 'text-slate-200'}`}>{game.away_score}</span>
        </div>
        <div className="flex-1 text-center min-w-0">
          <Shield size={28} className="mx-auto mb-2 text-slate-100" />
          <p className="text-[10px] font-black uppercase truncate text-slate-800">{awayTeam?.name || '...'}</p>
        </div>
      </div>
    </div>
  );
}
