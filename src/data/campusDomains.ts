export interface CampusInfo {
  id: string;
  name: string;
}

export const CAMPUS_DOMAINS: Record<string, CampusInfo> = {
  'nyu.edu':           { id: 'nyu',       name: 'New York University' },
  'columbia.edu':      { id: 'columbia',  name: 'Columbia University' },
  'newschool.edu':     { id: 'newschool', name: 'The New School' },
  'fordham.edu':       { id: 'fordham',   name: 'Fordham University' },
  'pace.edu':          { id: 'pace',      name: 'Pace University' },
  'baruch.cuny.edu':   { id: 'baruch',    name: 'Baruch College' },
  'hunter.cuny.edu':   { id: 'hunter',    name: 'Hunter College' },
  'pratt.edu':         { id: 'pratt',     name: 'Pratt Institute' },
  'parsons.edu':       { id: 'parsons',   name: 'Parsons School of Design' },
  'fitnyc.edu':        { id: 'fit',       name: 'Fashion Institute of Technology' },
  'berkeley.edu':      { id: 'berkeley',  name: 'UC Berkeley' },
};

export function detectCampusFromEmail(email: string): CampusInfo | null {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? (CAMPUS_DOMAINS[domain] ?? null) : null;
}
