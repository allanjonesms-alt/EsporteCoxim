
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  Users, 
  Calendar, 
  Settings, 
  LogIn, 
  LogOut, 
  Menu, 
  X,
  ChevronRight,
  Plus,
  ArrowLeft,
  Trash2,
  Edit,
  Camera,
  Activity
} from 'lucide-react';
import { 
  CompStatus, 
  GameStatus, 
  Phase, 
  Competition, 
  Team, 
  Player, 
  Game 
} from './types';
import { COMP_STATUS_ORDER, APP_NAME, DEFAULT_ADMIN } from './constants';

// --- Local Storage Database Helper ---
const DB_KEYS = {
  COMPETITIONS: 'ec_competitions',
  TEAMS: 'ec_teams',
  PLAYERS: 'ec_players',
  GAMES: 'ec_games',
  ADMIN: 'ec_admin'
};

const useDB = () => {
  const [competitions, setCompetitions] = useState<Competition[]>(() => JSON.parse(localStorage.getItem(DB_KEYS.COMPETITIONS) || '[]'));
  const [teams, setTeams] = useState<Team[]>(() => JSON.parse(localStorage.getItem(DB_KEYS.TEAMS) || '[]'));
  const [players, setPlayers] = useState<Player[]>(() => JSON.parse(localStorage.getItem(DB_KEYS.PLAYERS) || '[]'));
  const [games, setGames] = useState<Game[]>(() => JSON.parse(localStorage.getItem(DB_KEYS.GAMES) || '[]'));

  useEffect(() => localStorage.setItem(DB_KEYS.COMPETITIONS, JSON.stringify(competitions)), [competitions]);
  useEffect(() => localStorage.setItem(DB_KEYS.TEAMS, JSON.stringify(teams)), [teams]);
  useEffect(() => localStorage.setItem(DB_KEYS.PLAYERS, JSON.stringify(players)), [players]);
  useEffect(() => localStorage.setItem(DB_KEYS.GAMES, JSON.stringify(games)), [games]);

  return { 
    competitions, setCompetitions, 
    teams, setTeams, 
    players, setPlayers, 
    games, setGames 
  };
};

// --- Custom Logo Component ---
const BrandLogo = ({ className = "h-10" }: { className?: string }) => (
  <img src="logo.png" alt="Esporte Coxim" className={className} onError={(e) => {
    // Fallback caso a imagem não exista
    e.currentTarget.src = "https://via.placeholder.com/150x50?text=ESPORTE+COXIM";
  }} />
);

// --- Components ---

const FileInput = ({ label, onChange, currentImage }: { label: string, onChange: (base64: string) => void, currentImage?: string }) => {
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => onChange(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-2xl bg-slate-100 overflow-hidden flex items-center justify-center border-2 border-dashed border-slate-300">
          {currentImage ? <img src={currentImage} className="w-full h-full object-cover" alt="Preview" /> : <Camera className="text-slate-400" />}
        </div>
        <input type="file" onChange={handleFile} className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-[#003b95] file:text-white hover:file:opacity-90 transition cursor-pointer" accept="image/*" />
      </div>
    </div>
  );
};

export default function App() {
  const db = useDB();
  const [view, setView] = useState<'user' | 'admin' | 'login' | 'comp_detail'>('user');
  const [adminSection, setAdminSection] = useState<'comp' | 'games' | 'teams'>('comp');
  const [selectedComp, setSelectedComp] = useState<Competition | null>(null);
  const [isLogged, setIsLogged] = useState(false);
  const [loginForm, setLoginForm] = useState({ phone: '', password: '' });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.phone === DEFAULT_ADMIN.phone && loginForm.password === DEFAULT_ADMIN.password) {
      setIsLogged(true);
      setView('admin');
    } else {
      alert("Credenciais Inválidas");
    }
  };

  const sortedCompetitions = useMemo(() => {
    return [...db.competitions].sort((a, b) => {
      return COMP_STATUS_ORDER.indexOf(a.status) - COMP_STATUS_ORDER.indexOf(b.status);
    });
  }, [db.competitions]);

  // --- Admin Views ---

  const CompetitionAdmin = () => {
    const [editing, setEditing] = useState<Competition | null>(null);
    const [form, setForm] = useState<Partial<Competition>>({ 
      name: '', 
      status: CompStatus.ATIVA, 
      phase: Phase.GRUPOS, 
      dateTime: '', 
      teamIds: [] 
    });

    const save = () => {
      if (!form.name || !form.dateTime) return alert("Preencha os campos obrigatórios");
      if (editing) {
        db.setCompetitions(prev => prev.map(c => c.id === editing.id ? { ...c, ...form } as Competition : c));
      } else {
        db.setCompetitions(prev => [...prev, { ...form, id: Date.now().toString() } as Competition]);
      }
      setEditing(null);
      setForm({ name: '', status: CompStatus.ATIVA, phase: Phase.GRUPOS, dateTime: '', teamIds: [] });
    };

    return (
      <div className="space-y-6">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <div className="w-2 h-8 bg-[#d90429] rounded-full"></div>
            {editing ? 'Editar Competição' : 'Nova Competição'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1">Nome da Competição</label>
              <input placeholder="Ex: Copa Coxim 2024" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#003b95] transition" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1">Data e Hora</label>
              <input type="datetime-local" value={form.dateTime} onChange={e => setForm({...form, dateTime: e.target.value})} className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#003b95] transition" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1">Status</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value as CompStatus})} className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#003b95] transition">
                {Object.values(CompStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1">Fase Inicial</label>
              <select value={form.phase} onChange={e => setForm({...form, phase: e.target.value as Phase})} className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#003b95] transition">
                {Object.values(Phase).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-6">
             <p className="font-bold text-xs text-slate-400 uppercase mb-3 ml-1">Habilitar Equipes:</p>
             <div className="flex flex-wrap gap-2">
                {db.teams.map(team => (
                  <button 
                    key={team.id}
                    onClick={() => {
                      const ids = form.teamIds || [];
                      setForm({...form, teamIds: ids.includes(team.id) ? ids.filter(i => i !== team.id) : [...ids, team.id]});
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all ${form.teamIds?.includes(team.id) ? 'bg-[#003b95] border-[#003b95] text-white shadow-md' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}
                  >
                    {team.name}
                  </button>
                ))}
             </div>
          </div>
          <button onClick={save} className="mt-8 bg-[#003b95] hover:bg-[#002b6e] text-white px-8 py-3 rounded-2xl font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-100">
            {editing ? 'Salvar Alterações' : 'Cadastrar Competição'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {db.competitions.map(c => (
            <div key={c.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:border-[#003b95]/30 transition-all flex justify-between items-center group">
              <div>
                <p className="font-black text-slate-800 uppercase italic leading-tight">{c.name}</p>
                <div className="flex items-center gap-2 mt-1">
                   <span className={`w-2 h-2 rounded-full ${c.status === CompStatus.ATIVA ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{c.status} • {c.phase}</p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setEditing(c); setForm(c); }} className="p-2 text-[#003b95] hover:bg-blue-50 rounded-xl transition"><Edit size={18} /></button>
                <button onClick={() => db.setCompetitions(prev => prev.filter(x => x.id !== c.id))} className="p-2 text-[#d90429] hover:bg-red-50 rounded-xl transition"><Trash2 size={18} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const TeamsAdmin = () => {
    const [editing, setEditing] = useState<Team | null>(null);
    const [form, setForm] = useState<Partial<Team>>({ name: '', logo: '', playerIds: [] });
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

    const saveTeam = () => {
      if (!form.name) return;
      if (editing) {
        db.setTeams(prev => prev.map(t => t.id === editing.id ? { ...t, ...form } as Team : t));
      } else {
        db.setTeams(prev => [...prev, { ...form, id: Date.now().toString(), playerIds: [] } as Team]);
      }
      setEditing(null);
      setForm({ name: '', logo: '' });
    };

    const PlayerManager = ({ teamId }: { teamId: string }) => {
      const [pForm, setPForm] = useState<Partial<Player>>({ name: '', nickname: '', dob: '', photo: '' });
      const teamPlayers = db.players.filter(p => p.teamId === teamId);

      const addPlayer = () => {
        if (!pForm.name) return;
        const newPlayer: Player = {
          ...pForm,
          id: Date.now().toString(),
          teamId,
          goals: 0
        } as Player;
        db.setPlayers(prev => [...prev, newPlayer]);
        setPForm({ name: '', nickname: '', dob: '', photo: '' });
      };

      return (
        <div className="mt-8 pt-6 border-t border-slate-100">
          <h4 className="font-black text-slate-800 mb-6 flex items-center gap-2 uppercase italic tracking-tight">
            <Users size={20} className="text-[#003b95]" /> Gerenciar Jogadores
          </h4>
          <div className="bg-slate-50 p-6 rounded-3xl space-y-4 mb-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <input placeholder="Nome Completo" value={pForm.name} onChange={e => setPForm({...pForm, name: e.target.value})} className="p-3 bg-white border-none rounded-xl focus:ring-2 focus:ring-[#003b95] text-sm" />
               <input placeholder="Apelido em Campo" value={pForm.nickname} onChange={e => setPForm({...pForm, nickname: e.target.value})} className="p-3 bg-white border-none rounded-xl focus:ring-2 focus:ring-[#003b95] text-sm" />
               <input type="date" value={pForm.dob} onChange={e => setPForm({...pForm, dob: e.target.value})} className="p-3 bg-white border-none rounded-xl focus:ring-2 focus:ring-[#003b95] text-sm" />
               <FileInput label="Foto do Atleta" onChange={base64 => setPForm({...pForm, photo: base64})} currentImage={pForm.photo} />
             </div>
             <button onClick={addPlayer} className="w-full bg-[#003b95] text-white py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#002b6e] transition shadow-md">
               <Plus size={16} /> Salvar Jogador
             </button>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {teamPlayers.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-100 hover:shadow-sm transition">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm">
                    {p.photo && <img src={p.photo} className="w-full h-full object-cover" />}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800 uppercase italic leading-tight">{p.nickname || p.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.name}</p>
                  </div>
                </div>
                <button onClick={() => db.setPlayers(prev => prev.filter(x => x.id !== p.id))} className="p-2 text-slate-300 hover:text-[#d90429] transition">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-8">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <div className="w-2 h-8 bg-[#003b95] rounded-full"></div>
            {editing ? 'Editar Time' : 'Cadastrar Novo Time'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Nome da Equipe</label>
                <input placeholder="Ex: Coxim E.C." value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-[#003b95] transition font-bold" />
              </div>
              <button onClick={saveTeam} className="w-full bg-[#003b95] text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-[#002b6e] transition-all shadow-lg shadow-blue-50">
                {editing ? 'Atualizar Dados' : 'Criar Equipe'}
              </button>
            </div>
            <FileInput label="Escudo Oficial" onChange={base64 => setForm({...form, logo: base64})} currentImage={form.logo} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <div className="space-y-4">
             <h4 className="font-black text-slate-400 uppercase text-xs tracking-[0.2em] mb-4">Equipes Registradas</h4>
             <div className="grid grid-cols-1 gap-3">
               {db.teams.map(t => (
                 <div key={t.id} className={`p-4 rounded-3xl border-2 transition-all cursor-pointer ${selectedTeamId === t.id ? 'bg-white border-[#003b95] shadow-xl' : 'bg-white border-transparent hover:border-slate-200'}`} onClick={() => setSelectedTeamId(t.id)}>
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center overflow-hidden border border-slate-100">
                          {t.logo ? <img src={t.logo} className="w-full h-full object-contain p-1" /> : <Users className="text-slate-200" size={24} />}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 uppercase italic text-lg leading-tight">{t.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{db.players.filter(p => p.teamId === t.id).length} Atletas</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                         <button onClick={(e) => { e.stopPropagation(); setEditing(t); setForm(t); }} className="p-2 text-slate-400 hover:text-[#003b95] transition"><Edit size={18} /></button>
                         <button onClick={(e) => { e.stopPropagation(); db.setTeams(prev => prev.filter(x => x.id !== t.id)) }} className="p-2 text-slate-400 hover:text-[#d90429] transition"><Trash2 size={18} /></button>
                      </div>
                   </div>
                 </div>
               ))}
             </div>
           </div>
           <div>
             {selectedTeamId ? <PlayerManager teamId={selectedTeamId} /> : (
               <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-12 text-center">
                 <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                    <Users size={40} className="opacity-20" />
                 </div>
                 <p className="font-bold text-sm uppercase tracking-widest">Selecione uma equipe para<br/>editar o plantel</p>
               </div>
             )}
           </div>
        </div>
      </div>
    );
  };

  const GamesAdmin = () => {
    const [form, setForm] = useState<Partial<Game>>({
      competitionId: '',
      homeTeamId: '',
      awayTeamId: '',
      homeScore: 0,
      awayScore: 0,
      status: GameStatus.PROXIMO,
      date: '',
      time: ''
    });

    const activeComp = db.competitions.find(c => c.id === form.competitionId);
    const availableTeams = activeComp ? db.teams.filter(t => activeComp.teamIds.includes(t.id)) : [];

    const saveGame = () => {
      if (!form.competitionId || !form.homeTeamId || !form.awayTeamId) return;
      db.setGames(prev => [...prev, { ...form, id: Date.now().toString() } as Game]);
      setForm({ ...form, homeTeamId: '', awayTeamId: '', homeScore: 0, awayScore: 0 });
    };

    return (
      <div className="space-y-8">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <div className="w-2 h-8 bg-[#d90429] rounded-full"></div>
            Agendar Nova Partida
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1">Competição</label>
              <select value={form.competitionId} onChange={e => setForm({...form, competitionId: e.target.value})} className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#003b95] text-sm font-bold">
                <option value="">Selecione...</option>
                {db.competitions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1">Mandante</label>
              <select value={form.homeTeamId} onChange={e => setForm({...form, homeTeamId: e.target.value})} className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#003b95] text-sm">
                <option value="">Selecione...</option>
                {availableTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1">Visitante</label>
              <select value={form.awayTeamId} onChange={e => setForm({...form, awayTeamId: e.target.value})} className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#003b95] text-sm">
                <option value="">Selecione...</option>
                {availableTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1">Data</label>
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#003b95] text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1">Horário</label>
              <input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#003b95] text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1">Status Inicial</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value as GameStatus})} className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#003b95] text-sm font-bold">
                {Object.values(GameStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <button onClick={saveGame} className="mt-8 bg-[#d90429] hover:bg-[#b00320] text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-red-50">
            Confirmar Agendamento
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {db.games.map(g => {
            const hTeam = db.teams.find(t => t.id === g.homeTeamId);
            const aTeam = db.teams.find(t => t.id === g.awayTeamId);
            const comp = db.competitions.find(c => c.id === g.competitionId);
            return (
              <div key={g.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 flex flex-col gap-4 shadow-sm hover:shadow-md transition">
                <div className="flex justify-between items-center text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
                  <span className="text-[#003b95]">{comp?.name}</span>
                  <span>{g.date} • {g.time}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 flex flex-col items-center">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl p-2 mb-2 border border-slate-100 flex items-center justify-center">
                      {hTeam?.logo && <img src={hTeam.logo} className="w-full h-full object-contain" />}
                    </div>
                    <p className="text-xs font-black text-center leading-tight uppercase italic">{hTeam?.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" value={g.homeScore} onChange={e => db.setGames(prev => prev.map(x => x.id === g.id ? {...x, homeScore: parseInt(e.target.value) || 0} : x))} className="w-12 h-12 text-xl text-center font-black bg-slate-100 rounded-xl border-none focus:ring-2 focus:ring-[#d90429]" />
                    <span className="text-slate-300 font-black italic">X</span>
                    <input type="number" value={g.awayScore} onChange={e => db.setGames(prev => prev.map(x => x.id === g.id ? {...x, awayScore: parseInt(e.target.value) || 0} : x))} className="w-12 h-12 text-xl text-center font-black bg-slate-100 rounded-xl border-none focus:ring-2 focus:ring-[#d90429]" />
                  </div>
                  <div className="flex-1 flex flex-col items-center">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl p-2 mb-2 border border-slate-100 flex items-center justify-center">
                      {aTeam?.logo && <img src={aTeam.logo} className="w-full h-full object-contain" />}
                    </div>
                    <p className="text-xs font-black text-center leading-tight uppercase italic">{aTeam?.name}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                   <select value={g.status} onChange={e => db.setGames(prev => prev.map(x => x.id === g.id ? {...x, status: e.target.value as GameStatus} : x))} className={`text-[10px] font-black uppercase p-2 border-none rounded-xl ${g.status === GameStatus.AO_VIVO ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                     {Object.values(GameStatus).map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                   <button onClick={() => db.setGames(prev => prev.filter(x => x.id !== g.id))} className="text-slate-300 hover:text-[#d90429] transition">
                     <Trash2 size={18} />
                   </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // --- User Views ---

  const UserHome = () => (
    <div className="space-y-12 pb-20">
      {/* Hero Section */}
      <div className="relative h-[24rem] sport-gradient rounded-[3rem] overflow-hidden flex items-end p-12 shadow-2xl shadow-blue-900/20">
        <div className="absolute inset-0 opacity-40 mix-blend-overlay">
           <img src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=2000" className="w-full h-full object-cover" />
        </div>
        <div className="absolute top-0 right-0 p-12 opacity-10">
           <BrandLogo className="h-48 grayscale invert" />
        </div>
        <div className="relative z-10 text-white max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <span className="px-4 py-1.5 bg-[#d90429] rounded-full text-[10px] font-black uppercase tracking-[0.3em] shadow-lg">Oficial</span>
            <span className="w-12 h-1 bg-white/30 rounded-full"></span>
          </div>
          <h2 className="text-6xl font-black italic uppercase tracking-tighter mb-4 leading-none">ESPORTE<br/><span className="text-[#d90429]">COXIM</span> ONLINE</h2>
          <p className="text-blue-100 text-lg font-medium opacity-80">A plataforma definitiva para atletas e torcedores da região de Coxim. Resultados em tempo real e gestão de elite.</p>
        </div>
      </div>

      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-black text-slate-800 uppercase italic flex items-center gap-3">
            <div className="w-2 h-8 bg-[#d90429] rounded-full"></div>
            Competições em Destaque
          </h3>
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-[#003b95]"></div>
            <div className="w-3 h-3 rounded-full bg-[#d90429]"></div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sortedCompetitions.map(c => (
            <div 
              key={c.id} 
              onClick={() => { setSelectedComp(c); setView('comp_detail'); }}
              className="group bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden cursor-pointer hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 relative"
            >
              <div className={`absolute top-0 left-0 w-2 h-full ${
                c.status === CompStatus.ATIVA ? 'bg-green-500' : 
                c.status === CompStatus.EM_BREVE ? 'bg-[#003b95]' : 'bg-slate-200'
              }`}></div>
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    c.status === CompStatus.ATIVA ? 'bg-green-100 text-green-700' :
                    c.status === CompStatus.EM_BREVE ? 'bg-blue-50 text-[#003b95]' :
                    c.status === CompStatus.ENCERRADA ? 'bg-slate-100 text-slate-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                    {c.status}
                  </span>
                  <p className="text-slate-300 text-[10px] font-black uppercase">{new Date(c.dateTime).toLocaleDateString()}</p>
                </div>
                <h4 className="text-2xl font-black text-slate-800 mb-6 group-hover:text-[#003b95] transition-colors uppercase italic leading-tight">{c.name}</h4>
                <div className="flex items-center gap-6 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <div className="flex items-center gap-2"><Users size={16} className="text-[#d90429]" /> {c.teamIds.length} Equipes</div>
                  <div className="flex items-center gap-2"><Calendar size={16} className="text-[#003b95]" /> {c.phase}</div>
                </div>
              </div>
              <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex items-center justify-between group-hover:bg-[#003b95] transition-colors duration-500">
                 <span className="text-xs font-black uppercase tracking-widest text-[#003b95] group-hover:text-white">Acompanhar Tabela</span>
                 <ChevronRight size={18} className="text-[#003b95] group-hover:text-white group-hover:translate-x-2 transition-all" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const CompetitionDetail = ({ comp }: { comp: Competition }) => {
    const [tab, setTab] = useState<'class' | 'jogos' | 'art'>('class');
    
    const compGames = useMemo(() => {
      const g = db.games.filter(x => x.competitionId === comp.id);
      return g.sort((a, b) => {
        const order = [GameStatus.AO_VIVO, GameStatus.PROXIMO, GameStatus.ENCERRADO];
        return order.indexOf(a.status) - order.indexOf(b.status);
      });
    }, [db.games, comp.id]);

    const standings = useMemo(() => {
       const stats: Record<string, { pts: number, j: number, v: number, e: number, d: number }> = {};
       comp.teamIds.forEach(id => { stats[id] = { pts: 0, j: 0, v: 0, e: 0, d: 0 }; });

       compGames.filter(g => g.status === GameStatus.ENCERRADO).forEach(g => {
         if (!stats[g.homeTeamId] || !stats[g.awayTeamId]) return;
         stats[g.homeTeamId].j += 1;
         stats[g.awayTeamId].j += 1;
         if (g.homeScore > g.awayScore) {
           stats[g.homeTeamId].pts += 3;
           stats[g.homeTeamId].v += 1;
           stats[g.awayTeamId].d += 1;
         } else if (g.homeScore < g.awayScore) {
           stats[g.awayTeamId].pts += 3;
           stats[g.awayTeamId].v += 1;
           stats[g.homeTeamId].d += 1;
         } else {
           stats[g.homeTeamId].pts += 1;
           stats[g.awayTeamId].pts += 1;
           stats[g.homeTeamId].e += 1;
           stats[g.awayTeamId].e += 1;
         }
       });

       return comp.teamIds.map(id => ({ id, ...stats[id] })).sort((a, b) => b.pts - a.pts);
    }, [compGames, comp.teamIds]);

    return (
      <div className="space-y-8 pb-20">
        <button onClick={() => setView('user')} className="flex items-center gap-2 text-slate-400 hover:text-[#003b95] font-black uppercase text-xs tracking-widest transition group">
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> Voltar ao Início
        </button>

        <div className="sport-gradient p-12 rounded-[3rem] shadow-xl text-white relative overflow-hidden">
           <div className="absolute top-0 right-0 p-8 opacity-10">
              <Trophy size={160} />
           </div>
           <div className="relative z-10">
             <div className="flex items-center gap-3 mb-4">
                <span className="px-4 py-1 bg-[#d90429] rounded-full text-[10px] font-black uppercase tracking-[0.2em]">{comp.status}</span>
                <span className="text-white/40 font-black italic">/</span>
                <span className="text-white/60 text-[10px] font-black uppercase tracking-widest">{comp.phase}</span>
             </div>
             <h2 className="text-5xl font-black uppercase italic tracking-tighter leading-none mb-2">{comp.name}</h2>
             <p className="text-blue-100/70 font-bold uppercase tracking-widest text-sm">Competição Oficial Coxim • 2024</p>
           </div>
        </div>

        <div className="flex gap-2 p-2 bg-slate-100 rounded-[1.5rem] max-w-xl mx-auto shadow-inner">
          {(['class', 'jogos', 'art'] as const).map(t => (
            <button 
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === t ? 'bg-white shadow-xl text-[#003b95] scale-105' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {t === 'class' ? 'Classificação' : t === 'jogos' ? 'Jogos' : 'Artilharia'}
            </button>
          ))}
        </div>

        <div className="min-h-[400px]">
          {tab === 'class' && (
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
               <table className="w-full text-left">
                 <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                      <th className="p-6"># Equipe</th>
                      <th className="p-6 text-center">PTS</th>
                      <th className="p-6 text-center">J</th>
                      <th className="p-6 text-center">V</th>
                      <th className="p-6 text-center">E</th>
                      <th className="p-6 text-center">D</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                   {standings.map((s, idx) => {
                     const team = db.teams.find(t => t.id === s.id);
                     return (
                       <tr key={s.id} className="text-sm hover:bg-slate-50/50 transition">
                         <td className="p-6 flex items-center gap-6">
                           <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black italic ${idx < 4 ? 'bg-[#003b95] text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>{idx + 1}</span>
                           <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center overflow-hidden border border-slate-100 p-1">
                               {team?.logo ? <img src={team.logo} className="w-full h-full object-contain" /> : <Users size={20} className="text-slate-200" />}
                             </div>
                             <span className="font-black text-slate-800 uppercase italic tracking-tight">{team?.name}</span>
                           </div>
                         </td>
                         <td className="p-6 text-center font-black text-xl text-[#003b95]">{s.pts}</td>
                         <td className="p-6 text-center text-slate-400 font-bold">{s.j}</td>
                         <td className="p-6 text-center text-slate-400 font-bold">{s.v}</td>
                         <td className="p-6 text-center text-slate-400 font-bold">{s.e}</td>
                         <td className="p-6 text-center text-slate-400 font-bold">{s.d}</td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
            </div>
          )}

          {tab === 'jogos' && (
            <div className="space-y-6">
               {compGames.map(g => {
                 const hTeam = db.teams.find(t => t.id === g.homeTeamId);
                 const aTeam = db.teams.find(t => t.id === g.awayTeamId);
                 return (
                   <div key={g.id} className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-500">
                      <div className="flex justify-center mb-8">
                        <span className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 ${
                          g.status === GameStatus.AO_VIVO ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-200' :
                          g.status === GameStatus.PROXIMO ? 'bg-blue-50 text-[#003b95]' :
                          'bg-slate-100 text-slate-400'
                        }`}>
                          {g.status === GameStatus.AO_VIVO && <Activity size={14} />}
                          {g.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-6 max-w-4xl mx-auto">
                        <div className="flex-1 flex flex-col items-center gap-4 group">
                           <div className="w-24 h-24 bg-slate-50 rounded-[2rem] p-4 flex items-center justify-center border border-slate-100 group-hover:scale-110 transition-transform">
                             {hTeam?.logo ? <img src={hTeam.logo} className="w-full h-full object-contain" /> : <Users className="text-slate-200" size={32} />}
                           </div>
                           <p className="font-black text-center text-slate-800 text-lg leading-none uppercase italic tracking-tighter">{hTeam?.name}</p>
                        </div>
                        
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex items-center gap-6">
                            <span className="text-6xl font-black text-slate-900 tracking-tighter italic">{g.status === GameStatus.PROXIMO ? '-' : g.homeScore}</span>
                            <span className="text-slate-200 text-2xl font-black italic">VS</span>
                            <span className="text-6xl font-black text-slate-900 tracking-tighter italic">{g.status === GameStatus.PROXIMO ? '-' : g.awayScore}</span>
                          </div>
                          <div className="mt-4 px-4 py-1.5 bg-slate-50 rounded-full">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{g.date} • {g.time}</p>
                          </div>
                        </div>

                        <div className="flex-1 flex flex-col items-center gap-4 group">
                           <div className="w-24 h-24 bg-slate-50 rounded-[2rem] p-4 flex items-center justify-center border border-slate-100 group-hover:scale-110 transition-transform">
                             {aTeam?.logo ? <img src={aTeam.logo} className="w-full h-full object-contain" /> : <Users className="text-slate-200" size={32} />}
                           </div>
                           <p className="font-black text-center text-slate-800 text-lg leading-none uppercase italic tracking-tighter">{aTeam?.name}</p>
                        </div>
                      </div>
                   </div>
                 );
               })}
            </div>
          )}

          {tab === 'art' && (
            <div className="bg-white rounded-[2.5rem] shadow-sm border divide-y divide-slate-50 overflow-hidden">
               {db.players
                .filter(p => comp.teamIds.includes(p.teamId))
                .sort((a, b) => b.goals - a.goals)
                .map((p, idx) => {
                  const team = db.teams.find(t => t.id === p.teamId);
                  return (
                    <div key={p.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition">
                       <div className="flex items-center gap-6">
                         <span className="text-slate-200 font-black italic text-2xl w-10">#{idx + 1}</span>
                         <div className="w-16 h-16 rounded-[1.2rem] bg-white overflow-hidden border-2 border-slate-100 shadow-sm">
                           {p.photo && <img src={p.photo} className="w-full h-full object-cover" />}
                         </div>
                         <div>
                           <p className="font-black text-slate-800 text-xl uppercase italic tracking-tight">{p.nickname || p.name}</p>
                           <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-slate-100 overflow-hidden p-0.5">
                                 {team?.logo && <img src={team.logo} className="w-full h-full object-contain" />}
                              </div>
                              <p className="text-[10px] text-[#003b95] font-black uppercase tracking-widest">{team?.name}</p>
                           </div>
                         </div>
                       </div>
                       <div className="text-center bg-[#003b95]/5 p-4 rounded-3xl min-w-[100px] border border-[#003b95]/10">
                         <span className="text-4xl font-black text-[#003b95] italic">{p.goals}</span>
                         <p className="text-[10px] font-black text-[#003b95]/40 uppercase tracking-widest">Gols</p>
                       </div>
                    </div>
                  );
               })}
               {db.players.filter(p => comp.teamIds.includes(p.teamId)).length === 0 && (
                 <div className="p-20 text-center text-slate-300">
                    <Users size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="font-black uppercase tracking-widest text-sm">Dados de artilharia ainda não registrados</p>
                 </div>
               )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const AdminPanel = () => (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <div className="flex items-center gap-2 mb-2">
              <span className="w-12 h-1 bg-[#d90429] rounded-full"></span>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#003b95]">Administrativo</p>
           </div>
           <h2 className="text-4xl font-black text-slate-800 uppercase italic tracking-tighter">Gestão da Plataforma</h2>
        </div>
        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
          {(['comp', 'games', 'teams'] as const).map(sec => (
            <button 
              key={sec}
              onClick={() => setAdminSection(sec)}
              className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${adminSection === sec ? 'bg-[#003b95] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {sec === 'comp' ? 'Competições' : sec === 'games' ? 'Partidas' : 'Equipes'}
            </button>
          ))}
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {adminSection === 'comp' && <CompetitionAdmin />}
        {adminSection === 'teams' && <TeamsAdmin />}
        {adminSection === 'games' && <GamesAdmin />}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] selection:bg-[#003b95] selection:text-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass-nav border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div 
            className="flex items-center gap-4 cursor-pointer group" 
            onClick={() => { setView('user'); setSelectedComp(null); }}
          >
            <BrandLogo className="h-12 group-hover:scale-105 transition-transform" />
            <div className="hidden md:block">
               <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">{APP_NAME}</h1>
               <p className="text-[8px] font-black text-[#d90429] uppercase tracking-[0.4em] ml-1">Painel Digital</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {isLogged ? (
              <>
                <button 
                  onClick={() => setView('admin')}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${view === 'admin' ? 'bg-[#003b95] text-white shadow-lg shadow-blue-200' : 'text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200'}`}
                >
                  <Settings size={16} /> <span className="hidden lg:inline">Painel Admin</span>
                </button>
                <button 
                  onClick={() => { setIsLogged(false); setView('user'); }}
                  className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-[#d90429] hover:bg-red-50 transition-all border border-transparent hover:border-red-100 flex items-center gap-2"
                >
                  <LogOut size={16} /> <span className="hidden lg:inline">Desconectar</span>
                </button>
              </>
            ) : (
              <button 
                onClick={() => setView('login')}
                className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#003b95] transition-all flex items-center gap-2 shadow-xl shadow-slate-200 active:scale-95"
              >
                <LogIn size={18} /> Acesso Restrito
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        {view === 'user' && <UserHome />}
        {view === 'comp_detail' && selectedComp && <CompetitionDetail comp={selectedComp} />}
        
        {view === 'login' && (
          <div className="max-w-md mx-auto pt-16">
            <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-50 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 sport-gradient"></div>
              <div className="text-center mb-10">
                <BrandLogo className="h-16 mx-auto mb-6" />
                <h2 className="text-3xl font-black text-slate-800 uppercase italic tracking-tighter">Bem-vindo</h2>
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Área Administrativa</p>
              </div>
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Celular Cadastrado</label>
                  <input 
                    type="text" 
                    value={loginForm.phone} 
                    onChange={e => setLoginForm({...loginForm, phone: e.target.value})} 
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-[#003b95] transition font-bold" 
                    placeholder="67..." 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Senha de Acesso</label>
                  <input 
                    type="password" 
                    value={loginForm.password} 
                    onChange={e => setLoginForm({...loginForm, password: e.target.value})} 
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-[#003b95] transition font-bold" 
                    placeholder="••••••••" 
                  />
                </div>
                <button type="submit" className="w-full bg-[#003b95] text-white py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-200 hover:bg-[#002b6e] transition-all active:scale-95">
                  Autenticar Agora
                </button>
              </form>
              <button onClick={() => setView('user')} className="w-full mt-6 text-xs text-slate-400 font-black uppercase tracking-widest hover:text-slate-600 transition">Cancelar e Voltar</button>
            </div>
          </div>
        )}

        {view === 'admin' && isLogged && <AdminPanel />}
      </main>

      <footer className="mt-auto border-t border-slate-100 bg-white py-20">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 items-center gap-12 text-center md:text-left">
          <div className="flex flex-col items-center md:items-start gap-4">
            <BrandLogo className="h-10 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all cursor-pointer" />
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Coxim, Mato Grosso do Sul</p>
          </div>
          <div className="flex flex-col items-center">
             <p className="text-xs text-slate-400 font-bold max-w-[200px] leading-relaxed uppercase tracking-widest">Gerenciamento Profissional de Ligas e Campeonatos Regionais.</p>
          </div>
          <div className="flex justify-center md:justify-end gap-6 text-[10px] font-black uppercase tracking-widest text-[#003b95]">
             <button className="hover:text-[#d90429] transition">Termos</button>
             <button className="hover:text-[#d90429] transition">Privacidade</button>
             <button className="hover:text-[#d90429] transition">Suporte</button>
          </div>
        </div>
        <div className="mt-12 text-center">
           <p className="text-[10px] font-black text-slate-200 uppercase tracking-[0.5em]">© 2024 ESPORTE COXIM • DESIGNED FOR CHAMPIONS</p>
        </div>
      </footer>
    </div>
  );
}
