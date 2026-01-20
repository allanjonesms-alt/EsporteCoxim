
import React, { useState } from 'react';
import { 
  Trash2, 
  Loader2,
  Users,
  Trophy,
  Gamepad2
} from 'lucide-react';
import { Competition, Team, Game, Phase } from './types';
import TournamentManager from './TournamentManager';
import GameManager from './GameManager';
import { supabase } from './supabase';

interface AdminPanelProps {
  competitions: Competition[];
  teams: Team[];
  games: Game[];
  phases: Phase[];
  onRefresh: () => Promise<void>;
}

export default function AdminPanel({ competitions, teams, games, phases, onRefresh }: AdminPanelProps) {
  const [adminTab, setAdminTab] = useState<'comps' | 'teams' | 'games'>('comps');
  const [syncing, setSyncing] = useState(false);
  
  const [newTeamName, setNewTeamName] = useState('');

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName) return;
    setSyncing(true);
    try {
      const { error } = await supabase.from('teams').insert({ name: newTeamName });
      if (error) throw error;
      setNewTeamName('');
      await onRefresh();
    } catch (err: any) { alert(err.message); }
    finally { setSyncing(false); }
  };

  const handleDeleteTeam = async (id: string) => {
    if (!confirm("Excluir este clube?")) return;
    setSyncing(true);
    try {
      const { error } = await supabase.from('teams').delete().eq('id', id);
      if (error) throw error;
      await onRefresh();
    } catch (err: any) { alert(err.message); }
    finally { setSyncing(false); }
  };

  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-black text-slate-900 uppercase italic font-sport leading-none">Painel Administrativo</h1>
        <div className="flex p-1.5 bg-slate-200/50 rounded-2xl shadow-inner border border-slate-200">
          <button onClick={() => setAdminTab('comps')} className={`px-6 py-2 rounded-xl font-black text-[10px] uppercase transition-all flex items-center gap-2 ${adminTab === 'comps' ? 'bg-[#003b95] text-white shadow-lg scale-105' : 'text-slate-500 hover:text-slate-700'}`}>
            <Trophy size={14}/> Torneios
          </button>
          <button onClick={() => setAdminTab('teams')} className={`px-6 py-2 rounded-xl font-black text-[10px] uppercase transition-all flex items-center gap-2 ${adminTab === 'teams' ? 'bg-[#003b95] text-white shadow-lg scale-105' : 'text-slate-500 hover:text-slate-700'}`}>
            <Users size={14}/> Clubes
          </button>
          <button onClick={() => setAdminTab('games')} className={`px-6 py-2 rounded-xl font-black text-[10px] uppercase transition-all flex items-center gap-2 ${adminTab === 'games' ? 'bg-[#003b95] text-white shadow-lg scale-105' : 'text-slate-500 hover:text-slate-700'}`}>
            <Gamepad2 size={14}/> Partidas
          </button>
        </div>
      </div>

      {adminTab === 'comps' && (
        <TournamentManager 
          competitions={competitions} 
          teams={teams} 
          phases={phases} 
          games={games}
          onRefresh={onRefresh} 
        />
      )}

      {adminTab === 'games' && (
        <GameManager 
          competitions={competitions} 
          teams={teams} 
          games={games} 
          onRefresh={onRefresh} 
        />
      )}

      {adminTab === 'teams' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 h-fit">
            <h3 className="font-black text-slate-800 uppercase italic mb-6">Novo Clube</h3>
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <input placeholder="Nome do Clube" className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-[#003b95] outline-none" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} />
              <button type="submit" className="w-full bg-[#d90429] text-white py-4 rounded-2xl font-black uppercase text-xs hover:bg-[#b00322] transition-colors">Registrar</button>
            </form>
          </div>
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {teams.map(t => (
              <div key={t.id} className="bg-white p-5 rounded-2xl border border-slate-50 flex items-center justify-between hover:border-slate-200 transition-colors">
                <span className="font-black text-xs uppercase text-slate-700">{t.name}</span>
                <button onClick={() => handleDeleteTeam(t.id)} className="text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
              </div>
            ))}
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
