
import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Trophy, 
  Calendar, 
  Shield, 
  Activity, 
  Loader2, 
  TrophyIcon,
  LogOut,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { Competition, Team, Game, CompStatus, GameStatus, Phase } from './types';
import { DEFAULT_ADMIN } from './constants';
import AdminPanel from './AdminPanel';

const SUPABASE_URL = 'https://pkwprsdejfyfokgscwdl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrd3Byc2RlamZ5Zm9rZ3Njd2RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzI5ODksImV4cCI6MjA4NDE0ODk4OX0.Ak4ytUV3HmULv5q-ZMOr5UYFrePQgo6uJU1910xLRfc';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
    setLoading(true);
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

  useEffect(() => { fetchData(); }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.phone.replace(/\D/g, '') === DEFAULT_ADMIN.phone && loginForm.pass === DEFAULT_ADMIN.password) {
      setIsLogged(true);
      localStorage.setItem('ec_session', 'true');
      setView('admin');
    } else { alert("Acesso negado."); }
  };

  const activeComp = competitions.find(c => c.id.toString() === selectedCompId);
  const standings = useMemo(() => {
    if (!activeComp) return [];
    const stats: Record<string, any> = {};
    const teamList = activeComp.team_ids || [];
    
    // Fallback se team_ids estiver vazio: pega dos jogos
    const currentGames = games.filter(g => g.competition_id.toString() === activeComp.id.toString());
    const ids = teamList.length ? teamList : Array.from(new Set(currentGames.flatMap(g => [g.home_team_id, g.away_team_id])));

    ids.forEach(tid => {
      const t = teams.find(team => team.id.toString() === tid.toString());
      stats[tid] = { id: tid, name: t?.name || '---', pts: 0, pj: 0, v: 0, e: 0, d: 0, gf: 0, ga: 0, sg: 0 };
    });

    currentGames.filter(g => g.status === GameStatus.ENCERRADO).forEach(g => {
      const h = g.home_team_id; const a = g.away_team_id;
      if (stats[h] && stats[a]) {
        stats[h].pj++; stats[a].pj++;
        stats[h].gf += g.home_score; stats[h].ga += g.away_score;
        stats[a].gf += g.away_score; stats[a].ga += g.home_score;
        if (g.home_score > g.away_score) { stats[h].pts += 3; stats[h].v++; stats[a].d++; }
        else if (g.home_score < g.away_score) { stats[a].pts += 3; stats[a].v++; stats[h].d++; }
        else { stats[h].pts += 1; stats[a].pts += 1; stats[h].e++; stats[a].e++; }
      }
    });

    return Object.values(stats)
      .map((s: any) => ({ ...s, sg: s.gf - s.ga }))
      .sort((a, b) => b.pts - a.pts || b.v - a.v || b.sg - a.sg);
  }, [activeComp, games, teams]);

  const groupedGames = useMemo(() => {
    const filtered = games.filter(g => g.competition_id.toString() === selectedCompId);
    return {
      ao_vivo: filtered.filter(g => g.status === GameStatus.AO_VIVO),
      agendado: filtered.filter(g => g.status === GameStatus.AGENDADO),
      encerrado: filtered.filter(g => g.status === GameStatus.ENCERRADO)
    };
  }, [games, selectedCompId]);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      <header className="bg-[#003b95] text-white shadow-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => setView('user')} className="flex items-center gap-3">
            <div className="bg-white p-1.5 rounded-xl"><Trophy className="text-[#003b95] w-6 h-6" /></div>
            <div className="flex flex-col leading-none font-sport uppercase italic">
              <span className="text-xl font-black">Esporte</span>
              <span className="text-xl font-black text-[#d90429]">Coxim</span>
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
              <button onClick={() => setView('login')} className="bg-[#d90429] text-white px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase shadow-xl">Acesso Restrito</button>
            )}
          </div>
        </div>
        {view === 'user' && (
          <div className="bg-[#002b6d] border-t border-white/5 px-4 py-2 overflow-x-auto no-scrollbar">
            <div className="max-w-6xl mx-auto flex items-center gap-4 py-1">
              {competitions.map(c => (
                <button key={c.id} onClick={() => setSelectedCompId(c.id.toString())} className={`whitespace-nowrap px-5 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${selectedCompId === c.id.toString() ? 'bg-[#d90429] text-white' : 'bg-white/5 text-white/40 hover:text-white'}`}>
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
          <div className="max-w-sm mx-auto pt-20">
            <div className="bg-white p-10 rounded-[3rem] shadow-2xl text-center">
              <Shield className="text-[#003b95] w-12 h-12 mx-auto mb-6" />
              <h2 className="text-3xl font-black text-slate-800 uppercase italic mb-8">Portal do Gestor</h2>
              <form onSubmit={handleLogin} className="space-y-5">
                <input type="text" placeholder="Celular" className="w-full p-5 bg-slate-50 rounded-2xl font-bold" value={loginForm.phone} onChange={e => setLoginForm({...loginForm, phone: e.target.value})} />
                <input type="password" placeholder="Senha" className="w-full p-5 bg-slate-50 rounded-2xl font-bold" value={loginForm.pass} onChange={e => setLoginForm({...loginForm, pass: e.target.value})} />
                <button type="submit" className="w-full bg-[#003b95] text-white py-5 rounded-2xl font-black uppercase text-xs">Entrar</button>
              </form>
            </div>
          </div>
        ) : view === 'admin' ? (
          <AdminPanel competitions={competitions} teams={teams} games={games} phases={phases} onRefresh={fetchData} />
        ) : (
          <div className="space-y-10 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="text-left">
                <h1 className="text-5xl font-black text-slate-900 uppercase italic font-sport leading-none tracking-tight">{activeComp?.name || 'Selecione um Torneio'}</h1>
                <p className="text-xs font-bold text-[#d90429] uppercase mt-3 tracking-widest flex items-center gap-2">
                  <Activity size={12}/> Coxim, Mato Grosso do Sul | Temporada 2025
                </p>
              </div>
              <div className="flex bg-slate-200/50 p-1.5 rounded-[1.5rem] border border-slate-200/50">
                {['classificacao', 'jogos', 'times'].map(t => (
                  <button key={t} onClick={() => setActiveTab(t as any)} className={`px-7 py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${activeTab === t ? 'bg-[#003b95] text-white' : 'text-slate-500 hover:text-slate-700'}`}>
                    {t === 'classificacao' ? 'Tabela' : t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === 'classificacao' && (
              <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
                <div className="bg-[#003b95] px-10 py-6 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <TrophyIcon size={24} className="text-white" />
                      <h3 className="font-black italic uppercase text-white text-lg">{activeComp?.current_phase || 'Classificação'}</h3>
                   </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-400 font-black uppercase border-b border-slate-100">
                      <tr>
                        <th className="px-10 py-5 w-20 text-center">#</th>
                        <th className="px-6 py-5">Clube</th>
                        <th className="px-4 py-5 text-center bg-slate-100/50 text-slate-800">P</th>
                        <th className="px-4 py-5 text-center">J</th>
                        <th className="px-4 py-5 text-center">V</th>
                        <th className="px-4 py-5 text-center">E</th>
                        <th className="px-4 py-5 text-center">D</th>
                        <th className="px-4 py-5 text-center">SG</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {standings.map((team, idx) => (
                        <tr key={team.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-10 py-6 text-center font-black text-xl text-slate-800">{idx + 1}</td>
                          <td className="px-6 py-6 font-black text-slate-800 uppercase text-sm">{team.name}</td>
                          <td className="px-4 py-6 text-center bg-slate-50/50 font-black text-base">{team.pts}</td>
                          <td className="px-4 py-6 text-center font-bold text-slate-500">{team.pj}</td>
                          <td className="px-4 py-6 text-center font-bold text-slate-500">{team.v}</td>
                          <td className="px-4 py-6 text-center font-bold text-slate-500">{team.e}</td>
                          <td className="px-4 py-6 text-center font-bold text-slate-500">{team.d}</td>
                          <td className={`px-4 py-6 text-center font-black ${team.sg > 0 ? 'text-green-500' : 'text-red-400'}`}>{team.sg}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'jogos' && (
              <div className="space-y-12">
                {['ao_vivo', 'agendado', 'encerrado'].map(cat => {
                  const items = (groupedGames as any)[cat];
                  if (!items.length) return null;
                  return (
                    <div key={cat} className="space-y-6">
                      <div className="flex items-center gap-3 border-l-4 border-slate-400 pl-4 py-1">
                        <h2 className="text-xl font-black uppercase italic font-sport text-slate-900">
                          {cat === 'ao_vivo' ? 'Ao Vivo' : cat === 'agendado' ? 'Próximas Partidas' : 'Resultados'}
                        </h2>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {items.map((game: Game) => (
                          <div key={game.id} className={`bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 ${game.status === GameStatus.AO_VIVO ? 'ring-2 ring-red-500' : ''}`}>
                            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-50">
                              <span className="text-[10px] font-black text-slate-400 uppercase">{new Date(game.game_date || '').toLocaleDateString('pt-BR')}</span>
                              <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${game.status === GameStatus.AO_VIVO ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100'}`}>{game.status}</div>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1 text-center truncate text-[10px] font-black uppercase">{teams.find(t => t.id.toString() === game.home_team_id.toString())?.name}</div>
                              <div className="flex items-center gap-2 font-sport font-black text-3xl">
                                <span>{game.home_score}</span>
                                <span className="text-xs text-slate-200">X</span>
                                <span>{game.away_score}</span>
                              </div>
                              <div className="flex-1 text-center truncate text-[10px] font-black uppercase">{teams.find(t => t.id.toString() === game.away_team_id.toString())?.name}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'times' && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {teams.filter(t => standings.some(s => s.id.toString() === t.id.toString())).map(t => (
                  <div key={t.id} className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col items-center">
                    <Shield size={32} className="text-slate-100 mb-4" />
                    <h4 className="font-black text-[10px] uppercase text-slate-800 text-center">{t.name}</h4>
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
