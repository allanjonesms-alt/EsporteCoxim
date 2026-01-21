import React, { useState } from 'react';
import { 
  TrophyIcon, 
  PlusCircle, 
  X, 
  Layers, 
  Settings2, 
  ChevronRight, 
  Loader2,
  Trash2,
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  Lock,
  UserPlus,
  Users,
  Dices,
  BarChart3,
  Eraser,
  CheckCircle2,
  Shield,
  Eye,
  Swords
} from 'lucide-react';
import { Competition, Team, Game, CompStatus, GameStatus, Phase } from './types';
import { DEFAULT_ADMIN } from './constants';
import { supabase } from './supabase';
import { shuffleArray, generateSeededSlots, getTeamRanking } from './macros';

interface TournamentManagerProps {
  competitions: Competition[];
  teams: Team[];
  phases: Phase[];
  games: Game[];
  onRefresh: () => Promise<void>;
}

export default function TournamentManager({ competitions, teams, phases, games, onRefresh }: TournamentManagerProps) {
  const [syncing, setSyncing] = useState(false);
  const [isCompModalOpen, setIsCompModalOpen] = useState(false);
  const [editingCompId, setEditingCompId] = useState<string | null>(null);
  const [isPhaseModalOpen, setIsPhaseModalOpen] = useState(false);
  const [isPhaseListModalOpen, setIsPhaseListModalOpen] = useState(false);
  
  const [isMataMataCountOpen, setIsMataMataCountOpen] = useState(false);
  const [isMataMataSlotsOpen, setIsMataMataSlotsOpen] = useState(false);
  const [mataMataCount, setMataMataCount] = useState<number>(8);
  const [mataMataSlots, setMataMataSlots] = useState<string[]>([]);
  const [showReconfigWarning, setShowReconfigWarning] = useState(false);
  const [pendingPhase, setPendingPhase] = useState<Phase | null>(null);

  const [viewGroupDetails, setViewGroupDetails] = useState<{ name: string, teamIds: string[] } | null>(null);
  const [phasePreview, setPhasePreview] = useState<Phase | null>(null);

  const [securityModal, setSecurityModal] = useState<{
    open: boolean;
    type: 'edit' | 'delete' | null;
    phaseId: string | null;
  }>({ open: false, type: null, phaseId: null });
  const [securityPassword, setSecurityPassword] = useState('');

  const [newCompData, setNewCompData] = useState({
    name: '',
    date: '',
    status: CompStatus.AGENDADA,
    phase: 'Fase de Grupos'
  });

  const [newPhaseData, setNewPhaseData] = useState({
    name: '',
    type: 'Fase de Grupos' as 'Fase de Grupos' | 'Mata-Mata'
  });

  const [groupConfigStep, setGroupConfigStep] = useState<'list' | 'setup' | 'slots'>('list');
  const [numGroups, setNumGroups] = useState<number>(2);
  const [groupAssignments, setGroupAssignments] = useState<Record<string, string[]>>({});
  const [selectedTeamForAssignment, setSelectedTeamForAssignment] = useState<string | null>(null);
  const [activePhaseId, setActivePhaseId] = useState<string | null>(null);

  // Move declarations of derived variables above their usage in helper functions and other variables to avoid TDZ errors.
  const activeComp = competitions.find(c => c.id.toString() === editingCompId?.toString());
  const activeCompTeams = teams.filter(t => t.league === activeComp?.name);
  const activeCompPhases = phases.filter(p => p.competitions_id.toString() === editingCompId?.toString());

  // Filtro de vencedores para progressão automática
  const [progressionWinners, setProgressionWinners] = useState<string[] | null>(null);

  // Lógica de Sequência de Mata-Mata
  const knockoutSequenceMap: Record<string, string> = {
    "OITAVAS DE FINAIS": "QUARTAS DE FINAIS",
    "QUARTAS DE FINAIS": "SEMI-FINAIS",
    "SEMI-FINAIS": "FINAL"
  };

  const getLastKnockoutPhase = () => {
    return [...activeCompPhases]
      .filter(p => p.type === 'Mata-Mata')
      .sort((a, b) => String(b.id).localeCompare(String(a.id)))[0];
  };

  const getWinnersOfPhase = (phaseId: string) => {
    const phaseGames = games.filter(g => 
      g.phase_id?.toString() === phaseId.toString() && 
      g.status === GameStatus.ENCERRADO
    );
    
    return phaseGames.map(g => {
      if (g.home_score > g.away_score) return g.home_team_id.toString();
      if (g.away_score > g.home_score) return g.away_team_id.toString();
      // Em caso de empate (teoricamente não ocorre em mata-mata sem decisão), ignoramos
      return null;
    }).filter(id => id !== null) as string[];
  };

  const lastKnockout = getLastKnockoutPhase();
  const nextKnockoutName = lastKnockout ? knockoutSequenceMap[lastKnockout.name] : null;
  const currentWinners = lastKnockout ? getWinnersOfPhase(lastKnockout.id.toString()) : [];

  const getDetectedGroups = (phaseId: string) => {
    const phaseGames = games.filter(g => g.phase_id?.toString() === phaseId.toString());
    if (phaseGames.length === 0) return [];

    const sets: Set<string>[] = [];
    phaseGames.forEach(g => {
      const h = g.home_team_id.toString();
      const a = g.away_team_id.toString();
      
      let foundSetIdx = -1;
      sets.forEach((set, idx) => {
        if (set.has(h) || set.has(a)) {
          foundSetIdx = idx;
        }
      });

      if (foundSetIdx !== -1) {
        sets[foundSetIdx].add(h);
        sets[foundSetIdx].add(a);
      } else {
        sets.push(new Set([h, a]));
      }
    });

    const finalSets: Set<string>[] = [];
    sets.forEach(currentSet => {
      let merged = false;
      for (const finalSet of finalSets) {
        const intersection = new Set([...currentSet].filter(x => finalSet.has(x)));
        if (intersection.size > 0) {
          currentSet.forEach(item => finalSet.add(item));
          merged = true;
          break;
        }
      }
      if (!merged) finalSets.push(currentSet);
    });

    return finalSets.map((set, i) => ({
      name: `GRUPO ${String.fromCharCode(65 + i)}`,
      teamIds: Array.from(set)
    }));
  };

  const handleApplyMacro = (type: 'random' | 'seed' | 'clear') => {
    if (type === 'clear') {
      setMataMataSlots(new Array(mataMataCount).fill(''));
      return;
    }
    
    // Se estiver em progressão, os times disponíveis são apenas os vencedores
    const teamsPool = progressionWinners || activeCompTeams.map(t => t.id.toString());
    
    if (type === 'random') {
      const shuffled = shuffleArray(teamsPool).slice(0, mataMataCount);
      const nextSlots = new Array(mataMataCount).fill('');
      shuffled.forEach((id, i) => nextSlots[i] = id);
      setMataMataSlots(nextSlots);
    } 
    else if (type === 'seed') {
      const filteredTeams = activeCompTeams.filter(t => teamsPool.includes(t.id.toString()));
      const rankedIds = getTeamRanking(filteredTeams, games.filter(g => g.competition_id.toString() === editingCompId));
      const topTeams = rankedIds.slice(0, mataMataCount);
      
      if (topTeams.length < mataMataCount) {
        alert(`Não há times suficientes (${topTeams.length}) para preencher ${mataMataCount} vagas.`);
        return;
      }
      setMataMataSlots(generateSeededSlots(topTeams));
    }
  };

  const handleSaveComp = async () => {
    if (!newCompData.name) return alert("Preencha o nome da competição.");
    setSyncing(true);
    try {
      const payload = {
        name: newCompData.name,
        status: newCompData.status,
        date: newCompData.date || new Date().toISOString().split('T')[0],
        current_phase: newCompData.phase
      };
      if (editingCompId) {
        const { error } = await supabase.from('leagues').update(payload).eq('id', editingCompId);
        if (error) throw error;
      } else {
        const manualId = (Math.floor(Date.now() / 1000)).toString();
        const { error } = await supabase.from('leagues').insert({ ...payload, id: manualId });
        if (error) throw error;
        setEditingCompId(manualId);
      }
      await onRefresh();
      alert("Configurações do torneio salvas com sucesso!");
    } catch (err: any) { alert("Erro ao salvar: " + err.message); } 
    finally { setSyncing(false); }
  };

  const handleSavePhase = async () => {
    if (!editingCompId) return alert("Salve o torneio antes de adicionar fases.");
    if (!newPhaseData.name) return alert("Preencha o nome da fase.");
    setSyncing(true);
    try {
      const manualId = `phase_${Date.now()}`;
      const { error } = await supabase.from('phases').insert({
        id: manualId,
        competitions_id: editingCompId,
        name: newPhaseData.name.toUpperCase(),
        type: newPhaseData.type
      });
      if (error) throw error;
      setIsPhaseModalOpen(false);
      
      // Se for uma fase criada via progressão automática, já iniciamos a config dela
      if (progressionWinners) {
        setActivePhaseId(manualId);
        setMataMataCount(progressionWinners.length);
        setIsMataMataSlotsOpen(true);
      }

      setNewPhaseData({ name: '', type: 'Fase de Grupos' });
      await onRefresh();
      if (!progressionWinners) alert(`Fase "${newPhaseData.name.toUpperCase()}" criada com sucesso.`);
    } catch (err: any) { alert("Erro ao criar fase: " + err.message); } 
    finally { setSyncing(false); }
  };

  const handleSecurityConfirm = async () => {
    if (securityPassword !== DEFAULT_ADMIN.password) {
      alert("Senha incorreta! Operação cancelada.");
      return;
    }
    const { type, phaseId } = securityModal;
    if (type === 'delete' && phaseId) {
      setSyncing(true);
      try {
        await supabase.from('games').delete().eq('phase_id', phaseId);
        const { error } = await supabase.from('phases').delete().eq('id', phaseId);
        if (error) throw error;
        await onRefresh();
        alert("Fase e todos os seus jogos foram excluídos permanentemente.");
      } catch (err: any) { alert("Erro ao excluir: " + err.message); } 
      finally { setSyncing(false); }
    } else if (type === 'edit' && phaseId) {
      const selectedPhase = phases.find(p => p.id.toString() === phaseId);
      setActivePhaseId(phaseId);
      setProgressionWinners(null); // Resetamos o filtro ao editar manualmente
      if (selectedPhase?.type === 'Mata-Mata') {
        setIsPhaseListModalOpen(false);
        setIsMataMataCountOpen(true);
      } else {
        setGroupConfigStep('setup');
      }
    }
    setSecurityModal({ open: false, type: null, phaseId: null });
    setSecurityPassword('');
  };

  const handlePhaseClick = (p: Phase) => {
    const hasGames = games.some(g => g.phase_id?.toString() === p.id.toString());
    
    if (hasGames) {
      setPendingPhase(p);
      setShowReconfigWarning(true);
    } else {
      setProgressionWinners(null);
      proceedToPhaseConfig(p);
    }
  };

  const proceedToPhaseConfig = (p: Phase) => {
    setActivePhaseId(p.id.toString());
    if (p.type === 'Fase de Grupos') {
      setGroupConfigStep('setup');
    } else {
      setIsPhaseListModalOpen(false);
      setIsMataMataCountOpen(true);
    }
    setShowReconfigWarning(false);
    setPendingPhase(null);
  };

  const handleSaveMataMata = async () => {
    if (!activePhaseId) return;
    setSyncing(true);
    try {
      await supabase.from('games').delete().eq('phase_id', activePhaseId);
      const newGames: any[] = [];
      for (let i = 0; i < mataMataSlots.length; i += 2) {
        const home = mataMataSlots[i];
        const away = mataMataSlots[i+1];
        if (home && away) {
          newGames.push({
            competition_id: editingCompId,
            phase_id: activePhaseId,
            home_team_id: home,
            away_team_id: away,
            status: GameStatus.AGENDADO,
            game_date: new Date().toISOString()
          });
        }
      }
      if (newGames.length > 0) {
        const { error } = await supabase.from('games').insert(newGames);
        if (error) throw error;
      }
      setIsMataMataSlotsOpen(false);
      setActivePhaseId(null);
      setProgressionWinners(null);
      await onRefresh();
      alert("Chaveamento de mata-mata gerado com sucesso!");
    } catch (err: any) { alert(err.message); } 
    finally { setSyncing(false); }
  };

  const handleGenerateGroupStructure = () => {
    const numParticipants = activeCompTeams.length;
    if (numParticipants === 0) return alert("Não há times vinculados para gerar grupos.");
    const slots = Math.ceil(numParticipants / numGroups);
    const initial: Record<string, string[]> = {};
    for (let i = 0; i < numGroups; i++) {
      initial[String.fromCharCode(65 + i)] = new Array(slots).fill('');
    }
    setGroupAssignments(initial);
    setGroupConfigStep('slots');
  };

  const handleAssignTeam = (letter: string, idx: number) => {
    const next = { ...groupAssignments };
    next[letter][idx] = selectedTeamForAssignment || '';
    setGroupAssignments(next);
    setSelectedTeamForAssignment(null);
  };

  const handleSaveGroups = async () => {
    if (!activePhaseId) return alert("Nenhuma fase selecionada.");
    setSyncing(true);
    try {
      await supabase.from('games').delete().eq('phase_id', activePhaseId);
      const newGames: any[] = [];
      Object.entries(groupAssignments).forEach(([letter, ids]) => {
        const valid = (ids as string[]).filter(id => id !== '');
        for (let i = 0; i < valid.length; i++) {
          for (let j = i + 1; j < valid.length; j++) {
            newGames.push({
              competition_id: editingCompId,
              phase_id: activePhaseId,
              home_team_id: valid[i],
              away_team_id: valid[j],
              status: GameStatus.AGENDADO,
              game_date: new Date().toISOString()
            });
          }
        }
      });
      if (newGames.length > 0) {
        const { error } = await supabase.from('games').insert(newGames);
        if (error) throw error;
      }
      setIsPhaseListModalOpen(false);
      setActivePhaseId(null);
      await onRefresh();
      alert("Tabela de jogos gerada com sucesso!");
    } catch (err: any) { alert(err.message); } 
    finally { setSyncing(false); }
  };

  // Filtragem de times com base na progressão
  const visibleTeams = progressionWinners 
    ? activeCompTeams.filter(t => progressionWinners.includes(t.id.toString()))
    : activeCompTeams;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-black text-slate-800 uppercase italic text-lg">Gerenciar Torneios</h3>
        <button 
          onClick={() => { 
            setEditingCompId(null); 
            setProgressionWinners(null);
            setNewCompData({ name: '', date: '', status: CompStatus.AGENDADA, phase: 'Fase de Grupos' });
            setIsCompModalOpen(true); 
          }} 
          className="bg-[#003b95] text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 shadow-lg hover:scale-105 transition-transform"
        >
          <PlusCircle size={16} /> Novo Torneio
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {competitions.map(c => (
          <button 
            key={c.id} 
            onClick={() => { 
              setEditingCompId(c.id.toString()); 
              setProgressionWinners(null);
              setNewCompData({
                name: c.name, 
                date: c.date || '', 
                status: c.status, 
                phase: c.current_phase || 'Fase de Grupos'
              }); 
              setIsCompModalOpen(true); 
            }} 
            className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-50 text-left hover:border-[#003b95] transition-all group"
          >
            <div className="bg-blue-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#003b95] transition-colors">
               <TrophyIcon className="text-[#003b95] group-hover:text-white" size={24}/>
            </div>
            <h4 className="font-black text-slate-800 uppercase text-lg mb-2">{c.name}</h4>
            <div className="flex items-center gap-2">
               <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${c.status === CompStatus.ATIVA ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                 {c.status}
               </span>
               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{c.current_phase}</span>
            </div>
          </button>
        ))}
      </div>

      {isCompModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-10 relative animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <button onClick={() => setIsCompModalOpen(false)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-600"><X/></button>
            <h3 className="text-2xl font-black uppercase italic mb-8 flex items-center gap-3">
               <Settings2 className="text-[#003b95]" /> Configurar Torneio
            </h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nome da Competição</label>
                <input 
                  placeholder="Ex: Copa Coxim 2025" 
                  className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-[#003b95] outline-none" 
                  value={newCompData.name} 
                  onChange={e => setNewCompData({...newCompData, name: e.target.value})} 
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Status Atual</label>
                  <select 
                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-[#003b95] outline-none" 
                    value={newCompData.status} 
                    onChange={e => setNewCompData({...newCompData, status: e.target.value as CompStatus})}
                  >
                    <option value={CompStatus.AGENDADA}>Agendada</option>
                    <option value={CompStatus.ATIVA}>Ativo</option>
                    <option value={CompStatus.ENCERRADA}>Encerrado</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Data de Início</label>
                  <input 
                    type="date" 
                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-[#003b95] outline-none" 
                    value={newCompData.date} 
                    onChange={e => setNewCompData({...newCompData, date: e.target.value})} 
                  />
                </div>
              </div>
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4">Ações da Competição</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button 
                    onClick={() => {
                      if(!editingCompId) alert("Salve o torneio primeiro.");
                      else {
                        setProgressionWinners(null);
                        setIsPhaseModalOpen(true);
                      }
                    }} 
                    className={`p-4 rounded-2xl font-black uppercase text-[9px] flex items-center justify-center gap-2 transition-all ${editingCompId ? 'bg-white shadow-sm hover:bg-slate-100' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                  >
                    <Layers size={14}/> Nova Fase
                  </button>
                  {editingCompId && (
                    <button onClick={() => { setIsPhaseListModalOpen(true); setGroupConfigStep('list'); }} className="bg-[#003b95] text-white p-4 rounded-2xl font-black uppercase text-[9px] flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 hover:bg-[#002b6d] transition-colors">
                      <Settings2 size={14}/> Gerenciar Fases Existentes
                    </button>
                  )}
                </div>
              </div>
              <div className="flex gap-4">
                <button onClick={handleSaveComp} className="flex-1 bg-[#d90429] text-white py-5 rounded-2xl font-black uppercase shadow-xl hover:bg-[#b00322] transition-colors">
                  Salvar Configurações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isPhaseModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 animate-in zoom-in-95 duration-200 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-blue-50 p-2 rounded-xl text-[#003b95]"><Layers size={20}/></div>
                <h4 className="text-xl font-black uppercase italic">Nova Fase</h4>
              </div>

              {/* Botão de Próxima Fase do Mata-Mata */}
              {nextKnockoutName && (
                <button
                  onClick={() => {
                    if (currentWinners.length === 0) {
                      alert("Atenção: Não foram encontrados vencedores com jogos encerrados na fase anterior. Encerrre os jogos das " + lastKnockout.name + " para habilitar a progressão automática.");
                      return;
                    }
                    setProgressionWinners(currentWinners);
                    setNewPhaseData({ name: nextKnockoutName, type: 'Mata-Mata' });
                  }}
                  className="w-full mb-6 p-4 bg-orange-50 border-2 border-orange-200 rounded-2xl flex items-center justify-between group hover:bg-orange-100 transition-all shadow-sm"
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className="bg-orange-500 text-white p-2 rounded-xl">
                      <Swords size={18} />
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase text-orange-600 tracking-widest">Sequência Automática</p>
                      <p className="text-xs font-black uppercase text-slate-800">Próxima Fase: {nextKnockoutName}</p>
                      <p className="text-[7px] font-bold text-slate-400 mt-1 uppercase italic">{currentWinners.length} vencedores encontrados</p>
                    </div>
                  </div>
                  <ChevronRight className="text-orange-400 group-hover:translate-x-1 transition-transform" size={20} />
                </button>
              )}

              <div className="space-y-5">
                 <div className="space-y-1">
                   <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Tipo da Fase</label>
                   <select 
                      className="w-full p-4 bg-slate-50 rounded-xl font-bold outline-none border-2 border-transparent focus:border-[#003b95]" 
                      value={newPhaseData.type} 
                      onChange={e => {
                        setProgressionWinners(null); // Resetamos filtro se mudar tipo manualmente
                        setNewPhaseData({...newPhaseData, type: e.target.value as any, name: ''});
                      }}
                   >
                      <option value="Fase de Grupos">Fase de Grupos</option>
                      <option value="Mata-Mata">Mata-Mata</option>
                   </select>
                 </div>
                 <div className="space-y-1">
                   <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Nome da Fase</label>
                   {newPhaseData.type === 'Mata-Mata' ? (
                     <div className="grid grid-cols-2 gap-2">
                       {["1ª FASE", "2ª FASE", "OITAVAS DE FINAIS", "QUARTAS DE FINAIS", "SEMI-FINAIS", "FINAL"].map(opt => (
                         <button
                           key={opt}
                           type="button"
                           onClick={() => {
                            setProgressionWinners(null);
                            setNewPhaseData({...newPhaseData, name: opt});
                           }}
                           className={`p-3 rounded-xl text-[9px] font-black uppercase transition-all border-2 ${newPhaseData.name === opt ? 'bg-[#003b95] text-white border-[#003b95]' : 'bg-slate-50 border-transparent text-slate-600 hover:border-slate-200'}`}
                         >
                           {opt}
                         </button>
                       ))}
                     </div>
                   ) : (
                     <input 
                        placeholder="Ex: Grupo A, Primeira Fase" 
                        className="w-full p-4 bg-slate-50 rounded-xl font-bold outline-none border-2 border-transparent focus:border-[#003b95]" 
                        value={newPhaseData.name} 
                        onChange={e => setNewPhaseData({...newPhaseData, name: e.target.value})} 
                     />
                   )}
                 </div>
                 <div className="flex gap-2 pt-4">
                    <button onClick={() => { setIsPhaseModalOpen(false); setProgressionWinners(null); setNewPhaseData({name: '', type: 'Fase de Grupos'}); }} className="flex-1 py-4 font-black uppercase text-[10px] text-slate-400 hover:text-slate-600">Cancelar</button>
                    <button onClick={handleSavePhase} className="flex-[2] bg-[#003b95] text-white py-4 rounded-xl font-black uppercase text-[10px] shadow-lg shadow-blue-900/10 hover:bg-[#002b6d]">Registrar Fase</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {isPhaseListModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-10 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black uppercase italic">Configuração de Fases</h3>
              <button onClick={() => { setIsPhaseListModalOpen(false); setActivePhaseId(null); setProgressionWinners(null); }} className="text-slate-300 hover:text-slate-600"><X/></button>
            </div>
            
            {groupConfigStep === 'list' && (
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-4">Selecione a fase para configurar:</p>
                {activeCompPhases.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-[10px] font-black uppercase text-slate-300">Nenhuma fase criada.</p>
                  </div>
                ) : (
                  activeCompPhases.map(p => {
                    const isConfigured = games.some(g => g.phase_id?.toString() === p.id.toString());
                    const detectedGroups = p.type === 'Fase de Grupos' ? getDetectedGroups(p.id.toString()) : [];
                    
                    return (
                      <div key={p.id} className="flex items-center gap-2">
                        <button 
                          onClick={() => handlePhaseClick(p)} 
                          className="flex-1 p-6 bg-slate-50 rounded-3xl border-2 border-transparent hover:border-[#003b95] text-left flex justify-between items-center transition-all group"
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-black uppercase text-slate-700 group-hover:text-[#003b95]">{p.name}</span>
                              <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded ${p.type === 'Fase de Grupos' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                                {p.type}
                              </span>
                            </div>
                            {p.type === 'Fase de Grupos' && detectedGroups.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {detectedGroups.map(group => (
                                  <span 
                                    key={group.name} 
                                    className="bg-white border border-blue-100 text-[#003b95] text-[7px] font-black px-2 py-0.5 rounded uppercase italic shadow-sm"
                                  >
                                    {group.name}
                                  </span>
                                ))}
                              </div>
                            )}
                            {isConfigured && detectedGroups.length === 0 && (
                              <span className="text-[8px] font-bold text-green-500 uppercase mt-0.5 tracking-wider italic">Estrutura de jogos gerada</span>
                            )}
                          </div>
                          <ChevronRight className="text-slate-300 group-hover:text-[#003b95]"/>
                        </button>
                        <div className="flex flex-col gap-2">
                          <button 
                            onClick={() => setPhasePreview(p)} 
                            title="Visualizar Resumo"
                            className="p-3 bg-blue-50 rounded-2xl text-[#003b95] hover:bg-[#003b95] hover:text-white transition-all shadow-sm"
                          >
                            <Eye size={16}/>
                          </button>
                          <button 
                            onClick={() => setSecurityModal({ open: true, type: 'delete', phaseId: p.id.toString() })} 
                            className="p-3 bg-slate-100 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm"
                          >
                            <Trash2 size={16}/>
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {groupConfigStep === 'setup' && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Quantos grupos terá esta fase?</label>
                  <input type="number" className="w-full p-6 bg-slate-50 rounded-3xl font-black text-4xl text-center text-[#003b95] border-2 border-slate-100" value={numGroups} onChange={e => setNumGroups(parseInt(e.target.value) || 1)} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setGroupConfigStep('list')} className="flex-1 py-5 text-slate-400 font-black uppercase text-[10px]">Voltar</button>
                  <button onClick={handleGenerateGroupStructure} className="flex-[2] py-5 bg-[#003b95] text-white rounded-3xl font-black uppercase shadow-xl hover:bg-[#002b6d] transition-colors">Próximo</button>
                </div>
              </div>
            )}

            {groupConfigStep === 'slots' && (
              <div className="space-y-8">
                <div className="p-6 bg-blue-50 rounded-3xl">
                   <p className="text-[10px] font-black uppercase text-[#003b95] mb-4">1. Selecione um clube:</p>
                   <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {activeCompTeams.map(t => (
                      <button 
                        key={t.id} 
                        onClick={() => setSelectedTeamForAssignment(t.id.toString())} 
                        className={`p-3 rounded-xl border-2 text-[9px] font-black uppercase transition-all ${selectedTeamForAssignment === t.id.toString() ? 'bg-[#003b95] text-white border-[#003b95] scale-105' : 'bg-white border-slate-100 text-slate-500 hover:border-blue-200'}`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.keys(groupAssignments).map(letter => (
                      <div key={letter} className="p-4 bg-slate-50 rounded-[2rem] border border-slate-100">
                        <h5 className="font-black bg-[#003b95] text-white p-2 rounded-xl text-[10px] text-center mb-4 uppercase italic">Grupo {letter}</h5>
                        <div className="space-y-2">
                          {(groupAssignments[letter] as string[]).map((id, idx) => (
                            <button key={idx} onClick={() => handleAssignTeam(letter, idx)} className={`w-full p-3 rounded-xl text-[10px] font-bold border-2 transition-all ${id ? 'bg-white border-[#003b95] text-[#003b95]' : 'bg-slate-100 border-dashed border-slate-300 text-slate-400'}`}>
                              {id ? teams.find(t => t.id.toString() === id)?.name : 'Vaga'}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setGroupConfigStep('setup')} className="flex-1 py-5 text-slate-400 font-black uppercase text-[10px]">Voltar</button>
                  <button onClick={handleSaveGroups} className="flex-[2] py-5 bg-[#d90429] text-white rounded-3xl font-black uppercase shadow-xl hover:bg-[#b00322] transition-colors">Gerar Jogos</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Visualização de Resumo da Fase */}
      {phasePreview && (
        <div className="fixed inset-0 z-[650] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
           <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-200 relative">
              <button 
                onClick={() => setPhasePreview(null)} 
                className="absolute top-6 right-6 text-slate-300 hover:text-slate-600 transition-colors"
              >
                <X />
              </button>
              
              <div className="text-center mb-8">
                <div className="bg-blue-50 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 text-[#003b95] shadow-inner">
                  <Layers size={32} />
                </div>
                <h4 className="text-2xl font-black uppercase italic text-slate-800">{phasePreview.name}</h4>
                <div className="inline-flex items-center gap-2 mt-2">
                  <span className={`text-[8px] font-black uppercase px-3 py-1 rounded-full ${phasePreview.type === 'Fase de Grupos' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                    {phasePreview.type}
                  </span>
                </div>
              </div>

              <div className="space-y-6">
                {phasePreview.type === 'Fase de Grupos' ? (
                  getDetectedGroups(phasePreview.id.toString()).map(group => {
                    const groupGames = games.filter(g => 
                      g.phase_id?.toString() === phasePreview.id.toString() &&
                      group.teamIds.includes(g.home_team_id.toString()) &&
                      group.teamIds.includes(g.away_team_id.toString())
                    );

                    return (
                      <div key={group.name} className="bg-slate-50 rounded-[2.5rem] border border-slate-100 overflow-hidden">
                        <div className="bg-[#003b95] px-6 py-3 flex justify-between items-center">
                          <span className="text-white font-black uppercase italic text-xs tracking-widest">{group.name}</span>
                          <span className="text-blue-200 font-bold uppercase text-[9px]">{groupGames.length} Partidas</span>
                        </div>
                        <div className="p-5 space-y-2">
                          {groupGames.length === 0 ? (
                            <p className="text-[10px] font-bold text-slate-400 uppercase italic text-center py-4">Sem jogos gerados</p>
                          ) : (
                            groupGames.map(game => {
                              const h = teams.find(t => t.id.toString() === game.home_team_id.toString());
                              const a = teams.find(t => t.id.toString() === game.away_team_id.toString());
                              return (
                                <div key={game.id} className="flex items-center justify-between gap-4 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                  <span className="text-[10px] font-black uppercase text-slate-700 truncate flex-1">{h?.name || '---'}</span>
                                  <Swords size={12} className="text-slate-300 shrink-0" />
                                  <span className="text-[10px] font-black uppercase text-slate-700 truncate flex-1 text-right">{a?.name || '---'}</span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Tabela de Confrontos</p>
                    {games.filter(g => g.phase_id?.toString() === phasePreview.id.toString()).map(game => {
                      const h = teams.find(t => t.id.toString() === game.home_team_id.toString());
                      const a = teams.find(t => t.id.toString() === game.away_team_id.toString());
                      return (
                        <div key={game.id} className="flex items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm hover:border-[#003b95] transition-all group">
                          <span className="text-[11px] font-black uppercase text-slate-800 flex-1 truncate group-hover:text-[#003b95]">{h?.name || '---'}</span>
                          <div className="bg-[#d90429] text-white px-3 py-1 rounded-lg text-[9px] font-black italic">VS</div>
                          <span className="text-[11px] font-black uppercase text-slate-800 flex-1 truncate text-right group-hover:text-[#003b95]">{a?.name || '---'}</span>
                        </div>
                      );
                    })}
                    {games.filter(g => g.phase_id?.toString() === phasePreview.id.toString()).length === 0 && (
                       <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                         <p className="text-[10px] font-black uppercase text-slate-300">Estrutura de mata-mata não gerada</p>
                       </div>
                    )}
                  </div>
                )}
              </div>

              <button 
                onClick={() => setPhasePreview(null)} 
                className="w-full mt-10 bg-[#003b95] text-white py-5 rounded-[1.5rem] font-black uppercase text-xs shadow-xl shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Fechar Resumo
              </button>
           </div>
        </div>
      )}

      {/* Modal de Aviso de Reconfiguração */}
      {showReconfigWarning && pendingPhase && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className="bg-orange-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-orange-500">
              <AlertTriangle size={48} />
            </div>
            <h4 className="text-2xl font-black uppercase italic text-slate-800 mb-4">Jogos já Gerados!</h4>
            <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8">
              A fase <span className="font-black text-[#003b95]">"{pendingPhase.name}"</span> já possui partidas registradas. 
              Ao continuar a edição, os jogos atuais serão <span className="text-red-500 font-bold">excluídos permanentemente</span> para dar lugar à nova configuração.
            </p>
            <div className="space-y-3">
              <button 
                onClick={() => proceedToPhaseConfig(pendingPhase)}
                className="w-full bg-[#003b95] text-white py-5 rounded-2xl font-black uppercase text-xs shadow-xl hover:bg-[#002b6d] transition-all"
              >
                Ciente, Prosseguir
              </button>
              <button 
                onClick={() => { setShowReconfigWarning(false); setPendingPhase(null); }}
                className="w-full py-4 text-slate-400 font-black uppercase text-[10px] hover:text-slate-600 transition-colors"
              >
                Cancelar Edição
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualização de Times por Grupo */}
      {viewGroupDetails && (
        <div className="fixed inset-0 z-[450] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
           <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-200 relative">
              <button 
                onClick={() => setViewGroupDetails(null)} 
                className="absolute top-6 right-6 text-slate-300 hover:text-slate-600 transition-colors"
              >
                <X />
              </button>
              <div className="text-center mb-8">
                <div className="bg-blue-50 w-16 h-16 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 text-[#003b95]">
                  <Users size={32} />
                </div>
                <h4 className="text-2xl font-black uppercase italic text-[#003b95]">{viewGroupDetails.name}</h4>
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mt-1">Clubes Participantes</p>
              </div>
              <div className="space-y-3">
                {viewGroupDetails.teamIds.map(id => {
                  const team = teams.find(t => t.id.toString() === id);
                  return (
                    <div key={id} className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-100 text-slate-300 shadow-sm">
                        <Shield size={16} />
                      </div>
                      <span className="font-black uppercase text-xs text-slate-700">{team?.name || 'Clube Desconhecido'}</span>
                    </div>
                  );
                })}
              </div>
              <button 
                onClick={() => setViewGroupDetails(null)} 
                className="w-full mt-8 bg-[#003b95] text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-blue-900/20"
              >
                Fechar Visualização
              </button>
           </div>
        </div>
      )}

      {isMataMataCountOpen && (
        <div className="fixed inset-0 z-[350] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <h4 className="text-xl font-black uppercase italic mb-8">Equipes na Fase</h4>
            <div className="space-y-6 text-center">
              <input 
                type="number" step="2" min="2"
                className="w-full p-8 bg-slate-50 rounded-[2rem] font-black text-5xl text-center text-[#003b95] border-2 border-slate-100" 
                value={mataMataCount} 
                onChange={e => setMataMataCount(parseInt(e.target.value) || 2)} 
              />
              <div className="flex gap-2 pt-4">
                <button onClick={() => { setIsMataMataCountOpen(false); setIsPhaseListModalOpen(true); }} className="flex-1 py-5 text-slate-400 font-black uppercase text-[10px]">Voltar</button>
                <button onClick={() => { 
                  if (mataMataCount % 2 !== 0) return alert("Deve ser par.");
                  setMataMataSlots(new Array(mataMataCount).fill(''));
                  setIsMataMataCountOpen(false);
                  setIsMataMataSlotsOpen(true);
                }} className="flex-[2] py-5 bg-[#003b95] text-white rounded-[2rem] font-black uppercase shadow-xl">Configurar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isMataMataSlotsOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl p-10 max-h-[90vh] overflow-y-auto flex flex-col gap-8 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <div className="flex flex-col gap-1">
                <h3 className="text-2xl font-black uppercase italic">Chaveamento</h3>
                {progressionWinners && (
                  <span className="text-[8px] font-black text-orange-500 uppercase italic bg-orange-50 px-3 py-1 rounded-full w-fit">Progressão: Apenas Vencedores Disponíveis</span>
                )}
              </div>
              <div className="flex gap-2">
                 <button onClick={() => handleApplyMacro('random')} className="p-3 bg-blue-50 text-[#003b95] rounded-xl font-black uppercase text-[8px]">Sorteio</button>
                 <button onClick={() => handleApplyMacro('seed')} className="p-3 bg-purple-50 text-purple-600 rounded-xl font-black uppercase text-[8px]">Ranqueado</button>
                 <button onClick={() => handleApplyMacro('clear')} className="p-3 bg-slate-50 text-slate-400 rounded-xl font-black uppercase text-[8px]">Limpar</button>
                 <button onClick={() => { setIsMataMataSlotsOpen(false); setProgressionWinners(null); }} className="text-slate-300 ml-4"><X/></button>
              </div>
            </div>
            <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-100">
              <div className="flex flex-wrap gap-3">
                {visibleTeams.map(t => {
                  const isUsed = mataMataSlots.includes(t.id.toString());
                  return (
                    <div 
                      key={t.id} draggable={!isUsed}
                      onDragStart={(e) => e.dataTransfer.setData('teamId', t.id.toString())}
                      className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-sm border-2 ${isUsed ? 'bg-slate-100 text-slate-300 border-transparent grayscale' : 'bg-white text-slate-700 border-white hover:border-[#003b95] cursor-grab'}`}
                    >
                      {t.name}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: mataMataSlots.length / 2 }).map((_, matchIdx) => (
                <div key={matchIdx} className="bg-white rounded-[2.5rem] border-2 border-slate-100 overflow-hidden shadow-sm">
                  <div className="bg-slate-50 px-6 py-3 border-b border-slate-100"><span className="text-[9px] font-black uppercase text-slate-400 italic">Confronto {matchIdx + 1}</span></div>
                  <div className="p-6 space-y-3">
                    {[0, 1].map(sideIdx => {
                      const slotIdx = (matchIdx * 2) + sideIdx;
                      const teamId = mataMataSlots[slotIdx];
                      const team = teams.find(t => t.id.toString() === teamId);
                      return (
                        <div 
                          key={slotIdx}
                          onDrop={(e) => {
                            e.preventDefault();
                            const teamId = e.dataTransfer.getData('teamId');
                            const newSlots = [...mataMataSlots];
                            const existingIndex = newSlots.indexOf(teamId);
                            if (existingIndex !== -1) newSlots[existingIndex] = '';
                            newSlots[slotIdx] = teamId;
                            setMataMataSlots(newSlots);
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          className={`h-14 flex items-center justify-center rounded-2xl border-2 transition-all ${team ? 'bg-blue-50 border-[#003b95] text-[#003b95]' : 'bg-slate-50 border-dashed border-slate-200'}`}
                        >
                          {team ? (
                            <div className="flex items-center gap-3 px-4 w-full">
                              <span className="text-[11px] font-black uppercase flex-grow truncate">{team.name}</span>
                              <button onClick={() => { const next = [...mataMataSlots]; next[slotIdx] = ''; setMataMataSlots(next); }} className="text-red-400 hover:text-red-600 transition-colors p-1"><X size={16}/></button>
                            </div>
                          ) : <span className="text-[9px] font-bold uppercase opacity-20">Solte Equipe</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-4 pt-6 border-t border-slate-50">
              <button onClick={() => { setIsMataMataSlotsOpen(false); setIsMataMataCountOpen(true); }} className="flex-1 py-5 text-slate-400 font-black uppercase text-[10px]">Voltar</button>
              <button onClick={handleSaveMataMata} className="flex-[2] py-5 bg-[#d90429] text-white rounded-[2rem] font-black uppercase shadow-xl">Gerar Chaveamento</button>
            </div>
          </div>
        </div>
      )}

      {securityModal.open && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 text-center">
            <h4 className="text-xl font-black uppercase italic mb-8">Segurança</h4>
            <input type="password" placeholder="SENHA ADMIN" className="w-full p-5 bg-slate-50 rounded-2xl font-black text-center" value={securityPassword} onChange={(e) => setSecurityPassword(e.target.value)} />
            <div className="flex gap-2 pt-6">
              <button onClick={() => setSecurityModal({ open: false, type: null, phaseId: null })} className="flex-1 py-4 font-black uppercase text-[10px] text-slate-400">Cancelar</button>
              <button onClick={handleSecurityConfirm} className="flex-[2] bg-[#d90429] text-white py-4 rounded-2xl font-black uppercase">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {syncing && (
        <div className="fixed bottom-10 right-10 bg-slate-900 text-white px-8 py-4 rounded-full flex items-center gap-3 z-[600]">
          <Loader2 className="animate-spin text-blue-400" size={18}/>
          <span className="text-[10px] font-black uppercase">Sincronizando...</span>
        </div>
      )}
    </div>
  );
}
