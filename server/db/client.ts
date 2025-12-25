import { Database } from 'bun:sqlite'
import { join } from 'path'
import { mkdirSync, existsSync } from 'fs'
import {
  CREATE_WORKFLOWS_TABLE,
  CREATE_WORKFLOWS_NAME_INDEX,
  CREATE_WORKFLOWS_UPDATED_INDEX,
  type WorkflowRow,
  type WorkflowResponse,
  rowToResponse,
} from './schema'

/**
 * Database file path.
 */
const DB_DIR = process.env.DATABASE_DIR ?? join(process.cwd(), 'data')
const DB_PATH = process.env.DATABASE_URL ?? join(DB_DIR, 'workflows.db')

/**
 * Database client singleton.
 */
let database: Database | null = null

/**
 * Runs a SQL statement that doesn't return results.
 * Using run() method to execute DDL statements.
 */
function runSQL(db: Database, sql: string): void {
  db.run(sql)
}

/**
 * Gets or creates the database connection.
 */
function getDatabase(): Database {
  if (!database) {
    // Ensure the data directory exists
    if (!existsSync(DB_DIR)) {
      mkdirSync(DB_DIR, { recursive: true })
    }

    database = new Database(DB_PATH)

    // Create tables and indices using bun:sqlite's run method
    runSQL(database, CREATE_WORKFLOWS_TABLE)
    runSQL(database, CREATE_WORKFLOWS_NAME_INDEX)
    runSQL(database, CREATE_WORKFLOWS_UPDATED_INDEX)
  }

  return database
}

/**
 * Workflow insert data type.
 */
interface WorkflowInsert {
  id: string
  name: string
  description: string | null
  graph: string
  thumbnail: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Database operations for workflows.
 */
export const db = {
  /**
   * Get all workflows ordered by last updated.
   */
  getAllWorkflows(): WorkflowResponse[] {
    const database = getDatabase()
    const stmt = database.prepare(`
      SELECT * FROM workflows
      ORDER BY updated_at DESC
    `)

    const rows = stmt.all() as WorkflowRow[]
    return rows.map(rowToResponse)
  },

  /**
   * Get a single workflow by ID.
   */
  getWorkflow(id: string): WorkflowResponse | null {
    const database = getDatabase()
    const stmt = database.prepare(`
      SELECT * FROM workflows
      WHERE id = ?
    `)

    const row = stmt.get(id) as WorkflowRow | undefined
    return row ? rowToResponse(row) : null
  },

  /**
   * Create a new workflow.
   */
  createWorkflow(workflow: WorkflowInsert): void {
    const database = getDatabase()
    const stmt = database.prepare(`
      INSERT INTO workflows (id, name, description, graph, thumbnail, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      workflow.id,
      workflow.name,
      workflow.description,
      workflow.graph,
      workflow.thumbnail,
      workflow.createdAt,
      workflow.updatedAt
    )
  },

  /**
   * Update an existing workflow.
   */
  updateWorkflow(workflow: WorkflowInsert): void {
    const database = getDatabase()
    const stmt = database.prepare(`
      UPDATE workflows
      SET name = ?, description = ?, graph = ?, thumbnail = ?, updated_at = ?
      WHERE id = ?
    `)

    stmt.run(
      workflow.name,
      workflow.description,
      workflow.graph,
      workflow.thumbnail,
      workflow.updatedAt,
      workflow.id
    )
  },

  /**
   * Delete a workflow.
   */
  deleteWorkflow(id: string): void {
    const database = getDatabase()
    const stmt = database.prepare(`
      DELETE FROM workflows
      WHERE id = ?
    `)

    stmt.run(id)
  },

  /**
   * Search workflows by name.
   */
  searchWorkflows(query: string): WorkflowResponse[] {
    const database = getDatabase()
    const stmt = database.prepare(`
      SELECT * FROM workflows
      WHERE name LIKE ?
      ORDER BY updated_at DESC
    `)

    const rows = stmt.all(`%${query}%`) as WorkflowRow[]
    return rows.map(rowToResponse)
  },

  /**
   * Close the database connection.
   */
  close(): void {
    if (database) {
      database.close()
      database = null
    }
  },
}
