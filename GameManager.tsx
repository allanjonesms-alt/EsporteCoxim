import React, { useState } from 'react';
import { 
  Trash2, 
  Loader2, 
  PlusCircle, 
  Clock, 
  Trophy 
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
    date: ''
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
        game_date: newGame.date || new Date().toISOString()
      });
      if (error) throw error;
      setNewGame({ ...newGame, homeId: '', awayId: '' });
      await onRefresh();
    } catch (err: any) { alert(err.message); }
    finally { setSyncing(false); }
  };

  const handleUpdateGame = async (gameId: string, h: number, a: number, status: GameStatus) => {
    setSyncing(true);
    try {
      const { error } = await supabase.from('games').update({ home_score: h, away_score: a, status }).eq('id', gameId);
      if (error) throw error;
      await onRefresh();
    } catch (err: any) { alert(err.message); }
    finally { setSyncing(false); }
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
        <div className="flex items-center gap-3 mb-6">
           <div className="bg-blue-50 p-2 rounded-xl text-[#003b95]"><Clock size={20}/></div>
           <h3 className="font-black text-slate-800 uppercase italic text-lg">Agendar Nova Partida</h3>
        </div>
        <form onSubmit={handleCreateGame} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Torneio</label>
            <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-[#003b95] outline-none" value={newGame.compId} onChange={e => setNewGame({...newGame, compId: e.target.value})}>
              <option value="">Selecionar...</option>
              {competitions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Time Casa</label>
            <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-[#003b95] outline-none" value={newGame.homeId} onChange={e => setNewGame({...newGame, homeId: e.target.value})}>
              <option value="">Selecionar...</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Time Visitante</label>
            <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-[#003b95] outline-none" value={newGame.awayId} onChange={e => setNewGame({...newGame, awayId: e.target.value})}>
              <option value="">Selecionar...</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="pt-5">
            <button type="submit" className="w-full h-14 bg-[#003b95] text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 hover:bg-[#002b6d] transition-all shadow-lg shadow-blue-900/10">
              <PlusCircle size={16}/> Agendar Jogo
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {games.map(g => {
          const homeTeam = teams.find(t => t.id.toString() === g.home_team_id.toString());
          const awayTeam = teams.find(t => t.id.toString() === g.away_team_id.toString());
          const comp = competitions.find(c => c.id.toString() === g.competition_id.toString());
          const phase = phases.find(p => p.id.toString() === g.phase_id?.toString());
          
          return (
            <div key={g.id} className="bg-white p-4 rounded-[1.5rem] shadow-md border border-slate-50 hover:shadow-lg transition-all relative group flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Trophy size={10} />
                  <span className="text-[9px] font-black uppercase italic tracking-wider truncate max-w-[200px]">
                    {comp?.name || 'Torneio'} {phase ? `• ${phase.name}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <select 
                    value={g.status} 
                    onChange={e => handleUpdateGame(g.id, g.home_score, g.away_score, e.target.value as GameStatus)} 
                    className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md outline-none transition-colors border-none bg-slate-50 text-slate-400 cursor-pointer ${
                      g.status === GameStatus.AO_VIVO ? 'bg-red-50 text-red-500 ring-1 ring-red-100' : 
                      g.status === GameStatus.ENCERRADO ? 'bg-slate-100 text-slate-800' : ''
                    }`}
                  >
                    {Object.values(GameStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button 
                    onClick={() => handleDeleteGame(g.id)} 
                    className="p-1 text-slate-200 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={12}/>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[11px] font-black uppercase text-slate-800 tracking-tight truncate flex-1 text-left">
                    {homeTeam?.name || 'Desconhecido'}
                  </span>
                  <input 
                    type="number" 
                    className="w-10 h-10 text-center font-black text-xl bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-100" 
                    value={g.home_score} 
                    onChange={e => handleUpdateGame(g.id, parseInt(e.target.value) || 0, g.away_score, g.status)} 
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-[11px] font-black uppercase text-slate-800 tracking-tight truncate flex-1 text-left">
                    {awayTeam?.name || 'Desconhecido'}
                  </span>
                  <input 
                    type="number" 
                    className="w-10 h-10 text-center font-black text-xl bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-100" 
                    value={g.away_score} 
                    onChange={e => handleUpdateGame(g.id, g.home_score, parseInt(e.target.value) || 0, g.status)} 
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-50 flex justify-between items-center">
                <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">
                  {new Date(g.game_date || '').toLocaleDateString('pt-BR')}
                </span>
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
