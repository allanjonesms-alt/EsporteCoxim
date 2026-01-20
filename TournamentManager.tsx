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
  Pencil,
  AlertCircle,
  ShieldAlert,
  Lock,
  UserPlus,
  Users,
  Dices,
  BarChart3,
  Eraser,
  CheckCircle2
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

  const activeComp = competitions.find(c => c.id.toString() === editingCompId?.toString());
  // Filtro: teams.league === leagues.name
  const activeCompTeams = teams.filter(t => t.league === activeComp?.name);

  const handleApplyMacro = (type: 'random' | 'seed' | 'clear') => {
    if (type === 'clear') {
      setMataMataSlots(new Array(mataMataCount).fill(''));
      return;
    }

    const availableIds = activeCompTeams.map(t => t.id.toString());
    
    if (type === 'random') {
      const shuffled = shuffleArray(availableIds).slice(0, mataMataCount);
      const nextSlots = new Array(mataMataCount).fill('');
      shuffled.forEach((id, i) => nextSlots[i] = id);
      setMataMataSlots(nextSlots);
    } 
    else if (type === 'seed') {
      const rankedIds = getTeamRanking(activeCompTeams, games.filter(g => g.competition_id.toString() === editingCompId));
      const topTeams = rankedIds.slice(0, mataMataCount);
      if (topTeams.length < mataMataCount) {
        alert("Não há times suficientes classificados para este tamanho de chaveamento.");
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
    } catch (err: any) { 
      alert("Erro ao salvar: " + err.message); 
    } finally { 
      setSyncing(false); 
    }
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
      setNewPhaseData({ name: '', type: 'Fase de Grupos' });
      await onRefresh();
      alert(`Fase "${newPhaseData.name.toUpperCase()}" criada com sucesso.`);
    } catch (err: any) { 
      alert("Erro ao criar fase: " + err.message); 
    } finally { 
      setSyncing(false); 
    }
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
      } catch (err: any) { 
        alert("Erro ao excluir: " + err.message); 
      } finally { 
        setSyncing(false); 
      }
    } else if (type === 'edit' && phaseId) {
      const selectedPhase = phases.find(p => p.id.toString() === phaseId);
      setActivePhaseId(phaseId);
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
      await onRefresh();
      alert("Chaveamento de mata-mata gerado com sucesso!");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const activeCompPhases = phases.filter(p => p.competitions_id.toString() === editingCompId?.toString());

  const handleGenerateGroupStructure = () => {
    const numParticipants = activeCompTeams.length;
    if (numParticipants === 0) return alert("Não há times vinculados a este torneio (leagues.name === teams.league) para gerar grupos.");
    
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
    if (!selectedTeamForAssignment) {
      next[letter][idx] = '';
    } else {
      next[letter][idx] = selectedTeamForAssignment;
    }
    setGroupAssignments(next);
    setSelectedTeamForAssignment(null);
  };

  const handleSaveGroups = async () => {
    if (!activePhaseId) return alert("Nenhuma fase selecionada para salvar.");
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
    } catch (err: any) { 
      alert(err.message); 
    } finally { 
      setSyncing(false); 
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-black text-slate-800 uppercase italic text-lg">Gerenciar Torneios</h3>
        <button 
          onClick={() => { 
            setEditingCompId(null); 
            setNewCompData({ name: '', date: '', status: CompStatus.AGENDADA, phase: 'Fase de Grupos' });
            setIsCompModalOpen(true); 
          }} 
          className="bg-[#003b95] text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 shadow-lg hover:scale-105 transition-transform"
        >
          <PlusCircle size(16}/> Novo Torneio
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {competitions.map(c => (
          <button 
            key={c.id} 
            onClick={() => { 
              setEditingCompId(c.id.toString()); 
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
                      if(!editingCompId) {
                        alert("Salve o torneio primeiro para habilitar as fases.");
                      } else {
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
              <div className="space-y-5">
                 <div className="space-y-1">
                   <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Tipo da Fase</label>
                   <select 
                      className="w-full p-4 bg-slate-50 rounded-xl font-bold outline-none border-2 border-transparent focus:border-[#003b95]" 
                      value={newPhaseData.type} 
                      onChange={e => setNewPhaseData({...newPhaseData, type: e.target.value as any, name: ''})}
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
                           onClick={() => setNewPhaseData({...newPhaseData, name: opt})}
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

                 <div className="bg-blue-50 p-4 rounded-2xl flex items-start gap-3">
                   <AlertCircle size={16} className="text-[#003b95] mt-1 shrink-0" />
                   <p className="text-[8px] font-bold text-blue-900 uppercase leading-relaxed">A fase será vinculada ao torneio "{newCompData.name}".</p>
                 </div>

                 <div className="flex gap-2 pt-4">
                    <button onClick={() => { setIsPhaseModalOpen(false); setNewPhaseData({name: '', type: 'Fase de Grupos'}); }} className="flex-1 py-4 font-black uppercase text-[10px] text-slate-400 hover:text-slate-600">Cancelar</button>
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
              <button onClick={() => { setIsPhaseListModalOpen(false); setActivePhaseId(null); }} className="text-slate-300 hover:text-slate-600"><X/></button>
            </div>
            
            {groupConfigStep === 'list' && (
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-4">Selecione a fase para configurar:</p>
                {activeCompPhases.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-[10px] font-black uppercase text-slate-300">Nenhuma fase criada para este torneio.</p>
                  </div>
                ) : (
                  activeCompPhases.map(p => {
                    const isConfigured = games.some(g => g.phase_id?.toString() === p.id.toString());
                    return (
                      <div key={p.id} className="flex items-center gap-2">
                        <button 
                          onClick={() => { 
                            if (p.type === 'Fase de Grupos') {
                              setActivePhaseId(p.id.toString()); 
                              setGroupConfigStep('setup'); 
                            } else {
                              setActivePhaseId(p.id.toString());
                              setIsPhaseListModalOpen(false);
                              setIsMataMataCountOpen(true);
                            }
                          }} 
                          className="flex-1 p-6 bg-slate-50 rounded-3xl border-2 border-transparent hover:border-[#003b95] text-left flex justify-between items-center transition-all group"
                        >
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-black uppercase text-slate-700 group-hover:text-[#003b95]">{p.name}</span>
                              <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded ${p.type === 'Fase de Grupos' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                                {p.type}
                              </span>
                            </div>
                            {isConfigured && (
                              <span className="text-[8px] font-bold text-green-500 uppercase mt-0.5 tracking-wider italic">Já possui jogos vinculados</span>
                            )}
                          </div>
                          <ChevronRight className="text-slate-300 group-hover:text-[#003b95]"/>
                        </button>
                        <div className="flex flex-col gap-2">
                          <button 
                            onClick={() => setSecurityModal({ open: true, type: 'delete', phaseId: p.id.toString() })} 
                            className="p-3 bg-slate-100 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm" 
                            title="Excluir Fase"
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
                  <button onClick={handleGenerateGroupStructure} className="flex-[2] py-5 bg-[#003b95] text-white rounded-3xl font-black uppercase shadow-xl hover:bg-[#002b6d] transition-colors">Próximo: Definir Vagas</button>
                </div>
              </div>
            )}

            {groupConfigStep === 'slots' && (
              <div className="space-y-8">
                <div className="p-6 bg-blue-50 rounded-3xl">
                   <p className="text-[10px] font-black uppercase text-[#003b95] mb-4">1. Selecione um clube (Filtro: Liga === "{activeComp?.name}"):</p>
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
                    {activeCompTeams.length === 0 && <p className="col-span-3 text-center text-[9px] font-bold text-slate-400 py-4 italic uppercase">Nenhum clube tem a liga "{activeComp?.name}" em seu cadastro.</p>}
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-2">2. Clique na vaga para preencher:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.keys(groupAssignments).map(letter => (
                      <div key={letter} className="p-4 bg-slate-50 rounded-[2rem] border border-slate-100">
                        <h5 className="font-black bg-[#003b95] text-white p-2 rounded-xl text-[10px] text-center mb-4 uppercase italic shadow-sm">Grupo {letter}</h5>
                        <div className="space-y-2">
                          {(groupAssignments[letter] as string[]).map((id, idx) => (
                            <button key={idx} onClick={() => handleAssignTeam(letter, idx)} className={`w-full p-3 rounded-xl text-[10px] font-bold border-2 transition-all ${id ? 'bg-white border-[#003b95] text-[#003b95]' : 'bg-slate-100 border-dashed border-slate-300 text-slate-400 hover:border-blue-300'}`}>
                              {id ? teams.find(t => t.id.toString() === id)?.name : 'Vaga Disponível'}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setGroupConfigStep('setup')} className="flex-1 py-5 text-slate-400 font-black uppercase text-[10px]">Voltar</button>
                  <button onClick={handleSaveGroups} className="flex-[2] py-5 bg-[#d90429] text-white rounded-3xl font-black uppercase shadow-xl hover:bg-[#b00322] transition-colors">Gerar Jogos de Grupo</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isMataMataCountOpen && (
        <div className="fixed inset-0 z-[350] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-blue-50 p-3 rounded-2xl text-[#003b95]"><Users size={24}/></div>
              <h4 className="text-xl font-black uppercase italic">Equipes na Fase</h4>
            </div>
            
            <div className="space-y-6 text-center">
              <p className="text-[10px] font-black uppercase text-slate-400 leading-relaxed">
                Informe a quantidade total de equipes que participarão deste chaveamento.
              </p>
              
              <div className="relative">
                <input 
                  type="number" 
                  step="2"
                  min="2"
                  className="w-full p-8 bg-slate-50 rounded-[2rem] font-black text-5xl text-center text-[#003b95] border-2 border-slate-100 focus:border-[#003b95] outline-none" 
                  value={mataMataCount} 
                  onChange={e => setMataMataCount(parseInt(e.target.value) || 2)} 
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button onClick={() => { setIsMataMataCountOpen(false); setIsPhaseListModalOpen(true); }} className="flex-1 py-5 text-slate-400 font-black uppercase text-[10px]">Voltar</button>
                <button onClick={() => { 
                  if (mataMataCount % 2 !== 0) return alert("A quantidade deve ser par.");
                  setMataMataSlots(new Array(mataMataCount).fill(''));
                  setIsMataMataCountOpen(false);
                  setIsMataMataSlotsOpen(true);
                }} className="flex-[2] py-5 bg-[#003b95] text-white rounded-[2rem] font-black uppercase shadow-xl hover:bg-[#002b6d] transition-colors">Configurar Vagas</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isMataMataSlotsOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl p-10 max-h-[90vh] overflow-y-auto flex flex-col gap-8 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black uppercase italic flex items-center gap-3">
                <TrophyIcon className="text-[#d90429]" /> Montagem do Chaveamento
              </h3>
              <div className="flex items-center gap-2">
                 <button 
                   onClick={() => handleApplyMacro('random')}
                   className="p-3 bg-blue-50 text-[#003b95] rounded-xl hover:bg-blue-100 transition-colors flex items-center gap-2 font-black uppercase text-[8px]"
                 >
                   <Dices size={14}/> Sorteio
                 </button>
                 <button 
                   onClick={() => handleApplyMacro('seed')}
                   className="p-3 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-colors flex items-center gap-2 font-black uppercase text-[8px]"
                 >
                   <BarChart3 size={14}/> Ranqueado
                 </button>
                 <button 
                   onClick={() => handleApplyMacro('clear')}
                   className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-2 font-black uppercase text-[8px]"
                 >
                   <Eraser size={14}/> Limpar
                 </button>
                 <div className="w-px h-8 bg-slate-100 mx-2" />
                 <button onClick={() => setIsMataMataSlotsOpen(false)} className="text-slate-300 hover:text-slate-600"><X/></button>
              </div>
            </div>

            <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-100">
              <p className="text-[10px] font-black uppercase text-slate-400 mb-6 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#003b95] rounded-full" /> Times Disponíveis (Liga === "{activeComp?.name}")
              </p>
              <div className="flex flex-wrap gap-3">
                {activeCompTeams.map(t => {
                  const isUsed = mataMataSlots.includes(t.id.toString());
                  return (
                    <div 
                      key={t.id}
                      draggable={!isUsed}
                      onDragStart={(e) => e.dataTransfer.setData('teamId', t.id.toString())}
                      className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase transition-all shadow-sm border-2 ${
                        isUsed 
                        ? 'bg-slate-100 text-slate-300 border-transparent cursor-not-allowed grayscale' 
                        : 'bg-white text-slate-700 border-white hover:border-[#003b95] cursor-grab active:cursor-grabbing hover:scale-105 active:scale-95'
                      }`}
                    >
                      {t.name}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#d90429] rounded-full" /> Vagas dos Confrontos (Arraste e Solte ou use as Macros)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: mataMataSlots.length / 2 }).map((_, matchIdx) => (
                  <div key={matchIdx} className="bg-white rounded-[2.5rem] border-2 border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all">
                    <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase text-slate-400 italic">Confronto {matchIdx + 1}</span>
                      <TrophyIcon size={12} className="text-slate-300" />
                    </div>
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
                            className={`h-14 flex items-center justify-center rounded-2xl border-2 transition-all ${
                              team ? 'bg-blue-50 border-[#003b95] text-[#003b95]' : 'bg-slate-50 border-dashed border-slate-200 text-slate-300 hover:border-blue-200'
                            }`}
                          >
                            {team ? (
                              <div className="flex items-center gap-3 px-4 w-full">
                                <span className="text-[11px] font-black uppercase flex-grow truncate">{team.name}</span>
                                <button onClick={() => {
                                  const next = [...mataMataSlots];
                                  next[slotIdx] = '';
                                  setMataMataSlots(next);
                                }} className="text-red-400 hover:text-red-600 transition-colors p-1"><X size={16}/></button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 opacity-50">
                                <UserPlus size={16} />
                                <span className="text-[9px] font-bold uppercase tracking-widest">Solte Equipe</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4 pt-6 border-t border-slate-50">
              <button onClick={() => { setIsMataMataSlotsOpen(false); setIsMataMataCountOpen(true); }} className="flex-1 py-5 text-slate-400 font-black uppercase text-[10px]">Voltar</button>
              <button onClick={handleSaveMataMata} className="flex-[2] py-5 bg-[#d90429] text-white rounded-[2rem] font-black uppercase shadow-xl hover:bg-[#b00322] transition-colors">Gerar Chaveamento</button>
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
