import { promises as fs } from 'fs';
import * as path from 'path';
import chalk from 'chalk';

export interface GenerateOptions {
  schema: string;
  output: string;
  rls: boolean;
  realtime: boolean;
  auth: boolean;
  types: boolean;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function generateMigrations(options: GenerateOptions): Promise<void> {
  const schemaPath = path.resolve(options.schema);
  const outputDir = path.resolve(options.output);

  console.log(chalk.gray(`Reading schema from: ${schemaPath}`));
  console.log(chalk.gray(`Writing migrations to: ${outputDir}`));

  const schemaContent = await fs.readFile(schemaPath, 'utf-8');
  const models = parsePrismaSchema(schemaContent);

  console.log(chalk.gray(`Found ${models.length} models: ${models.map((m) => m.name).join(', ')}`));

  await fs.mkdir(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];

  await fs.writeFile(path.join(outputDir, `${timestamp}_initial_schema.sql`), generateSchemaSQL(models));
  console.log(chalk.green('✓ Generated initial schema migration'));

  if (options.rls) {
    await fs.writeFile(path.join(outputDir, `${timestamp}_rls_policies.sql`), generateRLSPolicies(models));
    console.log(chalk.green('✓ Generated RLS policies'));
  }

  if (options.realtime) {
    await fs.writeFile(path.join(outputDir, `${timestamp}_realtime_setup.sql`), generateRealtimeSetup(models));
    console.log(chalk.green('✓ Generated Realtime setup'));
  }

  if (options.auth) {
    await fs.writeFile(path.join(outputDir, `${timestamp}_auth_helpers.sql`), generateAuthHelpers(models));
    console.log(chalk.green('✓ Generated Auth helpers'));
  }

  if (options.types) {
    const typesDir = path.join(outputDir, '..', 'types');
    await fs.mkdir(typesDir, { recursive: true });
    await fs.writeFile(path.join(typesDir, 'database.ts'), generateTypescriptTypes(models));
    console.log(chalk.green('✓ Generated TypeScript types'));
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PrismaModel {
  name: string;
  fields: PrismaField[];
  relations: PrismaRelation[];
}

interface PrismaField {
  name: string;
  type: string;            // scalar type (String, Int, ... , UUID) or the related model name
  isId: boolean;
  isUnique: boolean;
  isRequired: boolean;
  isArray: boolean;
  isRelation: boolean;
  hasDefault: boolean;
  defaultValue?: string;
}

interface PrismaRelation {
  field: string;           // the relation field name, e.g. "author"
  targetModel: string;     // e.g. "User"
  isArray: boolean;        // back-relation (Post[]) vs owning side
  fkFields: string[];      // scalar fields holding the foreign key
  fkReferences: string[];  // referenced columns on the target model
  onDelete?: string;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

const SCALAR_TYPES = new Set([
  'String', 'Int', 'BigInt', 'Float', 'Boolean', 'DateTime',
  'Json', 'Bytes', 'Decimal', 'UUID', 'Unsupported',
]);

/** Extract the raw text of every `model X { ... }` block. */
function extractModels(content: string): Array<{ name: string; body: string }> {
  const out: Array<{ name: string; body: string }> = [];
  const re = /model\s+(\w+)\s*\{([\s\S]*?)\n\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    out.push({ name: m[1], body: m[2] });
  }
  return out;
}

function parsePrismaSchema(content: string): PrismaModel[] {
  const raw = extractModels(content);
  const modelNames = new Set(raw.map((r) => r.name));
  return raw.map((r) => {
    const { fields, relations } = parseModelBody(r.body, modelNames);
    return { name: r.name, fields, relations };
  });
}

function parseModelBody(body: string, modelNames: Set<string>): { fields: PrismaField[]; relations: PrismaRelation[] } {
  const fields: PrismaField[] = [];
  const relations: PrismaRelation[] = [];

  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('//') || line.startsWith('@@') || line.startsWith('}')) continue;

    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;
    const name = parts[0];
    const typeRaw = parts[1];

    const isArray = typeRaw.endsWith('[]');
    const baseType = typeRaw.replace(/^\?/, '').replace(/\[\]$/, '').replace(/\?$/, '');
    const isOptional = typeRaw.startsWith('?') || typeRaw.endsWith('?');
    const isRelation = isArray || modelNames.has(baseType);

    // default value (handles nested parens like @default(uuid()))
    let hasDefault = false;
    let defaultValue: string | undefined;
    const di = line.indexOf('@default(');
    if (di !== -1) {
      let depth = 0;
      let end = -1;
      for (let i = di + '@default('.length; i < line.length; i++) {
        if (line[i] === '(') depth++;
        else if (line[i] === ')') {
          if (depth === 0) { end = i; break; }
          depth--;
        }
      }
      if (end !== -1) {
        hasDefault = true;
        defaultValue = line.slice(di + '@default('.length, end);
      }
    }

    if (isRelation) {
      const relationAttr = line.match(/@relation\s*\(([^)]*(?:\([^)]*\)[^)]*)*)\)/);
      let fkFields: string[] = [];
      let fkReferences: string[] = [];
      let onDelete: string | undefined;
      if (relationAttr) {
        const f = relationAttr[1].match(/fields:\s*\[([^\]]+)\]/);
        const r = relationAttr[1].match(/references:\s*\[([^\]]+)\]/);
        const od = relationAttr[1].match(/onDelete:\s*(\w+)/);
        if (f) fkFields = f[1].split(',').map((s) => s.trim());
        if (r) fkReferences = r[1].split(',').map((s) => s.trim());
        if (od) onDelete = od[1];
      }
      relations.push({ field: name, targetModel: baseType, isArray, fkFields, fkReferences, onDelete });
      continue; // relation fields never become columns
    }

    // scalar
    let cleanType = baseType;
    if (cleanType === 'String' && line.includes('@id') && line.includes('@default(uuid())')) {
      cleanType = 'UUID';
    }

    fields.push({
      name,
      type: cleanType,
      isId: line.includes('@id'),
      isUnique: line.includes('@unique') || line.includes('@id'),
      isRequired: !isOptional && !isArray,
      isArray,
      isRelation: false,
      hasDefault,
      defaultValue,
    });
  }

  return { fields, relations };
}

// ---------------------------------------------------------------------------
// SQL generation
// ---------------------------------------------------------------------------

/** Map a model name to the FK columns that reference it, per model. */
function buildFkIndex(model: PrismaModel): Map<string, { target: string; ref: string; onDelete?: string }> {
  const map = new Map<string, { target: string; ref: string; onDelete?: string }>();
  for (const rel of model.relations) {
    for (let i = 0; i < rel.fkFields.length; i++) {
      const col = rel.fkFields[i];
      const ref = rel.fkReferences[i] ?? 'id';
      map.set(col, { target: rel.targetModel, ref, onDelete: rel.onDelete });
    }
  }
  return map;
}

function generateSchemaSQL(models: PrismaModel[]): string {
  let sql = '-- Initial schema migration\n-- Generated by prisma-to-supabase\n\n';

  for (const model of models) {
    sql += generateTableSQL(model);
    sql += '\n';
  }

  // Foreign keys are emitted inline in CREATE TABLE above; add indexes after.
  for (const model of models) {
    const fk = buildFkIndex(model);
    for (const col of fk.keys()) {
      sql += `CREATE INDEX "idx_${model.name.toLowerCase()}_${col}" ON "${model.name.toLowerCase()}" ("${col}");\n`;
    }
  }
  if (sql.endsWith('\n\n')) sql = sql.slice(0, -1);
  return sql;
}

function generateTableSQL(model: PrismaModel): string {
  const table = model.name.toLowerCase();
  const fk = buildFkIndex(model);
  const cols: string[] = [];

  for (const field of model.fields) {
    let colDef = `  "${field.name}" ${pgType(field)}`;

    if (field.isId) colDef += ' PRIMARY KEY';
    if (field.isUnique && !field.isId) colDef += ' UNIQUE';
    if (field.isRequired) colDef += ' NOT NULL';
    colDef += defaultClause(field);

    const foreign = fk.get(field.name);
    if (foreign) {
      colDef += ` REFERENCES "${foreign.target.toLowerCase()}"("${foreign.ref}")`;
      if (foreign.onDelete) colDef += ` ON DELETE ${foreign.onDelete.toUpperCase()}`;
    }
    cols.push(colDef);
  }

  return `CREATE TABLE "${table}" (\n${cols.join(',\n')}\n);\n`;
}

function pgType(field: PrismaField): string {
  if (field.hasDefault && field.defaultValue === 'autoincrement()') {
    return field.type === 'BigInt' ? 'BIGINT GENERATED BY DEFAULT AS IDENTITY' : 'INTEGER GENERATED BY DEFAULT AS IDENTITY';
  }
  const map: Record<string, string> = {
    String: 'TEXT', Int: 'INTEGER', BigInt: 'BIGINT', Float: 'DOUBLE PRECISION',
    Boolean: 'BOOLEAN', DateTime: 'TIMESTAMPTZ', Json: 'JSONB', Bytes: 'BYTEA',
    Decimal: 'DECIMAL', UUID: 'UUID',
  };
  return map[field.type] ?? 'TEXT';
}

function defaultClause(field: PrismaField): string {
  if (!field.hasDefault || !field.defaultValue) return '';
  const d = field.defaultValue;
  if (d === 'uuid()') return ' DEFAULT gen_random_uuid()';
  if (d === 'now()') return ' DEFAULT now()';
  if (d === 'autoincrement()') return '';
  if (d === 'cuid()' || d === 'ulid()') return ''; // generated client-side
  if (d.startsWith('"') && d.endsWith('"')) return ` DEFAULT ${d}`;
  if (d === 'true' || d === 'false') return ` DEFAULT ${d}`;
  if (!isNaN(Number(d))) return ` DEFAULT ${d}`;
  return '';
}

// ---------------------------------------------------------------------------
// RLS / Realtime / Auth
// ---------------------------------------------------------------------------

/** Find the column most likely to hold the owner's user id. */
function ownerColumn(model: PrismaModel): string | null {
  const candidates = ['user_id', 'userId', 'author_id', 'authorId', 'owner_id', 'ownerId', 'created_by', 'createdBy'];
  for (const c of candidates) {
    if (model.fields.some((f) => f.name === c)) return c;
  }
  // fall back to any FK that points at a model named User
  for (const rel of model.relations) {
    if (rel.targetModel.toLowerCase() === 'user' && rel.fkFields.length) return rel.fkFields[0];
  }
  return null;
}

function generateRLSPolicies(models: PrismaModel[]): string {
  let sql = '-- Row Level Security Policies\n-- Generated by prisma-to-supabase\n\n';
  for (const model of models) {
    const table = model.name.toLowerCase();
    sql += `ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;\n\n`;
    const col = ownerColumn(model);
    if (col) {
      const label = `Users can manage own ${model.name}`;
      // Columns are emitted as quoted, case-sensitive identifiers. Referencing the
      // owner column unquoted makes Postgres fold it to lowercase (authorId ->
      // authorid) and the policy fails. auth.uid() returns uuid, so cast to text
      // when the owner column is TEXT to avoid "operator does not exist: uuid = text".
      const ownerField = model.fields.find((f) => f.name === col);
      const compare = ownerField && pgType(ownerField) === 'UUID'
        ? `auth.uid() = "${col}"`
        : `auth.uid()::text = "${col}"`;
      sql += `CREATE POLICY "${label} select" ON "${table}" FOR SELECT USING (${compare});\n`;
      sql += `CREATE POLICY "${label} insert" ON "${table}" FOR INSERT WITH CHECK (${compare});\n`;
      sql += `CREATE POLICY "${label} update" ON "${table}" FOR UPDATE USING (${compare});\n`;
      sql += `CREATE POLICY "${label} delete" ON "${table}" FOR DELETE USING (${compare});\n\n`;
    } else {
      sql += `-- No owner column detected on "${table}" — add custom policies here.\n\n`;
    }
  }
  return sql;
}

function generateRealtimeSetup(models: PrismaModel[]): string {
  const tables = models.map((m) => `"${m.name.toLowerCase()}"`);
  return `-- Realtime Publication Setup\n-- Generated by prisma-to-supabase\n\nALTER PUBLICATION supabase_realtime ADD TABLE ${tables.join(', ')};\n`;
}

function generateAuthHelpers(_models: PrismaModel[]): string {
  return `-- Auth Integration Helpers\n-- Generated by prisma-to-supabase\n\n`
    + `CREATE OR REPLACE FUNCTION public.current_user_id()\n`
    + `RETURNS uuid LANGUAGE sql STABLE AS $$\n  SELECT auth.uid();\n$$;\n\n`
    + `CREATE OR REPLACE FUNCTION public.is_service_role()\n`
    + `RETURNS boolean LANGUAGE sql STABLE AS $$\n  SELECT (auth.jwt() ->> 'role') = 'service_role';\n$$;\n`;
}

// ---------------------------------------------------------------------------
// TypeScript types
// ---------------------------------------------------------------------------

function tsType(field: PrismaField): string {
  const map: Record<string, string> = {
    String: 'string', Int: 'number', BigInt: 'bigint', Float: 'number',
    Boolean: 'boolean', DateTime: 'Date', Json: 'Record<string, unknown>',
    Bytes: 'Uint8Array', Decimal: 'number', UUID: 'string',
  };
  return map[field.type] ?? 'unknown';
}

function generateTypescriptTypes(models: PrismaModel[]): string {
  const byName = new Map(models.map((m) => [m.name, m]));
  let ts = '// Database types generated by prisma-to-supabase\n// DO NOT EDIT MANUALLY\n\n';

  for (const model of models) {
    ts += `export interface ${model.name} {\n`;
    for (const f of model.fields) {
      ts += `  ${f.name}${f.isRequired ? '' : '?'}: ${tsType(f)};\n`;
    }
    for (const rel of model.relations) {
      const target = byName.get(rel.targetModel);
      const name = target ? rel.targetModel : rel.targetModel;
      ts += `  ${rel.field}: ${name}${rel.isArray ? '[]' : ''};\n`;
    }
    ts += '}\n\n';
  }

  ts += 'export interface Database {\n  public: {\n    Tables: {\n';
  for (const model of models) {
    ts += `      ${model.name.toLowerCase()}: {\n`;
    ts += `        Row: ${model.name};\n`;
    ts += `        Insert: Omit<${model.name}, 'id'>;\n`;
    ts += `        Update: Partial<${model.name}>;\n`;
    ts += '      };\n';
  }
  ts += '    };\n  };\n}\n';
  return ts;
}