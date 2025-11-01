// Static data extracted from HTML files for UI display
export interface Player {
  number: number;
  position: string;
  name: string;
  rating?: number | null;
  captain?: boolean;
  yellowCard?: number | null;
  redCard?: number | null;
}

export interface Lineup {
  formation?: string;
  players: Player[];
  substitutes: Player[];
  coach?: string;
}

export interface MatchStats {
  possession?: { home: number; away: number };
  expectedGoals?: { home: number; away: number };
  attack?: Record<string, { label: string; home: string; away: string }>;
  passing?: Record<string, { label: string; home: string; away: string }>;
  discipline?: Record<string, { label: string; home: string; away: string }>;
}

export interface HeadToHead {
  homeWins?: number;
  awayWins?: number;
  draws?: number;
  lastMeetings?: number;
  description?: string;
}

export interface StandingsEntry {
  position: number;
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form?: string[]; // Array of 'W', 'D', 'L'
  qualificationZone?: 'champions-league' | 'europa-league' | 'relegation' | null;
}

export interface RecentMatch {
  homeTeam: string;
  awayTeam: string;
  score: string;
  competition: string;
  date: string;
}

export interface TeamForm {
  position: number;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  form: string[]; // Last 5 matches: 'W', 'D', 'L'
  homeRecord?: {
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
  };
  awayRecord?: {
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
  };
  recentMatches?: RecentMatch[];
}

export interface Comment {
  id: string;
  author: string;
  avatar?: string;
  content: string;
  timestamp: string;
  likes?: number;
  replies?: Comment[];
}

export interface HighlightMatch {
  id: string;
  title: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  date: string;
  time?: string;
  score?: string;
  halftimeScore?: string;
  videoSrc?: string;
  venue?: string;
  referee?: string;
  category?: string;
  url?: string;
  stage?: string;
  lineups?: {
    home?: Lineup;
    away?: Lineup;
  };
  stats?: MatchStats;
  headToHead?: HeadToHead;
  standings?: StandingsEntry[];
  teamForm?: {
    home?: TeamForm;
    away?: TeamForm;
  };
  logos?: {
    league?: string;
    homeTeam?: string;
    awayTeam?: string;
  };
  comments?: Comment[];
}

// Mock data extracted from the HTML files
export const mockMatches: HighlightMatch[] = [
  {
    id: 'everton-tottenham-match-highlights-2025-10-26',
    title: 'Everton vs Tottenham',
    homeTeam: 'Everton',
    awayTeam: 'Tottenham',
    league: 'Premier League',
    date: 'October 26, 2025',
    time: '4:30 PM',
    score: '0 - 3',
    halftimeScore: '0 - 2',
    videoSrc: 'https://hoofootay4.spotlightmoment.com/embed/aZaAaQfgXwD1F',
    venue: 'Hill Dickinson Stadium',
    referee: 'Craig Pawson, England',
    stage: 'Regular Season - 9',
    category: 'Premier League',
    lineups: {
      home: {
        formation: '4-2-3-1',
        coach: 'David William Moyes',
        players: [
          { number: 1, position: 'G', name: 'Jordan Pickford', rating: 5.9 },
          { number: 16, position: 'D', name: 'Vitaliy Mykolenko', rating: 5.9 },
          { number: 5, position: 'D', name: 'Michael Keane', rating: 6.6 },
          { number: 6, position: 'D', name: 'James Tarkowski', captain: true, rating: 6.7 },
          { number: 15, position: 'D', name: 'Jake O\'Brien', rating: 6.2 },
          { number: 37, position: 'M', name: 'James Garner', rating: 7.3, yellowCard: 58 },
          { number: 27, position: 'M', name: 'Idrissa Gueye', rating: 6.9 },
          { number: 18, position: 'M', name: 'Jack Grealish', rating: 7.2, yellowCard: 71 },
          { number: 22, position: 'M', name: 'Kiernan Dewsbury-Hall', rating: 7.0 },
          { number: 10, position: 'M', name: 'Iliman Ndiaye', rating: 7.5 },
          { number: 9, position: 'F', name: 'Beto', rating: 6.2 },
        ],
        substitutes: [
          { number: 34, position: 'M', name: 'Merlin Röhl', rating: 6.0 },
          { number: 11, position: 'F', name: 'Thierno Barry', rating: 6.2 },
          { number: 24, position: 'M', name: 'Carlos Alcaraz', rating: 6.2 },
          { number: 12, position: 'G', name: 'Mark Travers' },
          { number: 23, position: 'D', name: 'Séamus Coleman' },
          { number: 39, position: 'D', name: 'Adam Aznou' },
          { number: 7, position: 'F', name: 'Dwight McNeil' },
          { number: 20, position: 'M', name: 'Tyler Dibling' },
          { number: 42, position: 'M', name: 'Tim Iroegbunam' },
        ],
      },
      away: {
        formation: '4-2-3-1',
        coach: 'Thomas Frank',
        players: [
          { number: 1, position: 'G', name: 'Guglielmo Vicario', rating: 7.9 },
          { number: 24, position: 'D', name: 'Djed Spence', rating: 6.3 },
          { number: 37, position: 'D', name: 'Micky van de Ven', captain: true, rating: 9.3 },
          { number: 4, position: 'D', name: 'Kevin Danso', rating: 8.2 },
          { number: 23, position: 'D', name: 'Pedro Porro', rating: 8.2 },
          { number: 30, position: 'M', name: 'Rodrigo Bentancur', rating: 7.0 },
          { number: 6, position: 'M', name: 'João Palhinha', rating: 7.5 },
          { number: 7, position: 'M', name: 'Xavi Simons', rating: 6.9 },
          { number: 20, position: 'M', name: 'Mohammed Kudus', rating: 6.5 },
          { number: 22, position: 'M', name: 'Brennan Johnson', rating: 6.6 },
          { number: 39, position: 'F', name: 'Randal Kolo Muani', rating: 6.2 },
        ],
        substitutes: [
          { number: 15, position: 'M', name: 'Pierre-Emile Højbjerg', rating: 6.5 },
          { number: 11, position: 'F', name: 'Richarlison', rating: 6.2 },
          { number: 9, position: 'F', name: 'Son Heung-min', rating: 6.5 },
          { number: 40, position: 'G', name: 'Brandon Austin' },
          { number: 38, position: 'D', name: 'Destiny Udogie' },
          { number: 29, position: 'D', name: 'Marcel Sabitzer' },
          { number: 14, position: 'M', name: 'Ivan Perišić' },
          { number: 19, position: 'F', name: 'Alejo Véliz' },
          { number: 18, position: 'M', name: 'Giovani Lo Celso' },
          { number: 36, position: 'F', name: 'Jun\'ai Byfield' },
          { number: 28, position: 'F', name: 'Wilson Odobert' },
          { number: 44, position: 'F', name: 'Dane Scarlett' },
        ],
      },
    },
    stats: {
      possession: { home: 53, away: 47 },
      expectedGoals: { home: 1.53, away: 2.08 },
      attack: {
        'Total shots': { label: 'Total shots', home: '12', away: '7' },
        'Shots on target': { label: 'Shots on target', home: '2', away: '4' },
        'Shots off target': { label: 'Shots off target', home: '5', away: '2' },
        'Blocked shots': { label: 'Blocked shots', home: '5', away: '1' },
        'Shots inside box': { label: 'Shots inside box', home: '8', away: '5' },
        'Shots outside box': { label: 'Shots outside box', home: '4', away: '2' },
        'Corner kicks': { label: 'Corner kicks', home: '9', away: '8' },
        'Offsides': { label: 'Offsides', home: '2', away: '2' },
      },
      passing: {
        'Total passes': { label: 'Total passes', home: '430', away: '388' },
        'Accurate passes': { label: 'Accurate passes', home: '365 (85%)', away: '324 (84%)' },
      },
      discipline: {
        'Fouls': { label: 'Fouls', home: '9', away: '8' },
        'Yellow cards': { label: 'Yellow cards', home: '2', away: '0' },
        'Red cards': { label: 'Red cards', home: '0', away: '0' },
        'Goalkeeper saves': { label: 'Goalkeeper saves', home: '1', away: '2' },
      },
    },
    headToHead: {
      homeWins: 3,
      awayWins: 4,
      draws: 0,
      lastMeetings: 7,
      description: 'In recent encounters, Everton have won 3 times while Tottenham have secured 4 victories, with no draws in their recent meetings.',
    },
    standings: [
      { position: 1, team: 'Arsenal', played: 8, won: 6, drawn: 1, lost: 1, goalsFor: 15, goalsAgainst: 3, goalDifference: 12, points: 19, form: ['W', 'D', 'W', 'W', 'W'], qualificationZone: 'champions-league' },
      { position: 2, team: 'Sunderland', played: 9, won: 5, drawn: 2, lost: 2, goalsFor: 11, goalsAgainst: 7, goalDifference: 4, points: 17, form: ['D', 'W', 'L', 'W', 'W'], qualificationZone: 'champions-league' },
      { position: 3, team: 'Manchester City', played: 8, won: 5, drawn: 1, lost: 2, goalsFor: 17, goalsAgainst: 6, goalDifference: 11, points: 16, form: ['W', 'D', 'W', 'W', 'W'], qualificationZone: 'champions-league' },
      { position: 4, team: 'Manchester United', played: 9, won: 5, drawn: 1, lost: 3, goalsFor: 15, goalsAgainst: 14, goalDifference: 1, points: 16, form: ['W', 'L', 'W', 'W', 'W'], qualificationZone: 'champions-league' },
      { position: 5, team: 'Liverpool', played: 8, won: 5, drawn: 0, lost: 3, goalsFor: 14, goalsAgainst: 11, goalDifference: 3, points: 15, form: ['W', 'W', 'L', 'L', 'L'], qualificationZone: 'europa-league' },
      { position: 6, team: 'Bournemouth', played: 8, won: 4, drawn: 3, lost: 1, goalsFor: 14, goalsAgainst: 11, goalDifference: 3, points: 15, form: ['W', 'D', 'D', 'W', 'D'], qualificationZone: 'europa-league' },
      { position: 7, team: 'Tottenham', played: 8, won: 4, drawn: 2, lost: 2, goalsFor: 14, goalsAgainst: 7, goalDifference: 7, points: 14, form: ['L', 'W', 'D', 'D', 'W'], qualificationZone: 'europa-league' },
      { position: 8, team: 'Chelsea', played: 9, won: 4, drawn: 2, lost: 3, goalsFor: 17, goalsAgainst: 11, goalDifference: 6, points: 14, form: ['L', 'L', 'W', 'W', 'L'] },
      { position: 9, team: 'Crystal Palace', played: 8, won: 3, drawn: 4, lost: 1, goalsFor: 12, goalsAgainst: 8, goalDifference: 4, points: 13, form: ['D', 'W', 'W', 'L', 'D'] },
      { position: 10, team: 'Newcastle', played: 9, won: 3, drawn: 3, lost: 3, goalsFor: 9, goalsAgainst: 8, goalDifference: 1, points: 12, form: ['D', 'L', 'W', 'L', 'W'] },
      { position: 11, team: 'Aston Villa', played: 8, won: 3, drawn: 3, lost: 2, goalsFor: 8, goalsAgainst: 8, goalDifference: 0, points: 12, form: ['D', 'D', 'W', 'W', 'W'] },
      { position: 12, team: 'Brighton', played: 9, won: 3, drawn: 3, lost: 3, goalsFor: 14, goalsAgainst: 15, goalDifference: -1, points: 12, form: ['D', 'W', 'D', 'W', 'L'] },
      { position: 13, team: 'Everton', played: 8, won: 3, drawn: 2, lost: 3, goalsFor: 9, goalsAgainst: 9, goalDifference: 0, points: 11, form: ['L', 'W', 'D', 'L', 'D'] },
      { position: 14, team: 'Leeds', played: 9, won: 3, drawn: 2, lost: 4, goalsFor: 9, goalsAgainst: 14, goalDifference: -5, points: 11, form: ['W', 'D', 'L', 'L', 'W'] },
      { position: 15, team: 'Brentford', played: 8, won: 3, drawn: 1, lost: 4, goalsFor: 11, goalsAgainst: 12, goalDifference: -1, points: 10, form: ['D', 'L', 'W', 'L', 'W'] },
      { position: 16, team: 'Fulham', played: 9, won: 2, drawn: 2, lost: 5, goalsFor: 9, goalsAgainst: 14, goalDifference: -5, points: 8, form: ['W', 'L', 'L', 'L', 'L'] },
      { position: 17, team: 'Burnley', played: 8, won: 2, drawn: 1, lost: 5, goalsFor: 9, goalsAgainst: 15, goalDifference: -6, points: 7, form: ['L', 'D', 'L', 'L', 'W'], qualificationZone: 'relegation' },
      { position: 18, team: 'Nottingham Forest', played: 8, won: 1, drawn: 2, lost: 5, goalsFor: 5, goalsAgainst: 15, goalDifference: -10, points: 5, form: ['L', 'D', 'L', 'L', 'L'], qualificationZone: 'relegation' },
      { position: 19, team: 'West Ham', played: 9, won: 1, drawn: 1, lost: 7, goalsFor: 7, goalsAgainst: 20, goalDifference: -13, points: 4, form: ['L', 'D', 'L', 'L', 'L'], qualificationZone: 'relegation' },
      { position: 20, team: 'Wolves', played: 8, won: 0, drawn: 2, lost: 6, goalsFor: 5, goalsAgainst: 16, goalDifference: -11, points: 2, form: ['L', 'L', 'D', 'D', 'L'], qualificationZone: 'relegation' },
    ],
    teamForm: {
      home: {
        position: 13,
        points: 11,
        played: 8,
        won: 3,
        drawn: 2,
        lost: 3,
        goalsFor: 9,
        goalsAgainst: 9,
        form: ['L', 'W', 'D', 'L', 'D'],
        homeRecord: {
          won: 2,
          drawn: 2,
          lost: 0,
          goalsFor: 5,
          goalsAgainst: 2,
        },
        recentMatches: [
          { homeTeam: 'Manchester City', awayTeam: 'Everton', score: '2-0', competition: 'Premier League', date: '18 Oct 2025' },
          { homeTeam: 'Everton', awayTeam: 'Crystal Palace', score: '2-1', competition: 'Premier League', date: '05 Oct 2025' },
          { homeTeam: 'Everton', awayTeam: 'West Ham', score: '1-1', competition: 'Premier League', date: '29 Sep 2025' },
          { homeTeam: 'Wolves', awayTeam: 'Everton', score: '2-0', competition: 'League Cup', date: '23 Sep 2025' },
          { homeTeam: 'Liverpool', awayTeam: 'Everton', score: '2-1', competition: 'Premier League', date: '20 Sep 2025' },
        ],
      },
      away: {
        position: 7,
        points: 14,
        played: 8,
        won: 4,
        drawn: 2,
        lost: 2,
        goalsFor: 14,
        goalsAgainst: 7,
        form: ['L', 'W', 'D', 'D', 'W'],
        awayRecord: {
          won: 3,
          drawn: 1,
          lost: 0,
          goalsFor: 9,
          goalsAgainst: 3,
        },
        recentMatches: [
          { homeTeam: 'Monaco', awayTeam: 'Tottenham', score: '0-0', competition: 'UEFA Champions League', date: '22 Oct 2025' },
          { homeTeam: 'Tottenham', awayTeam: 'Aston Villa', score: '1-2', competition: 'Premier League', date: '19 Oct 2025' },
          { homeTeam: 'Leeds', awayTeam: 'Tottenham', score: '1-2', competition: 'Premier League', date: '04 Oct 2025' },
          { homeTeam: 'Bodo/Glimt', awayTeam: 'Tottenham', score: '2-2', competition: 'UEFA Champions League', date: '30 Sep 2025' },
          { homeTeam: 'Tottenham', awayTeam: 'Wolves', score: '1-1', competition: 'Premier League', date: '27 Sep 2025' },
        ],
      },
    },
    comments: [
      {
        id: '1',
        author: 'FootballFan92',
        content: 'What a performance from Tottenham! Van de Ven was absolutely brilliant at the back. That defensive display was class.',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        likes: 12,
      },
      {
        id: '2',
        author: 'PremierLeagueEnthusiast',
        content: 'Everton really struggled to create chances in this one. Pickford had a tough game but that defense needs to step up.',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
        likes: 8,
      },
      {
        id: '3',
        author: 'SpursSupporter',
        content: 'Great away win! Three points on the road. We needed this after the last couple of results. COYS! 🔥',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
        likes: 25,
      },
      {
        id: '4',
        author: 'MatchAnalyst',
        content: 'The midfield battle was interesting - Garner had a decent game for Everton but Tottenham controlled the tempo well. Tactical masterclass from Frank.',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
        likes: 15,
      },
      {
        id: '5',
        author: 'ToffeeBlues',
        content: 'Tough loss but we move on. Onwards and upwards! Still early in the season.',
        timestamp: new Date(Date.now() - 15 * 60 * 60 * 1000).toISOString(), // 15 hours ago
        likes: 6,
      },
    ],
  },
  {
    id: 'fc-augsburg-borussia-dortmund-match-highlights-2025-10-31',
    title: 'FC Augsburg vs Borussia Dortmund',
    homeTeam: 'FC Augsburg',
    awayTeam: 'Borussia Dortmund',
    league: 'Bundesliga',
    date: 'October 31, 2025',
    category: 'Bundesliga',
    url: 'https://dasfootball.com/fc-augsburg-borussia-dortmund-match-highlights-2025-10-31/',
  },
  {
    id: '1-fc-koln-bayern-munchen-match-highlights-2025-10-29',
    title: '1.FC Köln vs Bayern München',
    homeTeam: '1.FC Köln',
    awayTeam: 'Bayern München',
    league: 'DFB Pokal 23/24',
    date: 'October 29, 2025',
    category: 'DFB Pokal 23/24',
    url: 'https://dasfootball.com/1-fc-koln-bayern-munchen-match-highlights-2025-10-29/',
  },
  {
    id: 'newcastle-tottenham-match-highlights-2025-10-29',
    title: 'Newcastle vs Tottenham',
    homeTeam: 'Newcastle',
    awayTeam: 'Tottenham',
    league: 'EFL Cup 2023-2024',
    date: 'October 29, 2025',
    category: 'EFL Cup 2023-2024',
    url: 'https://dasfootball.com/newcastle-tottenham-match-highlights-2025-10-29/',
  },
  {
    id: 'wolves-chelsea-match-highlights-2025-10-29',
    title: 'Wolves vs Chelsea',
    homeTeam: 'Wolves',
    awayTeam: 'Chelsea',
    league: 'Europa Conference League',
    date: 'October 29, 2025',
    category: 'Europa Conference League',
    url: 'https://dasfootball.com/wolves-chelsea-match-highlights-2025-10-29/',
  },
  {
    id: 'swansea-manchester-city-match-highlights-2025-10-29',
    title: 'Swansea vs Manchester City',
    homeTeam: 'Swansea',
    awayTeam: 'Manchester City',
    league: 'EFL Cup 2023-2024',
    date: 'October 29, 2025',
    category: 'EFL Cup 2023-2024',
    url: 'https://dasfootball.com/swansea-manchester-city-match-highlights-2025-10-29/',
  },
  {
    id: 'inter-fiorentina-match-highlights-2025-10-29',
    title: 'Inter vs Fiorentina',
    homeTeam: 'Inter',
    awayTeam: 'Fiorentina',
    league: 'Serie A highlights',
    date: 'October 29, 2025',
    category: 'Serie A highlights',
    url: 'https://dasfootball.com/inter-fiorentina-match-highlights-2025-10-29/',
  },
  {
    id: 'bologna-torino-match-highlights-2025-10-29',
    title: 'Bologna vs Torino',
    homeTeam: 'Bologna',
    awayTeam: 'Torino',
    league: 'Serie A highlights',
    date: 'October 29, 2025',
    category: 'Serie A highlights',
    url: 'https://dasfootball.com/bologna-torino-match-highlights-2025-10-29/',
  },
  {
    id: 'liverpool-crystal-palace-match-highlights-2025-10-29',
    title: 'Liverpool vs Crystal Palace',
    homeTeam: 'Liverpool',
    awayTeam: 'Crystal Palace',
    league: 'EFL Cup 2023-2024',
    date: 'October 29, 2025',
    category: 'EFL Cup 2023-2024',
    url: 'https://dasfootball.com/liverpool-crystal-palace-match-highlights-2025-10-29/',
  },
  {
    id: 'arsenal-brighton-match-highlights-2025-10-29',
    title: 'Arsenal vs Brighton',
    homeTeam: 'Arsenal',
    awayTeam: 'Brighton',
    league: 'EFL Cup 2023-2024',
    date: 'October 29, 2025',
    category: 'EFL Cup 2023-2024',
    url: 'https://dasfootball.com/arsenal-brighton-match-highlights-2025-10-29/',
  },
  {
    id: 'sc-paderborn-07-bayer-leverkusen-match-highlights-2025-10-29',
    title: 'SC Paderborn 07 vs Bayer Leverkusen',
    homeTeam: 'SC Paderborn 07',
    awayTeam: 'Bayer Leverkusen',
    league: 'Uncategorized',
    date: 'October 29, 2025',
    category: 'Uncategorized',
    url: 'https://dasfootball.com/sc-paderborn-07-bayer-leverkusen-match-highlights-2025-10-29/',
  },
  {
    id: 'como-verona-match-highlights-2025-10-29',
    title: 'Como vs Verona',
    homeTeam: 'Como',
    awayTeam: 'Verona',
    league: 'Serie A highlights',
    date: 'October 29, 2025',
    category: 'Serie A highlights',
    url: 'https://dasfootball.com/como-verona-match-highlights-2025-10-29/',
  },
  {
    id: 'lorient-paris-saint-germain-match-highlights-2025-10-29',
    title: 'Lorient vs Paris Saint Germain',
    homeTeam: 'Lorient',
    awayTeam: 'Paris Saint Germain',
    league: 'Ligue 1 Highlights',
    date: 'October 29, 2025',
    category: 'Ligue 1 Highlights',
    url: 'https://dasfootball.com/lorient-paris-saint-germain-match-highlights-2025-10-29/',
  },
  {
    id: 'juventus-udinese-match-highlights-2025-10-29',
    title: 'Juventus vs Udinese',
    homeTeam: 'Juventus',
    awayTeam: 'Udinese',
    league: 'Serie A highlights',
    date: 'October 29, 2025',
    category: 'Serie A highlights',
    url: 'https://dasfootball.com/juventus-udinese-match-highlights-2025-10-29/',
  },
  {
    id: 'as-roma-parma-match-highlights-2025-10-29',
    title: 'AS Roma vs Parma',
    homeTeam: 'AS Roma',
    awayTeam: 'Parma',
    league: 'Serie A highlights',
    date: 'October 29, 2025',
    category: 'Serie A highlights',
    url: 'https://dasfootball.com/as-roma-parma-match-highlights-2025-10-29/',
  },
  {
    id: 'fc-augsburg-vfl-bochum-match-highlights-2025-10-28',
    title: 'FC Augsburg vs VfL Bochum',
    homeTeam: 'FC Augsburg',
    awayTeam: 'VfL Bochum',
    league: 'DFB Pokal 23/24',
    date: 'October 28, 2025',
    category: 'DFB Pokal 23/24',
    url: 'https://dasfootball.com/fc-augsburg-vfl-bochum-match-highlights-2025-10-28/',
  },
  {
    id: 'borussia-monchengladbach-karlsruher-sc-match-highlights-2025-10-28',
    title: 'Borussia Mönchengladbach vs Karlsruher SC',
    homeTeam: 'Borussia Mönchengladbach',
    awayTeam: 'Karlsruher SC',
    league: 'DFB Pokal 23/24',
    date: 'October 28, 2025',
    category: 'DFB Pokal 23/24',
    url: 'https://dasfootball.com/borussia-monchengladbach-karlsruher-sc-match-highlights-2025-10-28/',
  },
  {
    id: 'vfl-wolfsburg-holstein-kiel-match-highlights-2025-10-28',
    title: 'VfL Wolfsburg vs Holstein Kiel',
    homeTeam: 'VfL Wolfsburg',
    awayTeam: 'Holstein Kiel',
    league: 'DFB Pokal 23/24',
    date: 'October 28, 2025',
    category: 'DFB Pokal 23/24',
    url: 'https://dasfootball.com/vfl-wolfsburg-holstein-kiel-match-highlights-2025-10-28/',
  },
  {
    id: 'energie-cottbus-rb-leipzig-match-highlights-2025-10-28',
    title: 'Energie Cottbus vs RB Leipzig',
    homeTeam: 'Energie Cottbus',
    awayTeam: 'RB Leipzig',
    league: 'DFB Pokal 23/24',
    date: 'October 28, 2025',
    category: 'DFB Pokal 23/24',
    url: 'https://dasfootball.com/energie-cottbus-rb-leipzig-match-highlights-2025-10-28/',
  },
  {
    id: 'wrexham-cardiff-match-highlights-2025-10-28',
    title: 'Wrexham vs Cardiff',
    homeTeam: 'Wrexham',
    awayTeam: 'Cardiff',
    league: 'EFL Cup 2023-2024',
    date: 'October 28, 2025',
    category: 'EFL Cup 2023-2024',
    url: 'https://dasfootball.com/wrexham-cardiff-match-highlights-2025-10-28/',
  },
  {
    id: 'wycombe-fulham-match-highlights-2025-10-28',
    title: 'Wycombe vs Fulham',
    homeTeam: 'Wycombe',
    awayTeam: 'Fulham',
    league: 'EFL Cup 2023-2024',
    date: 'October 28, 2025',
    category: 'EFL Cup 2023-2024',
    url: 'https://dasfootball.com/wycombe-fulham-match-highlights-2025-10-28/',
  },
];

