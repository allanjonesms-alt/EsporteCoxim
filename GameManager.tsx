import React, { useState, useMemo } from 'react';
import { 
  Trash2, 
  Loader2, 
  PlusCircle, 
  Clock, 
  Trophy,
  Plus,
  Minus,
  Play,
  Square,
  Calendar,
  Save,
  Shield,
  Lock,
  Layers,
  Filter,
  Users
} from 'lucide-react';
import { Competition, Team, Game, GameStatus, Phase } from './types';
import { supabase } from './supabase';

interface GameManagerProps {
  competitions: Competition[];
  teams: Team[];
  games: Game[];
  phases: Phase[];
  onRefresh: () => Promise<void>;
}

export default function GameManager({ competitions, teams, games, phases, onRefresh }: GameManagerProps) {
  const [syncing, setSyncing] = useState(false);
  const [filterCompId, setFilterCompId] = useState<string>(competitions[0]?.id?.toString() || '');
  const [newGame, setNewGame] = useState({
    compId: '',
    phaseId: '',
    homeId: '',
    awayId: '',
    date: '',
    time: ''
  });

  // Função para detectar grupos em uma fase específica
  const getDetectedGroups = (phaseId: string, phaseGames: Game[]) => {
    if (phaseGames.length === 0) return [];
    const sets: Set<string>[] = [];
    
    phaseGames.forEach(g => {
      const h = g.home_team_id.toString();
      const a = g.away_team_id.toString();
      let foundSetIdx = -1;
      sets.forEach((set, idx) => { if (set.has(h) || set.has(a)) foundSetIdx = idx; });
      if (foundSetIdx !== -1) { sets[foundSetIdx].add(h); sets[foundSetIdx].add(a); }
      else { sets.push(new Set([h, a])); }
    });

    const finalSets: Set<string>[] = [];
    sets.forEach(currentSet => {
      let merged = false;
      for (const finalSet of finalSets) {
        const intersection = new Set([...currentSet].filter(x => finalSet.has(x)));
        if (intersection.size > 0) { currentSet.forEach(item => finalSet.add(item)); merged = true; break; }
      }
      if (!merged) finalSets.push(currentSet);
    });

    return finalSets.map((set, i) => ({
      name: `GRUPO ${String.fromCharCode(65 + i)}`,
      teamIds: Array.from(set)
    }));
  };

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGame.compId || !newGame.homeId || !newGame.awayId) return alert("Preencha os campos obrigatórios.");
    setSyncing(true);
    try {
      const { error } = await supabase.from('games').insert({
        competition_id: newGame.compId,
        phase_id: newGame.phaseId || null,
        home_team_id: newGame.homeId,
        away_team_id: newGame.awayId,
        home_score: 0,
        away_score: 0,
        status: GameStatus.AGENDADO,
        game_date: newGame.date || new Date().toISOString().split('T')[0],
        game_time: newGame.time || '00:00'
      });
      if (error) throw error;
      setNewGame({ ...newGame, homeId: '', awayId: '', date: '', time: '' });
      await onRefresh();
    } catch (err: any) { alert(err.message); }
    finally { setSyncing(false); }
  };

  const handleUpdateGame = async (gameId: string, updates: Partial<Game>) => {
    setSyncing(true);
    try {
      const { error } = await supabase.from('games').update(updates).eq('id', gameId);
      if (error) throw error;
      await onRefresh();
    } catch (err: any) { alert(err.message); }
    finally { setSyncing(false); }
  };

  const handleScoreChange = (game: Game, side: 'home' | 'away', delta: number) => {
    if (game.status !== GameStatus.AO_VIVO) {
      alert("O placar só pode ser alterado enquanto a partida estiver AO VIVO.");
      return;
    }
    const currentScore = side === 'home' ? game.home_score : game.away_score;
    const newScore = Math.max(0, currentScore + delta);
    handleUpdateGame(game.id, side === 'home' ? { home_score: newScore } : { away_score: newScore });
  };

  const handleDeleteGame = async (id: string) => {
    if (!confirm("Excluir partida?")) return;
    setSyncing(true);
    try {
      await supabase.from('games').delete().eq('id', id);
      await onRefresh();
    } catch (err: any) { alert(err.message); }
    finally { setSyncing(false); }
  };

  // Agrupamento hierárquico dos jogos com ordenação por status
  const structuredGames = useMemo(() => {
    const compGames = games.filter(g => g.competition_id.toString() === filterCompId);
    const compPhases = phases.filter(p => p.competitions_id.toString() === filterCompId);
    
    // Função auxiliar de ordenação: AO VIVO > AGENDADO > ENCERRADO
    const statusPriorityMap = {
      [GameStatus.AO_VIVO]: 1,
      [GameStatus.AGENDADO]: 2,
      [GameStatus.ENCERRADO]: 3
    };

    const sortGames = (list: Game[]) => {
      return [...list].sort((a, b) => {
        const pA = statusPriorityMap[a.status] || 99;
        const pB = statusPriorityMap[b.status] || 99;
        if (pA !== pB) return pA - pB;
        // Se status for igual, ordena por data e hora
        const dateA = new Date(`${a.game_date}T${a.game_time || '00:00'}`).getTime();
        const dateB = new Date(`${b.game_date}T${b.game_time || '00:00'}`).getTime();
        return dateA - dateB;
      });
    };

    // Jogos sem fase vinculada (Ghost Games)
    const ghostGames = sortGames(compGames.filter(g => !g.phase_id));

    return [
      ...compPhases.map(phase => {
        const phaseGames = compGames.filter(g => g.phase_id?.toString() === phase.id.toString());
        if (phase.type === 'Fase de Grupos') {
          const detectedGroups = getDetectedGroups(phase.id.toString(), phaseGames);
          return {
            ...phase,
            groups: detectedGroups.map(group => ({
              ...group,
              games: sortGames(phaseGames.filter(g => 
                group.teamIds.includes(g.home_team_id.toString()) && 
                group.teamIds.includes(g.away_team_id.toString())
              ))
            }))
          };
        }
        return { ...phase, games: sortGames(phaseGames), groups: [] };
      }),
      ...(ghostGames.length > 0 ? [{ id: 'none', name: 'SEM FASE DEFINIDA', type: 'Geral', games: ghostGames, groups: [] }] : [])
    ];
  }, [games, phases, filterCompId]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Formulário de Agendamento */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
        <div className="flex items-center gap-3 mb-6">
           <div className="bg-blue-50 p-2 rounded-xl text-[#003b95]"><PlusCircle size={20}/></div>
           <h3 className="font-black text-slate-800 uppercase italic text-lg">Agendar Partida</h3>
        </div>
        <form onSubmit={handleCreateGame} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Torneio</label>
            <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-[#003b95] outline-none text-[10px]" value={newGame.compId} onChange={e => setNewGame({...newGame, compId: e.target.value, phaseId: ''})}>
              <option value="">Selecionar...</option>
              {competitions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Fase</label>
            <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-[#003b95] outline-none text-[10px]" value={newGame.phaseId} onChange={e => setNewGame({...newGame, phaseId: e.target.value})}>
              <option value="">Geral / S.F.</option>
              {phases.filter(p => p.competitions_id.toString() === newGame.compId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Times</label>
            <div className="flex gap-2">
              <select className="flex-1 p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-[#003b95] outline-none text-[10px]" value={newGame.homeId} onChange={e => setNewGame({...newGame, homeId: e.target.value})}>
                <option value="">Casa</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select className="flex-1 p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-[#003b95] outline-none text-[10px]" value={newGame.awayId} onChange={e => setNewGame({...newGame, awayId: e.target.value})}>
                <option value="">Vis.</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Data/Hora</label>
            <div className="flex gap-2">
              <input type="date" className="flex-1 p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-[#003b95] outline-none text-[10px]" value={newGame.date} onChange={e => setNewGame({...newGame, date: e.target.value})} />
              <input type="time" className="w-20 p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-[#003b95] outline-none text-[10px]" value={newGame.time} onChange={e => setNewGame({...newGame, time: e.target.value})} />
            </div>
          </div>
          <div className="pt-5 lg:col-span-1">
            <button type="submit" className="w-full h-14 bg-[#003b95] text-white rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-blue-900/10 hover:bg-[#002b6d]">Agendar</button>
          </div>
        </form>
      </div>

      {/* Filtro de Visualização */}
      <div className="flex items-center justify-between bg-white px-8 py-5 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
          <Filter size={18} className="text-[#003b95]" />
          <span className="font-black uppercase italic text-sm text-slate-800">Visualizar Partidas por Fase</span>
        </div>
        <select 
          className="bg-slate-50 p-3 rounded-xl font-black uppercase text-[10px] text-[#003b95] outline-none border-2 border-transparent focus:border-[#003b95]"
          value={filterCompId}
          onChange={e => setFilterCompId(e.target.value)}
        >
          {competitions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Lista Estruturada de Jogos */}
      <div className="space-y-12 pb-24">
        {structuredGames.map((phase: any) => (
          <div key={phase.id} className="space-y-6">
            <div className="bg-[#003b95] text-white px-8 py-4 rounded-[2rem] flex items-center justify-between shadow-xl border-b-4 border-[#d90429]">
              <div className="flex items-center gap-4">
                <Layers size={20} className="text-blue-300" />
                <h4 className="font-black uppercase italic tracking-widest">{phase.name}</h4>
              </div>
              <span className="text-[10px] font-bold bg-white/10 px-4 py-1 rounded-full uppercase">{phase.type}</span>
            </div>

            {/* Se for Fase de Grupos, exibe os Grupos */}
            {phase.groups && phase.groups.length > 0 ? (
              <div className="grid grid-cols-1 gap-10">
                {phase.groups.map((group: any) => (
                  <div key={group.name} className="space-y-4">
                    <div className="flex items-center gap-3 ml-4">
                      <Users size={16} className="text-[#003b95]" />
                      <h5 className="font-black text-[#003b95] uppercase italic tracking-wider">{group.name}</h5>
                      <div className="h-[2px] bg-slate-200 flex-1 rounded-full"></div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {group.games.map((g: Game) => renderGameCard(g))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Se não tiver grupos (Mata-Mata ou Sem Fase), exibe os jogos direto
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {(phase.games || []).map((g: Game) => renderGameCard(g))}
              </div>
            )}
            
            {(phase.games?.length === 0 && (!phase.groups || phase.groups.length === 0)) && (
               <div className="text-center py-12 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                 <p className="text-[10px] font-black uppercase text-slate-300">Nenhuma partida registrada nesta fase</p>
               </div>
            )}
          </div>
        ))}
      </div>

      {syncing && (
        <div className="fixed bottom-10 right-10 bg-slate-900 text-white px-8 py-4 rounded-full flex items-center gap-3 z-[500] shadow-2xl">
          <Loader2 className="animate-spin text-blue-400" size={18}/>
          <span className="text-[10px] font-black uppercase">Sincronizando...</span>
        </div>
      )}
    </div>
  );

  function renderGameCard(g: Game) {
    const homeTeam = teams.find(t => t.id.toString() === g.home_team_id.toString());
    const awayTeam = teams.find(t => t.id.toString() === g.away_team_id.toString());
    const isLive = g.status === GameStatus.AO_VIVO;
    const isFinished = g.status === GameStatus.ENCERRADO;
    const homeWinner = isFinished && g.home_score > g.away_score;
    const awayWinner = isFinished && g.away_score > g.home_score;

    // Configurações de estilo para placares Live
    const scoreBaseClasses = "w-10 h-10 text-center font-black text-xl rounded-lg outline-none transition-all duration-300";
    const liveScoreClasses = `${scoreBaseClasses} bg-red-50 border-2 border-red-500 text-red-600 shadow-lg shadow-red-100 animate-pulse ring-4 ring-red-500/10`;
    const staticScoreClasses = `${scoreBaseClasses} bg-slate-100 text-slate-400 border border-slate-200`;
    const endedScoreClasses = `${scoreBaseClasses} bg-white border-2 border-slate-800 text-slate-800 shadow-sm`;

    return (
      <div key={g.id} className="bg-white p-6 rounded-[2.5rem] shadow-lg border border-slate-50 hover:shadow-2xl transition-all relative group flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-slate-300'}`}></span>
            <span className={`text-[10px] font-black uppercase ${isLive ? 'text-red-500' : 'text-slate-400'}`}>{g.status}</span>
          </div>
          <div className="flex items-center gap-2">
            {g.status === GameStatus.AGENDADO && (
              <button onClick={() => handleUpdateGame(g.id, { status: GameStatus.AO_VIVO })} className="bg-green-500 text-white px-3 py-1 rounded-lg text-[8px] font-black uppercase flex items-center gap-1 hover:bg-green-600">
                <Play size={10} fill="currentColor" /> Iniciar
              </button>
            )}
            {g.status === GameStatus.AO_VIVO && (
              <button onClick={() => handleUpdateGame(g.id, { status: GameStatus.ENCERRADO })} className="bg-[#d90429] text-white px-3 py-1 rounded-lg text-[8px] font-black uppercase flex items-center gap-1 hover:bg-red-700">
                <Square size={10} fill="currentColor" /> Finalizar
              </button>
            )}
            <button onClick={() => handleDeleteGame(g.id)} className="p-1.5 text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
          </div>
        </div>

        <div className="space-y-3">
          {/* Time Casa */}
          <div className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
            homeWinner ? 'bg-green-500/20 border-green-200' :
            isLive ? 'bg-red-50/20 border-red-100 ring-2 ring-red-500/5' : 
            'bg-slate-50 border-slate-100 opacity-90'
          }`}>
            <span className={`text-xs font-black uppercase truncate flex-1 ${isLive ? 'text-red-900' : 'text-slate-700'}`}>{homeTeam?.name || '---'}</span>
            <div className="flex items-center gap-2">
              <button disabled={!isLive} onClick={() => handleScoreChange(g, 'home', -1)} className={`p-1 rounded-md ${isLive ? 'bg-white text-slate-400 hover:text-red-500 shadow-sm' : 'text-slate-200 cursor-not-allowed'}`}><Minus size={12}/></button>
              <div className="relative">
                <input 
                  type="number" 
                  readOnly={!isLive} 
                  className={isLive ? liveScoreClasses : (g.status === GameStatus.ENCERRADO ? endedScoreClasses : staticScoreClasses)} 
                  value={g.home_score} 
                />
                {!isLive && g.status !== GameStatus.ENCERRADO && <Lock size={8} className="absolute -top-1 -right-1 text-slate-400" />}
              </div>
              <button disabled={!isLive} onClick={() => handleScoreChange(g, 'home', 1)} className={`p-1 rounded-md ${isLive ? 'bg-white text-slate-400 hover:text-green-500 shadow-sm' : 'text-slate-200 cursor-not-allowed'}`}><Plus size={12}/></button>
            </div>
          </div>
          {/* Time Visitante */}
          <div className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
            awayWinner ? 'bg-green-500/20 border-green-200' :
            isLive ? 'bg-red-50/20 border-red-100 ring-2 ring-red-500/5' : 
            'bg-slate-50 border-slate-100 opacity-90'
          }`}>
            <span className={`text-xs font-black uppercase truncate flex-1 ${isLive ? 'text-red-900' : 'text-slate-700'}`}>{awayTeam?.name || '---'}</span>
            <div className="flex items-center gap-2">
              <button disabled={!isLive} onClick={() => handleScoreChange(g, 'away', -1)} className={`p-1 rounded-md ${isLive ? 'bg-white text-slate-400 hover:text-red-500 shadow-sm' : 'text-slate-200 cursor-not-allowed'}`}><Minus size={12}/></button>
              <div className="relative">
                <input 
                  type="number" 
                  readOnly={!isLive} 
                  className={isLive ? liveScoreClasses : (g.status === GameStatus.ENCERRADO ? endedScoreClasses : staticScoreClasses)} 
                  value={g.away_score} 
                />
                {!isLive && g.status !== GameStatus.ENCERRADO && <Lock size={8} className="absolute -top-1 -right-1 text-slate-400" />}
              </div>
              <button disabled={!isLive} onClick={() => handleScoreChange(g, 'away', 1)} className={`p-1 rounded-md ${isLive ? 'bg-white text-slate-400 hover:text-green-500 shadow-sm' : 'text-slate-200 cursor-not-allowed'}`}><Plus size={12}/></button>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-slate-50">
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase">
                <Calendar size={12} className="text-[#003b95]" /> {g.game_date ? new Date(g.game_date).toLocaleDateString('pt-BR') : '--/--'}
             </div>
             <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase">
                <Clock size={12} className="text-[#d90429]" /> {g.game_time || '--:--'}
             </div>
          </div>
          {isLive && <span className="text-[8px] font-black text-red-500 uppercase italic animate-pulse">Live Tracking</span>}
        </div>
      </div>
    );
  }
}
