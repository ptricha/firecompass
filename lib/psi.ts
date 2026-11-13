const PSI_BASE = 'https://psi.nasa.gov/geode-py/ws'

export interface PSIFile {
  file_name: string
  file_size: number
  remote_url: string
  s3_path: string
  restricted: boolean
  subcategory?: string
}

export interface PSIInvestigation {
  accession: string
  investigationAcronym: string
  title: string
  approach: string
  hypothesis: string
  added: PSIFile[]
  experimentalTable: PSIFile[]
  flightProgram: string
  funding: string
}

export async function getPSIInvestigation(accession: string): Promise<PSIInvestigation> {
  const res = await fetch(`${PSI_BASE}/repo/investigations/${accession}`, {
    headers: { 'User-Agent': 'japax-spaceapps-2026/1.0' },
    next: { revalidate: 3600 }
  })
  if (!res.ok) throw new Error(`PSI fetch failed: ${res.status}`)
  return res.json()
}

export async function searchPSICombustion(): Promise<PSIInvestigation[]> {
  const res = await fetch(
    `${PSI_BASE}/repo/search?source=psi&type=investigation&size=50&from=0`,
    { headers: { 'User-Agent': 'japax-spaceapps-2026/1.0' }, next: { revalidate: 3600 } }
  )
  const data = await res.json()
  const hits = data?.hits?.hits ?? []
  return hits
    .map((h: { _source: PSIInvestigation }) => h._source)
    .filter((inv: PSIInvestigation) =>
      inv.accession?.startsWith('PSI-') &&
      (inv.title?.toLowerCase().includes('combust') ||
       inv.title?.toLowerCase().includes('flame') ||
       inv.title?.toLowerCase().includes('fire') ||
       inv.title?.toLowerCase().includes('smoke') ||
       inv.title?.toLowerCase().includes('burning'))
    )
}

export function getVideoFiles(investigation: PSIInvestigation): PSIFile[] {
  return investigation.added.filter(f =>
    f.file_name.match(/\.(mp4|avi|mov|ts)$/i) && !f.restricted
  )
}

export function getCSVFiles(investigation: PSIInvestigation): PSIFile[] {
  return [
    ...investigation.experimentalTable.filter(f => f.file_name.endsWith('.csv')),
    ...investigation.added.filter(f => f.file_name.endsWith('.csv') && !f.restricted)
  ]
}
