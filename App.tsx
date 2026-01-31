
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
  Users,
  Clock,
  Swords,
  Layers,
  ChevronRight,
  Medal
} from 'lucide-react';
import { Competition, Team, Game, CompStatus, GameStatus, Phase } from './types';
import { DEFAULT_ADMIN, LOGO_DATA_URL } from './constants';
import AdminPanel from './AdminPanel';
import { supabase } from './supabase';

// Componente de Logo com Fallback e proporções corrigidas
const BrandLogo = ({ className = "w-16 h-16 md:w-24 md:h-24" }: { className?: string }) => {
  const [error, setError] = useState(false);

  // Fallback visual caso até o SVG falhe (raro)
  if (error) {
    return (
      <div className={`${className} bg-gradient-to-br from-[#003b95] to-[#d90429] rounded-2xl flex items-center justify-center shadow-lg border-2 border-white/20`}>
        <div className="flex flex-col items-center">
          <Trophy className="text-white w-1/2 h-1/2" />
          <span className="text-[10px] font-black text-white leading-none mt-1">EC</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} flex items-center justify-center p-1`}>
      <img 
        src={LOGO_DATA_URL} 
        alt="Esporte Coxim" 
        className="w-full h-full object-contain transition-transform hover:scale-110 duration-500 drop-shadow-[0_10px_10px_rgba(0,0,0,0.3)]"
        onError={() => setError(true)}
      />
    </div>
  );
};

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
  const [loginForm, setLoginForm] = useState({ phone: '', pass: '' });

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
    return finalGroups;
  }, [activeComp, games, teams, phases]);

  const knockoutPhases = useMemo(() => {
    if (!activeComp) return [];
    return phases
      .filter(p => p.competitions_id.toString() === activeComp.id.toString() && p.type === 'Mata-Mata')
      .map(p => ({
        ...p,
        games: games.filter(g => g.phase_id?.toString() === p.id.toString())
      }))
      .filter(p => p.games.length > 0);
  }, [activeComp, phases, games]);

  const structuredGames = useMemo(() => {
    if (!activeComp) return [];
    const compGames = games.filter(g => g.competition_id.toString() === selectedCompId);
    const compPhases = phases.filter(p => p.competitions_id.toString() === selectedCompId);
    
    const statusPriorityMap = {
      [GameStatus.AO_VIVO]: 1,
      [GameStatus.AGENDADO]: 2,
      [GameStatus.ENCERRADO]: 3
    };

    const sortGamesByStatusAndTime = (list: Game[]) => {
      return [...list].sort((a, b) => {
        const pA = statusPriorityMap[a.status] || 99;
        const pB = statusPriorityMap[b.status] || 99;
        if (pA !== pB) return pA - pB;
        const timeA = `${a.game_date || '9999-12-31'}T${a.game_time || '00:00'}`;
        const timeB = `${b.game_date || '9999-12-31'}T${b.game_time || '00:00'}`;
        return timeA.localeCompare(timeB);
      });
    };

    const ghostGames = sortGamesByStatusAndTime(compGames.filter(g => !g.phase_id));

    return [
      ...compPhases.map(phase => {
        const phaseGames = compGames.filter(g => g.phase_id?.toString() === phase.id.toString());
        if (phase.type === 'Fase de Grupos') {
          const detectedGroups = detectGroupsInPhase(phase.id.toString(), phaseGames);
          return {
            ...phase,
            groups: detectedGroups.map(group => ({
              ...group,
              games: sortGamesByStatusAndTime(phaseGames.filter(g => 
                group.teamIds.includes(g.home_team_id.toString()) && 
                group.teamIds.includes(g.away_team_id.toString())
              ))
            }))
          };
        }
        return { ...phase, games: sortGamesByStatusAndTime(phaseGames), groups: [] };
      }),
      ...(ghostGames.length > 0 ? [{ id: 'none', name: 'Geral', type: 'Geral', games: ghostGames, groups: [] }] : [])
    ];
  }, [games, phases, selectedCompId, activeComp]);

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

  const formatDisplayDate = (dateStr?: string) => {
    if (!dateStr) return '--/--';
    const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = cleanDate.split('-');
    if (parts.length < 3) return cleanDate;
    return `${parts[2]}/${parts[1]}`;
  };

  const formatDisplayTime = (timeStr?: string) => {
    if (!timeStr) return '--:--';
    return timeStr.substring(0, 5);
  };

  const renderGameCard = (g: Game) => {
    const homeTeam = teams.find(t => t.id.toString() === g.home_team_id.toString());
    const awayTeam = teams.find(t => t.id.toString() === g.away_team_id.toString());
    const comp = competitions.find(c => c.id.toString() === g.competition_id.toString());
    const isVolei = comp?.modality === 'Volei';
    const isFinished = g.status === GameStatus.ENCERRADO;
    const isLive = g.status === GameStatus.AO_VIVO;
    
    const homeWinner = isFinished && g.home_score > g.away_score;
    const awayWinner = isFinished && g.away_score > g.home_score;

    const homePoints = isVolei ? (g.current_set_points_home || 0) : g.home_score;
    const awayPoints = isVolei ? (g.current_set_points_away || 0) : g.away_score;

    return (
      <div key={g.id} className="bg-white p-3 rounded-[1.5rem] shadow shadow-[#003b95]/5 border border-slate-50 hover:shadow-lg transition-all flex flex-col gap-2 border-l-4 border-l-[#003b95]">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-slate-300'}`}></span>
            <span className={`text-[8px] font-black uppercase tracking-widest ${isLive ? 'text-red-500' : 'text-slate-400'}`}>{g.status}</span>
          </div>
        </div>

        <div className="space-y-1.5">
          {/* CASA */}
          <div className={`flex items-center justify-between p-2 rounded-xl border transition-all ${homeWinner ? 'bg-[#003b95]/5 border-[#003b95]/20' : 'bg-slate-50 border-slate-100'}`}>
            <div className="flex items-center gap-2 flex-1">
              <span className={`text-[10px] font-black uppercase truncate ${homeWinner ? 'text-[#003b95]' : 'text-slate-700'}`}>{homeTeam?.name || '---'}</span>
              {homeWinner && <Medal size={12} className="text-[#d90429]" />}
            </div>
            <div className="flex items-center gap-1">
               {isVolei && (
                 <span className="text-[10px] font-black italic text-[#003b95] opacity-60 mr-1">{g.home_score}</span>
               )}
               <div className="w-10 h-10 flex items-center justify-center bg-white border border-slate-800 text-slate-800 font-black text-lg rounded-lg shadow-sm">
                 {homePoints}
               </div>
            </div>
          </div>
          {/* VISITANTE */}
          <div className={`flex items-center justify-between p-2 rounded-xl border transition-all ${awayWinner ? 'bg-[#003b95]/5 border-[#003b95]/20' : 'bg-slate-50 border-slate-100'}`}>
            <div className="flex items-center gap-2 flex-1">
              <span className={`text-[10px] font-black uppercase truncate ${awayWinner ? 'text-[#003b95]' : 'text-slate-700'}`}>{awayTeam?.name || '---'}</span>
              {awayWinner && <Medal size={12} className="text-[#d90429]" />}
            </div>
            <div className="flex items-center gap-1">
               {isVolei && (
                 <span className="text-[10px] font-black italic text-[#d90429] opacity-60 mr-1">{g.away_score}</span>
               )}
               <div className="w-10 h-10 flex items-center justify-center bg-white border border-slate-800 text-slate-800 font-black text-lg rounded-lg shadow-sm">
                 {awayPoints}
               </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-1 border-t border-slate-50">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase">
              <Clock size={10} className="text-[#d90429]" /> {formatDisplayTime(g.game_time)}
            </div>
            <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase">
              <Calendar size={10} className="text-[#003b95]" /> {formatDisplayDate(g.game_date)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderKnockoutBracket = () => {
    if (knockoutPhases.length === 0) return null;
    const latestKnockout = knockoutPhases[knockoutPhases.length - 1];
    return (
      <div className="space-y-4 animate-in slide-in-from-bottom-6 duration-700">
        <div className="flex items-center gap-3 bg-white p-4 rounded-[1.5rem] shadow border-l-4 border-[#d90429]">
          <div className="bg-red-50 p-2 rounded-xl text-[#d90429] shadow-inner">
            <Swords size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black uppercase italic text-slate-800 leading-none">{latestKnockout.name}</h3>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {latestKnockout.games.map(g => {
            const h = teams.find(t => t.id.toString() === g.home_team_id.toString());
            const a = teams.find(t => t.id.toString() === g.away_team_id.toString());
            const isFinished = g.status === GameStatus.ENCERRADO;
            const isLive = g.status === GameStatus.AO_VIVO;
            
            const homeWon = isFinished && g.home_score > g.away_score;
            const awayWon = isFinished && g.away_score > g.home_score;

            return (
              <div key={g.id} className="bg-white rounded-[1.5rem] border border-slate-100 shadow overflow-hidden flex flex-col group hover:shadow-lg transition-all duration-500">
                <div className={`p-2 flex items-center justify-between ${isLive ? 'bg-red-500' : 'bg-[#003b95]'} transition-colors`}>
                   <span className="text-[8px] font-black text-white uppercase italic tracking-widest">
                     {isLive ? 'AO VIVO' : isFinished ? 'FINALIZADO' : 'AGENDADO'}
                   </span>
                </div>
                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 flex flex-col items-center gap-1 text-center">
                    <span className={`text-[11px] font-black uppercase leading-tight transition-all ${homeWon ? 'text-[#003b95] scale-110 drop-shadow-sm' : 'text-slate-400'}`}>
                      {h?.name || '---'}
                    </span>
                    {homeWon && <Medal size={14} className="text-[#d90429] animate-bounce" />}
                  </div>

                  <div className="flex flex-col items-center px-4">
                    <div className="flex items-center gap-4">
                      {isFinished ? (
                        <>
                          <span className={`text-4xl font-black italic font-sport ${homeWon ? 'text-[#003b95]' : 'text-slate-300'}`}>
                            {g.home_score}
                          </span>
                          <span className="text-slate-200 font-black text-sm">X</span>
                          <span className={`text-4xl font-black italic font-sport ${awayWon ? 'text-[#003b95]' : 'text-slate-300'}`}>
                            {g.away_score}
                          </span>
                        </>
                      ) : (
                        <div className="flex flex-col items-center">
                           <span className="text-4xl font-black text-slate-100 italic font-sport tracking-widest">X</span>
                           {isLive && <span className="text-[6px] font-black text-red-500 uppercase italic animate-pulse">EM CAMPO</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col items-center gap-1 text-center">
                    <span className={`text-[11px] font-black uppercase leading-tight transition-all ${awayWon ? 'text-[#003b95] scale-110 drop-shadow-sm' : 'text-slate-400'}`}>
                      {a?.name || '---'}
                    </span>
                    {awayWon && <Medal size={14} className="text-[#d90429] animate-bounce" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      <header className="bg-[#003b95] text-white shadow-xl sticky top-0 z-50 border-b-4 border-[#d90429]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => setView('user')} className="flex items-center gap-2 md:gap-4 group transition-transform hover:scale-105 active:scale-95">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 blur-xl rounded-full scale-125 group-hover:bg-white/40 transition-all animate-pulse"></div>
              <BrandLogo />
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
                <div className="flex justify-center">
                  <BrandLogo className="w-32 h-32 md:w-48 md:h-48" />
                </div>
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
          <div className="space-y-6 animate-in fade-in duration-700">
            <div className="flex p-1.5 bg-white rounded-xl shadow border border-slate-100 w-fit mx-auto mb-2">
              <button onClick={() => setActiveTab('classificacao')} className={`px-6 py-2 rounded-lg font-black text-[10px] uppercase transition-all flex items-center gap-2 ${activeTab === 'classificacao' ? 'bg-[#003b95] text-white shadow' : 'text-slate-500 hover:text-slate-800'}`}>
                <Trophy size={14} /> Tabela
              </button>
              <button onClick={() => setActiveTab('jogos')} className={`px-6 py-2 rounded-lg font-black text-[10px] uppercase transition-all flex items-center gap-2 ${activeTab === 'jogos' ? 'bg-[#003b95] text-white shadow' : 'text-slate-500 hover:text-slate-800'}`}>
                <Gamepad2 size={14} /> Jogos
              </button>
            </div>

            {activeTab === 'classificacao' && (
              <div className="space-y-6 pb-12">
                {groupedStandings.length === 0 ? (
                  <div className="max-w-4xl mx-auto">
                    {knockoutPhases.length > 0 ? renderKnockoutBracket() : (
                      <div className="text-center py-12 bg-white rounded-[2rem] shadow border border-dashed border-slate-200">
                        <Trophy size={32} className="mx-auto text-slate-200 mb-2" />
                        <p className="font-black text-slate-300 text-xs uppercase italic">Aguardando Início da Competição</p>
                      </div>
                    )}
                  </div>
                ) : (
                  groupedStandings.map((group, gIdx) => (
                    <div key={group.id} className="bg-white rounded-[1.5rem] shadow border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-6 duration-500" style={{ animationDelay: `${gIdx * 100}ms` }}>
                      <div className="bg-[#003b95] px-4 py-3 flex items-center justify-between border-b-2 border-[#d90429]">
                         <div className="flex items-center gap-2">
                            <div className="bg-white/10 p-1.5 rounded-lg text-white"><TrophyIcon size={14} /></div>
                            <h3 className="font-black italic uppercase text-white text-sm tracking-wide leading-none">{group.displayName}</h3>
                         </div>
                      </div>
                      <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left text-[10px]">
                          <thead className="bg-slate-50 text-slate-400 font-black uppercase border-b border-slate-100">
                            <tr>
                              <th className="px-3 py-2 w-12 text-center">#</th>
                              <th className="px-2 py-2">Time</th>
                              <th className="px-2 py-2 text-center bg-[#003b95]/5 text-[#003b95]">P</th>
                              <th className="px-2 py-2 text-center">J</th>
                              <th className="px-2 py-2 text-center">V</th>
                              <th className="px-2 py-2 text-center">SG</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {group.standings.map((team, idx) => (
                              <tr key={team.id} className="hover:bg-blue-50/40 transition-colors group/row">
                                <td className="px-3 py-2 text-center">
                                  <span className={`inline-block w-5 h-5 leading-5 rounded-md font-black text-[10px] ${idx < 4 ? 'bg-[#003b95] text-white' : 'bg-slate-100 text-slate-400'}`}>{idx + 1}</span>
                                </td>
                                <td className="px-2 py-2 font-black text-slate-800 uppercase text-[10px] group-hover/row:text-[#d90429] transition-colors">{team.name}</td>
                                <td className="px-2 py-2 text-center bg-[#003b95]/5 font-black text-[11px] text-[#003b95]">{team.pts}</td>
                                <td className="px-2 py-2 text-center font-bold text-slate-500">{team.pj}</td>
                                <td className="px-2 py-2 text-center font-bold text-slate-500">{team.v}</td>
                                <td className={`px-2 py-2 text-center font-black text-[10px] ${team.sg > 0 ? 'text-green-500' : team.sg < 0 ? 'text-red-500' : 'text-slate-400'}`}>{team.sg}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                )}
                {groupedStandings.length > 0 && knockoutPhases.length > 0 && (
                  <div className="max-w-4xl mx-auto mt-6">
                    {renderKnockoutBracket()}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'jogos' && (
              <div className="space-y-6 pb-12">
                {structuredGames.map((phase: any, pIdx) => (
                  <div key={phase.id} className="space-y-4 animate-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${pIdx * 100}ms` }}>
                    <div className="bg-[#003b95] text-white px-6 py-3 rounded-[1.5rem] flex items-center justify-between shadow border-b-2 border-[#d90429]">
                      <div className="flex items-center gap-3">
                        <Layers size={16} className="text-blue-300" />
                        <h4 className="font-black uppercase italic text-sm tracking-widest">{phase.name}</h4>
                      </div>
                    </div>
                    {phase.groups && phase.groups.length > 0 ? (
                      <div className="space-y-6">
                        {phase.groups.map((group: any) => (
                          <div key={group.name} className="space-y-3">
                            <div className="flex items-center gap-2 ml-2">
                              <Users size={14} className="text-[#003b95]" />
                              <h5 className="font-black text-[#003b95] text-[10px] uppercase italic tracking-wider">{group.name}</h5>
                              <div className="h-[1px] bg-slate-100 flex-1 rounded-full"></div>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {group.games.map((g: Game) => renderGameCard(g))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {(phase.games || []).map((g: Game) => renderGameCard(g))}
                      </div>
                    )}
                    {(!phase.games || phase.games.length === 0) && (!phase.groups || phase.groups.length === 0) && (
                      <div className="text-center py-6 bg-white rounded-[1.5rem] border border-dashed border-slate-200">
                        <p className="text-[8px] font-black uppercase text-slate-300">Aguardando definição de partidas</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
