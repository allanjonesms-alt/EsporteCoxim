
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
}

export interface Game {
  id: string;
  competition_id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  status: GameStatus;
  game_date?: string;
  game_time?: string;
}
