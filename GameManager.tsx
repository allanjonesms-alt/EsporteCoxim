
import React, { useState } from 'react';
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
  // Added Shield icon to fix the "Cannot find name 'Shield'" error
  Shield
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
  const [newGame, setNewGame] = useState({
    compId: '',
    homeId: '',
    awayId: '',
    date: '',
    time: ''
  });

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGame.compId || !newGame.homeId || !newGame.awayId) return alert("Selecione o campeonato e os dois times.");
    setSyncing(true);
    try {
      const { error } = await supabase.from('games').insert({
        competition_id: newGame.compId,
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
    const currentScore = side === 'home' ? game.home_score : game.away_score;
    const newScore = Math.max(0, currentScore + delta);
    handleUpdateGame(game.id, side === 'home' ? { home_score: newScore } : { away_score: newScore });
  };

  const handleDeleteGame = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta partida permanentemente?")) return;
    setSyncing(true);
    try {
      const { error } = await supabase.from('games').delete().eq('id', id);
      if (error) throw error;
      await onRefresh();
    } catch (err: any) { alert(err.message); }
    finally { setSyncing(false); }
  };

  const sortedGames = [...games].sort((a, b) => {
    const priority = {
      [GameStatus.AO_VIVO]: 1,
      [GameStatus.AGENDADO]: 2,
      [GameStatus.ENCERRADO]: 3
    };
    const pA = priority[a.status] || 99;
    const pB = priority[b.status] || 99;
    if (pA !== pB) return pA - pB;
    return new Date(a.game_date || 0).getTime() - new Date(b.game_date || 0).getTime();
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
        <div className="flex items-center gap-3 mb-6">
           <div className="bg-blue-50 p-2 rounded-xl text-[#003b95]"><Clock size={20}/></div>
           <h3 className="font-black text-slate-800 uppercase italic text-lg">Agendar Nova Partida</h3>
        </div>
        <form onSubmit={handleCreateGame} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Torneio</label>
            <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-[#003b95] outline-none text-xs" value={newGame.compId} onChange={e => setNewGame({...newGame, compId: e.target.value})}>
              <option value="">Selecionar...</option>
              {competitions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Time Casa</label>
            <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-[#003b95] outline-none text-xs" value={newGame.homeId} onChange={e => setNewGame({...newGame, homeId: e.target.value})}>
              <option value="">Selecionar...</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Time Visitante</label>
            <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-[#003b95] outline-none text-xs" value={newGame.awayId} onChange={e => setNewGame({...newGame, awayId: e.target.value})}>
              <option value="">Selecionar...</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Data e Hora</label>
            <div className="flex gap-2">
              <input type="date" className="flex-1 p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-[#003b95] outline-none text-xs" value={newGame.date} onChange={e => setNewGame({...newGame, date: e.target.value})} />
              <input type="time" className="w-24 p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-[#003b95] outline-none text-xs" value={newGame.time} onChange={e => setNewGame({...newGame, time: e.target.value})} />
            </div>
          </div>
          <div className="pt-5">
            <button type="submit" className="w-full h-14 bg-[#003b95] text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 hover:bg-[#002b6d] transition-all shadow-lg shadow-blue-900/10">
              <PlusCircle size={16}/> Agendar
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sortedGames.map(g => {
          const homeTeam = teams.find(t => t.id.toString() === g.home_team_id.toString());
          const awayTeam = teams.find(t => t.id.toString() === g.away_team_id.toString());
          const comp = competitions.find(c => c.id.toString() === g.competition_id.toString());
          const phase = phases.find(p => p.id.toString() === g.phase_id?.toString());
          
          return (
            <div key={g.id} className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-50 hover:shadow-2xl transition-all relative group flex flex-col gap-5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-slate-400">
                  <Trophy size={14} className="text-[#003b95]" />
                  <span className="text-[10px] font-black uppercase italic tracking-wider truncate max-w-[250px]">
                    {comp?.name || 'Torneio'} {phase ? `• ${phase.name}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {g.status === GameStatus.AGENDADO && (
                    <button 
                      onClick={() => handleUpdateGame(g.id, { status: GameStatus.AO_VIVO })}
                      className="bg-green-500 text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1.5 hover:bg-green-600 transition-colors shadow-lg shadow-green-200"
                    >
                      <Play size={10} fill="currentColor" /> Iniciar
                    </button>
                  )}
                  {g.status === GameStatus.AO_VIVO && (
                    <button 
                      onClick={() => handleUpdateGame(g.id, { status: GameStatus.ENCERRADO })}
                      className="bg-[#d90429] text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1.5 hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                    >
                      <Square size={10} fill="currentColor" /> Encerrar
                    </button>
                  )}
                  <select 
                    value={g.status} 
                    onChange={e => handleUpdateGame(g.id, { status: e.target.value as GameStatus })} 
                    className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-xl outline-none transition-colors border-none bg-slate-50 text-slate-500 cursor-pointer ${
                      g.status === GameStatus.AO_VIVO ? 'bg-red-50 text-red-500 ring-1 ring-red-100' : 
                      g.status === GameStatus.ENCERRADO ? 'bg-slate-100 text-slate-800' : ''
                    }`}
                  >
                    {Object.values(GameStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button 
                    onClick={() => handleDeleteGame(g.id)} 
                    className="p-2 text-slate-200 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16}/>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* Time Casa */}
                <div className="flex items-center justify-between gap-4 bg-slate-50/50 p-3 rounded-[1.5rem] border border-slate-100">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-100 shadow-sm">
                      <Shield className="text-slate-200 w-5 h-5" />
                    </div>
                    <select 
                      className="bg-transparent font-black text-xs uppercase text-slate-800 outline-none w-full"
                      value={g.home_team_id}
                      onChange={e => handleUpdateGame(g.id, { home_team_id: e.target.value })}
                    >
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleScoreChange(g, 'home', -1)} className="p-1.5 bg-white rounded-lg text-slate-400 hover:text-red-500 border border-slate-100 transition-colors shadow-sm"><Minus size={14}/></button>
                    <input 
                      type="number" 
                      className="w-12 h-12 text-center font-black text-2xl bg-white rounded-xl outline-none border border-slate-100 shadow-inner" 
                      value={g.home_score} 
                      onChange={e => handleUpdateGame(g.id, { home_score: parseInt(e.target.value) || 0 })} 
                    />
                    <button onClick={() => handleScoreChange(g, 'home', 1)} className="p-1.5 bg-white rounded-lg text-slate-400 hover:text-green-500 border border-slate-100 transition-colors shadow-sm"><Plus size={14}/></button>
                  </div>
                </div>

                {/* Time Visitante */}
                <div className="flex items-center justify-between gap-4 bg-slate-50/50 p-3 rounded-[1.5rem] border border-slate-100">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-100 shadow-sm">
                      <Shield className="text-slate-200 w-5 h-5" />
                    </div>
                    <select 
                      className="bg-transparent font-black text-xs uppercase text-slate-800 outline-none w-full"
                      value={g.away_team_id}
                      onChange={e => handleUpdateGame(g.id, { away_team_id: e.target.value })}
                    >
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleScoreChange(g, 'away', -1)} className="p-1.5 bg-white rounded-lg text-slate-400 hover:text-red-500 border border-slate-100 transition-colors shadow-sm"><Minus size={14}/></button>
                    <input 
                      type="number" 
                      className="w-12 h-12 text-center font-black text-2xl bg-white rounded-xl outline-none border border-slate-100 shadow-inner" 
                      value={g.away_score} 
                      onChange={e => handleUpdateGame(g.id, { away_score: parseInt(e.target.value) || 0 })} 
                    />
                    <button onClick={() => handleScoreChange(g, 'away', 1)} className="p-1.5 bg-white rounded-lg text-slate-400 hover:text-green-500 border border-slate-100 transition-colors shadow-sm"><Plus size={14}/></button>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-50 flex justify-between items-center gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                    <Calendar size={12} className="text-slate-300" />
                    <input 
                      type="date" 
                      className="bg-transparent text-[9px] font-black uppercase text-slate-500 outline-none" 
                      value={g.game_date?.split('T')[0] || ''}
                      onChange={e => handleUpdateGame(g.id, { game_date: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                    <Clock size={12} className="text-slate-300" />
                    <input 
                      type="time" 
                      className="bg-transparent text-[9px] font-black uppercase text-slate-500 outline-none w-16" 
                      value={g.game_time || '00:00'}
                      onChange={e => handleUpdateGame(g.id, { game_time: e.target.value })}
                    />
                  </div>
                </div>
                {g.status === GameStatus.AO_VIVO && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                    <span className="text-[8px] font-black text-red-500 uppercase italic">Ao Vivo</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {syncing && (
        <div className="fixed bottom-10 right-10 bg-slate-900 text-white px-8 py-4 rounded-full flex items-center gap-3 z-[500] shadow-2xl animate-in slide-in-from-bottom-5">
          <Loader2 className="animate-spin text-blue-400" size={18}/>
          <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando...</span>
        </div>
      )}
    </div>
  );
}
