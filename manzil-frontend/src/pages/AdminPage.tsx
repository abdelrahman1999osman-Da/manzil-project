import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Shield,
  User,
  Sparkles,
  Play,
  Database,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
} from "lucide-react";
import {
  sendAdminChatMessage,
  fetchWorkflowStatus,
  type AdminChatResponse,
  type WorkflowToolData,
  type WorkflowStage,
} from "../lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  tool?: string | null;
  toolStatus?: string | null;
  toolData?: WorkflowToolData | null;
  taskId?: string | null;
}

const suggestions = [
  { icon: Play, label: "Run the full workflow with 15000 records" },
  { icon: Database, label: "Run the workflow with 5000 records" },
  { icon: Cpu, label: "What is the current deployed model?" },
  { icon: Sparkles, label: "Run the workflow with 20000 records" },
];

function WorkflowResultCard({ data }: { data: WorkflowToolData }) {
  const stages = data.stages || [];
  const records = data.records;
  const model = data.model;
  const workflowStatus = data.workflow_status || "UNKNOWN";
  const failedStep = data.failed_step;

  const isFailed = workflowStatus === "FAILED";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mt-3 overflow-hidden rounded-2xl border ${
        isFailed
          ? "border-red-500/20 bg-red-500/5"
          : "border-primary/20 bg-primary/5"
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-center gap-2 border-b px-4 py-3 ${
          isFailed
            ? "border-red-500/10 bg-red-500/5"
            : "border-primary/10 bg-primary/5"
        }`}
      >
        {isFailed ? (
          <XCircle className="size-4 text-red-400" />
        ) : (
          <CheckCircle2 className="size-4 text-primary" />
        )}
        <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Workflow Result
        </span>
      </div>

      <div className="px-4 py-3">
        {/* Status */}
        <div className="mb-3 flex items-center gap-3">
          <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
            Status
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
              isFailed
                ? "bg-red-500/15 text-red-400"
                : "bg-primary/15 text-primary"
            }`}
          >
            {workflowStatus}
          </span>
          {failedStep && (
            <span className="text-[11px] text-text-muted">
              Failed at: <span className="text-red-400">{failedStep}</span>
            </span>
          )}
        </div>

        {/* Records & Model */}
        <div className="mb-3 flex gap-6">
          {records != null && (
            <div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
                Records
              </span>
              <p className="text-sm font-semibold text-text">
                {records.toLocaleString()}
              </p>
            </div>
          )}
          {model && (
            <div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
                Model
              </span>
              <p className="text-sm font-semibold text-text">{model}</p>
            </div>
          )}
        </div>

        {/* Stages */}
        {stages.length > 0 && (
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
              Stages
            </span>
            <div className="mt-2 space-y-1.5">
              {stages.map((stage: WorkflowStage, i: number) => (
                <StageRow key={i} stage={stage} />
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function StageRow({ stage }: { stage: WorkflowStage }) {
  const isOk = stage.status === "SUCCESS" || stage.status === "SKIPPED";
  const isFailed = stage.status === "FAILED";

  return (
    <div className="flex items-center gap-3 rounded-xl bg-bg/40 px-3 py-2">
      {isOk ? (
        <CheckCircle2 className="size-3.5 shrink-0 text-primary" />
      ) : isFailed ? (
        <XCircle className="size-3.5 shrink-0 text-red-400" />
      ) : (
        <Clock className="size-3.5 shrink-0 text-warning" />
      )}
      <span className="w-24 text-xs font-medium text-text-secondary">
        {stage.step}
      </span>
      <span
        className={`text-[11px] font-medium ${
          isOk
            ? "text-primary"
            : isFailed
              ? "text-red-400"
              : "text-warning"
        }`}
      >
        {stage.status}
      </span>
      {stage.duration_seconds != null && (
        <span className="ml-auto text-[11px] text-text-muted">
          {stage.duration_seconds}s
        </span>
      )}
    </div>
  );
}

export default function AdminPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollingRefs = useRef<Map<string, number>>(new Map());

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Cleanup polling timers on unmount
  useEffect(() => {
    return () => {
      pollingRefs.current.forEach((timer) => window.clearInterval(timer));
      pollingRefs.current.clear();
    };
  }, []);

  const startPolling = useCallback((messageId: string, taskId: string) => {
    // Avoid duplicate timers
    if (pollingRefs.current.has(taskId)) return;

    const timer = window.setInterval(async () => {
      try {
        const status = await fetchWorkflowStatus(taskId);

        if (status.status === "RUNNING") {
          // Update the placeholder message to show still running
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    toolStatus: "RUNNING",
                    toolData: status.tool_data ?? m.toolData,
                    content: status.reply ?? m.content,
                  }
                : m,
            ),
          );
          return;
        }

        // SUCCESS or FAILED — finalize and stop polling
        window.clearInterval(timer);
        pollingRefs.current.delete(taskId);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  toolStatus: status.status === "SUCCESS" ? status.tool_data?.workflow_status ?? "SUCCESS" : "FAILED",
                  toolData: status.tool_data ?? m.toolData,
                  content: status.reply ?? m.content,
                }
              : m,
          ),
        );
      } catch {
        window.clearInterval(timer);
        pollingRefs.current.delete(taskId);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, content: "Workflow polling failed. Please refresh and check workflow history." }
              : m,
          ),
        );
      }
    }, 3000);

    pollingRefs.current.set(taskId, timer);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: text.trim(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        const data: AdminChatResponse = await sendAdminChatMessage(
          text.trim(),
          messages.map((m) => ({ role: m.role, content: m.content })),
        );

        // Async RUN_WORKFLOW: backend returns 202 + task_id
        const taskId = (data as unknown as { task_id?: string }).task_id ?? null;
        const isRunning = data.tool === "RUN_WORKFLOW" && data.tool_status === "RUNNING" && taskId;

        if (isRunning) {
          const msgId = crypto.randomUUID();
          const runningMsg: Message = {
            id: msgId,
            role: "assistant",
            content: data.reply ?? `Workflow started (task ${taskId}). Polling for progress...`,
            tool: data.tool,
            toolStatus: "RUNNING",
            toolData: null,
            taskId,
          };
          setMessages((prev) => [...prev, runningMsg]);
          startPolling(msgId, taskId);
        } else {
          const assistantMsg: Message = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: data.reply ?? "I couldn't process that request.",
            tool: data.tool,
            toolStatus: data.tool_status,
            toolData: data.tool_data,
          };
          setMessages((prev) => [...prev, assistantMsg]);
        }
      } catch {
        const errorMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "I'm sorry, I encountered an error. Please try again later.",
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setLoading(false);
      }
    },
    [messages, loading, startPolling],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestion = (label: string) => {
    sendMessage(label);
  };

  const shouldShowWorkflowResult = (msg: Message) =>
    msg.tool === "RUN_WORKFLOW" && msg.toolData != null;

  const shouldShowFailure = (msg: Message) =>
    msg.toolStatus === "FAILED" && !shouldShowWorkflowResult(msg);

  return (
    <section className="py-16 max-md:py-10">
      <div className="mx-auto max-w-[900px] px-8 max-md:px-5">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-white/5 px-4 py-1.5">
            <Shield className="size-3.5 text-primary" />
            <span className="text-xs font-medium text-text-secondary">
              Admin Access
            </span>
          </div>
          <h1 className="text-[44px] font-bold leading-[1.08] tracking-tight max-md:text-[32px]">
            Admin Agent
          </h1>
          <p className="mt-4 text-lg text-text-secondary">
            Execute workflows, manage data, and control the AI pipeline.
          </p>
        </motion.div>

        {/* Chat Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="overflow-hidden rounded-[22px] border border-border bg-card"
        >
          {/* Messages Area */}
          <div className="h-[500px] overflow-y-auto p-6 max-md:h-[400px] max-md:p-4">
            <AnimatePresence initial={false}>
              {messages.length === 0 && !loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex h-full flex-col items-center justify-center text-center"
                >
                  <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                    <Shield className="size-7 text-primary" strokeWidth={1.5} />
                  </div>
                  <p className="text-base font-medium text-text-secondary">
                    Admin Agent Ready
                  </p>
                  <p className="mt-1 text-sm text-text-muted">
                    Run workflows, manage data, or check pipeline status
                  </p>
                </motion.div>
              )}

              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`mb-4 flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Shield className="size-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed max-md:text-[13px] ${
                      msg.role === "user"
                        ? "bg-primary/15 text-text"
                        : "border border-border bg-bg/60 text-text-secondary"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>

                    {/* Polling indicator for RUNNING workflow */}
                    {msg.role === "assistant" &&
                      msg.tool === "RUN_WORKFLOW" &&
                      msg.toolStatus === "RUNNING" &&
                      msg.taskId && (
                        <div className="mt-3 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                          <Loader2 className="size-4 text-primary animate-spin" />
                          <span className="text-xs font-medium text-text-secondary">
                            Workflow running — task {msg.taskId.slice(0, 8)}… polling every 3s
                          </span>
                        </div>
                      )}

                    {/* Workflow Result Card */}
                    {msg.role === "assistant" && shouldShowWorkflowResult(msg) && (
                      <WorkflowResultCard data={msg.toolData!} />
                    )}

                    {/* Failure Card (non-workflow errors) */}
                    {msg.role === "assistant" && shouldShowFailure(msg) && (
                      <div className="mt-3 overflow-hidden rounded-2xl border border-red-500/20 bg-red-500/5">
                        <div className="flex items-center gap-2 border-b border-red-500/10 bg-red-500/5 px-4 py-3">
                          <XCircle className="size-4 text-red-400" />
                          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                            Error
                          </span>
                        </div>
                        <p className="px-4 py-3 text-sm text-text-secondary">
                          {msg.content}
                        </p>
                      </div>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
                      <User className="size-4 text-text-muted" />
                    </div>
                  )}
                </motion.div>
              ))}

              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mb-4 flex gap-3"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Shield className="size-4 text-primary" />
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl border border-border bg-bg/60 px-4 py-3">
                    <Loader2 className="size-4 text-primary animate-spin" />
                    <span className="text-sm text-text-muted">
                      Processing...
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions */}
          {messages.length === 0 && (
            <div className="flex gap-2 overflow-x-auto border-t border-border px-6 py-4 max-md:px-4 scrollbar-none">
              {suggestions.map((s) => (
                <button
                  key={s.label}
                  onClick={() => handleSuggestion(s.label)}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-medium text-text-secondary transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 hover:text-text"
                >
                  <s.icon className="size-3.5" strokeWidth={1.75} />
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-3 border-t border-border p-4 max-md:p-3"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Run workflow, check status, manage data..."
              className="h-12 flex-1 rounded-xl border border-border bg-bg/60 px-4 text-sm text-text outline-none transition-all duration-200 placeholder:text-text-muted focus:border-primary/40 focus:ring-2 focus:ring-primary/20 max-md:h-11 max-md:text-[13px]"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-bg transition-all duration-200 hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed max-md:size-11"
            >
              <Send className="size-5" />
            </button>
          </form>
        </motion.div>
      </div>
    </section>
  );
}
