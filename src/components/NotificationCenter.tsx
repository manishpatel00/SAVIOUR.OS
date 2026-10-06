import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppNotification } from '../types';
import { Bell, Check, Trash2, Mail, AlertTriangle, ShieldAlert, CheckCircle, Info, Send } from 'lucide-react';
import { createGmailDraft } from '../lib/workspace';

export interface NotificationCenterProps {
  notifications: AppNotification[];
  accessToken?: string | null;
  userEmail?: string | null;
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onClearNotification?: (id: string) => void;
  onClear?: (id: string) => void;
  onTriggerNotificationEmail?: (notification: AppNotification) => Promise<void>;
  onSaveToDraft?: (notification: AppNotification) => Promise<void>;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  accessToken = null,
  userEmail = null,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearNotification,
  onClear,
  onTriggerNotificationEmail,
  onSaveToDraft
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [emailSendingId, setEmailSendingId] = useState<string | null>(null);

  const handleClear = (id: string) => {
    if (typeof onClearNotification === 'function') {
      onClearNotification(id);
    } else if (typeof onClear === 'function') {
      onClear(id);
    }
  };

  const handleEmailTrigger = async (n: AppNotification) => {
    if (typeof onTriggerNotificationEmail === 'function') {
      await onTriggerNotificationEmail(n);
    } else if (typeof onSaveToDraft === 'function') {
      await onSaveToDraft(n);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'alert':
        return <ShieldAlert className="w-4 h-4 text-rose-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const handleEmailDraft = async (n: AppNotification) => {
    if (!accessToken || !userEmail) return;
    try {
      setEmailSendingId(n.id);
      await handleEmailTrigger(n);
    } catch (err) {
      console.error(err);
    } finally {
      setEmailSendingId(null);
    }
  };

  return (
    <div className="relative z-50">
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer relative"
        title="Alert Notifications"
      >
        <Bell className="w-4 h-4" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center text-[9px] font-mono font-bold text-white shadow-lg shadow-rose-500/20"
            >
              {unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Dropdown Card */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop click closer */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-3 w-80 sm:w-96 bg-surface border border-border rounded-2xl shadow-2xl z-50 overflow-hidden font-sans"
            >
              {/* Header */}
              <div className="p-4 border-b border-border flex items-center justify-between bg-zinc-950/20">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-xs tracking-wider uppercase text-text">Live Sentinel Alerts</span>
                  <span className="px-1.5 py-0.5 rounded bg-brand/10 text-[9px] font-mono font-bold text-brand uppercase tracking-wider">
                    REALTIME
                  </span>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={() => onMarkAllAsRead?.()}
                    className="text-[10px] text-brand hover:text-indigo-300 font-bold cursor-pointer transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notification List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-border">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-muted space-y-2">
                    <Bell className="w-8 h-8 mx-auto stroke-1 opacity-40" />
                    <p className="text-xs font-light">Your system inbox is clean. No active alerts.</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-4 transition-colors flex gap-3 relative group ${
                        n.read ? 'bg-transparent' : 'bg-brand/5'
                      }`}
                    >
                      {/* Left indicator accent color */}
                      {!n.read && (
                        <div className="absolute top-0 left-0 bottom-0 w-1 bg-brand" />
                      )}

                      {/* Icon */}
                      <div className="mt-0.5">{getIcon(n.type)}</div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-xs font-bold text-text truncate">{n.title}</h4>
                          <span className="text-[9px] text-muted font-mono flex-shrink-0">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-text-sub leading-relaxed font-light">{n.message}</p>

                        {/* Interactive integrations (Gmail drafts) */}
                        {accessToken && userEmail && !n.emailSent && (
                          <div className="pt-2">
                            <button
                              onClick={() => handleEmailDraft(n)}
                              disabled={emailSendingId === n.id}
                              className="px-2.5 py-1 rounded-lg bg-brand/10 hover:bg-brand/20 border border-brand/15 text-[9px] font-bold text-brand flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              {emailSendingId === n.id ? (
                                <span className="animate-spin w-2.5 h-2.5 border-2 border-brand border-t-transparent rounded-full" />
                              ) : (
                                <Send className="w-2.5 h-2.5" />
                              )}
                              Save Alert to Gmail Draft
                            </button>
                          </div>
                        )}

                        {n.emailSent && (
                          <div className="pt-1.5 flex items-center gap-1 text-[9px] text-success font-semibold font-mono">
                            <Check className="w-3 h-3" />
                            <span>Saved to Gmail Inbox Drafts</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!n.read && (
                          <button
                            onClick={() => onMarkAsRead?.(n.id)}
                            className="p-1 rounded bg-zinc-900 border border-border hover:bg-zinc-800 text-text-sub hover:text-text transition-colors cursor-pointer"
                            title="Mark as read"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => handleClear(n.id)}
                          className="p-1 rounded bg-zinc-900 border border-border hover:bg-crisis/25 text-text-sub hover:text-crisis transition-colors cursor-pointer"
                          title="Delete notification"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer status summary */}
              <div className="p-3 border-t border-border bg-zinc-950/40 text-[10px] text-center text-muted font-mono">
                {accessToken && userEmail ? (
                  <span className="text-success font-bold">Linked with {userEmail}</span>
                ) : (
                  <span>Sign in with Google to enable Gmail email notifications</span>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
