import React from 'react';
import { Scissors, Calendar, AlertTriangle, Mail, Timer, Sparkles } from 'lucide-react';

interface AgentStatusMatrixProps {
  onSelectAgent?: (agentId: string) => void;
  compact?: boolean;
}

export const AgentStatusMatrix: React.FC<AgentStatusMatrixProps> = ({ onSelectAgent, compact = false }) => {
  const agents = [
    {
      id: 'ag-slicer',
      code: 'AG-01',
      name: 'AUTOCUT SLICER',
      role: 'Milestone Decomposition',
      status: 'ONLINE',
      icon: <Scissors className="w-3.5 h-3.5 text-brand" />,
      color: 'brand',
      metric: '3-5 Micro-Tasks'
    },
    {
      id: 'ag-pilot',
      code: 'AG-02',
      name: 'COLLISION PILOT',
      role: 'Schedule Deconfliction',
      status: 'ACTIVE',
      icon: <Calendar className="w-3.5 h-3.5 text-brand" />,
      color: 'brand',
      metric: 'Zero Overlaps'
    },
    {
      id: 'ag-triage',
      code: 'AG-03',
      name: 'CRISIS TRIAGE',
      role: 'Damage Control Protocol',
      status: 'READY',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />,
      color: 'crisis',
      metric: '3-Step Recovery'
    },
    {
      id: 'ag-dispatch',
      code: 'AG-04',
      name: 'EMAIL DISPATCH',
      role: 'Checklist & Draft Courier',
      status: 'SYNCED',
      icon: <Mail className="w-3.5 h-3.5 text-brand" />,
      color: 'brand',
      metric: 'Direct Inbox'
    },
    {
      id: 'ag-warden',
      code: 'AG-05',
      name: 'FOCUS WARDEN',
      role: 'Binaural Pomodoro Shield',
      status: 'STANDBY',
      icon: <Timer className="w-3.5 h-3.5 text-brand" />,
      color: 'brand',
      metric: '25m Lock'
    }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto pt-3 font-mono">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5 text-left">
        {agents.map((agent) => {
          const isCrisis = agent.color === 'crisis';
          return (
            <div
              key={agent.id}
              onClick={() => onSelectAgent?.(agent.id)}
              className={`p-2.5 sm:p-3 bg-zinc-950/85 border rounded-xl relative group transition-all duration-300 ${
                isCrisis
                  ? 'border-rose-500/20 hover:border-rose-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                  : 'border-white/10 hover:border-brand/40 hover:shadow-[0_0_15px_rgba(0,255,65,0.12)]'
              } ${onSelectAgent ? 'cursor-pointer' : ''}`}
            >
              {/* Corner brackets */}
              <div className="corner corner-tl" />
              <div className="corner corner-tr" />
              <div className="corner corner-bl" />
              <div className="corner corner-br" />

              {/* Status Header */}
              <div className="flex items-center justify-between text-[8.5px] mb-1.5">
                <span className={`font-bold flex items-center gap-1 ${isCrisis ? 'text-rose-400' : 'text-brand'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isCrisis ? 'bg-rose-400 shadow-[0_0_6px_#f43f5e]' : 'bg-brand shadow-[0_0_6px_#00ff41]'}`} />
                  {agent.code}
                </span>
                <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-semibold">
                  {agent.status}
                </span>
              </div>

              {/* Icon & Title */}
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110 ${
                    isCrisis ? 'bg-rose-500/10 border-rose-500/30' : 'bg-brand/10 border-brand/25'
                  }`}
                >
                  {agent.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] sm:text-[11px] font-bold text-white tracking-wide truncate">
                    {agent.name}
                  </div>
                  <div className="text-[8.5px] text-zinc-500 truncate leading-tight">
                    {agent.role}
                  </div>
                </div>
              </div>

              {/* Metric footer pill */}
              <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[8px] text-zinc-400">
                <span className="uppercase tracking-wider text-zinc-600">CAPABILITY</span>
                <span className="text-zinc-300 font-semibold">{agent.metric}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
