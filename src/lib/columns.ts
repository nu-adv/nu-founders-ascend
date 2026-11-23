import type { Category, Decision, Founder, MatchStatus } from './types'

export const STATUS_LABEL: Record<MatchStatus, string> = {
  CONFIRMED: 'In ascend',
  PROBABLE: 'Probable',
  POSSIBLE: 'Possible',
  UNVERIFIED: 'Name only',
  AMBIGUOUS: 'Ambiguous',
  'NOT CHECKED': 'Not checked',
  'NOT FOUND': 'Not in ascend',
}

export const STATUS_HINT: Record<MatchStatus, string> = {
  CONFIRMED: 'Verified as the same person in ascend',
  PROBABLE: 'Found by name, several details agree',
  POSSIBLE: 'Found by name, few details agree',
  UNVERIFIED: 'Found by name only, nothing else agrees',
  AMBIGUOUS: 'More than one ascend record matches',
  'NOT CHECKED': 'Could not be searched automatically',
  'NOT FOUND': 'No matching constituent in ascend',
}

export const CATEGORY_LABEL: Record<Category, string> = {
  in_ascend: 'In ascend',
  review: 'Needs review',
  not_found: 'Not in ascend',
}

export const DECISION_LABEL: Record<Decision['value'], string> = {
  match: 'Match',
  not_match: 'Not a match',
  unsure: 'Unsure',
}

export type ColumnGroup = 'Person' | 'ascend' | 'Northeastern' | 'Company' | 'Sources' | 'Review'

export interface ColumnDef {
  id: string
  label: string
  group: ColumnGroup
  /** Plain-text value used for export, search and sorting. */
  value: (f: Founder, d?: Decision) => string
  /** Width in px for the list view (when shown there). */
  width: number
  /** Excel column width in characters. */
  xlsxWidth: number
  mono?: boolean
  /** Can be shown as a column in the list view. */
  inList?: boolean
  /** Visible in the list view by default. */
  defaultVisible?: boolean
}

const j = (xs: string[] | undefined, sep = '; ') => (xs ?? []).filter(Boolean).join(sep)
const firstWeb = (f: Founder) => f.website[0]
const firstPb = (f: Founder) => f.pitchbook[0]

export const COLUMNS: ColumnDef[] = [
  // Person
  { id: 'name', label: 'Full Name', group: 'Person', value: (f) => f.name, width: 280, xlsxWidth: 28, inList: true, defaultVisible: true },
  { id: 'first', label: 'First Name', group: 'Person', value: (f) => f.first, width: 130, xlsxWidth: 16, inList: true },
  { id: 'last', label: 'Last Name', group: 'Person', value: (f) => f.last, width: 140, xlsxWidth: 18, inList: true },
  { id: 'status', label: 'Match status', group: 'ascend', value: (f) => STATUS_LABEL[f.status], width: 140, xlsxWidth: 16, inList: true, defaultVisible: true },
  // ascend IDs
  { id: 'constituentId', label: 'Constituent ascend ID', group: 'ascend', value: (f) => f.ascend?.constituentId ?? '', width: 150, xlsxWidth: 20, mono: true, inList: true, defaultVisible: true },
  { id: 'householdId', label: 'Household ascend ID', group: 'ascend', value: (f) => f.ascend?.householdId ?? '', width: 150, xlsxWidth: 20, mono: true, inList: true, defaultVisible: true },
  { id: 'householdName', label: 'Household', group: 'ascend', value: (f) => f.ascend?.householdName ?? '', width: 200, xlsxWidth: 26, inList: true },
  { id: 'ascendName', label: 'Name in ascend', group: 'ascend', value: (f) => f.ascend?.name ?? '', width: 220, xlsxWidth: 28, inList: true },
  { id: 'ascendType', label: 'Constituent type', group: 'ascend', value: (f) => f.ascend?.type ?? '', width: 140, xlsxWidth: 16, inList: true },
  { id: 'ascendEmployer', label: 'ascend employer', group: 'ascend', value: (f) => f.ascend?.employer ?? '', width: 200, xlsxWidth: 26, inList: true },
  { id: 'ascendJobTitle', label: 'ascend job title', group: 'ascend', value: (f) => f.ascend?.jobTitle ?? '', width: 220, xlsxWidth: 30 },
  { id: 'ascendDegree', label: 'ascend degree', group: 'ascend', value: (f) => [f.ascend?.degree, f.ascend?.major].filter(Boolean).join(', '), width: 220, xlsxWidth: 30 },
  { id: 'ascendYear', label: 'ascend degree year', group: 'ascend', value: (f) => f.ascend?.degreeYear ?? '', width: 110, xlsxWidth: 12, inList: true },
  { id: 'ascendEmails', label: 'ascend emails', group: 'ascend', value: (f) => j(f.ascend?.emails), width: 260, xlsxWidth: 40 },
  { id: 'ascendAddresses', label: 'ascend addresses', group: 'ascend', value: (f) => j(f.ascend?.addresses, ' | '), width: 300, xlsxWidth: 60 },
  { id: 'jobHistory', label: 'ascend job history', group: 'ascend', value: (f) => j(f.ascend?.jobHistory), width: 300, xlsxWidth: 50 },
  { id: 'evidence', label: 'Why it matches', group: 'ascend', value: (f) => f.evidence.map((e) => `${e.label}: ${e.text}`).join('; '), width: 320, xlsxWidth: 70 },
  { id: 'contactUrl', label: 'ascend constituent link', group: 'ascend', value: (f) => f.ascend?.contactUrl ?? '', width: 260, xlsxWidth: 40 },
  { id: 'householdUrl', label: 'ascend household link', group: 'ascend', value: (f) => f.ascend?.householdUrl ?? '', width: 260, xlsxWidth: 40 },
  // Company & role
  { id: 'title', label: 'Title', group: 'Company', value: (f) => f.title, width: 240, xlsxWidth: 34, inList: true },
  { id: 'company', label: 'Company', group: 'Company', value: (f) => f.company, width: 200, xlsxWidth: 28, inList: true, defaultVisible: true },
  { id: 'tier', label: 'Tier', group: 'Company', value: (f) => f.tier, width: 90, xlsxWidth: 10, inList: true },
  { id: 'sector', label: 'Sector', group: 'Company', value: (f) => f.sector, width: 180, xlsxWidth: 24, inList: true },
  { id: 'funding', label: 'Funding', group: 'Company', value: (f) => f.funding, width: 100, xlsxWidth: 12, inList: true },
  { id: 'companyType', label: 'Company type', group: 'Company', value: (f) => firstPb(f)?.companyType || firstWeb(f)?.companyType || '', width: 160, xlsxWidth: 20 },
  { id: 'companyWebsite', label: 'Company website', group: 'Company', value: (f) => firstPb(f)?.companyWebsite || firstWeb(f)?.website || '', width: 200, xlsxWidth: 28 },
  // Contact & location
  { id: 'email', label: 'Email', group: 'Person', value: (f) => f.emails[0] ?? '', width: 240, xlsxWidth: 32, inList: true, defaultVisible: true },
  { id: 'allEmails', label: 'All source emails', group: 'Person', value: (f) => j(f.emails), width: 300, xlsxWidth: 50 },
  { id: 'phone', label: 'Phone', group: 'Person', value: (f) => firstPb(f)?.phone ?? '', width: 150, xlsxWidth: 18 },
  { id: 'linkedin', label: 'LinkedIn', group: 'Person', value: (f) => f.linkedin, width: 220, xlsxWidth: 36 },
  { id: 'location', label: 'Location', group: 'Person', value: (f) => f.location, width: 180, xlsxWidth: 26, inList: true, defaultVisible: true },
  { id: 'city', label: 'City', group: 'Person', value: (f) => f.city, width: 130, xlsxWidth: 16 },
  { id: 'state', label: 'State / Region', group: 'Person', value: (f) => f.state, width: 140, xlsxWidth: 18 },
  // Northeastern (from the website)
  { id: 'degree', label: 'Degree', group: 'Northeastern', value: (f) => f.degree, width: 130, xlsxWidth: 16, inList: true, defaultVisible: true },
  { id: 'classOf', label: 'Class', group: 'Northeastern', value: (f) => f.classOf, width: 130, xlsxWidth: 16, inList: true },
  { id: 'field', label: 'Field of study', group: 'Northeastern', value: (f) => f.field, width: 220, xlsxWidth: 30, inList: true },
  // Sources
  { id: 'sources', label: 'Source', group: 'Sources', value: (f) => f.sources.join(' + '), width: 150, xlsxWidth: 18, inList: true, defaultVisible: true },
  { id: 'aliases', label: 'Also listed as', group: 'Sources', value: (f) => j(f.aliases), width: 200, xlsxWidth: 26 },
  { id: 'recordId', label: 'Record ID', group: 'Sources', value: (f) => f.id, width: 90, xlsxWidth: 10, mono: true },
  // Review (stored in this browser)
  { id: 'decision', label: 'Your decision', group: 'Review', value: (_f, d) => (d ? DECISION_LABEL[d.value] : ''), width: 130, xlsxWidth: 16, inList: true },
  { id: 'decisionNote', label: 'Your note', group: 'Review', value: (_f, d) => d?.note ?? '', width: 240, xlsxWidth: 40 },
]

export const COLUMN_BY_ID = Object.fromEntries(COLUMNS.map((c) => [c.id, c])) as Record<string, ColumnDef>

export const DEFAULT_LIST_COLUMNS = COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id)

/** Export presets shown in the export dialog. */
export const EXPORT_PRESETS: { id: string; label: string; description: string; columns: string[] }[] = [
  {
    id: 'ids',
    label: 'ascend IDs',
    description: 'First, last, full name and both ascend IDs',
    columns: ['first', 'last', 'name', 'constituentId', 'householdId'],
  },
  {
    id: 'outreach',
    label: 'Contact sheet',
    description: 'Names, role, company, email, phone, LinkedIn, location',
    columns: ['name', 'title', 'company', 'email', 'phone', 'linkedin', 'location', 'constituentId', 'householdId'],
  },
  {
    id: 'review',
    label: 'Review worksheet',
    description: 'Status, evidence, ascend details and your decisions',
    columns: ['name', 'status', 'constituentId', 'householdId', 'ascendName', 'ascendEmployer', 'company', 'title', 'evidence', 'jobHistory', 'decision', 'decisionNote'],
  },
  { id: 'all', label: 'Everything', description: 'Every available column', columns: COLUMNS.map((c) => c.id) },
]
