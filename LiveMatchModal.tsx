
import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Minus, 
  CheckCircle2, 
  Zap,
  Square,
  Loader2,
  Trophy
} from 'lucide-react';
import { Game, Team, Competition, GameStatus } from './types';
import { supabase } from './supabase';

interface LiveMatchModalProps {
  game: Game;
  teams: Team[];
  competition: Competition;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}

export default function LiveMatchModal({ game, teams, competition, onClose, onRefresh }: LiveMatchModalProps) {
  const [syncing, setSyncing] = useState(false);
  const homeTeam = teams.find(t => t.id.toString() === game.home_team_id.toString());
  const awayTeam = teams.find(t => t.id.toString() === game.away_team_id.toString());
  const isVolei = competition.modality === 'Volei';

  const handleUpdateScore = async (side: 'home' | 'away', delta: number) => {
    setSyncing(true);
    try {
      if (isVolei) {
        const current = side === 'home' ? (game.current_set_points_home || 0) : (game.current_set_points_away || 0);
        const { error } = await supabase.from('games').update(
          side === 'home' 
            ? { current_set_points_home: Math.max(0, current + delta) } 
            : { current_set_points_away: Math.max(0, current + delta) }
        ).eq('id', game.id);
        if (error) throw error;
      } else {
        const current = side === 'home' ? game.home_score : game.away_score;
        const { error } = await supabase.from('games').update(
          side === 'home' 
            ? { home_score: Math.max(0, current + delta) } 
            : { away_score: Math.max(0, current + delta) }
        ).eq('id', game.id);
        if (error) throw error;
      }
      await onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleEndSet = async () => {
    if (!confirm("Deseja realmente encerrar este SET e somar ao placar geral?")) return;
    setSyncing(true);
    try {
      const hPoints = game.current_set_points_home || 0;
      const aPoints = game.current_set_points_away || 0;
      if (hPoints === aPoints) throw new Error("Empate não permitido no set.");

      let newSetsHome = game.home_score || 0;
      let newSetsAway = game.away_score || 0;
      hPoints > aPoints ? newSetsHome++ : newSetsAway++;

      // Lógica de Vitória por Maioria de Sets (Vôlei)
      // Se target_sets for 3, precisa de 2 (Math.ceil(3/2) = 2)
      // Se target_sets for 5, precisa de 3 (Math.ceil(5/2) = 3)
      const target = game.target_sets || 3;
      const winsNeeded = Math.ceil(target / 2);
      const isMatchOver = newSetsHome >= winsNeeded || newSetsAway >= winsNeeded;

      await supabase.from('game_sets').insert({
        game_id: game.id,
        set_number: (game.home_score || 0) + (game.away_score || 0) + 1,
        home_points: hPoints,
        away_points: aPoints,
        winner_id: hPoints > aPoints ? game.home_team_id : game.away_team_id
      });

      const { error } = await supabase.from('games').update({
        is_set_active: false,
        home_score: newSetsHome,
        away_score: newSetsAway,
        current_set_points_home: 0,
        current_set_points_away: 0,
        status: isMatchOver ? GameStatus.ENCERRADO : GameStatus.AO_VIVO
      }).eq('id', game.id);

      if (error) throw error;
      await onRefresh();
      if (isMatchOver) {
        alert(`Partida finalizada! Placar final: ${newSetsHome} x ${newSetsAway}`);
        onClose();
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleEndMatch = async () => {
    if (!confirm("Deseja FINALIZAR a partida permanentemente com o placar atual?")) return;
    setSyncing(true);
    try {
      const { error } = await supabase.from('games').update({
        status: GameStatus.ENCERRADO,
        is_set_active: false
      }).eq('id', game.id);
      if (error) throw error;
      await onRefresh();
      onClose();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-slate-950 flex flex-col animate-in fade-in duration-300 select-none overflow-hidden">
      {/* Header Compacto */}
      <div className="bg-[#003b95] p-3 flex justify-between items-center border-b-2 border-[#d90429] shadow-xl">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            <span className="text-[8px] font-black text-white/70 uppercase tracking-widest">LIVE CONTROL</span>
          </div>
          <h2 className="text-white font-black italic uppercase tracking-tighter text-sm leading-none mt-0.5 truncate max-w-[200px]">
            {competition.name}
          </h2>
        </div>
        <button 
          onClick={onClose}
          className="bg-white/10 hover:bg-white/20 p-2 rounded-xl text-white transition-all active:scale-90"
        >
          <X size={18} />
        </button>
      </div>

      {/* Área Central do Placar - Layout Inteligente */}
      <div className="flex-1 flex flex-col md:flex-row items-stretch overflow-y-auto">
        {/* Equipe CASA */}
        <div className="flex-1 flex flex-col p-4 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 relative">
          <div className="text-center">
            <span className="bg-[#003b95] text-white px-3 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest">CASA</span>
            <h3 className="text-white text-lg md:text-2xl font-black uppercase italic mt-1 leading-tight px-2 line-clamp-1">
              {homeTeam?.name || '---'}
            </h3>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center py-2">
            <div className="relative mb-2">
              <div className="absolute inset-0 bg-[#003b95]/10 blur-[40px] rounded-full scale-125"></div>
              <div className="relative text-white text-[6rem] md:text-[10rem] font-black italic font-sport leading-none drop-shadow-lg">
                {isVolei ? (game.current_set_points_home || 0) : game.home_score}
              </div>
            </div>

            {/* BOTÕES DE CONTROLE CASA */}
            <div className="flex gap-2 w-full max-w-[280px]">
              <button 
                disabled={syncing}
                onClick={() => handleUpdateScore('home', -1)}
                className="flex-1 bg-slate-800 active:bg-slate-700 text-white py-4 rounded-2xl flex items-center justify-center transition-all active:scale-90 border border-slate-700"
              >
                <Minus size={24} strokeWidth={4} />
              </button>
              <button 
                disabled={syncing}
                onClick={() => handleUpdateScore('home', 1)}
                className="flex-[2] bg-[#003b95] active:bg-[#002b6d] text-white py-4 rounded-2xl flex flex-col items-center justify-center shadow-lg transition-all active:scale-95"
              >
                <Plus size={28} strokeWidth={4} />
              </button>
            </div>
          </div>

          {isVolei && (
            <div className="py-1.5 bg-slate-950/50 rounded-xl flex items-center justify-center gap-2 border border-slate-800">
               <span className="text-slate-500 font-black uppercase text-[8px] italic">Sets:</span>
               <span className="text-[#003b95] text-xl font-black italic font-sport">{game.home_score}</span>
            </div>
          )}
        </div>

        {/* Equipe VISITANTE */}
        <div className="flex-1 flex flex-col p-4 bg-slate-950 relative">
          <div className="text-center">
            <span className="bg-[#d90429] text-white px-3 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest">VISITANTE</span>
            <h3 className="text-white text-lg md:text-2xl font-black uppercase italic mt-1 leading-tight px-2 line-clamp-1">
              {awayTeam?.name || '---'}
            </h3>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center py-2">
            <div className="relative mb-2">
              <div className="absolute inset-0 bg-[#d90429]/10 blur-[40px] rounded-full scale-125"></div>
              <div className="relative text-white text-[6rem] md:text-[10rem] font-black italic font-sport leading-none drop-shadow-lg">
                {isVolei ? (game.current_set_points_away || 0) : game.away_score}
              </div>
            </div>

            {/* BOTÕES DE CONTROLE VISITANTE */}
            <div className="flex gap-2 w-full max-w-[280px]">
              <button 
                disabled={syncing}
                onClick={() => handleUpdateScore('away', -1)}
                className="flex-1 bg-slate-800 active:bg-slate-700 text-white py-4 rounded-2xl flex items-center justify-center transition-all active:scale-90 border border-slate-700"
              >
                <Minus size={24} strokeWidth={4} />
              </button>
              <button 
                disabled={syncing}
                onClick={() => handleUpdateScore('away', 1)}
                className="flex-[2] bg-[#d90429] active:bg-[#b00322] text-white py-4 rounded-2xl flex flex-col items-center justify-center shadow-lg transition-all active:scale-95"
              >
                <Plus size={28} strokeWidth={4} />
              </button>
            </div>
          </div>

          {isVolei && (
            <div className="py-1.5 bg-slate-900/50 rounded-xl flex items-center justify-center gap-2 border border-slate-800">
               <span className="text-slate-500 font-black uppercase text-[8px] italic">Sets:</span>
               <span className="text-[#d90429] text-xl font-black italic font-sport">{game.away_score}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Mais Fino */}
      <div className="bg-slate-900 p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-slate-800 shadow-2xl">
        <div className="flex items-center gap-3">
           <Zap className="text-[#d90429] animate-pulse" size={20} fill="currentColor" />
           <p className="text-slate-500 text-[8px] font-bold uppercase tracking-widest">
             {isVolei ? (game.is_set_active ? 'Set em curso' : 'Fim de Set') : 'Bola em Jogo'}
           </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {isVolei && game.is_set_active && (
            <button 
              onClick={handleEndSet}
              disabled={syncing}
              className="flex-1 md:flex-none bg-green-500 text-white px-4 py-3 rounded-xl font-black uppercase italic text-[10px] flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <CheckCircle2 size={16} /> Fim Set
            </button>
          )}
          
          <button 
            onClick={handleEndMatch}
            disabled={syncing}
            className="flex-1 md:flex-none bg-white text-slate-950 px-4 py-3 rounded-xl font-black uppercase italic text-[10px] flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
          >
            <Square size={14} fill="currentColor" /> Finalizar
          </button>
        </div>
      </div>

      {/* Overlay de Sincronização Sutil */}
      {syncing && (
        <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-[1px] z-[3000] flex items-center justify-center pointer-events-none">
           <div className="bg-[#003b95] text-white p-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-pulse">
              <Loader2 className="animate-spin" size={16} />
              <span className="text-[8px] font-black uppercase tracking-widest">Salvando...</span>
           </div>
        </div>
      )}
    </div>
  );
}
