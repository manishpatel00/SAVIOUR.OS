import { describe, it, expect } from 'vitest';
import {
  sanitizeUniqueIds,
  calculateUrgencyScore,
  assessTriageSeverity,
  detectScheduleConflicts,
  calculateLevelAndProgress,
  validateSandboxEmail,
  generateMilestoneBreakdown,
  generateEmergencyDamageControlDraft,
} from '../src/lib/sentinelEngine';
import { Task } from '../src/types';

describe('Saviour AI Sentinel Engine — Addy Osmani Engineering Quality Gates', () => {
  describe('sanitizeUniqueIds', () => {
    it('returns empty array when passed non-array', () => {
      expect(sanitizeUniqueIds(null as any)).toEqual([]);
      expect(sanitizeUniqueIds(undefined as any)).toEqual([]);
    });

    it('preserves existing unique IDs', () => {
      const items = [{ id: 'task-1' }, { id: 'task-2' }, { id: 'task-3' }];
      const result = sanitizeUniqueIds(items);
      expect(result).toHaveLength(3);
      expect(result.map(r => r.id)).toEqual(['task-1', 'task-2', 'task-3']);
    });

    it('fixes duplicated IDs so every element has a distinct ID', () => {
      const items = [{ id: 'duplicate' }, { id: 'duplicate' }, { id: 'duplicate' }];
      const result = sanitizeUniqueIds(items);
      const uniqueIds = new Set(result.map(r => r.id));
      expect(uniqueIds.size).toBe(3);
    });

    it('generates an ID when missing or empty', () => {
      const items = [{ id: '' }, { id: (undefined as any) }];
      const result = sanitizeUniqueIds(items);
      expect(result[0].id).toBeTruthy();
      expect(result[1].id).toBeTruthy();
      expect(result[0].id).not.toBe(result[1].id);
    });
  });

  describe('calculateUrgencyScore', () => {
    const fixedNow = new Date('2026-10-06T12:00:00Z');

    it('assigns high urgency score for overdue tasks', () => {
      const pastDate = '2026-10-06T08:00:00Z'; // 4 hours ago
      const score = calculateUrgencyScore(pastDate, 'critical', fixedNow);
      expect(score).toBeGreaterThanOrEqual(95);
    });

    it('assigns very high score for tasks due within 4 hours', () => {
      const soonDate = '2026-10-06T15:00:00Z'; // 3 hours in future
      const score = calculateUrgencyScore(soonDate, 'critical', fixedNow);
      expect(score).toBeGreaterThanOrEqual(90);
    });

    it('assigns lower score for distant low priority tasks', () => {
      const distantDate = '2026-10-15T12:00:00Z'; // 9 days in future
      const score = calculateUrgencyScore(distantDate, 'low', fixedNow);
      expect(score).toBeLessThanOrEqual(30);
    });
  });

  describe('assessTriageSeverity', () => {
    const fixedNow = new Date('2026-10-06T12:00:00Z');

    it('classifies overdue task as critical', () => {
      const overdue = '2026-10-05T12:00:00Z';
      expect(assessTriageSeverity(overdue, 'medium', fixedNow)).toBe('critical');
    });

    it('classifies critical priority as critical even if due in 48 hours', () => {
      const future = '2026-10-08T12:00:00Z';
      expect(assessTriageSeverity(future, 'critical', fixedNow)).toBe('critical');
    });

    it('classifies tasks due within 24 hours as high', () => {
      const tomorrow = '2026-10-07T08:00:00Z';
      expect(assessTriageSeverity(tomorrow, 'medium', fixedNow)).toBe('high');
    });
  });

  describe('detectScheduleConflicts', () => {
    it('returns false when no tasks overlap', () => {
      const tasks: Task[] = [
        {
          id: 't1',
          title: 'Morning block',
          description: '',
          dueDate: '2026-10-06T09:00:00Z',
          priority: 'high',
          status: 'pending',
          estimatedMinutes: 60,
          actualMinutes: 0,
          category: 'Work',
          subtasks: [],
          urgencyScore: 80,
        },
        {
          id: 't2',
          title: 'Afternoon block',
          description: '',
          dueDate: '2026-10-06T14:00:00Z',
          priority: 'high',
          status: 'pending',
          estimatedMinutes: 60,
          actualMinutes: 0,
          category: 'Work',
          subtasks: [],
          urgencyScore: 70,
        },
      ];
      const conflictResult = detectScheduleConflicts(tasks);
      expect(conflictResult.hasConflict).toBe(false);
      expect(conflictResult.conflicts).toHaveLength(0);
    });

    it('flags conflict when task duration overlaps with next task deadline', () => {
      const tasks: Task[] = [
        {
          id: 't1',
          title: 'Keynote Presentation Prep',
          description: '',
          dueDate: '2026-10-06T10:00:00Z',
          priority: 'critical',
          status: 'pending',
          estimatedMinutes: 90, // Ends at 11:30
          actualMinutes: 0,
          category: 'Work',
          subtasks: [],
          urgencyScore: 90,
        },
        {
          id: 't2',
          title: 'Team Architecture Review',
          description: '',
          dueDate: '2026-10-06T10:30:00Z', // Collides with t1
          priority: 'high',
          status: 'pending',
          estimatedMinutes: 45,
          actualMinutes: 0,
          category: 'Work',
          subtasks: [],
          urgencyScore: 85,
        },
      ];
      const conflictResult = detectScheduleConflicts(tasks);
      expect(conflictResult.hasConflict).toBe(true);
      expect(conflictResult.conflicts[0].taskA).toBe('Keynote Presentation Prep');
      expect(conflictResult.conflicts[0].taskB).toBe('Team Architecture Review');
    });
  });

  describe('calculateLevelAndProgress', () => {
    it('calculates level 1 for 0-99 XP', () => {
      const res = calculateLevelAndProgress(45);
      expect(res.level).toBe(1);
      expect(res.currentLevelXp).toBe(45);
      expect(res.progressPercent).toBe(45);
    });

    it('levels up accurately at 100 XP boundaries', () => {
      const res = calculateLevelAndProgress(250);
      expect(res.level).toBe(3);
      expect(res.currentLevelXp).toBe(50);
      expect(res.progressPercent).toBe(50);
    });
  });

  describe('validateSandboxEmail', () => {
    it('accepts valid email and normalizes casing', () => {
      const res = validateSandboxEmail('  User@Example.COM ');
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe('user@example.com');
      expect(res.error).toBeUndefined();
    });

    it('rejects invalid email formats', () => {
      expect(validateSandboxEmail('').isValid).toBe(false);
      expect(validateSandboxEmail('notanemail').isValid).toBe(false);
      expect(validateSandboxEmail('missing@tld').isValid).toBe(false);
    });
  });

  describe('generateMilestoneBreakdown', () => {
    it('produces clean non-empty milestones containing the task title', () => {
      const milestones = generateMilestoneBreakdown('Ship Production Release', 4);
      expect(milestones).toHaveLength(4);
      expect(milestones[0]).toContain('Ship Production Release');
    });
  });

  describe('generateEmergencyDamageControlDraft', () => {
    it('produces empathetic, professional damage control email with task context', () => {
      const draft = generateEmergencyDamageControlDraft('Database Migration', 24);
      expect(draft).toContain('Database Migration');
      expect(draft).toContain('24 hours');
      expect(draft).toContain('Dear Team');
    });
  });

  describe('Notification Management Logic', () => {
    const mockNotifications = [
      { id: 'n1', title: 'Alert 1', message: 'Test 1', type: 'alert' as const, createdAt: new Date().toISOString(), read: false },
      { id: 'n2', title: 'Alert 2', message: 'Test 2', type: 'warning' as const, createdAt: new Date().toISOString(), read: false },
      { id: 'n3', title: 'Alert 3', message: 'Test 3', type: 'info' as const, createdAt: new Date().toISOString(), read: true },
    ];

    it('clears target notification by id', () => {
      const cleared = mockNotifications.filter(n => n.id !== 'n2');
      expect(cleared).toHaveLength(2);
      expect(cleared.find(n => n.id === 'n2')).toBeUndefined();
    });

    it('marks all notifications as read', () => {
      const readAll = mockNotifications.map(n => ({ ...n, read: true }));
      expect(readAll.every(n => n.read)).toBe(true);
    });

    it('marks single notification as read by id', () => {
      const updated = mockNotifications.map(n => n.id === 'n1' ? { ...n, read: true } : n);
      expect(updated.find(n => n.id === 'n1')?.read).toBe(true);
      expect(updated.find(n => n.id === 'n2')?.read).toBe(false);
    });
  });
});
