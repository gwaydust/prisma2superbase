#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const generate_js_1 = require("./generate.js");
commander_1.program
    .name('prisma-to-supabase')
    .description('Generate production-ready Supabase migrations from Prisma schemas')
    .version('0.1.0');
commander_1.program
    .command('generate')
    .description('Generate Supabase migrations from schema.prisma')
    .option('-s, --schema <path>', 'Path to schema.prisma', './prisma/schema.prisma')
    .option('-o, --output <dir>', 'Output directory', './supabase/migrations')
    .option('--rls', 'Generate RLS policies', true)
    .option('--realtime', 'Generate Realtime publication setup', true)
    .option('--auth', 'Generate Auth integration helpers', true)
    .option('--types', 'Generate TypeScript types', true)
    .action(async (options) => {
    try {
        console.log(chalk_1.default.green('🚀 Generating Supabase migrations...'));
        await (0, generate_js_1.generateMigrations)(options);
        console.log(chalk_1.default.green('✅ Done! Check your output directory.'));
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(chalk_1.default.red('❌ Error:'), message);
        process.exit(1);
    }
});
commander_1.program
    .command('init')
    .description('Initialize prisma-to-supabase in current project')
    .action(() => {
    console.log(chalk_1.default.blue('📦 Initializing prisma-to-supabase...'));
    console.log('Run: npx prisma-to-supabase generate');
});
commander_1.program.parse();
//# sourceMappingURL=cli.js.map