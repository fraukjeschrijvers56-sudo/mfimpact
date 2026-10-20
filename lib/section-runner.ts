import { getDb, isUsingSupabase } from './db';
import type { SectionName } from './section-versions';

export interface SectionJob {
  id: number;
  client_id: number;
  section_name: string;
  status: 'queued' | 'running' | 'done' | 'error';
  progress: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export async function createSectionJob(
  clientId: number,
  section: SectionName
): Promise<number> {
  const db = getDb();

  if (isUsingSupabase()) {
    const { data, error } = await db
      .from('section_jobs')
      .insert({
        client_id: clientId,
        section_name: section,
        status: 'queued',
        progress: 0,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  } else {
    // SQLite fallback (in-memory tracking)
    const result = db
      .prepare(
        `INSERT INTO section_jobs (client_id, section_name, status, progress, created_at, updated_at)
         VALUES (?, ?, 'queued', 0, datetime('now'), datetime('now'))`
      )
      .run(clientId, section);
    return result.lastInsertRowid as number;
  }
}

export async function getSectionJob(jobId: number): Promise<SectionJob | null> {
  const db = getDb();

  if (isUsingSupabase()) {
    const { data, error } = await db
      .from('section_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) return null;
    return data;
  } else {
    return db.prepare('SELECT * FROM section_jobs WHERE id = ?').get(jobId) as SectionJob | undefined || null;
  }
}

export async function updateSectionJob(
  jobId: number,
  updates: Partial<Pick<SectionJob, 'status' | 'progress' | 'error_message' | 'started_at' | 'completed_at'>>
): Promise<void> {
  const db = getDb();

  if (isUsingSupabase()) {
    await db
      .from('section_jobs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', jobId);
  } else {
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = Object.values(updates);
    db.prepare(`UPDATE section_jobs SET ${fields}, updated_at = datetime('now') WHERE id = ?`).run(...values, jobId);
  }
}

export async function saveDossierVersion(
  clientId: number,
  dossierSnapshot: any,
  sectionName?: string,
  changeReason?: string
): Promise<void> {
  const db = getDb();

  if (isUsingSupabase()) {
    await db.from('dossier_versions').insert({
      client_id: clientId,
      dossier_snapshot: dossierSnapshot,
      section_name: sectionName,
      change_reason: changeReason,
    });
  } else {
    // SQLite fallback
    db.prepare(
      `INSERT INTO dossier_versions (client_id, version_timestamp, dossier_snapshot, section_name, change_reason)
       VALUES (?, datetime('now'), ?, ?, ?)`
    ).run(clientId, JSON.stringify(dossierSnapshot), sectionName || null, changeReason || null);
  }
}

// Helper to preserve manually edited fields
export function mergeWithEditedFields(
  newData: any,
  oldData: any,
  editedFields: string[]
): any {
  if (!editedFields || editedFields.length === 0) return newData;

  const result = { ...newData };

  for (const path of editedFields) {
    const keys = path.split('.');
    let oldValue: any = oldData;
    let newValue: any = result;

    // Navigate to the parent
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      oldValue = oldValue?.[key];
      if (!newValue[key]) newValue[key] = {};
      newValue = newValue[key];
    }

    // Set the final key to the old (manually edited) value
    const finalKey = keys[keys.length - 1];
    if (oldValue && finalKey in oldValue) {
      newValue[finalKey] = oldValue[finalKey];
    }
  }

  return result;
}
