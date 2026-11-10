#!/usr/bin/env node
import { program } from 'commander';
import chalk from 'chalk';
import { generateMigrations } from './generate.js';

program
  .name('prisma-to-supabase')
  .description('Generate production-ready Supabase migrations from Prisma schemas')
  .version('0.1.0');

program
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
      console.log(chalk.green('🚀 Generating Supabase migrations...'));
      await generateMigrations(options);
      console.log(chalk.green('✅ Done! Check your output directory.'));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red('❌ Error:'), message);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize prisma-to-supabase in current project')
  .action(() => {
    console.log(chalk.blue('📦 Initializing prisma-to-supabase...'));
    console.log('Run: npx prisma-to-supabase generate');
  });

program.parse();