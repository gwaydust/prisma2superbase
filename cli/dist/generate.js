"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMigrations = generateMigrations;
const fs_1 = require("fs");
const path = __importStar(require("path"));
const chalk_1 = __importDefault(require("chalk"));
async function generateMigrations(options) {
    const schemaPath = path.resolve(options.schema);
    const outputDir = path.resolve(options.output);
    console.log(chalk_1.default.gray(`Reading schema from: ${schemaPath}`));
    console.log(chalk_1.default.gray(`Writing migrations to: ${outputDir}`));
    // Read and parse the Prisma schema
    const schemaContent = await fs_1.promises.readFile(schemaPath, 'utf-8');
    const models = parsePrismaSchema(schemaContent);
    console.log(chalk_1.default.gray(`Found ${models.length} models: ${models.map(m => m.name).join(', ')}`));
    // Ensure output directory exists
    await fs_1.promises.mkdir(outputDir, { recursive: true });
    // Generate migrations
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    // 1. Main schema migration
    const schemaSql = generateSchemaSQL(models);
    await fs_1.promises.writeFile(path.join(outputDir, `${timestamp}_initial_schema.sql`), schemaSql);
    console.log(chalk_1.default.green(`✓ Generated initial schema migration`));
    // 2. RLS policies
    if (options.rls) {
        const rlsSql = generateRLSPolicies(models);
        await fs_1.promises.writeFile(path.join(outputDir, `${timestamp}_rls_policies.sql`), rlsSql);
        console.log(chalk_1.default.green(`✓ Generated RLS policies`));
    }
    // 3. Realtime setup
    if (options.realtime) {
        const realtimeSql = generateRealtimeSetup(models);
        await fs_1.promises.writeFile(path.join(outputDir, `${timestamp}_realtime_setup.sql`), realtimeSql);
        console.log(chalk_1.default.green(`✓ Generated Realtime setup`));
    }
    // 4. Auth helpers
    if (options.auth) {
        const authSql = generateAuthHelpers(models);
        await fs_1.promises.writeFile(path.join(outputDir, `${timestamp}_auth_helpers.sql`), authSql);
        console.log(chalk_1.default.green(`✓ Generated Auth helpers`));
    }
    // 5. TypeScript types
    if (options.types) {
        const typesTs = generateTypescriptTypes(models);
        const typesDir = path.join(outputDir, '..', 'types');
        await fs_1.promises.mkdir(typesDir, { recursive: true });
        await fs_1.promises.writeFile(path.join(typesDir, 'database.ts'), typesTs);
        console.log(chalk_1.default.green(`✓ Generated TypeScript types`));
    }
}
// Simplified Prisma schema parser
function parsePrismaSchema(content) {
    const models = [];
    const modelRegex = /model\s+(\w+)\s*{([^}]+)}/g;
    let match;
    while ((match = modelRegex.exec(content)) !== null) {
        const modelName = match[1];
        const modelBody = match[2];
        const fields = parseFields(modelBody);
        const relations = parseRelations(modelBody, modelName);
        models.push({
            name: modelName,
            fields,
            relations
        });
    }
    return models;
}
function parseFields(body) {
    const fields = [];
    const lines = body.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@'))
            continue;
        const parts = trimmed.split(/\s+/);
        if (parts.length < 2)
            continue;
        const name = parts[0];
        const type = parts[1];
        const isId = trimmed.includes('@id');
        const isUnique = trimmed.includes('@unique') || isId;
        const isRequired = !type.endsWith('?');
        const isArray = type.startsWith('[') || type.endsWith('[]');
        // Clean type
        let cleanType = type.replace(/^\??/, '').replace(/\[\]$/, '').replace(/^\?/, '');
        // Check for relation
        const relationMatch = trimmed.match(/@relation\s*\(\s*name:\s*"([^"]+)"\s*\)/);
        const relationName = relationMatch ? relationMatch[1] : undefined;
        fields.push({
            name,
            type: cleanType,
            isId,
            isUnique,
            isRequired,
            isArray,
            relationName
        });
    }
    return fields;
}
function parseRelations(body, modelName) {
    const relations = [];
    // This is a simplified parser - in production, use @prisma/sdk
    return relations;
}
function generateSchemaSQL(models) {
    let sql = `-- Initial schema migration\n-- Generated by prisma-to-supabase\n\n`;
    for (const model of models) {
        sql += generateTableSQL(model);
        sql += '\n';
    }
    return sql;
}
function generateTableSQL(model) {
    let sql = `CREATE TABLE "${model.name.toLowerCase()}" (\n`;
    const columns = [];
    for (const field of model.fields) {
        if (field.isArray)
            continue; // Skip array fields (handled via relations)
        const pgType = mapPrismaTypeToPostgres(field.type);
        let colDef = `  "${field.name}" ${pgType}`;
        if (field.isId) {
            colDef += ' PRIMARY KEY';
        }
        if (field.isUnique && !field.isId) {
            colDef += ' UNIQUE';
        }
        if (field.isRequired) {
            colDef += ' NOT NULL';
        }
        columns.push(colDef);
    }
    sql += columns.join(',\n');
    sql += '\n);\n';
    // Indexes for foreign keys
    for (const relation of model.relations) {
        sql += `CREATE INDEX "idx_${model.name.toLowerCase()}_${relation.fields.join('_')}" ON "${model.name.toLowerCase()}" ("${relation.fields.join('", "')}");\n`;
    }
    return sql;
}
function mapPrismaTypeToPostgres(prismaType) {
    const typeMap = {
        'String': 'TEXT',
        'Int': 'INTEGER',
        'BigInt': 'BIGINT',
        'Float': 'DOUBLE PRECISION',
        'Boolean': 'BOOLEAN',
        'DateTime': 'TIMESTAMPTZ',
        'Json': 'JSONB',
        'Bytes': 'BYTEA',
        'Decimal': 'DECIMAL',
    };
    return typeMap[prismaType] || 'TEXT';
}
function generateRLSPolicies(models) {
    let sql = `-- Row Level Security Policies\n-- Generated by prisma-to-supabase\n\n`;
    for (const model of models) {
        const tableName = model.name.toLowerCase();
        sql += `ALTER TABLE "${tableName}" ENABLE ROW LEVEL SECURITY;\n\n`;
        // Default policy: users can only access their own data (if there's a userId field)
        const hasUserId = model.fields.some(f => f.name === 'userId' || f.name === 'user_id');
        if (hasUserId) {
            sql += `CREATE POLICY "Users can view own ${model.name}" ON "${tableName}"\n`;
            sql += `  FOR SELECT USING (auth.uid() = user_id);\n\n`;
            sql += `CREATE POLICY "Users can insert own ${model.name}" ON "${tableName}"\n`;
            sql += `  FOR INSERT WITH CHECK (auth.uid() = user_id);\n\n`;
            sql += `CREATE POLICY "Users can update own ${model.name}" ON "${tableName}"\n`;
            sql += `  FOR UPDATE USING (auth.uid() = user_id);\n\n`;
            sql += `CREATE POLICY "Users can delete own ${model.name}" ON "${tableName}"\n`;
            sql += `  FOR DELETE USING (auth.uid() = user_id);\n\n`;
        }
    }
    return sql;
}
function generateRealtimeSetup(models) {
    let sql = `-- Realtime Publication Setup\n-- Generated by prisma-to-supabase\n\n`;
    sql += `-- Enable realtime for all tables\n`;
    sql += `ALTER PUBLICATION supabase_realtime ADD TABLE `;
    sql += models.map(m => `"${m.name.toLowerCase()}"`).join(', ');
    sql += `;\n\n`;
    return sql;
}
function generateAuthHelpers(models) {
    let sql = `-- Auth Integration Helpers\n-- Generated by prisma-to-supabase\n\n`;
    // Helper function to get current user's data
    sql += `CREATE OR REPLACE FUNCTION current_user_id()\n`;
    sql += `RETURNS uuid LANGUAGE sql STABLE AS $$\n`;
    sql += `  SELECT auth.uid();\n`;
    sql += `$$\n\n`;
    return sql;
}
function generateTypescriptTypes(models) {
    let ts = `// Database types generated by prisma-to-supabase\n// DO NOT EDIT MANUALLY\n\n`;
    for (const model of models) {
        ts += `export interface ${model.name} {\n`;
        for (const field of model.fields) {
            const tsType = mapPrismaTypeToTypeScript(field.type);
            const optional = !field.isRequired ? '?' : '';
            const array = field.isArray ? '[]' : '';
            ts += `  ${field.name}${optional}: ${tsType}${array};\n`;
        }
        ts += `}\n\n`;
    }
    // Database schema type
    ts += `export interface Database {\n`;
    ts += `  public: {\n`;
    ts += `    Tables: {\n`;
    for (const model of models) {
        ts += `      ${model.name.toLowerCase()}: {\n`;
        ts += `        Row: ${model.name};\n`;
        ts += `        Insert: Omit<${model.name}, 'id' | 'createdAt' | 'updatedAt'>;\n`;
        ts += `        Update: Partial<${model.name}>;\n`;
        ts += `      };\n`;
    }
    ts += `    };\n`;
    ts += `  };\n`;
    ts += `}\n`;
    return ts;
}
function mapPrismaTypeToTypeScript(prismaType) {
    const typeMap = {
        'String': 'string',
        'Int': 'number',
        'BigInt': 'bigint',
        'Float': 'number',
        'Boolean': 'boolean',
        'DateTime': 'Date',
        'Json': 'Record<string, unknown>',
        'Bytes': 'Uint8Array',
        'Decimal': 'number',
    };
    return typeMap[prismaType] || 'unknown';
}
//# sourceMappingURL=generate.js.map