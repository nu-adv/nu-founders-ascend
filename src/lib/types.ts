export type MatchStatus =
  | 'CONFIRMED'
  | 'PROBABLE'
  | 'POSSIBLE'
  | 'UNVERIFIED'
  | 'AMBIGUOUS'
  | 'NOT CHECKED'
  | 'NOT FOUND'

export type Category = 'in_ascend' | 'review' | 'not_found'

export interface Evidence {
  kind: string
  label: string
  text: string
}

export interface AscendMatch {
  name: string
  constituentId: string
  householdId: string
  householdName: string
  contactUrl: string
  householdUrl: string
  employer: string
  jobTitle: string
  type: string
  degree: string
  major: string
  college: string
  degreeYear: string
  primaryEmail: string
  primaryAddress: string
  jobHistory: string[]
  emails: string[]
  addresses: string[]
  otherNames: string[]
}

export interface PitchBookRecord {
  row: string
  name: string
  position: string
  company: string
  companyType: string
  companyWebsite: string
  email: string
  phone: string
  linkedin: string
  location: string
  address: string
  city: string
  state: string
  country: string
  roles: string
  boardSeats: string
  dealRoles: string
}

export interface WebsiteRecord {
  id: string
  name: string
  title: string
  headline: string
  currentTitle: string
  currentCompany: string
  basedIn: string
  emails: string[]
  linkedin: string
  degree: string
  degreeShort: string
  classOf: string
  field: string
  years: string
  confidence: string
  company: string
  companyRole: string
  tier: string
  sector: string
  industry: string
  hq: string
  employees: string
  founded: string
  companyType: string
  funding: string
  stage: string
  lastRound: string
  investors: string
  revenue: string
  status: string
  website: string
  companyLinkedin: string
}

export interface OtherCandidate {
  name: string
  constituentId: string
  employer: string
  jobTitle: string
  type: string
  degreeYear: string
  verdict: string
  contactUrl: string
}

export interface Founder {
  id: string
  name: string
  first: string
  last: string
  aliases: string[]
  sources: string[] // "PitchBook" | "Website"
  status: MatchStatus
  category: Category
  title: string
  company: string
  emails: string[]
  linkedin: string
  city: string
  state: string
  location: string
  degree: string
  classOf: string
  field: string
  tier: string
  sector: string
  funding: string
  pitchbook: PitchBookRecord[]
  website: WebsiteRecord[]
  ascend: AscendMatch | null
  evidence: Evidence[]
  others: OtherCandidate[]
  note: string
  searches: string[]
}

export interface FoundersData {
  generated: string
  founders: Founder[]
}

/** A reviewer's own call on a "needs review" row; stored in this browser only. */
export type DecisionValue = 'match' | 'not_match' | 'unsure'
export interface Decision {
  value: DecisionValue
  note?: string
  at: string
}
export type Decisions = Record<string, Decision>
