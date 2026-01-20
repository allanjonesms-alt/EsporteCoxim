
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  Calendar, 
  Shield, 
  Activity, 
  Loader2, 
  TrophyIcon,
  LogOut,
  CheckCircle2,
  Gamepad2,
  Users
} from 'lucide-react';
import { Competition, Team, Game, CompStatus, GameStatus, Phase } from './types';
import { DEFAULT_ADMIN, LOGO_DATA_URL } from './constants';
import AdminPanel from './AdminPanel';
import { supabase } from './supabase';

export default function App() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompId, setSelectedCompId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'classificacao' | 'jogos' | 'times'>('classificacao');
  
  const [view, setView] = useState<'user' | 'admin' | 'login'>('user');
  const [isLogged, setIsLogged] = useState(() => localStorage.getItem('ec_session') === 'true');
  const [loginForm, setLoginForm] = useState({ phone: '67984373039', pass: '@Jones2028' });

  const fetchData = async () => {
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
      if (cRes.data?.length && !selectedCompId) setSelectedCompId(cRes.data[0].id.toString());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { 
    setLoading(true);
    fetchData(); 
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leagues' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'games' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'phases' },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.phone.replace(/\D/g, '') === DEFAULT_ADMIN.phone && loginForm.pass === DEFAULT_ADMIN.password) {
      setIsLogged(true);
      localStorage.setItem('ec_session', 'true');
      setView('admin');
    } else { alert("Acesso negado."); }
  };

  const activeComp = competitions.find(c => c.id.toString() === selectedCompId);
  
  const detectGroupsInPhase = (phaseId: string, phaseGames: Game[]) => {
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

  const groupedStandings = useMemo(() => {
    if (!activeComp) return [];
    const groupPhases = phases.filter(p => 
      p.competitions_id.toString() === activeComp.id.toString() && 
      p.type === 'Fase de Grupos'
    ).sort((a, b) => a.name.localeCompare(b.name));
    const finalGroups: any[] = [];
    groupPhases.forEach(phase => {
      const phaseGames = games.filter(g => g.phase_id?.toString() === phase.id.toString());
      const detected = detectGroupsInPhase(phase.id.toString(), phaseGames);
      if (detected.length > 0) {
        detected.forEach(groupInfo => {
          const groupGames = phaseGames.filter(g => 
            groupInfo.teamIds.includes(g.home_team_id.toString()) && 
            groupInfo.teamIds.includes(g.away_team_id.toString())
          );
          finalGroups.push({
            id: `${phase.id}_${groupInfo.name}`,
            displayName: `${phase.name} - ${groupInfo.name}`,
            standings: calculateStandings(groupGames, groupInfo.teamIds)
          });
        });
      }
    });
    if (finalGroups.length === 0) {
      const generalGames = games.filter(g => g.competition_id.toString() === activeComp.id.toString());
      if (generalGames.length > 0) {
        finalGroups.push({
          id: 'general',
          displayName: activeComp.current_phase || 'Classificação Geral',
          standings: calculateStandings(generalGames)
        });
      }
    }
    return finalGroups;
  }, [activeComp, games, teams, phases]);

  function calculateStandings(filteredGames: Game[], specificTeamIds?: string[]) {
    const stats: Record<string, any> = {};
    const teamIds = specificTeamIds || Array.from(new Set(filteredGames.flatMap(g => [g.home_team_id.toString(), g.away_team_id.toString()])));
    teamIds.forEach(tid => {
      const t = teams.find(team => team.id.toString() === tid);
      stats[tid] = { id: tid, name: t?.name || '---', pts: 0, pj: 0, v: 0, e: 0, d: 0, gf: 0, ga: 0, sg: 0 };
    });
    filteredGames.filter(g => g.status === GameStatus.ENCERRADO || g.status === GameStatus.AO_VIVO).forEach(g => {
      const h = g.home_team_id.toString(); 
      const a = g.away_team_id.toString();
      if (stats[h] && stats[a]) {
        stats[h].pj++; stats[a].pj++;
        stats[h].gf += (g.home_score || 0); stats[h].ga += (g.away_score || 0);
        stats[a].gf += (g.away_score || 0); stats[a].ga += (g.home_score || 0);
        if (g.home_score > g.away_score) { stats[h].pts += 3; stats[h].v++; stats[a].d++; } 
        else if (g.home_score < g.away_score) { stats[a].pts += 3; stats[a].v++; stats[h].d++; } 
        else { stats[h].pts += 1; stats[a].pts += 1; stats[h].e++; stats[a].e++; }
      }
    });
    return Object.values(stats)
      .map((s: any) => ({ ...s, sg: s.gf - s.ga }))
      .sort((a, b) => b.pts - a.pts || b.v - a.v || b.sg - a.sg || b.gf - a.gf);
  }

  const sortGames = (gamesList: Game[]) => {
    const priority = { [GameStatus.AO_VIVO]: 1, [GameStatus.AGENDADO]: 2, [GameStatus.ENCERRADO]: 3 };
    return [...gamesList].sort((a, b) => {
      const pA = priority[a.status] || 99;
      const pB = priority[b.status] || 99;
      if (pA !== pB) return pA - pB;
      return new Date(a.game_date || 0).getTime() - new Date(b.game_date || 0).getTime();
    });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      <header className="bg-[#003b95] text-white shadow-xl sticky top-0 z-50 border-b-4 border-[#d90429]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => setView('user')} className="flex items-center gap-2 md:gap-4 group transition-transform hover:scale-105 active:scale-95">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 blur-xl rounded-full scale-125 group-hover:bg-white/40 transition-all animate-pulse"></div>
              <img src={LOGO_DATA_URL} alt="Esporte Coxim" className="relative w-14 h-14 md:w-20 md:h-20 drop-shadow-2xl object-contain" />
            </div>
            <div className="flex flex-col leading-none font-sport uppercase italic">
              <span className="text-xl md:text-3xl font-black tracking-tighter">Esporte</span>
              <span className="text-xl md:text-3xl font-black text-[#d90429] tracking-tighter">Coxim</span>
            </div>
          </button>
          <div className="flex items-center gap-4">
            {isLogged ? (
              <div className="flex items-center gap-2 bg-white/10 p-1 rounded-2xl">
                <button onClick={() => setView(view === 'admin' ? 'user' : 'admin')} className={`px-5 py-2 rounded-xl font-black text-[10px] uppercase transition-all ${view === 'admin' ? 'bg-white text-[#003b95]' : 'text-white'}`}>
                  {view === 'admin' ? 'Ver Tabela' : 'Gerenciar'}
                </button>
                <button onClick={() => { setIsLogged(false); localStorage.removeItem('ec_session'); setView('user'); }} className="p-2 text-red-200"><LogOut size={18} /></button>
              </div>
            ) : (
              <button onClick={() => setView('login')} className="bg-[#d90429] text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-[#b00322] transition-all border-b-4 border-black/20">Portal do Gestor</button>
            )}
          </div>
        </div>
        {view === 'user' && (
          <div className="bg-[#002b6d] px-4 py-2 overflow-x-auto no-scrollbar shadow-inner">
            <div className="max-w-6xl mx-auto flex items-center gap-4 py-1">
              {competitions.map(c => (
                <button key={c.id} onClick={() => setSelectedCompId(c.id.toString())} className={`whitespace-nowrap px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${selectedCompId === c.id.toString() ? 'bg-[#d90429] text-white shadow-lg shadow-black/30' : 'bg-white/5 text-white/40 hover:text-white'}`}>
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
            <p className="font-black text-slate-300 uppercase animate-pulse">Sincronizando...</p>
          </div>
        ) : view === 'login' ? (
          <div className="max-w-md mx-auto pt-10 md:pt-20 animate-in zoom-in-95 duration-500">
            <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl text-center border-b-[12px] border-[#003b95]">
              <div className="mb-8 relative group">
                <div className="absolute inset-0 bg-blue-100 blur-3xl rounded-full scale-110 opacity-50 group-hover:opacity-100 transition-all"></div>
                <img src={LOGO_DATA_URL} alt="Esporte Coxim" className="relative w-48 h-48 mx-auto object-contain drop-shadow-2xl transition-transform hover:scale-105" />
              </div>
              <h2 className="text-3xl font-black text-slate-800 uppercase italic mb-8 font-sport tracking-tight">Login Administrativo</h2>
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Celular Admin</label>
                  <input type="text" placeholder="(67) 98437-3039" className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-[#003b95] outline-none shadow-inner" value={loginForm.phone} onChange={e => setLoginForm({...loginForm, phone: e.target.value})} />
                </div>
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Senha</label>
                  <input type="password" placeholder="••••••••" className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-[#003b95] outline-none shadow-inner" value={loginForm.pass} onChange={e => setLoginForm({...loginForm, pass: e.target.value})} />
                </div>
                <button type="submit" className="w-full bg-[#003b95] text-white py-5 rounded-2xl font-black uppercase text-[12px] shadow-2xl hover:bg-[#002b6d] transition-all transform active:scale-95 border-b-4 border-black/20">Acessar Painel</button>
                <button type="button" onClick={() => setView('user')} className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors">Voltar</button>
              </form>
            </div>
          </div>
        ) : view === 'admin' ? (
          <AdminPanel competitions={competitions} teams={teams} games={games} phases={phases} onRefresh={fetchData} />
        ) : (
          <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex p-2 bg-white rounded-2xl shadow-xl border border-slate-100 w-fit mx-auto mb-4">
              <button onClick={() => setActiveTab('classificacao')} className={`px-8 md:px-10 py-3 rounded-xl font-black text-[11px] uppercase transition-all flex items-center gap-2 ${activeTab === 'classificacao' ? 'bg-[#003b95] text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}>
                <Trophy size={16} /> Tabela
              </button>
              <button onClick={() => setActiveTab('jogos')} className={`px-8 md:px-10 py-3 rounded-xl font-black text-[11px] uppercase transition-all flex items-center gap-2 ${activeTab === 'jogos' ? 'bg-[#003b95] text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}>
                <Gamepad2 size={16} /> Jogos
              </button>
            </div>

            {activeTab === 'classificacao' && (
              <div className="space-y-12 pb-24">
                {groupedStandings.map((group, gIdx) => (
                  <div key={group.id} className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-6 duration-500" style={{ animationDelay: `${gIdx * 100}ms` }}>
                    <div className="bg-[#003b95] px-10 py-6 flex items-center justify-between border-b-4 border-[#d90429]">
                       <div className="flex items-center gap-4">
                          <div className="bg-white/10 p-2 rounded-xl text-white shadow-inner"><TrophyIcon size={20} /></div>
                          <h3 className="font-black italic uppercase text-white text-lg tracking-wide leading-none">{group.displayName}</h3>
                       </div>
                    </div>
                    <div className="overflow-x-auto no-scrollbar">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-400 font-black uppercase border-b border-slate-100">
                          <tr>
                            <th className="px-6 md:px-10 py-5 w-20 text-center">#</th>
                            <th className="px-4 py-5">Time</th>
                            <th className="px-4 py-5 text-center bg-[#003b95]/5 text-[#003b95]">P</th>
                            <th className="px-4 py-5 text-center">J</th>
                            <th className="px-4 py-5 text-center">V</th>
                            <th className="px-4 py-5 text-center">SG</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {group.standings.map((team, idx) => (
                            <tr key={team.id} className="hover:bg-blue-50/40 transition-colors group/row">
                              <td className="px-6 md:px-10 py-6 text-center">
                                <span className={`inline-block w-8 h-8 leading-8 rounded-lg font-black text-sm ${idx < 4 ? 'bg-[#003b95] text-white' : 'bg-slate-100 text-slate-400'}`}>{idx + 1}</span>
                              </td>
                              <td className="px-4 py-6 font-black text-slate-800 uppercase text-[13px] group-hover/row:text-[#d90429] transition-colors">{team.name}</td>
                              <td className="px-4 py-6 text-center bg-[#003b95]/5 font-black text-base text-[#003b95]">{team.pts}</td>
                              <td className="px-4 py-6 text-center font-bold text-slate-500">{team.pj}</td>
                              <td className="px-4 py-6 text-center font-bold text-slate-500">{team.v}</td>
                              <td className={`px-4 py-6 text-center font-black text-[13px] ${team.sg > 0 ? 'text-green-500' : team.sg < 0 ? 'text-red-500' : 'text-slate-400'}`}>{team.sg}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'jogos' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-500 pb-20">
                {sortGames(games.filter(g => g.competition_id.toString() === selectedCompId)).map(g => {
                  const homeTeam = teams.find(t => t.id.toString() === g.home_team_id.toString());
                  const awayTeam = teams.find(t => t.id.toString() === g.away_team_id.toString());
                  const phase = phases.find(p => p.id.toString() === g.phase_id?.toString());
                  const isLive = g.status === GameStatus.AO_VIVO;
                  return (
                    <div key={g.id} className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-50 hover:shadow-2xl transition-all flex flex-col gap-5 border-l-8 border-l-[#003b95]">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black uppercase italic tracking-widest text-[#003b95] bg-blue-50 px-3 py-1 rounded-full">{phase?.name || 'Partida'}</span>
                        <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${isLive ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-400'}`}>{g.status}</span>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-6">
                          <span className="text-sm font-black uppercase text-slate-800 truncate flex-1">{homeTeam?.name || '---'}</span>
                          <span className={`text-3xl font-black italic min-w-[40px] text-right ${isLive ? 'text-[#d90429]' : 'text-slate-900'}`}>{g.home_score}</span>
                        </div>
                        <div className="flex items-center justify-between gap-6">
                          <span className="text-sm font-black uppercase text-slate-800 truncate flex-1">{awayTeam?.name || '---'}</span>
                          <span className={`text-3xl font-black italic min-w-[40px] text-right ${isLive ? 'text-[#d90429]' : 'text-slate-900'}`}>{g.away_score}</span>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-slate-400">
                         <div className="flex items-center gap-2"><Calendar size={14} className="text-[#003b95]" /><span className="text-[10px] font-bold uppercase">{g.game_date ? new Date(g.game_date).toLocaleDateString('pt-BR') : '--'}</span></div>
                         <div className="flex items-center gap-2"><Activity size={14} className="text-[#d90429]" /><span className="text-[10px] font-bold uppercase">{g.game_time || '--:--'}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
