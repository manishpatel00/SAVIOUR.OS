import { Task, SubTask } from '../types';

/**
 * Deduplicate and guarantee valid unique IDs for arrays of entities
 */
export function sanitizeUniqueIds<T extends { id: string }>(items: T[]): T[] {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  return items.map((item, index) => {
    let id = item.id;
    if (!id || typeof id !== 'string') {
      id = `gen_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 7)}`;
    }
    while (seen.has(id)) {
      id = `${id}_dup_${Math.random().toString(36).substring(2, 7)}`;
    }
    seen.add(id);
    return { ...item, id };
  });
}

/**
 * Calculate dynamic urgency score (1 - 100) based on due date proximity and priority weight
 */
export function calculateUrgencyScore(dueDateString: string, priority: Task['priority'], referenceDate: Date = new Date()): number {
  const due = new Date(dueDateString);
  const now = referenceDate;
  const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

  let baseScore = 50;

  // Due proximity adjustments
  if (diffHours < 0) {
    baseScore = 95; // Overdue is extremely urgent
  } else if (diffHours <= 4) {
    baseScore = 90;
  } else if (diffHours <= 24) {
    baseScore = 75;
  } else if (diffHours <= 72) {
    baseScore = 55;
  } else {
    baseScore = 30;
  }

  // Priority weight
  const priorityMultiplier: Record<Task['priority'], number> = {
    critical: 1.1,
    high: 1.05,
    medium: 0.95,
    low: 0.85,
  };

  const finalScore = Math.min(100, Math.max(1, Math.round(baseScore * (priorityMultiplier[priority] || 1))));
  return finalScore;
}

/**
 * Assess triage severity classification
 */
export function assessTriageSeverity(
  dueDateString: string, 
  priority: Task['priority'], 
  referenceDate: Date = new Date()
): 'critical' | 'high' | 'medium' | 'low' {
  const due = new Date(dueDateString);
  const diffHours = (due.getTime() - referenceDate.getTime()) / (1000 * 60 * 60);

  if (diffHours < 0 || priority === 'critical') return 'critical';
  if (diffHours <= 24 || priority === 'high') return 'high';
  if (diffHours <= 72 || priority === 'medium') return 'medium';
  return 'low';
}

export interface ScheduleConflict {
  taskA: string;
  taskB: string;
  overlapMinutes: number;
}

/**
 * Detect task schedule conflicts when deadlines/focus windows collide
 */
export function detectScheduleConflicts(tasks: Task[]): { hasConflict: boolean; conflicts: ScheduleConflict[] } {
  const activeTasks = tasks
    .filter(t => t.status !== 'completed' && t.dueDate)
    .map(t => ({
      ...t,
      dueTimestamp: new Date(t.dueDate).getTime(),
    }))
    .filter(t => !isNaN(t.dueTimestamp))
    .sort((a, b) => a.dueTimestamp - b.dueTimestamp);

  const conflicts: ScheduleConflict[] = [];

  for (let i = 0; i < activeTasks.length - 1; i++) {
    const current = activeTasks[i];
    const next = activeTasks[i + 1];

    // Check if estimated execution time collides with subsequent task
    const estimatedBufferMs = (current.estimatedMinutes || 30) * 60 * 1000;
    const timeGapMs = next.dueTimestamp - current.dueTimestamp;

    if (Math.abs(timeGapMs) < estimatedBufferMs && timeGapMs >= 0) {
      const overlapMinutes = Math.round((estimatedBufferMs - timeGapMs) / (60 * 1000));
      conflicts.push({
        taskA: current.title,
        taskB: next.title,
        overlapMinutes: Math.max(5, overlapMinutes),
      });
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
  };
}

/**
 * Calculate user XP progression, level, and next-level requirements
 */
export function calculateLevelAndProgress(xp: number): {
  level: number;
  currentLevelXp: number;
  xpForNextLevel: number;
  progressPercent: number;
} {
  const XP_PER_LEVEL = 100;
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const currentLevelXp = xp % XP_PER_LEVEL;
  const progressPercent = Math.min(100, Math.round((currentLevelXp / XP_PER_LEVEL) * 100));

  return {
    level,
    currentLevelXp,
    xpForNextLevel: XP_PER_LEVEL,
    progressPercent,
  };
}

/**
 * Validate and normalize email for sandbox access
 */
export function validateSandboxEmail(email: string): { isValid: boolean; normalized: string; error?: string } {
  if (!email || typeof email !== 'string') {
    return { isValid: false, normalized: '', error: 'Email address cannot be empty' };
  }
  const normalized = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalized)) {
    return { isValid: false, normalized, error: 'Please enter a valid email format (e.g. user@domain.com)' };
  }
  return { isValid: true, normalized };
}

/**
 * Generate structured milestones fallback
 */
export function generateMilestoneBreakdown(title: string, count: number = 4): string[] {
  const safeTitle = (title || 'Task').trim();
  return [
    `Research core specifications for "${safeTitle}"`,
    `Build primary implementation layer and isolate blockers`,
    `Conduct verification and address failure edge cases`,
    `Review final checklist and ship verified outcome`
  ].slice(0, count);
}

/**
 * Generate emergency damage control email draft
 */
export function generateEmergencyDamageControlDraft(title: string, hoursExtension: number = 24): string {
  const safeTitle = (title || 'Assigned milestone').trim();
  return `Subject: Urgent Milestone Status Update: ${safeTitle}\n\nDear Team,\n\nI want to provide an immediate update regarding the delivery schedule for "${safeTitle}". During final integration, we encountered an unexpected technical constraint that necessitates a brief recalibration.\n\nOur recovery plan is actively underway. We have scoped down non-critical paths and are allocating an additional ${hoursExtension} hours to ensure quality and integrity.\n\nI will share our completed deliverable directly upon resolution.\n\nThank you for your patience and support.\n\nBest regards,\nSentinel Task Protocol`;
}
