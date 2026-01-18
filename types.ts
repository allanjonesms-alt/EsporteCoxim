
export enum CompStatus {
  ATIVA = 'Ativa',
  EM_BREVE = 'Em Breve',
  INATIVA = 'Inativa',
  ENCERRADA = 'Encerrada'
}

export enum GameStatus {
  AO_VIVO = 'Ao Vivo',
  PROXIMO = 'Próximo Jogo',
  ENCERRADO = 'Encerrado'
}

export enum Phase {
  GRUPOS = 'Grupos',
  PLAYOFFS = 'Play-Offs'
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  nickname: string;
  dob: string;
  photo?: string;
  goals: number;
}

export interface Team {
  id: string;
  name: string;
  logo?: string;
  playerIds: string[];
  league?: string; // Novo campo para vincular ao campeonato
}

export interface Competition {
  id: string;
  name: string;
  dateTime: string;
  status: CompStatus;
  phase: Phase;
  teamIds: string[];
}

export interface Game {
  id: string;
  competitionId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  status: GameStatus;
  date: string;
  time: string;
}

export interface AdminUser {
  phone: string;
  password: string;
}
