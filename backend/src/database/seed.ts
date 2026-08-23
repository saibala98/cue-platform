import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { AppDataSource } from './data-source';
import { Lob } from '../models/Lob';
import { User } from '../models/User';
import { Module } from '../models/Module';
import { ModuleLesson } from '../models/ModuleLesson';
import { ModuleQuizQuestion } from '../models/ModuleQuizQuestion';
import { KnowledgeMap } from '../models/KnowledgeMap';
import { MentorAssignment } from '../models/MentorAssignment';
import { CourseProgress } from '../models/CourseProgress';
import { LobDocument } from '../models/LobDocument';
import { DocumentChunk } from '../models/DocumentChunk';
import { hashPassword } from '../services/authService';
import { assignAllLobModulesToEmployee } from '../services/moduleAssignmentService';
import { UPLOAD_DIR } from '../middleware/upload.middleware';

/** A minimal, genuinely valid single-page PDF (hand-written PDF syntax, no
 * binary compression) so the seeded document is really openable/downloadable,
 * not just a DB row with a fake extension. */
function buildMinimalPdf(lines: string[]): Buffer {
  const contentOps = lines.map((line, i) => `BT /F1 11 Tf 72 ${740 - i * 16} Td (${line.replace(/[()\\]/g, '')}) Tj ET`).join('\n');
  const stream = contentOps;
  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length ${stream.length} >>
stream
${stream}
endstream
endobj
xref
0 6
0000000000 65535 f
trailer
<< /Size 6 /Root 1 0 R >>
startxref
0
%%EOF`;
  return Buffer.from(pdf, 'utf8');
}

const SEED_PASSWORD = 'Password123!';

async function seed() {
  await AppDataSource.initialize();
  console.log('[seed] connected');

  // Idempotent: wipe app tables (dev/staging only) so this script can be re-run safely.
  await AppDataSource.query(
    `TRUNCATE TABLE knowledge_map, lob_documents, course_progress, mentor_assignments, completion_records,
     module_quiz_questions, module_lessons, module_assignments, modules, users, lob RESTART IDENTITY CASCADE;`,
  );
  console.log('[seed] cleared existing data');

  const lobRepo = AppDataSource.getRepository(Lob);
  const userRepo = AppDataSource.getRepository(User);
  const moduleRepo = AppDataSource.getRepository(Module);
  const lessonRepo = AppDataSource.getRepository(ModuleLesson);
  const quizRepo = AppDataSource.getRepository(ModuleQuizQuestion);
  const knowledgeRepo = AppDataSource.getRepository(KnowledgeMap);
  const assignmentRepo = AppDataSource.getRepository(MentorAssignment);
  const progressRepo = AppDataSource.getRepository(CourseProgress);
  const documentRepo = AppDataSource.getRepository(LobDocument);
  const chunkRepo = AppDataSource.getRepository(DocumentChunk);

  const lob = await lobRepo.save(
    lobRepo.create({ name: 'GIC Operations', description: 'Global In-house Center operations, servicing and support.' }),
  );
  console.log(`[seed] created LOB: ${lob.name}`);

  const passwordHash = await hashPassword(SEED_PASSWORD);

  const leader = await userRepo.save(
    userRepo.create({
      email: 'leader@cue.example',
      passwordHash,
      firstName: 'Priya',
      lastName: 'Nair',
      role: 'people_leader',
      lobId: lob.id,
    }),
  );
  const mentor = await userRepo.save(
    userRepo.create({
      email: 'mentor@cue.example',
      passwordHash,
      firstName: 'Daniel',
      lastName: 'Ortiz',
      role: 'mentor',
      lobId: lob.id,
    }),
  );
  const joinee = await userRepo.save(
    userRepo.create({
      email: 'joinee@cue.example',
      passwordHash,
      firstName: 'Aisha',
      lastName: 'Khan',
      role: 'new_joinee',
      lobId: lob.id,
    }),
  );
  const compliance = await userRepo.save(
    userRepo.create({
      email: 'compliance@cue.example',
      passwordHash,
      firstName: 'Marcus',
      lastName: 'Lee',
      role: 'compliance_admin',
      lobId: lob.id,
    }),
  );
  console.log('[seed] created 4 users (one per role), password for all: ' + SEED_PASSWORD);

  // Modules don't exist yet at this point (created below), so the auto-assign
  // hook that fires on registration can't run for this seeded joinee — assign
  // explicitly once the modules exist, further down.

  const welcomeModuleId = randomUUID();
  const welcomeModule = await moduleRepo.save(
    moduleRepo.create({
      id: welcomeModuleId,
      title: 'GIC Operations: Welcome & Team Structure',
      lobId: lob.id,
      contentType: 'course',
      version: '2026.1',
      orderIndex: 1,
      slaDays: 3,
      familyId: welcomeModuleId,
    }),
  );
  await lessonRepo.save([
    lessonRepo.create({
      moduleId: welcomeModule.id,
      title: 'Welcome to GIC Operations',
      orderIndex: 1,
      contentType: 'text',
      contentBody: 'An overview of the GIC Operations team, reporting lines, and how work is organized across shifts.',
    }),
    lessonRepo.create({
      moduleId: welcomeModule.id,
      title: 'Team structure & reporting lines',
      orderIndex: 2,
      contentType: 'text',
      contentBody:
        'GIC Operations is organized into three pods, each led by a people leader. Every pod has dedicated mentors for new joinees during their first 90 days.',
    }),
    lessonRepo.create({
      moduleId: welcomeModule.id,
      title: 'Shift structure',
      orderIndex: 3,
      contentType: 'url',
      contentUrl: 'https://example.com/training/shift-structure',
    }),
  ]);
  await quizRepo.save([
    quizRepo.create({
      moduleId: welcomeModule.id,
      questionText: 'How many pods make up GIC Operations?',
      orderIndex: 1,
      options: ['Two', 'Three', 'Five', 'One'],
      correctIndex: 1,
    }),
    quizRepo.create({
      moduleId: welcomeModule.id,
      questionText: 'Who supports new joinees during their first 90 days?',
      orderIndex: 2,
      options: ['Compliance admin', 'IT service desk', 'A dedicated mentor', 'External vendor'],
      correctIndex: 2,
    }),
    quizRepo.create({
      moduleId: welcomeModule.id,
      questionText: 'Each pod is led by a...',
      orderIndex: 3,
      options: ['People leader', 'Compliance admin', 'External contractor', 'Rotating volunteer'],
      correctIndex: 0,
    }),
  ]);

  const complianceModuleId = randomUUID();
  const complianceModule = await moduleRepo.save(
    moduleRepo.create({
      id: complianceModuleId,
      title: 'Data Handling & Compliance Basics',
      lobId: lob.id,
      contentType: 'course',
      version: '2026.1',
      orderIndex: 2,
      slaDays: 7,
      familyId: complianceModuleId,
    }),
  );
  await lessonRepo.save([
    lessonRepo.create({
      moduleId: complianceModule.id,
      title: 'Why data handling matters',
      orderIndex: 1,
      contentType: 'text',
      contentBody:
        'GIC Operations handles client data daily. Mishandling it can trigger regulatory penalties and breach client trust, so every employee completes this module before touching production systems.',
    }),
    lessonRepo.create({
      moduleId: complianceModule.id,
      title: 'Data handling walkthrough (video)',
      orderIndex: 2,
      contentType: 'url',
      contentUrl: 'https://example.com/training/data-handling-basics',
    }),
  ]);
  await quizRepo.save([
    quizRepo.create({
      moduleId: complianceModule.id,
      questionText: 'What must you complete before touching production systems?',
      orderIndex: 1,
      options: ['Nothing', 'This compliance module', 'A background check only', 'A manager interview'],
      correctIndex: 1,
    }),
    quizRepo.create({
      moduleId: complianceModule.id,
      questionText: 'What can mishandling client data trigger?',
      orderIndex: 2,
      options: ['Faster onboarding', 'Regulatory penalties', 'A bonus', 'Nothing significant'],
      correctIndex: 1,
    }),
    quizRepo.create({
      moduleId: complianceModule.id,
      questionText: 'How often does GIC Operations handle client data?',
      orderIndex: 3,
      options: ['Daily', 'Once a year', 'Never', 'Only during audits'],
      correctIndex: 0,
    }),
  ]);
  console.log('[seed] created 2 training modules with lessons and quizzes');

  await assignAllLobModulesToEmployee(joinee.id, lob.id);
  console.log('[seed] assigned both modules to the seeded new joinee');

  // Fictional subject-matter experts referenced below (Sarah Chen, Michael Park,
  // Olivia Bennett, Emily Zhao, Raj Patel) are knowledge-map contacts only —
  // not app accounts. lastUpdatedBy always points at one of the 4 real seeded
  // users, matching who'd plausibly maintain that entry.
  await knowledgeRepo.save([
    knowledgeRepo.create({
      lobId: lob.id,
      topic: 'GIC Rate Exception Approvals',
      description: 'Approval chain for exceptions to standard GIC pricing tiers.',
      ownerName: 'Sarah Chen',
      ownerEmail: 'sarah.chen@cue.example',
      goToContactName: 'Sarah Chen',
      goToContactEmail: 'sarah.chen@cue.example',
      goToContactRole: 'Senior Operations Lead',
      approverName: 'Michael Park',
      approverEmail: 'michael.park@cue.example',
      approverRole: 'VP Operations',
      notes: 'Route requests through the Rate Exception Portal — see the GIC Procedures Manual for the full process.',
      lastUpdatedBy: leader.id,
    }),
    knowledgeRepo.create({
      lobId: lob.id,
      topic: 'Certificate Renewal Process',
      description: 'Process for renewing maturing GIC certificates, including notice periods and rate rollover rules.',
      ownerName: 'Olivia Bennett',
      ownerEmail: 'olivia.bennett@cue.example',
      goToContactName: 'Olivia Bennett',
      goToContactEmail: 'olivia.bennett@cue.example',
      goToContactRole: 'GIC Renewals Specialist',
      approverName: 'Sarah Chen',
      approverEmail: 'sarah.chen@cue.example',
      approverRole: 'Senior Operations Lead',
      notes: 'Renewal notices go out 30 days before maturity.',
      lastUpdatedBy: leader.id,
    }),
    knowledgeRepo.create({
      lobId: lob.id,
      topic: 'Client Escalation Contact',
      description: 'First point of contact when a client issue needs to go beyond frontline support.',
      ownerName: 'Daniel Ortiz',
      ownerEmail: 'daniel.ortiz@cue.example',
      goToContactName: 'Daniel Ortiz',
      goToContactEmail: 'daniel.ortiz@cue.example',
      goToContactRole: 'Team Lead',
      approverName: 'Priya Nair',
      approverEmail: 'priya.nair@cue.example',
      approverRole: 'People Leader',
      notes: 'Severity 1 issues page the on-call lead first.',
      lastUpdatedBy: mentor.id,
    }),
    knowledgeRepo.create({
      lobId: lob.id,
      topic: 'Compliance Certification Questions',
      description: 'Required compliance certifications and exam requirements for GIC associates.',
      ownerName: 'Marcus Lee',
      ownerEmail: 'marcus.lee@cue.example',
      goToContactName: 'Marcus Lee',
      goToContactEmail: 'marcus.lee@cue.example',
      goToContactRole: 'Compliance Admin',
      approverName: null,
      approverEmail: null,
      approverRole: null,
      notes: 'Annual re-certification is due every January.',
      lastUpdatedBy: compliance.id,
    }),
    knowledgeRepo.create({
      lobId: lob.id,
      topic: 'System Access Requests',
      description: 'How to request access to GIC servicing systems and who approves it.',
      ownerName: 'Raj Patel',
      ownerEmail: 'raj.patel@cue.example',
      goToContactName: 'Raj Patel',
      goToContactEmail: 'raj.patel@cue.example',
      goToContactRole: 'IT Service Desk Analyst',
      approverName: 'Marcus Lee',
      approverEmail: 'marcus.lee@cue.example',
      approverRole: 'Compliance Admin',
      notes: 'All system access requires a ticket approved by compliance.',
      lastUpdatedBy: compliance.id,
    }),
    knowledgeRepo.create({
      lobId: lob.id,
      topic: 'Branch Code Queries',
      description: 'Where to look up branch codes for account servicing and transfers.',
      ownerName: 'Priya Nair',
      ownerEmail: 'priya.nair@cue.example',
      goToContactName: 'Priya Nair',
      goToContactEmail: 'priya.nair@cue.example',
      goToContactRole: 'People Leader',
      approverName: null,
      approverEmail: null,
      approverRole: null,
      notes: 'Branch code directory lives in the Ops wiki.',
      lastUpdatedBy: leader.id,
    }),
    knowledgeRepo.create({
      lobId: lob.id,
      topic: 'Early Redemption Exceptions',
      description: 'Approving early redemption of a GIC outside standard terms.',
      ownerName: 'Sarah Chen',
      ownerEmail: 'sarah.chen@cue.example',
      goToContactName: 'Sarah Chen',
      goToContactEmail: 'sarah.chen@cue.example',
      goToContactRole: 'Senior Operations Lead',
      approverName: 'Michael Park',
      approverEmail: 'michael.park@cue.example',
      approverRole: 'VP Operations',
      notes: 'Client must provide a hardship justification for early redemption.',
      lastUpdatedBy: leader.id,
    }),
    knowledgeRepo.create({
      lobId: lob.id,
      topic: 'CDIC Coverage Questions',
      description: 'Questions about CDIC deposit insurance coverage limits for GIC products.',
      ownerName: 'Emily Zhao',
      ownerEmail: 'emily.zhao@cue.example',
      goToContactName: 'Emily Zhao',
      goToContactEmail: 'emily.zhao@cue.example',
      goToContactRole: 'Product Specialist',
      approverName: null,
      approverEmail: null,
      approverRole: null,
      notes: 'Coverage limits are per depositor, per insured category.',
      lastUpdatedBy: leader.id,
    }),
    knowledgeRepo.create({
      lobId: lob.id,
      topic: 'Rate Holds Process',
      description: 'Placing a temporary rate hold for a client during application processing.',
      ownerName: 'Olivia Bennett',
      ownerEmail: 'olivia.bennett@cue.example',
      goToContactName: 'Olivia Bennett',
      goToContactEmail: 'olivia.bennett@cue.example',
      goToContactRole: 'GIC Renewals Specialist',
      approverName: 'Sarah Chen',
      approverEmail: 'sarah.chen@cue.example',
      approverRole: 'Senior Operations Lead',
      notes: 'Rate holds are valid for 10 business days.',
      lastUpdatedBy: leader.id,
    }),
    knowledgeRepo.create({
      lobId: lob.id,
      topic: 'Special Term GIC Requests',
      description: 'Custom-term GIC requests outside the standard product shelf.',
      ownerName: 'Emily Zhao',
      ownerEmail: 'emily.zhao@cue.example',
      goToContactName: 'Emily Zhao',
      goToContactEmail: 'emily.zhao@cue.example',
      goToContactRole: 'Product Specialist',
      approverName: 'Michael Park',
      approverEmail: 'michael.park@cue.example',
      approverRole: 'VP Operations',
      notes: 'Custom terms require a minimum deposit threshold.',
      lastUpdatedBy: leader.id,
    }),
    knowledgeRepo.create({
      lobId: lob.id,
      topic: 'Client Complaint Escalation',
      description: 'Formal client complaint handling, distinct from a routine escalation.',
      ownerName: 'Daniel Ortiz',
      ownerEmail: 'daniel.ortiz@cue.example',
      goToContactName: 'Daniel Ortiz',
      goToContactEmail: 'daniel.ortiz@cue.example',
      goToContactRole: 'Team Lead',
      approverName: 'Priya Nair',
      approverEmail: 'priya.nair@cue.example',
      approverRole: 'People Leader',
      notes: 'Formal complaints must be logged within 24 hours of receipt.',
      lastUpdatedBy: mentor.id,
    }),
    knowledgeRepo.create({
      lobId: lob.id,
      topic: 'AML/KYC Questions',
      description: 'Anti-money laundering and know-your-customer verification questions.',
      ownerName: 'Marcus Lee',
      ownerEmail: 'marcus.lee@cue.example',
      goToContactName: 'Marcus Lee',
      goToContactEmail: 'marcus.lee@cue.example',
      goToContactRole: 'Compliance Admin',
      approverName: null,
      approverEmail: null,
      approverRole: null,
      notes: 'Escalate any suspicious activity immediately — do not wait for the next review cycle.',
      lastUpdatedBy: compliance.id,
    }),
    knowledgeRepo.create({
      lobId: lob.id,
      topic: 'Trade Confirmation Issues',
      description: "Who to contact when a trade confirmation doesn't match the client instruction.",
      ownerName: 'Raj Patel',
      ownerEmail: 'raj.patel@cue.example',
      goToContactName: 'Raj Patel',
      goToContactEmail: 'raj.patel@cue.example',
      goToContactRole: 'Operations Analyst',
      approverName: 'Sarah Chen',
      approverEmail: 'sarah.chen@cue.example',
      approverRole: 'Senior Operations Lead',
      notes: 'Flag mismatches before end-of-day cutoff.',
      lastUpdatedBy: leader.id,
    }),
    knowledgeRepo.create({
      lobId: lob.id,
      topic: 'Day-End Balancing Contact',
      description: 'Day-end balancing discrepancies and reconciliation contact.',
      ownerName: 'Raj Patel',
      ownerEmail: 'raj.patel@cue.example',
      goToContactName: 'Raj Patel',
      goToContactEmail: 'raj.patel@cue.example',
      goToContactRole: 'Operations Analyst',
      approverName: 'Sarah Chen',
      approverEmail: 'sarah.chen@cue.example',
      approverRole: 'Senior Operations Lead',
      notes: 'Unresolved discrepancies over $500 must be reported same-day.',
      lastUpdatedBy: leader.id,
    }),
    knowledgeRepo.create({
      lobId: lob.id,
      topic: 'Regulatory Reporting Questions',
      description: 'Questions about regulatory filings and reporting deadlines.',
      ownerName: 'Marcus Lee',
      ownerEmail: 'marcus.lee@cue.example',
      goToContactName: 'Marcus Lee',
      goToContactEmail: 'marcus.lee@cue.example',
      goToContactRole: 'Compliance Admin',
      approverName: 'Michael Park',
      approverEmail: 'michael.park@cue.example',
      approverRole: 'VP Operations',
      notes: 'Filing calendar is maintained by the compliance team.',
      lastUpdatedBy: compliance.id,
    }),
    knowledgeRepo.create({
      lobId: lob.id,
      topic: 'Compliance point of contact',
      description: 'General first stop for any compliance question during onboarding.',
      ownerName: 'Compliance Team',
      ownerEmail: null,
      goToContactName: 'Marcus Lee',
      goToContactEmail: 'marcus.lee@cue.example',
      goToContactRole: 'Compliance Admin',
      approverName: null,
      approverEmail: null,
      approverRole: null,
      notes: 'First stop for any compliance question during onboarding.',
      lastUpdatedBy: compliance.id,
    }),
  ]);
  console.log('[seed] created 16 knowledge map entries');

  const gicManualId = randomUUID();
  const gicManualFileName = `${gicManualId}.pdf`;
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const gicManualPath = path.join(UPLOAD_DIR, gicManualFileName);
  fs.writeFileSync(
    gicManualPath,
    buildMinimalPdf(['GIC Procedures Manual', 'Section 2.1: GIC Rate Exception Process', '(see Knowledge Buddy for the full text)']),
  );

  const gicManual = await documentRepo.save(
    documentRepo.create({
      lobId: lob.id,
      fileName: 'gic_procedures_manual.pdf',
      filePath: gicManualPath,
      fileType: 'pdf',
      fileSize: fs.statSync(gicManualPath).size,
      uploadedBy: leader.id,
      status: 'ready',
      chunkCount: 2,
    }),
  );
  await chunkRepo.save([
    chunkRepo.create({
      documentId: gicManual.id,
      lobId: lob.id,
      chunkIndex: 0,
      chunkText:
        'Section 1.1: Document Purpose\n\nThis manual covers the standard operating procedures for GIC Operations, including rate exception handling, client escalations, and account servicing workflows. All associates are expected to follow these procedures for any client-facing rate or pricing decision.',
      metadata: { fileName: 'gic_procedures_manual.pdf', totalChunks: 2, sectionHeader: 'Document Purpose', pageNumber: 1 },
    }),
    chunkRepo.create({
      documentId: gicManual.id,
      lobId: lob.id,
      chunkIndex: 1,
      chunkText:
        'Section 2.1: GIC Rate Exception Process\n\nWhen a client requests a rate exception outside standard GIC pricing tiers, the requesting associate must submit a rate exception request through the Rate Exception Portal within 2 business days of the client ask. The request must include the client account number, the requested rate, the standard rate, and a business justification. Requests are reviewed by the Senior Operations Lead and require final sign-off from the VP of Operations before the exception is applied to the account.',
      metadata: { fileName: 'gic_procedures_manual.pdf', totalChunks: 2, sectionHeader: 'GIC Rate Exception Process', pageNumber: 4 },
    }),
  ]);
  console.log('[seed] created 1 ready document (GIC Procedures Manual) with 2 chunks');

  const assignment = await assignmentRepo.save(
    assignmentRepo.create({ leaderId: leader.id, mentorId: mentor.id, menteeId: joinee.id, status: 'active' }),
  );
  await progressRepo.save(Array.from({ length: 6 }, (_, i) => progressRepo.create({ assignmentId: assignment.id, sessionNumber: i + 1 })));
  console.log('[seed] created 1 active mentor assignment with a 6-session checklist');

  console.log('\n[seed] done. Sample logins (all use password: ' + SEED_PASSWORD + '):');
  console.log('  people_leader:     leader@cue.example');
  console.log('  mentor:            mentor@cue.example');
  console.log('  new_joinee:        joinee@cue.example');
  console.log('  compliance_admin:  compliance@cue.example');

  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
