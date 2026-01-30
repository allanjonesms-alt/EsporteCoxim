
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
  Users,
  Pencil,
  Check,
  X,
  CircleDot,
  Zap
} from 'lucide-react';
import { Competition, Team, Game, GameStatus, Phase } from './types';
import { supabase } from './supabase';
import LiveMatchModal from './LiveMatchModal';

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
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [liveGameId, setLiveGameId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Game>>({});
  
  const [newGame, setNewGame] = useState({
    compId: '',
    phaseId: '',
    homeId: '',
    awayId: '',
    date: '',
    time: ''
  });

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGame.compId || !newGame.homeId || !newGame.awayId) return alert("Preencha os campos.");
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
      setEditingGameId(null);
      if (updates.status === GameStatus.AO_VIVO) {
        setLiveGameId(gameId);
      }
    } catch (err: any) { alert(err.message); }
    finally { setSyncing(false); }
  };

  // Fix: Adding missing handleToggleSet function to toggle set activation in Volleyball games
  const handleToggleSet = async (g: Game, action: 'start') => {
    setSyncing(true);
    try {
      const { error } = await supabase.from('games').update({ 
        is_set_active: action === 'start',
        status: GameStatus.AO_VIVO 
      }).eq('id', g.id);
      if (error) throw error;
      if (action === 'start') setLiveGameId(g.id);
      await onRefresh();
    } catch (err: any) { alert(err.message); }
    finally { setSyncing(false); }
  };

  const startEditing = (g: Game) => {
    setEditingGameId(g.id);
    // Limpa a data caso venha como ISO completa
    const cleanDate = g.game_date?.split('T')[0] || '';
    setEditValues({ 
      game_date: cleanDate, 
      game_time: g.game_time?.substring(0, 5) || '', 
      status: g.status, 
      target_sets: g.target_sets || 3 
    });
  };

  const structuredGames = useMemo(() => {
    const compGames = games.filter(g => g.competition_id.toString() === filterCompId);
    const compPhases = phases.filter(p => p.competitions_id.toString() === filterCompId);
    
    const sortGamesByStatusAndTime = (list: Game[]) => {
      const priority = { [GameStatus.AO_VIVO]: 1, [GameStatus.AGENDADO]: 2, [GameStatus.ENCERRADO]: 3 };
      return [...list].sort((a, b) => {
        const pA = priority[a.status] || 99;
        const pB = priority[b.status] || 99;
        if (pA !== pB) return pA - pB;
        const timeA = `${a.game_date || '9999-12-31'}T${a.game_time || '00:00'}`;
        const timeB = `${b.game_date || '9999-12-31'}T${b.game_time || '00:00'}`;
        return timeA.localeCompare(timeB);
      });
    };

    return [
      ...compPhases.map(phase => ({ 
        ...phase, 
        games: sortGamesByStatusAndTime(compGames.filter(g => g.phase_id?.toString() === phase.id.toString())) 
      })), 
      ...(sortGamesByStatusAndTime(compGames.filter(g => !g.phase_id)).length 
        ? [{ id: 'none', name: 'GERAL', games: sortGamesByStatusAndTime(compGames.filter(g => !g.phase_id)) }] 
        : [])
    ];
  }, [games, phases, filterCompId]);

  const activeLiveGame = games.find(g => g.id.toString() === liveGameId?.toString());
  const activeLiveComp = activeLiveGame ? competitions.find(c => c.id.toString() === activeLiveGame.competition_id.toString()) : null;

  function renderGameCard(g: Game) {
    const isEditing = editingGameId === g.id;
    const comp = competitions.find(c => c.id.toString() === g.competition_id.toString());
    const isVolei = comp?.modality === 'Volei';
    const homeTeam = teams.find(t => t.id.toString() === g.home_team_id.toString());
    const awayTeam = teams.find(t => t.id.toString() === g.away_team_id.toString());
    const isLive = g.status === GameStatus.AO_VIVO;
    const isFinished = g.status === GameStatus.ENCERRADO;

    const displayDate = (g.game_date?.split('T')[0] || '').split('-').reverse().slice(0, 2).join('/');
    const displayTime = g.game_time?.substring(0, 5) || '--:--';

    return (
      <div key={g.id} className={`bg-white p-6 rounded-[2.5rem] shadow-lg border transition-all flex flex-col gap-4 ${isEditing ? 'border-[#003b95] ring-4 ring-[#003b95]/5' : 'border-slate-50'}`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <span className={`text-[10px] font-black uppercase ${isLive ? 'text-red-500' : 'text-slate-400'}`}>{g.status}</span>
            ) : (
              <div className="flex items-center gap-2">
                <select className="bg-blue-50 p-1 rounded-lg text-[10px] font-black uppercase outline-none border border-[#003b95]/20" value={editValues.status} onChange={e => setEditValues({...editValues, status: e.target.value as GameStatus})}>
                  {Object.values(GameStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {isVolei && (
                  <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
                    {[1, 3].map(v => <button key={v} onClick={() => setEditValues({...editValues, target_sets: v})} className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${editValues.target_sets === v ? 'bg-[#003b95] text-white' : 'text-slate-400'}`}>{v} SETS</button>)}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <>
                {!isVolei && g.status === GameStatus.AGENDADO && (
                  <button onClick={() => handleUpdateGame(g.id, { status: GameStatus.AO_VIVO })} className="bg-green-500 text-white px-3 py-1 rounded-lg text-[8px] font-black uppercase flex items-center gap-1">
                    <Play size={10} fill="currentColor" /> Iniciar
                  </button>
                )}
                {isLive && (
                  <button onClick={() => setLiveGameId(g.id)} className="bg-red-500 text-white px-3 py-1 rounded-lg text-[8px] font-black uppercase flex items-center gap-1 shadow-sm">
                    <Zap size={10} fill="currentColor" /> Placar Live
                  </button>
                )}
                <button onClick={() => startEditing(g)} className="p-1.5 text-slate-200 hover:text-[#003b95]"><Pencil size={14}/></button>
                <button onClick={() => { if(confirm("Excluir?")) supabase.from('games').delete().eq('id', g.id).then(() => onRefresh()) }} className="p-1.5 text-slate-200 hover:text-red-500"><Trash2 size={14}/></button>
              </>
            ) : (
              <>
                <button onClick={() => handleUpdateGame(g.id, editValues)} className="bg-green-500 text-white p-2 rounded-lg"><Check size={14}/></button>
                <button onClick={() => setEditingGameId(null)} className="bg-slate-100 text-slate-400 p-2 rounded-lg"><X size={14}/></button>
              </>
            )}
          </div>
        </div>

        {isVolei && !isEditing && !isFinished && (
          <div className="bg-slate-50 p-2 rounded-2xl flex justify-center">
             {!g.is_set_active ? (
               <button onClick={() => handleToggleSet(g, 'start')} className="w-full bg-green-500 text-white py-2 rounded-xl text-[10px] font-black uppercase italic flex items-center justify-center gap-2 shadow-sm hover:bg-green-600 transition-colors"><Play size={14} fill="currentColor" /> Iniciar Set</button>
             ) : (
               <button onClick={() => setLiveGameId(g.id)} className="w-full bg-red-500 text-white py-2 rounded-xl text-[10px] font-black uppercase italic flex items-center justify-center gap-2 animate-pulse"><Zap size={14} fill="currentColor" /> Gerenciar Set Live</button>
             )}
          </div>
        )}

        <div className="space-y-2">
          {[
            { team: homeTeam, side: 'home' as const, points: isVolei ? g.current_set_points_home : g.home_score, sets: g.home_score },
            { team: awayTeam, side: 'away' as const, points: isVolei ? g.current_set_points_away : g.away_score, sets: g.away_score }
          ].map((item) => (
            <div key={item.side} className="flex items-center justify-between p-3 rounded-2xl border bg-white border-slate-200">
              <span className="text-[10px] font-black uppercase truncate flex-1 text-slate-700">{item.team?.name || '---'}</span>
              <div className="flex items-center gap-1">
                {isVolei && (
                  <div className="w-6 h-10 flex items-center justify-center text-slate-900 text-base font-black italic">
                    {item.sets}
                  </div>
                )}
                <div className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-lg font-black text-xl text-slate-800 border border-slate-200">
                  {item.points || 0}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-slate-50">
          {!isEditing ? (
            <div className="flex items-center gap-3 text-[9px] font-bold text-slate-400 uppercase">
               <Calendar size={12} className="text-[#003b95]" /> {displayDate}
               <Clock size={12} className="text-[#d90429]" /> {displayTime}
            </div>
          ) : (
            <div className="flex items-center gap-2 w-full">
              <div className="flex-1 flex items-center gap-1 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                <Calendar size={10} className="text-[#003b95]" />
                <input 
                  type="date" 
                  className="bg-transparent text-[9px] font-black w-full outline-none"
                  value={editValues.game_date || ''}
                  onChange={e => setEditValues({...editValues, game_date: e.target.value})}
                />
              </div>
              <div className="flex-1 flex items-center gap-1 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                <Clock size={10} className="text-[#d90429]" />
                <input 
                  type="time" 
                  className="bg-transparent text-[9px] font-black w-full outline-none"
                  value={editValues.game_time || ''}
                  onChange={e => setEditValues({...editValues, game_time: e.target.value})}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
        <h3 className="font-black text-slate-800 uppercase italic text-lg mb-6">Agendar Partida</h3>
        <form onSubmit={handleCreateGame} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-[10px]" value={newGame.compId} onChange={e => setNewGame({...newGame, compId: e.target.value})}>
            <option value="">Competição...</option>
            {competitions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-[10px]" value={newGame.phaseId} onChange={e => setNewGame({...newGame, phaseId: e.target.value})}>
            <option value="">Fase...</option>
            {phases.filter(p => p.competitions_id.toString() === newGame.compId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className="p-4 bg-slate-50 rounded-2xl font-bold text-[10px]" value={newGame.homeId} onChange={e => setNewGame({...newGame, homeId: e.target.value})}><option value="">Casa</option>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <select className="p-4 bg-slate-50 rounded-2xl font-bold text-[10px]" value={newGame.awayId} onChange={e => setNewGame({...newGame, awayId: e.target.value})}><option value="">Visitante</option>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <input type="date" className="p-4 bg-slate-50 rounded-2xl font-bold text-[10px]" value={newGame.date} onChange={e => setNewGame({...newGame, date: e.target.value})} />
          <button type="submit" className="bg-[#003b95] text-white rounded-2xl font-black uppercase text-[10px]">Agendar</button>
        </form>
      </div>

      <div className="flex items-center justify-between bg-white px-8 py-5 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="flex items-center gap-3"><Filter size={18}/><span className="font-black uppercase italic text-sm">Visualizar Torneio</span></div>
        <select className="bg-slate-50 p-3 rounded-xl font-black uppercase text-[10px]" value={filterCompId} onChange={e => setFilterCompId(e.target.value)}>
          {competitions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="space-y-12 pb-24">
        {structuredGames.map((phase: any) => (
          <div key={phase.id} className="space-y-6">
            <h4 className="font-black uppercase italic text-[#003b95] ml-4">{phase.name}</h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {(phase.games || []).map((g: Game) => renderGameCard(g))}
            </div>
          </div>
        ))}
      </div>

      {activeLiveGame && activeLiveComp && (
        <LiveMatchModal 
          game={activeLiveGame}
          teams={teams}
          competition={activeLiveComp}
          onClose={() => setLiveGameId(null)}
          onRefresh={onRefresh}
        />
      )}

      {syncing && <div className="fixed bottom-10 right-10 bg-slate-900 text-white px-8 py-4 rounded-full flex items-center gap-3 z-[500]"><Loader2 className="animate-spin" size={18}/>Sincronizando...</div>}
    </div>
  );
}
