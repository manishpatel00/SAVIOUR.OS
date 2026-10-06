import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, TaskPriority, TaskStatus } from '../types';
import { CTAButton } from './ui/CTAButton';
import { 
  AlertOctagon, CheckCircle2, Circle, Clock, Plus, Trash2, ChevronDown, 
  ChevronUp, Sparkles, RefreshCw, Layers, Calendar, Mail, Search, X, Check, BookOpen
} from 'lucide-react';

interface TaskBoardProps {
  tasks: Task[];
  onAddTask: (task: Omit<Task, 'id' | 'urgencyScore'>) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onMitigateTask: (taskId: string, type: 'extension_request' | 'action_plan' | 'reschedule') => Promise<void>;
  onBreakdownTask: (taskId: string) => Promise<void>;
  accessToken: string | null;
  onSyncToCalendar: (task: Task) => Promise<void>;
  onSaveGmailDraft: (task: Task, bodyText: string) => Promise<void>;
  onShowOnboarding?: () => void;
  onSendEmailReminder: (task: Task, checklistItems: string[]) => void;
}

export const TaskBoard: React.FC<TaskBoardProps> = ({
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onMitigateTask,
  onBreakdownTask,
  onSyncToCalendar,
  onSaveGmailDraft,
  onShowOnboarding,
  onSendEmailReminder
}) => {
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Form State for creating a task
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [newCategory, setNewCategory] = useState('Work');
  const [newDueDate, setNewDueDate] = useState('');
  const [newEstMin, setNewEstMin] = useState(30);

  // Dynamic status/loading states for AI actions
  const [aiLoadingTaskId, setAiLoadingTaskId] = useState<string | null>(null);
  const [triageModeActive, setTriageModeActive] = useState(false);
  const [triageLoadingTaskId, setTriageLoadingTaskId] = useState<string | null>(null);

  const handleTriageDiagnostic = async (task: Task) => {
    setTriageLoadingTaskId(task.id);
    try {
      const res = await fetch('/api/gemini/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          category: task.category,
          dueDate: task.dueDate
        })
      });
      
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }
      
      const data = await res.json();
      if (data) {
        onUpdateTask({
          ...task,
          triageData: {
            severity: data.severity || 'critical',
            recoveryPlan: data.recoveryPlan || [],
            damageControlEmail: data.damageControlEmail || '',
            recoveryMindset: data.recoveryMindset || "Take a deep breath. Clear the noise."
          }
        });
      }
    } catch (err) {
      console.error("Triage diagnostic error:", err);
      // Fail gracefully and show an error/warning mindset inside the task triage view
      onUpdateTask({
        ...task,
        triageData: {
          severity: 'critical',
          recoveryPlan: [
            'Check neural connection: The Saviour AI companion was unable to reach its diagnostics server.',
            'Review timeline manually to identify realistic extensions.',
            'Clear ambient noise and start a 25-minute Pomodoro focus block.'
          ],
          damageControlEmail: 'Dear team, I am experiencing a temporary delay with our deliverables due to a configuration block. Resolving immediately.',
          recoveryMindset: '⚠️ DIAGNOSTIC LINK FAULT: Could not reach neural sentinel. Manual diagnostic sequence initialized.'
        }
      });
    } finally {
      setTriageLoadingTaskId(null);
    }
  };

  // Sorting/Filtering logic
  const filteredTasks = tasks
    .filter(task => {
      const matchPriority = filterPriority === 'all' || task.priority === filterPriority;
      const matchStatus = filterStatus === 'all' || task.status === filterStatus;
      const matchSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchPriority && matchStatus && matchSearch;
    })
    .sort((a, b) => b.urgencyScore - a.urgencyScore);

  const handleToggleSubtask = (task: Task, subtaskId: string) => {
    const updatedSubtasks = task.subtasks.map(st => 
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    
    let updatedStatus = task.status;
    if (updatedSubtasks.length > 0 && updatedSubtasks.every(st => st.completed)) {
      updatedStatus = 'completed';
    }

    onUpdateTask({
      ...task,
      subtasks: updatedSubtasks,
      status: updatedStatus
    });
  };

  const handleToggleTaskStatus = (task: Task) => {
    const nextStatusMap: Record<TaskStatus, TaskStatus> = {
      pending: 'in_progress',
      in_progress: 'completed',
      completed: 'pending'
    };
    const newStatus = nextStatusMap[task.status];
    
    onUpdateTask({
      ...task,
      status: newStatus,
      subtasks: task.subtasks.map(st => ({
        ...st,
        completed: newStatus === 'completed' ? true : st.completed
      }))
    });
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDueDate) return;

    onAddTask({
      title: newTitle,
      description: newDesc,
      priority: newPriority,
      status: 'pending',
      category: newCategory,
      dueDate: new Date(newDueDate).toISOString(),
      estimatedMinutes: Number(newEstMin) || 30,
      actualMinutes: 0,
      subtasks: []
    });

    // Reset Form
    setNewTitle('');
    setNewDesc('');
    setNewDueDate('');
    setNewPriority('medium');
    setNewCategory('Work');
    setNewEstMin(30);
    setIsAdding(false);
  };

  const handleAIAction = async (taskId: string, actionType: 'breakdown' | 'mitigate', mitigationType?: 'extension_request' | 'action_plan' | 'reschedule') => {
    setAiLoadingTaskId(taskId);
    try {
      if (actionType === 'breakdown') {
        await onBreakdownTask(taskId);
      } else if (actionType === 'mitigate' && mitigationType) {
        await onMitigateTask(taskId, mitigationType);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoadingTaskId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Interactive Onboarding Strip */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 bg-zinc-950/80 border border-white/10 p-3.5 sm:p-4 rounded-xl font-mono relative overflow-hidden group hover:border-brand/30 transition-all duration-300 shadow-md">
        <div className="corner corner-tl" />
        <div className="corner corner-tr" />
        <div className="corner corner-bl" />
        <div className="corner corner-br" />
        
        <div className="flex items-center gap-2.5 text-xs text-zinc-300 leading-relaxed flex-1">
          <Sparkles className="w-4 h-4 text-brand animate-pulse flex-shrink-0" />
          <span className="text-[11px] sm:text-xs">
            <span className="text-brand font-bold uppercase tracking-wider">First time?</span>{' '}
            <span className="text-zinc-400">Discover how the autonomous sentinel safeguards your deliverables.</span>
          </span>
        </div>

        <button
          type="button"
          onClick={onShowOnboarding}
          className="w-full sm:w-auto px-4 py-2 sm:py-1.5 bg-brand/10 hover:bg-brand/20 border border-brand/30 hover:border-brand text-brand hover:text-white text-xs font-mono font-bold uppercase tracking-wider rounded-lg cursor-pointer transition-all flex items-center justify-center gap-2 flex-shrink-0 shadow-[0_0_12px_rgba(0,255,65,0.1)] hover:shadow-[0_0_18px_rgba(0,255,65,0.25)] active:scale-[0.98]"
        >
          <BookOpen className="w-3.5 h-3.5 text-brand" />
          <span>Run Interactive Onboarding</span>
        </button>
      </div>

      {/* Advanced Search & Filter Controls */}
      <div className="bg-surface p-5 rounded-2xl border border-border space-y-4 font-sans">
        {/* Search & Main Header Row */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search code bases, categories, keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950/55 border border-border rounded-xl pl-10 pr-4 py-2 text-sm text-text placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Crisis Toggle Button */}
            <button
              type="button"
              onClick={() => setTriageModeActive(!triageModeActive)}
              className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide flex items-center gap-2 transition-all cursor-pointer border ${
                triageModeActive
                  ? 'bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.15)] hover:bg-red-500/20'
                  : 'bg-zinc-900/50 border-border text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              <AlertOctagon className={`w-3.5 h-3.5 ${triageModeActive ? 'animate-bounce text-red-400' : 'text-zinc-500'}`} />
              <span>Crisis Triage: {triageModeActive ? 'ON' : 'OFF'}</span>
            </button>

            <CTAButton
              onClick={() => setIsAdding(true)}
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
            >
              New Task
            </CTAButton>
          </div>
        </div>

        {/* Filter Chip Strips */}
        <div className="flex flex-col gap-3 pt-2 border-t border-border/50">
          {/* Priority Chips */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 w-20">Priority:</span>
            <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {['all', 'critical', 'high', 'medium', 'low'].map((p) => {
                const isActive = filterPriority === p;
                return (
                  <button
                    key={p}
                    onClick={() => setFilterPriority(p)}
                    className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors border ${
                      isActive
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm shadow-indigo-600/10'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    {p === 'all' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Chips */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 w-20">Status:</span>
            <div className="flex flex-wrap gap-1.5 overflow-x-auto">
              {[
                { key: 'all', label: 'All' },
                { key: 'pending', label: 'Pending' },
                { key: 'in_progress', label: 'In Progress' },
                { key: 'completed', label: 'Completed' }
              ].map((s) => {
                const isActive = filterStatus === s.key;
                return (
                  <button
                    key={s.key}
                    onClick={() => setFilterStatus(s.key)}
                    className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors border ${
                      isActive
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm shadow-indigo-600/10'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Crisis Mode Active Banner */}
      <AnimatePresence>
        {triageModeActive && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-red-500/5 border border-red-500/15 rounded-2xl p-4 flex items-start gap-3 shadow-[0_0_15px_rgba(239,68,68,0.03)] font-sans text-left"
          >
            <AlertOctagon className="w-5 h-5 text-red-500 animate-pulse flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-red-400 uppercase tracking-widest">🚨 Emergency Crisis Triage Active</p>
              <p className="text-zinc-400 text-xs font-light leading-relaxed">
                Expand any delayed, high-threat, or critical tasks below to trigger the <strong>Deep Crisis Diagnostic</strong>. Saviour AI will run impact assessments, formulate apologies, and generate dynamic recovery plans.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Task List */}
      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="border border-dashed border-border/80 bg-surface/30 rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-4 font-sans"
          >
            <div className="p-4 rounded-full bg-indigo-500/10 text-indigo-400">
              <Layers className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-text">No deadlines found</h3>
              <p className="text-xs text-zinc-500 max-w-sm">
                Add a task or clear filters to see your productivity timeline.
              </p>
            </div>
            <button
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-xs font-semibold cursor-pointer transition-colors"
            >
              Add First Task
            </button>
          </motion.div>
        ) : (
          filteredTasks.map((task) => {
            const isExpanded = expandedTaskId === task.id;
            const subtaskCompletedCount = task.subtasks.filter(st => st.completed).length;
            const progressPct = task.subtasks.length > 0 
              ? Math.round((subtaskCompletedCount / task.subtasks.length) * 100)
              : task.status === 'completed' ? 100 : 0;

            const dueObj = new Date(task.dueDate);
            const isOverdue = dueObj.getTime() < Date.now() && task.status !== 'completed';
            const formattedDate = dueObj.toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            // Action: render specific task shimmer skeleton loader when background generating
            if (aiLoadingTaskId === task.id) {
              return (
                <div 
                  key={task.id} 
                  className="skeleton-shimmer h-[96px] w-full bg-zinc-900/60 rounded-2xl relative border border-border overflow-hidden" 
                />
              );
            }

            const getDueInText = () => {
              const dueObj = new Date(task.dueDate);
              const diffMs = dueObj.getTime() - Date.now();
              if (diffMs < 0) return 'Overdue';
              const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
              if (diffHrs < 1) {
                const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
                return `${diffMins}m`;
              }
              if (diffHrs < 24) return `${diffHrs}h`;
              const diffDays = Math.floor(diffHrs / 24);
              return `${diffDays}d`;
            };

            const getCharProgressBar = () => {
              const totalBlocks = 10;
              const solidBlocks = Math.min(10, Math.max(0, Math.round((progressPct / 100) * totalBlocks)));
              const lightBlocks = totalBlocks - solidBlocks;
              return '█'.repeat(solidBlocks) + '░'.repeat(lightBlocks);
            };

            return (
              <div 
                key={task.id}
                className="bg-[#111113] border border-white/6 rounded-[20px] overflow-hidden transition-all duration-300 font-sans text-left p-6 shadow-sm relative group"
              >
                {/* Visual Accent Glow for critical/active tasks */}
                {task.priority === 'critical' && task.status !== 'completed' && (
                  <div className="absolute inset-0 bg-red-500/2 rounded-[20px] pointer-events-none border border-red-500/20" />
                )}

                <div className="flex flex-col gap-4">
                  {/* Title and Top Level Metadata */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1 min-w-0">
                      <h4 
                        onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                        className={`text-sm font-semibold truncate cursor-pointer hover:text-brand transition-colors ${
                          task.status === 'completed' ? 'text-zinc-500 line-through font-normal' : 'text-text'
                        }`}
                      >
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="text-xs text-zinc-400 font-light line-clamp-2 leading-relaxed">
                          {task.description}
                        </p>
                      )}
                    </div>

                    {/* Completion Status check button & Delete */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleTaskStatus(task);
                        }}
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                          task.status === 'completed'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-zinc-900/50 border-white/6 text-zinc-400 hover:bg-zinc-800'
                        }`}
                        title="Toggle status"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTask(task.id);
                        }}
                        className="w-7 h-7 rounded-lg border border-white/6 bg-zinc-900/50 text-zinc-500 hover:text-red-400 hover:bg-red-950/20 hover:border-red-500/20 transition-colors cursor-pointer flex items-center justify-center"
                        title="Delete deadline"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                        className="w-7 h-7 rounded-lg border border-white/6 bg-zinc-900/50 text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                        title="Toggle expanded details"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Operational Metrics (Risk score & Due In) */}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-500 uppercase font-bold text-[10px]">Risk:</span>
                      <span className={`font-bold ${
                        task.urgencyScore >= 80 ? 'text-red-400' : task.urgencyScore >= 50 ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {task.urgencyScore}%
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-500 uppercase font-bold text-[10px]">Due in:</span>
                      <span className={`font-bold ${isOverdue ? 'text-red-400' : 'text-zinc-300'}`}>
                        {getDueInText()}
                      </span>
                    </div>

                    {task.priority === 'critical' && task.status !== 'completed' && (
                      <span className="px-2 py-0.5 rounded bg-red-500/10 text-[9px] font-bold text-red-400 uppercase border border-red-500/20 animate-pulse font-mono tracking-wider">
                        CRITICAL
                      </span>
                    )}
                  </div>

                  {/* Character Progress Bar */}
                  <div className="space-y-1.5 font-mono text-xs">
                    <div className="flex justify-between text-[11px] text-zinc-500">
                      <span>Progress</span>
                      <span>{progressPct}%</span>
                    </div>
                    <div className="text-zinc-400 leading-none tracking-widest font-mono text-sm selection:bg-transparent select-none">
                      {getCharProgressBar()}
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/4">
                    <button
                      onClick={() => handleAIAction(task.id, 'breakdown')}
                      disabled={aiLoadingTaskId === task.id}
                      className="px-3 py-1.5 bg-zinc-900/50 hover:bg-zinc-800 border border-white/6 rounded-lg text-[11px] text-zinc-300 hover:text-white font-mono cursor-pointer transition-colors"
                    >
                      [Breakdown]
                    </button>
                    <button
                      onClick={() => onSyncToCalendar(task)}
                      className="px-3 py-1.5 bg-zinc-900/50 hover:bg-zinc-800 border border-white/6 rounded-lg text-[11px] text-zinc-300 hover:text-white font-mono cursor-pointer transition-colors"
                    >
                      [Schedule]
                    </button>
                    <button
                      onClick={() => {
                        // Focus: navigate directly to Focus tab / starts Pomodoro!
                        const pTab = document.getElementById('active-feature-tab');
                        pTab?.scrollIntoView({ behavior: 'smooth' });
                        // Set the focus timer for this task
                        setExpandedTaskId(task.id);
                        onMitigateTask(task.id, 'reschedule'); // simulates a buffer check
                      }}
                      className="px-3 py-1.5 bg-zinc-900/50 hover:bg-zinc-800 border border-white/6 rounded-lg text-[11px] text-brand hover:text-brand-light font-mono cursor-pointer transition-colors font-bold"
                    >
                      [Focus]
                    </button>
                    <button
                      onClick={() => handleAIAction(task.id, 'mitigate', 'extension_request')}
                      className="px-3 py-1.5 bg-zinc-900/50 hover:bg-zinc-800 border border-white/6 rounded-lg text-[11px] text-zinc-300 hover:text-white font-mono cursor-pointer transition-colors"
                    >
                      [Email]
                    </button>
                  </div>
                </div>

                {/* Expanded Details Panel */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-border/60 bg-zinc-950/20 p-5 space-y-5"
                    >
                      {/* Subtask milestones Checklist */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-zinc-500" />
                            Milestone Breakdowns
                          </span>
                          <span className="font-mono text-xs text-indigo-400 font-semibold">{progressPct}% Complete</span>
                        </div>

                        {task.subtasks.length === 0 ? (
                          <div className="text-xs text-zinc-500 italic py-2">
                            No milestone breakdowns available. Click "Autocut Milestones" to let AI split the workload!
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 mt-1">
                            {task.subtasks.map((st) => (
                              <div
                                key={st.id}
                                onClick={() => handleToggleSubtask(task, st.id)}
                                className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                                  st.completed
                                    ? 'bg-emerald-950/10 border-emerald-500/25 text-zinc-400 line-through'
                                    : 'bg-zinc-900/40 border-border/80 hover:border-border text-zinc-200'
                                }`}
                              >
                                {st.completed ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                ) : (
                                  <Circle className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                                )}
                                <span className="truncate text-xs">{st.title}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Emergency Deep Crisis Module */}
                      {triageModeActive && (
                        <div className="border-t border-border/80 pt-4 space-y-4">
                          <div className="p-4 bg-red-950/5 border border-red-500/15 rounded-2xl space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                                <AlertOctagon className="w-4 h-4 text-red-500 animate-pulse" />
                                Deep Crisis Triage Assessment
                              </span>
                              <span className="px-2 py-0.5 rounded bg-red-500/10 text-[9px] font-mono font-bold text-red-400 tracking-wider">
                                STAKEHOLDER SHIELD
                              </span>
                            </div>

                            <p className="text-xs text-zinc-400 leading-relaxed font-light">
                              Evaluate severity, establish immediate recovery strategies, generate apology messages, and reset emotional friction.
                            </p>

                            <button
                              type="button"
                              disabled={triageLoadingTaskId !== null}
                              onClick={() => handleTriageDiagnostic(task)}
                              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-full text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors flex items-center gap-2"
                            >
                              {triageLoadingTaskId === task.id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                              ) : (
                                <AlertOctagon className="w-3.5 h-3.5 text-white" />
                              )}
                              <span>{triageLoadingTaskId === task.id ? 'Analyzing crisis...' : 'Run Crisis Triage'}</span>
                            </button>

                            {/* Render Triage Diagnostic Outputs */}
                            {task.triageData && (
                              <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-4 pt-4 border-t border-red-500/15 text-left"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] uppercase font-mono text-zinc-500">Threat Severity:</span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                    task.triageData.severity === 'critical'
                                      ? 'bg-red-500/20 text-red-400 border border-red-500/20'
                                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/20'
                                  }`}>
                                    ● {task.triageData.severity}
                                  </span>
                                </div>

                                <div className="p-3 bg-zinc-950 border border-border rounded-xl text-xs italic text-zinc-300 relative font-light font-serif">
                                  <span className="absolute top-1 left-2 text-xl text-zinc-600 leading-none">“</span>
                                  <p className="pl-4 pr-2">{task.triageData.recoveryMindset}</p>
                                </div>

                                <div className="space-y-2">
                                  <span className="text-[10px] uppercase font-mono text-zinc-500 block">Immediate Actions:</span>
                                  <div className="space-y-1.5">
                                    {task.triageData.recoveryPlan.slice(0, 3).map((step, idx) => (
                                      <div key={idx} className="flex gap-2.5 items-start p-2.5 rounded-xl bg-zinc-900/20 border border-border">
                                        <div className="w-5 h-5 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center font-mono font-bold text-[10px] text-red-400 flex-shrink-0">
                                          {idx + 1}
                                        </div>
                                        <p className="text-xs text-zinc-300 font-light leading-relaxed">{step}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] uppercase font-mono text-zinc-500">Apology Message draft:</span>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => onSaveGmailDraft(task, task.triageData?.damageControlEmail || '')}
                                        className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors cursor-pointer text-[9px]"
                                      >
                                        [Gmail Draft]
                                      </button>
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(task.triageData?.damageControlEmail || '');
                                          alert('Apology draft copied!');
                                        }}
                                        className="text-zinc-400 hover:text-zinc-200 font-bold transition-colors cursor-pointer text-[9px]"
                                      >
                                        [Copy]
                                      </button>
                                    </div>
                                  </div>
                                  <div className="p-3 bg-zinc-950 border border-border rounded-xl text-xs font-mono text-zinc-300 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto text-left">
                                    {task.triageData.damageControlEmail}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Autonomous Operations Actions Bar */}
                      <div className="border-t border-border/80 pt-4 space-y-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                          Autonomous Safeguard Actions
                        </span>

                        {/* Action buttons list (mobile scrolls) */}
                        <div className="flex flex-nowrap md:flex-wrap gap-2 overflow-x-auto md:overflow-visible pb-2 scrollbar-none">
                          <CTAButton
                            variant="secondary"
                            size="sm"
                            disabled={aiLoadingTaskId !== null}
                            onClick={() => handleAIAction(task.id, 'breakdown')}
                            icon={
                              aiLoadingTaskId === task.id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                              ) : (
                                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                              )
                            }
                          >
                            Autocut Milestones
                          </CTAButton>

                          <CTAButton
                            variant="secondary"
                            size="sm"
                            disabled={aiLoadingTaskId !== null}
                            onClick={() => handleAIAction(task.id, 'mitigate', 'extension_request')}
                            icon={<Calendar className="w-3.5 h-3.5 text-indigo-400" />}
                          >
                            Extension Draft
                          </CTAButton>

                          <CTAButton
                            variant="secondary"
                            size="sm"
                            disabled={aiLoadingTaskId !== null}
                            onClick={() => handleAIAction(task.id, 'mitigate', 'action_plan')}
                            icon={<Sparkles className="w-3.5 h-3.5 text-indigo-400" />}
                          >
                            Action Plan
                          </CTAButton>

                          <CTAButton
                            variant="secondary"
                            size="sm"
                            onClick={() => onSyncToCalendar(task)}
                            className="!border-emerald-500/20 text-emerald-300 hover:text-emerald-200"
                            icon={<Calendar className="w-3.5 h-3.5 text-emerald-400" />}
                          >
                            Calendar Sync
                          </CTAButton>

                          {task.subtasks.length > 0 && (
                            <CTAButton
                              variant="secondary"
                              size="sm"
                              onClick={() => onSendEmailReminder(task, task.subtasks.map(s => s.title))}
                              className="!border-indigo-500/20 text-indigo-300 hover:text-indigo-200"
                              icon={<Mail className="w-3.5 h-3.5 text-indigo-400" />}
                            >
                              Send Checklist
                            </CTAButton>
                          )}
                        </div>

                        {/* Render Active Mitigation Draft inline */}
                        {task.lastMitigation && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`p-4 rounded-xl border text-xs leading-relaxed space-y-2 mt-2 font-mono whitespace-pre-wrap text-left ${
                              task.lastMitigation.type === 'extension_request'
                                ? 'bg-indigo-950/20 border-indigo-500/20 text-indigo-200'
                                : 'bg-amber-950/20 border-amber-500/20 text-amber-200'
                            }`}
                          >
                            <div className="flex items-center justify-between border-b border-border/40 pb-1.5 mb-1 text-[10px] uppercase tracking-wider text-zinc-400">
                              <span>
                                {task.lastMitigation.type === 'extension_request' 
                                  ? '✉️ Extension Request Notification Draft' 
                                  : '📋 Proactive Action Recovery Blueprint'}
                              </span>
                              <div className="flex items-center gap-2">
                                {task.lastMitigation.type === 'extension_request' && (
                                  <button
                                    onClick={() => onSaveGmailDraft(task, task.lastMitigation?.text || '')}
                                    className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors cursor-pointer text-[9px]"
                                  >
                                    [Save to Gmail]
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(task.lastMitigation?.text || '');
                                    alert('Draft copied to clipboard!');
                                  }}
                                  className="hover:text-white transition-colors cursor-pointer text-zinc-500 text-[9px]"
                                >
                                  [Copy Blueprint]
                                </button>
                              </div>
                            </div>
                            {task.lastMitigation.text}
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* Deploy New Task Modal Overlay */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="bg-surface border border-border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col font-sans"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h3 className="text-base font-bold text-text flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-400" />
                  New Deadline Sentinel
                </h3>
                <button
                  onClick={() => setIsAdding(false)}
                  className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleCreateTask} className="p-6 space-y-4 text-left">
                {/* Title */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1.5">Task Title</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Deliver critical Q3 product specs"
                    className="w-full bg-zinc-950/50 border border-border rounded-xl px-3.5 py-2.5 text-sm text-text placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1.5">Description</label>
                  <textarea
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Describe stakeholders, deliverables, or special constraints..."
                    rows={3}
                    className="w-full bg-zinc-950/50 border border-border rounded-xl px-3.5 py-2.5 text-sm text-text placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                  />
                </div>

                {/* Priority Segmented Control */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-2">Threat Priority</label>
                  <div className="grid grid-cols-4 gap-1.5 bg-zinc-950/60 p-1 rounded-xl border border-border">
                    {['low', 'medium', 'high', 'critical'].map((p) => {
                      const isSelected = newPriority === p;
                      const activeColors: Record<string, string> = {
                        low: 'bg-zinc-700 text-white',
                        medium: 'bg-indigo-600 text-white',
                        high: 'bg-amber-500 text-white',
                        critical: 'bg-red-600 text-white'
                      };
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setNewPriority(p as TaskPriority)}
                          className={`py-1.5 rounded-lg text-xs font-semibold capitalize cursor-pointer transition-all ${
                            isSelected 
                              ? activeColors[p] 
                              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sub-fields grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Due Date */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1.5">Due Date</label>
                    <input
                      type="datetime-local"
                      required
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      className="w-full bg-zinc-950/50 border border-border rounded-xl px-3 py-2 text-xs text-text focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Estimated Minutes */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1.5">Focus Budget (Min)</label>
                    <input
                      type="number"
                      required
                      value={newEstMin}
                      onChange={(e) => setNewEstMin(Number(e.target.value))}
                      min={5}
                      className="w-full bg-zinc-950/50 border border-border rounded-xl px-3 py-2 text-xs text-text focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1.5">Category Tag</label>
                  <input
                    type="text"
                    required
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="e.g. Work, Pitch, Tech, Personal"
                    className="w-full bg-zinc-950/50 border border-border rounded-xl px-3 py-2 text-xs text-text focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-4 py-2 bg-zinc-900 border border-border hover:bg-zinc-800 text-xs text-zinc-300 font-bold rounded-full transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-bold rounded-full transition-colors shadow-lg shadow-indigo-600/10 cursor-pointer"
                  >
                    Add to Deadlines →
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
