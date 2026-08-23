import { httpClient, toApiError } from './httpClient';
import type {
  AssignableJoinee,
  AssignableMentor,
  ChecklistAssignment,
  CollaborationSession,
  LeaderAssignmentRow,
  MyMentorAssignment,
  MyMenteeRow,
} from '../types';

export async function fetchUnassignedJoinees(): Promise<AssignableJoinee[]> {
  try {
    const { data } = await httpClient.get('/api/mentors/unassigned-joinees');
    return data.joinees;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function fetchAvailableMentors(): Promise<AssignableMentor[]> {
  try {
    const { data } = await httpClient.get('/api/mentors/available-mentors');
    return data.mentors;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function assignMentor(mentorId: string, menteeId: string): Promise<void> {
  try {
    await httpClient.post('/api/mentors/assign', { mentorId, menteeId });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function fetchLeaderAssignments(): Promise<LeaderAssignmentRow[]> {
  try {
    const { data } = await httpClient.get('/api/mentors/assignments');
    return data.assignments;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function fetchMyAssignment(): Promise<MyMentorAssignment | null> {
  try {
    const { data } = await httpClient.get('/api/mentors/my-assignment');
    return data.assignment;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function fetchMyMentees(): Promise<MyMenteeRow[]> {
  try {
    const { data } = await httpClient.get('/api/mentors/my-mentees');
    return data.mentees;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function fetchChecklist(assignmentId: string): Promise<{ assignment: ChecklistAssignment; sessions: CollaborationSession[] }> {
  try {
    const { data } = await httpClient.get(`/api/mentors/checklist/${assignmentId}`);
    return data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function completeSession(assignmentId: string, sessionNumber: number, notes?: string): Promise<void> {
  try {
    await httpClient.post(`/api/mentors/checklist/${assignmentId}/session/${sessionNumber}/complete`, notes === undefined ? {} : { notes });
  } catch (err) {
    throw toApiError(err);
  }
}
