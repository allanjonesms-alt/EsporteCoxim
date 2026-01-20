
import React, { useState } from 'react';
import { 
  TrophyIcon, 
  PlusCircle, 
  X, 
  Layers, 
  Settings2, 
  ChevronRight, 
  Loader2 
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { Competition, Team, Game, CompStatus, GameStatus, Phase } from './types';

const SUPABASE_URL = 'https://pkwprsdejfyfokgscwdl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrd3Byc2RlamZ5Zm9rZ3Njd2RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzI5ODksImV4cCI6MjA4NDE0ODk4OX0.Ak4ytUV3HmULv5q-ZMOr5UYFrePQgo6uJU1910xLRfc';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface TournamentManagerProps {
  competitions: Competition[];
  teams: Team[];
  phases: Phase[];
  onRefresh: () => Promise<void>;
}

export default function TournamentManager({ competitions, teams, phases, onRefresh }: TournamentManagerProps) {
  const [syncing, setSyncing] = useState(false);
  const [isCompModalOpen, setIsCompModalOpen] = useState(false);
  const [editingCompId, setEditingCompId] = useState<string | null>(null);
  const [isPhaseModalOpen, setIsPhaseModalOpen] = useState(false);
  const [isPhaseListModalOpen, setIsPhaseListModalOpen] = useState(false);
  const [isGeneratedGamesModalOpen, setIsGeneratedGamesModalOpen] = useState(false);

  const [newCompData, setNewCompData] = useState({
    name: '',
    date: '',
    status: CompStatus.AGENDADA,
    phase: 'Fase de Grupos',
    teams: [] as string[]
  });

  const [newPhaseData, setNewPhaseData] = useState({
    name: '',
    type: 'Fase de Grupos' as 'Fase de Grupos' | 'Mata-Mata'
  });

  // Group Logic States
  const [groupConfigStep, setGroupConfigStep] = useState<'list' | 'setup' | 'slots'>('list');
  const [numGroups, setNumGroups] = useState<number>(2);
  const [groupAssignments, setGroupAssignments] = useState<Record<string, string[]>>({});
  const [selectedTeamForAssignment, setSelectedTeamForAssignment] = useState<string | null>(null);
  const [groupsSummary, setGroupsSummary] = useState<Record<string, string[]>>({});

  const handleSaveComp = async () => {
    if (!newCompData.name) return alert("Preencha o nome.");
    setSyncing(true);
    try {
      const payload = {
        name: newCompData.name,
        status: newCompData.status,
        date: newCompData.date || new Date().toISOString().split('T')[0],
        current_phase: newCompData.phase
      };
      if (editingCompId) {
        await supabase.from('leagues').update(payload).eq('id', editingCompId);
      } else {
        const manualId = (Math.floor(Date.now() / 1000)).toString();
        await supabase.from('leagues').insert({ ...payload, id: manualId });
      }
      setIsCompModalOpen(false);
      setEditingCompId(null);
      await onRefresh();
    } catch (err: any) { alert(err.message); }
    finally { setSyncing(false); }
  };

  const handleSavePhase = async () => {
    if (!newPhaseData.name || !editingCompId) return;
    setSyncing(true);
    try {
      const manualId = Date.now().toString();
      await supabase.from('phases').insert({
        id: manualId,
        competitions_id: editingCompId,
        name: newPhaseData.name,
        type: newPhaseData.type
      });
      setIsPhaseModalOpen(false);
      await onRefresh();
    } catch (err: any) { alert(err.message); }
    finally { setSyncing(false); }
  };

  const activeCompPhases = phases.filter(p => p.competitions_id.toString() === editingCompId?.toString());
  const activeCompTeams = teams.filter(t => 
    newCompData.teams.map(String).includes(t.id.toString()) || 
    (t.league && t.league.toLowerCase() === newCompData.name.toLowerCase())
  );

  const handleGenerateGroupStructure = () => {
    const numParticipants = activeCompTeams.length;
    if (numParticipants === 0) return alert("Nenhum time vinculado a este torneio.");
    
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
    setSyncing(true);
    try {
      const newGames: any[] = [];
      const summary: Record<string, string[]> = {};

      Object.entries(groupAssignments).forEach(([letter, ids]) => {
        const valid = (ids as string[]).filter(id => id !== '');
        summary[letter] = valid.map(id => teams.find(t => t.id.toString() === id)?.name || '---');
        for (let i = 0; i < valid.length; i++) {
          for (let j = i + 1; j < valid.length; j++) {
            newGames.push({
              competition_id: editingCompId,
              home_team_id: valid[i],
              away_team_id: valid[j],
              status: GameStatus.AGENDADO,
              game_date: new Date().toISOString()
            });
          }
        }
      });

      await supabase.from('games').insert(newGames);
      setGroupsSummary(summary);
      setIsGeneratedGamesModalOpen(true);
      setIsPhaseListModalOpen(false);
      await onRefresh();
    } catch (err: any) { alert(err.message); }
    finally { setSyncing(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-black text-slate-800 uppercase italic text-lg">Gerenciar Torneios</h3>
        <button 
          onClick={() => { setEditingCompId(null); setIsCompModalOpen(true); }} 
          className="bg-[#003b95] text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 shadow-lg hover:scale-105 transition-transform"
        >
          <PlusCircle size={16}/> Novo Torneio
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
                phase: c.current_phase || 'Fase de Grupos', 
                teams: c.team_ids || []
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

      {/* Modal: Configuração de Torneio */}
      {isCompModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-10 relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setIsCompModalOpen(false)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-600"><X/></button>
            <h3 className="text-2xl font-black uppercase italic mb-8 flex items-center gap-3">
               <Settings2 className="text-[#003b95]" /> Configurar Torneio
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nome da Competição</label>
                <input placeholder="Ex: Copa Coxim 2025" className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-[#003b95] outline-none" value={newCompData.name} onChange={e => setNewCompData({...newCompData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Status Atual</label>
                <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-[#003b95] outline-none" value={newCompData.status} onChange={e => setNewCompData({...newCompData, status: e.target.value as CompStatus})}>
                  <option value={CompStatus.AGENDADA}>Agendada</option>
                  <option value={CompStatus.ATIVA}>Ativo</option>
                  <option value={CompStatus.ENCERRADA}>Encerrado</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Data de Início</label>
                <input type="date" className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-[#003b95] outline-none" value={newCompData.date} onChange={e => setNewCompData({...newCompData, date: e.target.value})} />
              </div>
              <div className="flex flex-col gap-2 pt-6">
                <button onClick={() => setIsPhaseModalOpen(true)} className="bg-slate-100 p-4 rounded-2xl font-black uppercase text-[9px] flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"><Layers size={14}/> Criar Fases</button>
                {editingCompId && (
                  <button onClick={() => { setIsPhaseListModalOpen(true); setGroupConfigStep('list'); }} className="bg-[#003b95] text-white p-4 rounded-2xl font-black uppercase text-[9px] flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 hover:bg-[#002b6d] transition-colors">
                    <Settings2 size={14}/> GERENCIAR FASES
                  </button>
                )}
              </div>
            </div>
            <button onClick={handleSaveComp} className="w-full bg-[#d90429] text-white py-5 rounded-2xl font-black uppercase shadow-xl hover:bg-[#b00322] transition-colors">Salvar Alterações</button>
          </div>
        </div>
      )}

      {/* Modal: Criar Fase */}
      {isPhaseModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10">
              <h4 className="text-xl font-black uppercase italic mb-6">Nova Fase</h4>
              <div className="space-y-4">
                 <input placeholder="Nome (Ex: Oitavas, Grupo A)" className="w-full p-4 bg-slate-50 rounded-xl font-bold" value={newPhaseData.name} onChange={e => setNewPhaseData({...newPhaseData, name: e.target.value})} />
                 <select className="w-full p-4 bg-slate-50 rounded-xl font-bold" value={newPhaseData.type} onChange={e => setNewPhaseData({...newPhaseData, type: e.target.value as any})}>
                    <option value="Fase de Grupos">Fase de Grupos</option>
                    <option value="Mata-Mata">Mata-Mata</option>
                 </select>
                 <div className="flex gap-2">
                    <button onClick={() => setIsPhaseModalOpen(false)} className="flex-1 py-4 font-black uppercase text-[10px] text-slate-400">Cancelar</button>
                    <button onClick={handleSavePhase} className="flex-1 bg-[#003b95] text-white py-4 rounded-xl font-black uppercase text-[10px]">Criar</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Modal: Sorteio de Grupos */}
      {isPhaseListModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-10 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-black uppercase italic mb-6">Configuração de Grupos</h3>
            
            {groupConfigStep === 'list' && (
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-4">Selecione a fase para sortear:</p>
                {activeCompPhases.filter(p => p.type === 'Fase de Grupos').map(p => (
                  <button 
                    key={p.id} 
                    onClick={() => { setGroupConfigStep('setup'); }} 
                    className="w-full p-6 bg-slate-50 rounded-3xl border-2 border-transparent hover:border-[#003b95] text-left flex justify-between items-center transition-all group"
                  >
                    <span className="font-black uppercase text-slate-700 group-hover:text-[#003b95]">{p.name}</span>
                    <ChevronRight className="text-slate-300 group-hover:text-[#003b95]"/>
                  </button>
                ))}
              </div>
            )}

            {groupConfigStep === 'setup' && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Quantos grupos terá esta fase?</label>
                  <input type="number" className="w-full p-6 bg-slate-50 rounded-3xl font-black text-4xl text-center text-[#003b95] border-2 border-slate-100" value={numGroups} onChange={e => setNumGroups(parseInt(e.target.value) || 1)} />
                </div>
                <button onClick={handleGenerateGroupStructure} className="w-full py-5 bg-[#003b95] text-white rounded-3xl font-black uppercase shadow-xl hover:bg-[#002b6d] transition-colors">Próximo: Definir Vagas</button>
              </div>
            )}

            {groupConfigStep === 'slots' && (
              <div className="space-y-8">
                <div className="p-6 bg-blue-50 rounded-3xl">
                   <p className="text-[10px] font-black uppercase text-[#003b95] mb-4">1. Selecione um clube:</p>
                   <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {(activeCompTeams.filter(t => !((Object.values(groupAssignments).flat() as string[]).includes(t.id.toString())))).map(t => (
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
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-2">2. Clique na vaga para preencher:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.keys(groupAssignments).map(letter => (
                      <div key={letter} className="p-4 bg-slate-50 rounded-[2rem] border border-slate-100">
                        <h5 className="font-black bg-[#003b95] text-white p-2 rounded-xl text-[10px] text-center mb-4 uppercase italic shadow-sm">Grupo {letter}</h5>
                        <div className="space-y-2">
                          {(groupAssignments[letter] as string[]).map((id, idx) => (
                            <button key={idx} onClick={() => handleAssignTeam(letter, idx)} className={`w-full p-3 rounded-xl text-[10px] font-bold border-2 transition-all ${id ? 'bg-white border-[#003b95] text-[#003b95]' : 'bg-slate-100 border-dashed border-slate-300 text-slate-400'}`}>
                              {id ? teams.find(t => t.id.toString() === id)?.name : 'Vaga Disponível'}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={handleSaveGroups} className="w-full py-5 bg-[#d90429] text-white rounded-3xl font-black uppercase shadow-xl hover:bg-[#b00322] transition-colors">Gerar Jogos de Grupo</button>
              </div>
            )}
            <button onClick={() => setIsPhaseListModalOpen(false)} className="mt-4 w-full text-slate-400 font-black uppercase text-[10px] hover:text-slate-600 transition-colors">Fechar</button>
          </div>
        </div>
      )}

      {syncing && (
        <div className="fixed bottom-10 right-10 bg-slate-900 text-white px-8 py-4 rounded-full flex items-center gap-3 z-[500] shadow-2xl">
          <Loader2 className="animate-spin text-blue-400" size={18}/>
          <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando...</span>
        </div>
      )}
    </div>
  );
}
