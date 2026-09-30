import { create } from "zustand";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  sources?: string[];
  suggestedQuestions?: string[];
}

interface ChatState {
  isOpen: boolean;
  activeSymbol: string | null;
  messages: ChatMessage[];
  pendingPrompt: string | null;
  openChat: (initialPrompt?: string, symbol?: string) => void;
  closeChat: () => void;
  toggleChat: () => void;
  addMessage: (msg: ChatMessage) => void;
  setPendingPrompt: (prompt: string | null) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  isOpen: false,
  activeSymbol: null,
  messages: [
    {
      id: "welcome",
      role: "assistant",
      content: `👋 **Hello! I'm your StockLens Financial & AI Copilot.**

I can explain the quantitative analysis, machine learning forecasts, and NCFM technical principles behind every trade on StockLens.

💡 *Ask me questions like:*
- **"Do analysis for every trade given"**
- **"What data science and deep learning is used for this project?"**
- **"On what basis has the analysis been done?"**
- **"Analyze the trade for RELIANCE / TCS / INFY"**`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      suggestedQuestions: [
        "Do analysis for every trade given",
        "What data science and deep learning is used?",
        "On what basis has the analysis been done?",
        "Analyze the trade for RELIANCE",
      ],
    },
  ],
  pendingPrompt: null,
  openChat: (initialPrompt?: string, symbol?: string) =>
    set({
      isOpen: true,
      activeSymbol: symbol ?? null,
      pendingPrompt: initialPrompt ?? null,
    }),
  closeChat: () => set({ isOpen: false }),
  toggleChat: () => set((state) => ({ isOpen: !state.isOpen })),
  addMessage: (msg: ChatMessage) =>
    set((state) => ({ messages: [...state.messages, msg] })),
  setPendingPrompt: (prompt: string | null) => set({ pendingPrompt: prompt }),
  clearMessages: () =>
    set({
      messages: [
        {
          id: "reset",
          role: "assistant",
          content: "Conversation history cleared. How can I assist you with your market analysis today?",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          suggestedQuestions: [
            "Do analysis for every trade given",
            "What data science and deep learning is used?",
            "On what basis has the analysis been done?",
          ],
        },
      ],
    }),
}));
