
import React, { useState } from 'react';
import { 
  Trash2, 
  Loader2, 
  Gamepad2, 
  PlusCircle, 
  Clock, 
  Swords 
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { Competition, Team, Game, GameStatus } from './types';

const SUPABASE_URL = 'https://pkwprsdejfyfokgscwdl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrd3Byc2RlamZ5Zm9rZ3Njd2RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzI5ODksImV4cCI6MjA4NDE0ODk4OX0.Ak4ytUV3HmULv5q-ZMOr5UYFrePQgo6uJU1910xLRfc';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface GameManagerProps {
  competitions: Competition[];
  teams: Team[];
  games: Game[];
  onRefresh: () => Promise<void>;
}

export default function GameManager({ competitions, teams, games, onRefresh }: GameManagerProps) {
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
      {/* Formulário de Agendamento */}
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

      {/* Lista de Partidas para Edição */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {games.map(g => {
          const homeTeam = teams.find(t => t.id.toString() === g.home_team_id.toString());
          const awayTeam = teams.find(t => t.id.toString() === g.away_team_id.toString());
          
          return (
            <div key={g.id} className="bg-white p-6 rounded-[2.5rem] shadow-lg border border-slate-50 flex items-center justify-between hover:shadow-2xl transition-all group">
              <div className="flex-1 flex flex-col items-center gap-2 px-2">
                <p className="text-[9px] font-black uppercase text-slate-400 text-center truncate w-full">{homeTeam?.name || '???'}</p>
                <input 
                  type="number" 
                  className="w-14 h-12 text-center font-black text-2xl bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-200" 
                  value={g.home_score} 
                  onChange={e => handleUpdateGame(g.id, parseInt(e.target.value) || 0, g.away_score, g.status)} 
                />
              </div>

              <div className="flex flex-col items-center gap-3 px-4 min-w-[120px]">
                <div className="flex items-center gap-1 text-slate-300">
                   <Swords size={14} />
                </div>
                <select 
                  value={g.status} 
                  onChange={e => handleUpdateGame(g.id, g.home_score, g.away_score, e.target.value as GameStatus)} 
                  className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full outline-none transition-colors ${
                    g.status === GameStatus.AO_VIVO ? 'bg-red-500 text-white animate-pulse' : 
                    g.status === GameStatus.ENCERRADO ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {Object.values(GameStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span className="text-[8px] font-bold text-slate-300">{new Date(g.game_date || '').toLocaleDateString('pt-BR')}</span>
              </div>

              <div className="flex-1 flex flex-col items-center gap-2 px-2">
                <p className="text-[9px] font-black uppercase text-slate-400 text-center truncate w-full">{awayTeam?.name || '???'}</p>
                <input 
                  type="number" 
                  className="w-14 h-12 text-center font-black text-2xl bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-200" 
                  value={g.away_score} 
                  onChange={e => handleUpdateGame(g.id, g.home_score, parseInt(e.target.value) || 0, g.status)} 
                />
              </div>

              <button 
                onClick={() => handleDeleteGame(g.id)} 
                className="ml-4 p-2 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              >
                <Trash2 size={16}/>
              </button>
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
