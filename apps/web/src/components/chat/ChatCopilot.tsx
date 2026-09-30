import React, { useState, useEffect, useRef } from "react";
import { useChatStore, ChatMessage } from "@/stores/chatStore";
import { apiClient } from "@/lib/api";

export const ChatCopilot: React.FC = () => {
  const {
    isOpen,
    activeSymbol,
    messages,
    pendingPrompt,
    openChat,
    closeChat,
    toggleChat,
    addMessage,
    setPendingPrompt,
    clearMessages,
  } = useChatStore();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Handle pendingPrompt sent from other components (e.g. clicking "Ask Copilot" on a trade card)
  useEffect(() => {
    if (pendingPrompt && isOpen) {
      sendMessage(pendingPrompt);
      setPendingPrompt(null);
    }
  }, [pendingPrompt, isOpen]);

  const sendMessage = async (textToSend?: string) => {
    const query = (textToSend ?? input).trim();
    if (!query || loading) return;

    if (!textToSend) setInput("");

    // Add user message
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    addMessage(userMsg);
    setLoading(true);

    try {
      const res = await apiClient.post("/chat", {
        message: query,
        symbol: activeSymbol ?? undefined,
      });

      const data = res.data.data;
      const botMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        role: "assistant",
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        sources: data.sources,
        suggestedQuestions: data.suggestedQuestions,
      };
      addMessage(botMsg);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: "assistant",
        content: "⚠️ I encountered an issue connecting to the analytics server. Please ensure the backend is running and try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      addMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const renderFormattedContent = (content: string) => {
    // Quick custom parser for headers, lists, blockquotes, and tables
    const lines = content.split("\n");
    return (
      <div className="space-y-2 text-xs sm:text-[13px] leading-relaxed break-words font-sans">
        {lines.map((line, idx) => {
          if (line.startsWith("### ")) {
            return (
              <h3 key={idx} className="text-sm sm:text-base font-bold text-[var(--color-text-primary)] mt-3 mb-1">
                {line.replace("### ", "")}
              </h3>
            );
          }
          if (line.startsWith("#### ")) {
            return (
              <h4 key={idx} className="text-xs sm:text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-2 mb-1">
                {line.replace("#### ", "")}
              </h4>
            );
          }
          if (line.startsWith("---")) {
            return <hr key={idx} className="border-[var(--color-bg-border)] my-2" />;
          }
          if (line.startsWith("> ")) {
            return (
              <div key={idx} className="p-2 rounded-lg bg-amber-500/10 border-l-2 border-amber-500 text-amber-900 dark:text-amber-200 text-[11px] font-medium my-1">
                {line.replace("> ", "")}
              </div>
            );
          }
          if (line.startsWith("- ")) {
            return (
              <div key={idx} className="flex items-start gap-1.5 ml-1">
                <span className="text-indigo-500 font-bold mt-0.5">•</span>
                <span className="text-[var(--color-text-secondary)]">{renderBoldText(line.replace("- ", ""))}</span>
              </div>
            );
          }
          if (line.includes("|") && line.trim().startsWith("|")) {
            return (
              <div key={idx} className="font-mono text-[11px] text-[var(--color-text-secondary)] bg-[var(--color-bg-base)] px-2 py-0.5 rounded overflow-x-auto whitespace-pre">
                {line}
              </div>
            );
          }
          if (line.trim() === "") {
            return <div key={idx} className="h-1" />;
          }
          return (
            <p key={idx} className="text-[var(--color-text-primary)]">
              {renderBoldText(line)}
            </p>
          );
        })}
      </div>
    );
  };

  const renderBoldText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-bold text-[var(--color-text-primary)]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className="fixed bottom-20 sm:bottom-8 right-3 sm:right-8 z-40 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold shadow-xl shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer group border border-indigo-400/20 backdrop-blur-sm"
          title="Open AI Market Copilot"
        >
          <span className="text-base sm:text-lg group-hover:rotate-12 transition-transform">🤖</span>
          <span className="text-xs sm:text-sm font-semibold tracking-wide">AI Copilot</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </button>
      )}

      {/* Floating Chat Drawer / Window */}
      {isOpen && (
        <div className="fixed inset-x-2 sm:inset-x-auto bottom-20 sm:bottom-6 sm:right-6 top-16 sm:top-auto z-50 w-auto sm:w-[460px] md:w-[480px] h-[calc(100dvh-150px)] sm:h-[640px] max-h-[85vh] rounded-2xl glass-card border border-[var(--color-bg-border)] shadow-2xl flex flex-col overflow-hidden animate-fade-in bg-[var(--color-bg-card)]">
          {/* Header */}
          <div className="p-4 border-b border-[var(--color-bg-border)] bg-[var(--color-bg-elevated)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-lg shadow-sm">
                🤖
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[var(--color-text-primary)]">StockLens AI Copilot</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/20">
                    Live
                  </span>
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)] font-medium">
                  Trained on NCFM Technical Analysis & Live Signals
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={clearMessages}
                className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-bg-hover)] transition-all"
                title="Clear conversation"
              >
                🗑️
              </button>
              <button
                onClick={closeChat}
                className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-bg-hover)] transition-all text-base font-bold"
                title="Close chat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[90%] p-3.5 rounded-2xl shadow-sm ${
                      isUser
                        ? "bg-indigo-600 text-white rounded-br-xs font-medium"
                        : "bg-[var(--color-bg-base)] border border-[var(--color-bg-border)] text-[var(--color-text-primary)] rounded-bl-xs"
                    }`}
                  >
                    {isUser ? (
                      <p className="text-xs sm:text-sm">{msg.content}</p>
                    ) : (
                      renderFormattedContent(msg.content)
                    )}

                    {/* Sources Badge */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-[var(--color-bg-border)] flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-[var(--color-text-muted)] font-semibold">Sources:</span>
                        {msg.sources.map((src, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-0.5 rounded bg-[var(--color-bg-input)] text-[var(--color-text-secondary)] font-medium"
                          >
                            {src}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <span className="text-[10px] text-[var(--color-text-muted)] mt-1 px-1">
                    {msg.timestamp}
                  </span>

                  {/* Suggested Question Chips */}
                  {msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1.5 w-full max-w-[90%]">
                      <span className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider">
                        Suggested Follow-ups:
                      </span>
                      {msg.suggestedQuestions.map((sq, i) => (
                        <button
                          key={i}
                          onClick={() => sendMessage(sq)}
                          className="text-left text-xs px-3 py-1.5 rounded-xl bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-hover)] border border-[var(--color-bg-border)] text-indigo-600 dark:text-indigo-400 font-semibold transition-all hover:scale-[1.01]"
                        >
                          → {sq}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-[var(--color-bg-base)] border border-[var(--color-bg-border)] w-36">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
                <span className="text-xs text-[var(--color-text-muted)] font-semibold">Analyzing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Carousel Bar */}
          <div className="px-3 py-2 border-t border-[var(--color-bg-border)] bg-[var(--color-bg-base)] flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {[
              { label: "⚡ Analyze Every Trade Given", prompt: "Do analysis for every trade given" },
              { label: "📚 Basis of Analysis (NCFM)", prompt: "On what basis has the analysis been done?" },
              { label: "📈 Reliance Trade Breakdown", prompt: "Analyze trade for RELIANCE" },
              { label: "🛡️ VaR & Risk Metrics", prompt: "How is Value at Risk (VaR) and Risk calculated?" },
              { label: "⛓️ Option Chain & PCR", prompt: "Explain option chain and PCR analysis" },
            ].map((qp, i) => (
              <button
                key={i}
                onClick={() => sendMessage(qp.prompt)}
                disabled={loading}
                className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-hover)] border border-[var(--color-bg-border)] text-[11px] font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-all flex-shrink-0 disabled:opacity-50"
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-2.5 sm:p-3 border-t border-[var(--color-bg-border)] bg-[var(--color-bg-card)] flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Ask about trade setup, stop loss, NCFM rationale..."
              disabled={loading}
              className="flex-1 text-xs sm:text-sm bg-[var(--color-bg-input)] border border-[var(--color-bg-border)] rounded-xl px-3 sm:px-3.5 py-2 sm:py-2.5 text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-indigo-500 transition-colors min-w-0"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm transition-all disabled:opacity-40 disabled:hover:bg-indigo-600 shadow-md shadow-indigo-600/25 flex-shrink-0 cursor-pointer"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
};
