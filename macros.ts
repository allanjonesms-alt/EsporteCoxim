import { Team, Game, GameStatus } from './types';

/**
 * Embaralha um array de IDs de times (Sorteio Aleatório)
 */
export const shuffleArray = (array: string[]): string[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Gera o chaveamento clássico (1º vs Último, 2º vs Penúltimo...)
 * @param sortedIds IDs dos times ordenados do melhor para o pior
 */
export const generateSeededSlots = (sortedIds: string[]): string[] => {
  const count = sortedIds.length;
  const slots = new Array(count).fill('');
  
  let left = 0;
  let right = count - 1;
  let slotIdx = 0;

  // Organiza em pares: [Melhor, Pior, 2º Melhor, 2º Pior...]
  while (left < right) {
    slots[slotIdx++] = sortedIds[left++];
    slots[slotIdx++] = sortedIds[right--];
  }

  return slots;
};

/**
 * Calcula a classificação interna para fins de macro
 */
export const getTeamRanking = (teams: Team[], games: Game[]): string[] => {
  const stats: Record<string, any> = {};
  
  teams.forEach(t => {
    stats[t.id] = { id: t.id.toString(), pts: 0, v: 0, sg: 0, gf: 0 };
  });

  games.filter(g => g.status === GameStatus.ENCERRADO).forEach(g => {
    const h = g.home_team_id.toString();
    const a = g.away_team_id.toString();
    
    if (stats[h] && stats[a]) {
      stats[h].gf += g.home_score;
      stats[h].sg += (g.home_score - g.away_score);
      stats[a].gf += g.away_score;
      stats[a].sg += (g.away_score - g.home_score);

      if (g.home_score > g.away_score) { stats[h].pts += 3; stats[h].v++; }
      else if (g.home_score < g.away_score) { stats[a].pts += 3; stats[a].v++; }
      else { stats[h].pts += 1; stats[a].pts += 1; }
    }
  });

  return Object.values(stats)
    .sort((a: any, b: any) => b.pts - a.pts || b.v - a.v || b.sg - a.sg || b.gf - a.gf)
    .map((s: any) => s.id);
};
