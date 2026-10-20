/**
 * Overlay manually edited values from oldData onto newData using dotted paths.
 * Paths are relative to the objects passed in (onderzoek-level, not dossier-level).
 */
export function mergeWithEditedFields(newData: any, oldData: any, editedFields: string[]): any {
  if (!editedFields || editedFields.length === 0) return newData;

  const result = { ...newData };

  for (const rawPath of editedFields) {
    const path = String(rawPath || '').trim();
    if (!path) continue;
    const keys = path.split('.').filter(Boolean);
    if (keys.length === 0) continue;

    let oldValue: any = oldData;
    let newValue: any = result;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      oldValue = oldValue?.[key];
      if (!newValue[key] || typeof newValue[key] !== 'object') newValue[key] = {};
      newValue = newValue[key];
    }

    const finalKey = keys[keys.length - 1];
    if (oldValue && typeof oldValue === 'object' && finalKey in oldValue) {
      newValue[finalKey] = oldValue[finalKey];
    }
  }

  return result;
}

/** Strip a leading `onderzoek.` so paths match onderzoek-level objects. */
export function stripOnderzoekPrefix(path: string): string {
  return path.startsWith('onderzoek.') ? path.slice('onderzoek.'.length) : path;
}
