import 'reflect-metadata';
import path from 'path';
import dotenv from 'dotenv';
import { types } from 'pg';
import { DataSource } from 'typeorm';
import type { DataSourceOptions } from 'typeorm';

// Our columns are `timestamp` (no timezone), and NOW() under Postgres always
// writes the UTC wall clock into them. node-postgres's default parser for
// that type (OID 1114) reads the naive string back using the Node process's
// *local* timezone instead of UTC, silently shifting every date read from
// the DB whenever the server isn't running in UTC. Forcing UTC parsing here
// keeps every date computation in the app (overdue checks, "this week"
// windows, days-since math) correct regardless of the host's timezone.
types.setTypeParser(1114, (value: string) => new Date(`${value}Z`));
import { Lob } from '../models/Lob';
import { User } from '../models/User';
import { Module } from '../models/Module';
import { CompletionRecord } from '../models/CompletionRecord';
import { MentorAssignment } from '../models/MentorAssignment';
import { CourseProgress } from '../models/CourseProgress';
import { LobDocument } from '../models/LobDocument';
import { KnowledgeMap } from '../models/KnowledgeMap';
import { ModuleAssignment } from '../models/ModuleAssignment';
import { ModuleLesson } from '../models/ModuleLesson';
import { ModuleQuizQuestion } from '../models/ModuleQuizQuestion';
import { Reminder } from '../models/Reminder';
import { DocumentChunk } from '../models/DocumentChunk';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';

dotenv.config();

const shared = {
  type: 'postgres' as const,
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.DB_LOGGING === 'true',
  entities: [
    Lob,
    User,
    Module,
    CompletionRecord,
    MentorAssignment,
    CourseProgress,
    LobDocument,
    KnowledgeMap,
    ModuleAssignment,
    ModuleLesson,
    ModuleQuizQuestion,
    Reminder,
    DocumentChunk,
    Conversation,
    Message,
  ],
  migrations: [path.join(__dirname, 'migrations', '*.{ts,js}')],
  migrationsTableName: 'migrations_history',
  // Hosted Postgres (Neon, Supabase, RDS, Heroku, ...) requires TLS; the
  // default Node CA bundle doesn't always chain cleanly to their certs, so
  // rejectUnauthorized: false is the standard escape hatch for this case.
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
};

const options: DataSourceOptions = process.env.DATABASE_URL
  ? { ...shared, url: process.env.DATABASE_URL }
  : {
      ...shared,
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'cue_platform',
    };

export const AppDataSource = new DataSource(options);
