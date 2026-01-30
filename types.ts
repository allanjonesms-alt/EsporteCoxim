
export enum CompStatus {
  ATIVA = 'ATIVA',
  EM_BREVE = 'EM_BREVE',
  ENCERRADA = 'ENCERRADA',
  AGENDADA = 'AGENDADA'
}

export enum GameStatus {
  AGENDADO = 'AGENDADO',
  AO_VIVO = 'AO_VIVO',
  ENCERRADO = 'ENCERRADO'
}

export interface Team {
  id: string;
  name: string;
  logo?: string;
  league?: string;
}

export interface Competition {
  id: string;
  name: string;
  status: CompStatus;
  team_ids: string[];
  date?: string;
  current_phase?: string;
  modality?: 'Futebol' | 'Volei';
}

export interface Phase {
  id: string | number;
  competitions_id: string | number;
  name: string;
  type: 'Fase de Grupos' | 'Mata-Mata';
}

export interface Game {
  id: string;
  competition_id: string;
  phase_id?: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number; // No Vôlei, representa Sets Vencidos
  away_score: number; // No Vôlei, representa Sets Vencidos
  status: GameStatus;
  game_date?: string;
  game_time?: string;
  // Campos de Vôlei
  target_sets?: number;
  is_set_active?: boolean;
  current_set_points_home?: number;
  current_set_points_away?: number;
}
