/**
 * Read-only Firestore REST helpers against the emulator the e2e suite runs
 * on (same base URL and owner bearer scripts/seed-emulator.js uses). Lets a
 * spec assert on documents the UI never shows, such as the `mail/` queue
 * the firestore-send-email extension would deliver in production.
 */
const PROJECT_ID = process.env.PUBLIC_FIREBASE_PROJECT_ID || 'demo-secid-alumni';
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8088';
const BASE = `http://${FIRESTORE_HOST}/v1/projects/${PROJECT_ID}/databases/(default)`;
const HEADERS = {
  'Content-Type': 'application/json',
  Authorization: 'Bearer owner',
};

type RestValue = Record<string, unknown>;
interface RestDocument {
  name: string;
  fields?: Record<string, RestValue>;
}

/** Firestore REST `Value` → plain JS (enough for the seeded shapes). */
function decodeValue(value: RestValue): unknown {
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('timestampValue' in value) return new Date(String(value.timestampValue));
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) {
    const arr = value.arrayValue as { values?: RestValue[] };
    return (arr.values ?? []).map(decodeValue);
  }
  if ('mapValue' in value) {
    const map = value.mapValue as { fields?: Record<string, RestValue> };
    return decodeFields(map.fields ?? {});
  }
  return undefined;
}

function decodeFields(fields: Record<string, RestValue>) {
  return Object.fromEntries(
    Object.entries(fields).map(([k, v]) => [k, decodeValue(v)])
  ) as Record<string, any>;
}

function toDoc(d: RestDocument) {
  return { id: d.name.split('/').pop() as string, ...decodeFields(d.fields ?? {}) };
}

/** Every document of a top-level collection (one page, up to 300). */
export async function listCollection(collectionId: string) {
  const res = await fetch(`${BASE}/documents/${collectionId}?pageSize=300`, {
    headers: HEADERS,
  });
  if (!res.ok) throw new Error(`GET ${collectionId} → ${res.status}`);
  const json = (await res.json()) as { documents?: RestDocument[] };
  return (json.documents ?? []).map(toDoc);
}

/** Documents of `collectionId` where `field == value` (string equality). */
export async function queryByField(
  collectionId: string,
  field: string,
  value: string
) {
  const res = await fetch(`${BASE}/documents:runQuery`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          fieldFilter: {
            field: { fieldPath: field },
            op: 'EQUAL',
            value: { stringValue: value },
          },
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`runQuery ${collectionId} → ${res.status}`);
  const rows = (await res.json()) as Array<{ document?: RestDocument }>;
  return rows.filter((r) => r.document).map((r) => toDoc(r.document!));
}
