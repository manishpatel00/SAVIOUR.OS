import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, Calendar, Mail, Sparkles, ChevronRight, ChevronLeft, 
  X, Mic, AlertTriangle 
} from 'lucide-react';

interface OnboardingCarouselProps {
  onClose: () => void;
  onConnectGoogle: () => void;
  isLoggedIn: boolean;
}

export const OnboardingCarousel: React.FC<OnboardingCarouselProps> = ({
  onClose,
  onConnectGoogle,
  isLoggedIn
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Real-time Voice Intake",
      description: "Never waste precious seconds typing when in a panic. Power up the voice companion and speak your raw schedule crisis. Saviour AI handles deep parsing instantly.",
      icon: <Mic className="w-6 h-6 sm:w-7 sm:h-7 text-brand pointer-events-none" />,
      tag: "VOICE INTERACTIVE"
    },
    {
      title: "Context-Aware Calendar Audits",
      description: "Securely sync your Google Calendar. The autonomous coordinator checks real workloads and fits preparation slots dynamically around your existing meetings.",
      icon: <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-brand pointer-events-none" />,
      tag: "SECURE OAUTH"
    },
    {
      title: "Crisis Triage Mode",
      description: "Activate Emergency Triage when milestones slip. Saviour AI runs root-cause diagnostics, serves 3-step action recovery lists, and drafts delay apology emails.",
      icon: <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7 text-crisis pointer-events-none" />,
      tag: "CRITICAL DAMAGE CONTROL"
    },
    {
      title: "Drafts & Automated Checklists",
      description: "Generates professional email drafts inside your Gmail drafts folder and mails high-fidelity checklist checkpoints straight to your personal inbox.",
      icon: <Mail className="w-6 h-6 sm:w-7 sm:h-7 text-brand pointer-events-none" />,
      tag: "AUTONOMOUS AGENTS"
    },
    {
      title: "Click Approve & Deploy",
      description: "Nothing runs silently. Review and tweak slots, edit email templates, and click 'Deploy' to securely inject updates, schedules, and reminders into your life.",
      icon: <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-urgent pointer-events-none" />,
      tag: "HUMAN CLEARANCE GATE"
    }
  ];

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] pointer-events-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.95, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 15 }}
        className="w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl relative pointer-events-auto z-[10000] font-sans my-auto max-h-[92vh] flex flex-col"
      >
        <div className="corner corner-tl" />
        <div className="corner corner-tr" />
        <div className="corner corner-bl" />
        <div className="corner corner-br" />

        {/* Ambient background spotlights */}
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-brand/5 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-brand/5 blur-[100px] rounded-full pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={handleCloseClick}
          className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 p-2 rounded-lg bg-zinc-900/80 border border-white/5 hover:border-brand/40 text-zinc-400 hover:text-brand transition-all cursor-pointer z-[10010]"
          aria-label="Close onboarding guide"
        >
          <X className="w-4 h-4 pointer-events-none" />
        </button>

        {/* Modal Container Body with internal scroll for mobile responsiveness */}
        <div className="p-5 sm:p-8 space-y-6 sm:space-y-7 text-left overflow-y-auto flex-1">
          
          {/* Logo / Brand Header */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand/10 border border-brand/30 rounded-xl flex items-center justify-center shadow-lg shadow-brand/10">
              <Shield className="w-4 h-4 text-brand" />
            </div>
            <div>
              <span className="font-sans font-extrabold text-sm tracking-wide uppercase text-text block">SAVIOUR.OS ONBOARDING</span>
              <span className="text-[9px] uppercase font-mono text-zinc-500 tracking-widest block">OPERATIONAL PROTOCOL BRIEFING</span>
            </div>
          </div>

          {/* Stepper indicator bar */}
          <div className="flex gap-1.5 sm:gap-2">
            {steps.map((_, idx) => {
              const isActive = idx === currentStep;
              return (
                <div
                  key={idx}
                  className={`h-1.5 flex-1 rounded-sm transition-all duration-300 ${
                    isActive 
                      ? 'bg-brand shadow-[0_0_8px_rgba(0,255,65,0.6)]' 
                      : 'bg-zinc-800'
                  }`}
                />
              );
            })}
          </div>

          {/* Step content with animation */}
          <div className="min-h-[160px] sm:min-h-[190px] relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="space-y-4"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div className="p-2.5 sm:p-3 bg-zinc-900 border border-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    {steps[currentStep].icon}
                  </div>
                  <div>
                    <span className="px-2 py-0.5 rounded bg-brand/10 border border-brand/25 text-[8.5px] sm:text-[9px] font-mono font-bold text-brand tracking-widest uppercase block w-max">
                      {steps[currentStep].tag}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold tracking-tight text-white mt-1 font-sans">
                      {steps[currentStep].title}
                    </h3>
                  </div>
                </div>

                <p className="text-zinc-400 font-normal text-xs sm:text-sm leading-relaxed max-w-xl font-sans">
                  {steps[currentStep].description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Interactive Google Connection Trigger Action */}
          {currentStep === 1 && !isLoggedIn && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 sm:p-4 rounded-xl bg-zinc-900/90 border border-brand/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 font-sans text-left"
            >
              <div className="space-y-0.5 flex-1">
                <p className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                  <span className="w-1.5 h-1.5 bg-brand rounded-full animate-pulse" />
                  Link Google Account Workspace
                </p>
                <p className="text-[10px] text-zinc-400 font-mono">
                  Enables real calendar auditing and automated email safeguards.
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onConnectGoogle();
                  onClose();
                }}
                className="w-full sm:w-auto px-4 py-2 bg-brand text-black hover:brightness-110 font-mono font-bold uppercase tracking-wider text-xs rounded-lg shadow-md shadow-brand/10 cursor-pointer transition-all flex-shrink-0 text-center"
              >
                Connect Workspace
              </button>
            </motion.div>
          )}

          {/* Bottom Navigation Step Controls */}
          <div className="flex items-center justify-between pt-4 sm:pt-5 border-t border-white/10 font-mono gap-3">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="px-3.5 sm:px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white disabled:text-zinc-800 disabled:cursor-not-allowed transition-colors flex items-center gap-1 cursor-pointer rounded-lg border border-transparent hover:border-white/10"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="px-4 sm:px-5 py-2.5 bg-brand hover:brightness-110 text-black font-bold text-xs font-mono uppercase tracking-wider rounded-lg flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-brand/20 hover:shadow-brand/30 active:scale-[0.98]"
            >
              <span>{currentStep === steps.length - 1 ? 'Start Operating' : 'Continue'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
