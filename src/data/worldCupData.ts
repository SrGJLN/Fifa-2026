/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Team, Match } from '../types';

export const TEAMS: Team[] = [
  // Grupo A
  { id: 'MEX', name: 'México', flag: '🇲🇽' },
  { id: 'RSA', name: 'Sudáfrica', flag: '🇿🇦' },
  { id: 'KOR', name: 'Corea del Sur', flag: '🇰🇷' },
  { id: 'CZE', name: 'Chequia', flag: '🇨🇿' },
  // Grupo B
  { id: 'CAN', name: 'Canadá', flag: '🇨🇦' },
  { id: 'BIH', name: 'Bosnia y Herzegovina', flag: '🇧🇦' },
  { id: 'QAT', name: 'Catar', flag: '🇶🇦' },
  { id: 'SUI', name: 'Suiza', flag: '🇨🇭' },
  // Grupo C
  { id: 'BRA', name: 'Brasil', flag: '🇧🇷' },
  { id: 'MAR', name: 'Marruecos', flag: '🇲🇦' },
  { id: 'HAI', name: 'Haití', flag: '🇭🇹' },
  { id: 'SCO', name: 'Escocia', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  // Grupo D
  { id: 'USA', name: 'Estados Unidos', flag: '🇺🇸' },
  { id: 'PAR', name: 'Paraguay', flag: '🇵🇾' },
  { id: 'AUS', name: 'Australia', flag: '🇦🇺' },
  { id: 'TUR', name: 'Turquía', flag: '🇹🇷' },
  // Grupo E
  { id: 'GER', name: 'Alemania', flag: '🇩🇪' },
  { id: 'CUW', name: 'Curazao', flag: '🇨🇼' },
  { id: 'CIV', name: 'Costa de Marfil', flag: '🇨🇮' },
  { id: 'ECU', name: 'Ecuador', flag: '🇪🇨' },
  // Grupo F
  { id: 'NED', name: 'Países Bajos', flag: '🇳🇱' },
  { id: 'JPN', name: 'Japón', flag: '🇯🇵' },
  { id: 'SWE', name: 'Suecia', flag: '🇸🇪' },
  { id: 'TUN', name: 'Túnez', flag: '🇹🇳' },
  // Grupo G
  { id: 'BEL', name: 'Bélgica', flag: '🇧🇪' },
  { id: 'EGY', name: 'Egipto', flag: '🇪🇬' },
  { id: 'IRN', name: 'Irán', flag: '🇮🇷' },
  { id: 'NZL', name: 'Nueva Zelanda', flag: '🇳🇿' },
  // Grupo H
  { id: 'ESP', name: 'España', flag: '🇪🇸' },
  { id: 'CPV', name: 'Cabo Verde', flag: '🇨🇻' },
  { id: 'KSA', name: 'Arabia Saudita', flag: '🇸🇦' },
  { id: 'URU', name: 'Uruguay', flag: '🇺🇾' },
  // Grupo I
  { id: 'FRA', name: 'Francia', flag: '🇫🇷' },
  { id: 'SEN', name: 'Senegal', flag: '🇸🇳' },
  { id: 'IRQ', name: 'Irak', flag: '🇮🇶' },
  { id: 'NOR', name: 'Noruega', flag: '🇳🇴' },
  // Grupo J
  { id: 'ARG', name: 'Argentina', flag: '🇦🇷' },
  { id: 'ALG', name: 'Argelia', flag: '🇩🇿' },
  { id: 'AUT', name: 'Austria', flag: '🇦🇹' },
  { id: 'JOR', name: 'Jordania', flag: '🇯🇴' },
  // Grupo K
  { id: 'POR', name: 'Portugal', flag: '🇵🇹' },
  { id: 'COD', name: 'RD Congo', flag: '🇨🇩' },
  { id: 'UZB', name: 'Uzbekistán', flag: '🇺🇿' },
  { id: 'COL', name: 'Colombia', flag: '🇨🇴' },
  // Grupo L
  { id: 'ENG', name: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: 'CRO', name: 'Croacia', flag: '🇭🇷' },
  { id: 'GHA', name: 'Ghana', flag: '🇬🇭' },
  { id: 'PAN', name: 'Panamá', flag: '🇵🇦' }
];

export const GROUPS: { [key: string]: string[] } = {
  A: ['MEX', 'RSA', 'KOR', 'CZE'],
  B: ['CAN', 'BIH', 'QAT', 'SUI'],
  C: ['BRA', 'MAR', 'HAI', 'SCO'],
  D: ['USA', 'PAR', 'AUS', 'TUR'],
  E: ['GER', 'CUW', 'CIV', 'ECU'],
  F: ['NED', 'JPN', 'SWE', 'TUN'],
  G: ['BEL', 'EGY', 'IRN', 'NZL'],
  H: ['ESP', 'CPV', 'KSA', 'URU'],
  I: ['FRA', 'SEN', 'IRQ', 'NOR'],
  J: ['ARG', 'ALG', 'AUT', 'JOR'],
  K: ['POR', 'COD', 'UZB', 'COL'],
  L: ['ENG', 'CRO', 'GHA', 'PAN']
};

export const CITIES_VENUES = [
  { city: 'Ciudad de México', venue: 'Estadio Azteca' },
  { city: 'Los Ángeles', venue: 'SoFi Stadium' },
  { city: 'New York / New Jersey', venue: 'MetLife Stadium' },
  { city: 'Toronto', venue: 'BMO Field' },
  { city: 'Vancouver', venue: 'BC Place' },
  { city: 'Dallas', venue: 'AT&T Stadium' },
  { city: 'Monterrey', venue: 'Estadio BBVA' },
  { city: 'Guadalajara', venue: 'Estadio Akron' },
  { city: 'Miami', venue: 'Hard Rock Stadium' },
  { city: 'Atlanta', venue: 'Mercedes-Benz Stadium' },
  { city: 'San Francisco Bay Area', venue: 'Levi\'s Stadium' },
  { city: 'Seattle', venue: 'Lumen Field' },
  { city: 'Boston', venue: 'Gillette Stadium' },
  { city: 'Houston', venue: 'NRG Stadium' },
  { city: 'Philadelphia', venue: 'Lincoln Financial Field' },
  { city: 'Kansas City', venue: 'Arrowhead Stadium' }
];

export const getTeamName = (id: string): string => {
  const team = TEAMS.find(t => t.id === id);
  return team ? team.name : id;
};

export const getTeamFlag = (id: string): string => {
  const team = TEAMS.find(t => t.id === id);
  return team ? team.flag : '🌐';
};

export const generateGroupMatches = (): Match[] => {
  const matches: Match[] = [];
  let matchId = 1;
  const groupLabels = Object.keys(GROUPS);

  groupLabels.forEach((gLabel, groupIdx) => {
    const teamsInGroup = GROUPS[gLabel];
    const groupMatchups = [
      { homeIdx: 0, awayIdx: 1, dayOffset: 0, hour: '10:00' },
      { homeIdx: 2, awayIdx: 3, dayOffset: 0, hour: '13:00' },
      { homeIdx: 0, awayIdx: 2, dayOffset: 4, hour: '16:00' },
      { homeIdx: 1, awayIdx: 3, dayOffset: 4, hour: '19:00' },
      { homeIdx: 0, awayIdx: 3, dayOffset: 8, hour: '18:00' },
      { homeIdx: 1, awayIdx: 2, dayOffset: 8, hour: '20:00' }
    ];

    groupMatchups.forEach((mInfo, mIdx) => {
      const homeTeamId = teamsInGroup[mInfo.homeIdx];
      const awayTeamId = teamsInGroup[mInfo.awayIdx];
      const venueIdx = (groupIdx * 2 + mIdx) % CITIES_VENUES.length;
      const venueInfo = CITIES_VENUES[venueIdx];
      const day = 11 + mInfo.dayOffset + Math.floor(groupIdx / 2);
      const dateText = `${day} jun`;

      matches.push({
        id: matchId++,
        stage: 'group',
        groupLabel: gLabel,
        teamHomeId: homeTeamId,
        teamAwayId: awayTeamId,
        date: dateText,
        time: mInfo.hour,
        venue: venueInfo.venue,
        city: venueInfo.city,
        completed: false
      });
    });
  });

  return matches;
};

export const generateR32Matches = (): Match[] => {
  const pairings = [
    { id: 101, home: 'RSA', away: 'CAN', date: '29 jun', time: '15:00', city: 'Ciudad de México', venue: 'Estadio Azteca' },
    { id: 102, home: 'NED', away: 'MAR', date: '29 jun', time: '21:00', city: 'Los Ángeles', venue: 'SoFi Stadium' },
    { id: 103, home: 'GER', away: 'PAR', date: '30 jun', time: '16:30', city: 'Dallas', venue: 'AT&T Stadium' },
    { id: 104, home: 'CIV', away: 'NOR', date: '30 jun', time: '13:00', city: 'Miami', venue: 'Hard Rock Stadium' },
    { id: 105, home: 'MEX', away: 'ECU', date: '30 jun', time: '21:00', city: 'Atlanta', venue: 'Mercedes-Benz Stadium' },
    { id: 106, home: 'FRA', away: 'SWE', date: '30 jun', time: '17:00', city: 'Houston', venue: 'NRG Stadium' },
    { id: 107, home: 'BEL', away: 'SEN', date: '1 jul', time: '16:00', city: 'Philadelphia', venue: 'Lincoln Financial Field' },
    { id: 108, home: 'USA', away: 'BIH', date: '1 jul', time: '20:00', city: 'Kansas City', venue: 'Arrowhead Stadium' },
    { id: 109, home: 'ESP', away: 'AUT', date: '2 jul', time: '15:00', city: 'Seattle', venue: 'Lumen Field' },
    { id: 110, home: 'POR', away: 'CRO', date: '2 jul', time: '19:00', city: 'Boston', venue: 'Gillette Stadium' },
    { id: 111, home: 'BRA', away: 'JPN', date: '2 jul', time: '13:00', city: 'Vancouver', venue: 'BC Place' },
    { id: 112, home: 'SUI', away: 'ALG', date: '2 jul', time: '23:00', city: 'San Francisco Bay Area', venue: 'Levi\'s Stadium' },
    { id: 113, home: 'COL', away: 'GHA', date: '3 jul', time: '21:30', city: 'Toronto', venue: 'BMO Field' },
    { id: 114, home: 'AUS', away: 'EGY', date: '3 jul', time: '14:00', city: 'Monterrey', venue: 'Estadio BBVA' },
    { id: 115, home: 'ARG', away: 'CPV', date: '3 jul', time: '18:00', city: 'Guadalajara', venue: 'Estadio Akron' },
    { id: 116, home: 'ENG', away: 'COD', date: '3 jul', time: '12:00', city: 'New York / New Jersey', venue: 'MetLife Stadium' },
  ];

  return pairings.map(p => ({
    id: p.id,
    stage: 'r32',
    teamHomeId: p.home,
    teamAwayId: p.away,
    date: p.date,
    time: p.time,
    venue: p.venue,
    city: p.city,
    completed: false
  }));
};

export const generateR16Matches = (): Match[] => {
  const pairings = [
    { id: 201, home: 'MAR', away: 'CAN', date: '4 jul', time: '13:00', city: 'Los Ángeles', venue: 'SoFi Stadium' },
    { id: 202, home: 'PAR', away: 'FRA', date: '4 jul', time: '19:00', city: 'Houston', venue: 'NRG Stadium' },
    { id: 203, home: 'USA', away: 'BEL', date: '5 jul', time: '13:00', city: 'Dallas', venue: 'AT&T Stadium' },
    { id: 204, home: 'POR', away: 'ESP', date: '5 jul', time: '19:00', city: 'Atlanta', venue: 'Mercedes-Benz Stadium' },
    { id: 205, home: 'BRA', away: 'NOR', date: '6 jul', time: '13:00', city: 'Vancouver', venue: 'BC Place' },
    { id: 206, home: 'MEX', away: 'ENG', date: '6 jul', time: '19:00', city: 'Seattle', venue: 'Lumen Field' },
    { id: 207, home: 'SUI', away: 'COL', date: '7 jul', time: '13:00', city: 'Philadelphia', venue: 'Lincoln Financial Field' },
    { id: 208, home: 'ARG', away: 'EGY', date: '7 jul', time: '19:00', city: 'New York / New Jersey', venue: 'MetLife Stadium' },
  ];

  return pairings.map(p => ({
    id: p.id,
    stage: 'r16',
    teamHomeId: p.home,
    teamAwayId: p.away,
    date: p.date,
    time: p.time,
    venue: p.venue,
    city: p.city,
    completed: false
  }));
};

export const generateQFMatches = (): Match[] => {
  const pairings = [
    { id: 301, home: 'G201', away: 'G202', city: 'Boston', venue: 'Gillette Stadium' },
    { id: 302, home: 'G203', away: 'G204', city: 'Miami', venue: 'Hard Rock Stadium' },
    { id: 303, home: 'G205', away: 'G206', city: 'Los Ángeles', venue: 'SoFi Stadium' },
    { id: 304, home: 'G207', away: 'G208', city: 'Kansas City', venue: 'Arrowhead Stadium' }
  ];

  return pairings.map((p, idx) => ({
    id: p.id,
    stage: 'qf',
    teamHomeId: p.home,
    teamAwayId: p.away,
    date: `${9 + Math.floor(idx / 2)} jul`,
    time: idx % 2 === 0 ? '16:00' : '20:00',
    venue: p.venue,
    city: p.city,
    completed: false
  }));
};

export const generateSFMatches = (): Match[] => {
  return [
    {
      id: 401,
      stage: 'sf',
      teamHomeId: 'G301',
      teamAwayId: 'G302',
      date: '14 jul',
      time: '19:00',
      venue: 'AT&T Stadium',
      city: 'Dallas',
      completed: false
    },
    {
      id: 402,
      stage: 'sf',
      teamHomeId: 'G303',
      teamAwayId: 'G304',
      date: '15 jul',
      time: '19:00',
      venue: 'Mercedes-Benz Stadium',
      city: 'Atlanta',
      completed: false
    }
  ];
};

export const generateThirdPlaceMatch = (): Match[] => {
  return [
    {
      id: 501,
      stage: 'third',
      teamHomeId: 'P401',
      teamAwayId: 'P402',
      date: '18 jul',
      time: '15:00',
      venue: 'Hard Rock Stadium',
      city: 'Miami',
      completed: false
    }
  ];
};

export const generateFinalMatch = (): Match[] => {
  return [
    {
      id: 601,
      stage: 'final',
      teamHomeId: 'G401',
      teamAwayId: 'G402',
      date: '19 jul',
      time: '16:00',
      venue: 'MetLife Stadium',
      city: 'New York / New Jersey',
      completed: false
    }
  ];
};

export const ALL_INITIAL_MATCHES = [
  ...generateGroupMatches(),
  ...generateR32Matches(),
  ...generateR16Matches(),
  ...generateQFMatches(),
  ...generateSFMatches(),
  ...generateThirdPlaceMatch(),
  ...generateFinalMatch()
];
