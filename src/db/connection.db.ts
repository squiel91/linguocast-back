import { Database } from './schema.db'
import * as SQLite from 'better-sqlite3'
import { Kysely, SqliteDialect } from 'kysely'

const dialect = new SqliteDialect({
  database: new SQLite('dev.sqlite'),
})

export const db = new Kysely<Database>({ dialect })
