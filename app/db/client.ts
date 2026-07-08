import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCHEMA_PATH = join(__dirname, 'schema.sql')

function getDbPath(): string {
  return process.env['PLM_DB_PATH'] ?? join(process.cwd(), 'plm.db')
}

let _db: DatabaseSync | null = null

export function getDb(): DatabaseSync {
  if (_db) return _db

  _db = new DatabaseSync(getDbPath())
  _db.exec('PRAGMA foreign_keys = ON')
  _db.exec('PRAGMA journal_mode = WAL')

  const schema = readFileSync(SCHEMA_PATH, 'utf-8')
  _db.exec(schema)

  return _db
}

export function queryAll<T extends Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): T[] {
  const stmt = getDb().prepare(sql)
  return stmt.all(...params) as T[]
}

export function queryOne<T extends Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): T | undefined {
  const stmt = getDb().prepare(sql)
  return stmt.get(...params) as T | undefined
}
