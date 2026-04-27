"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type ChatRole = "user" | "assistant";

interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface ChatApiResponse {
  bot_response: string;
}

const STORAGE_KEY = "iwis_chat_history";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const apiBaseUrl = useMemo(
    () => (process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, ""),
    []
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ChatMessage[];
      if (Array.isArray(parsed)) {
        setMessages(parsed.filter((item) => item?.role && item?.content).slice(-20));
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-20)));
  }, [messages]);

  function handleClearChat() {
    setMessages([]);
    setInput("");
    localStorage.removeItem(STORAGE_KEY);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const message = input.trim();
    if (!message || loading) return;

    const userMessage: ChatMessage = { role: "user", content: message };
    const nextHistory = [...messages, userMessage].slice(-20);
    setMessages(nextHistory);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: nextHistory,
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat request failed: ${response.status}`);
      }

      const data = (await response.json()) as ChatApiResponse;
      const assistantMessage: ChatMessage = { role: "assistant", content: data.bot_response };
      setMessages((prev) => [...prev, assistantMessage].slice(-20));
    } catch {
      const fallbackMessage: ChatMessage = {
        role: "assistant",
        content: "Er ging iets mis bij het ophalen van een antwoord. Probeer opnieuw.",
      };
      setMessages((prev) => [
        ...prev,
        fallbackMessage,
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chat-widget-root">
      {isOpen ? (
        <section className="chat-widget-panel" aria-label="IWIS chatbot">
          <header className="chat-widget-header">
            <h2>IWIS Assistant</h2>
            <div className="chat-widget-header-actions">
              <button
                type="button"
                className="chat-widget-secondary"
                onClick={handleClearChat}
                disabled={loading || messages.length === 0}
                aria-label="Start a new chat"
                title="Start a new chat"
              >
                +
              </button>
              <button
                type="button"
                className="chat-widget-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
              >
                ×
              </button>
            </div>
          </header>

          <div className="chat-widget-messages">
            {messages.length === 0 ? (
              <p className="chat-widget-empty">Stel een vraag over metingen, alerts of rapporten.</p>
            ) : (
              messages.map((item, index) => (
                <div key={`${item.role}-${index}`} className={`chat-bubble ${item.role}`}>
                  {item.content}
                </div>
              ))
            )}
            {loading && <div className="chat-bubble assistant">Even denken...</div>}
          </div>

          <form className="chat-widget-form" onSubmit={handleSubmit}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Typ je vraag..."
              disabled={loading}
              maxLength={2000}
            />
            <button type="submit" disabled={loading || !input.trim()}>
              Verstuur
            </button>
          </form>
        </section>
      ) : null}

      <button type="button" className="chat-widget-toggle" onClick={() => setIsOpen((value) => !value)}>
        Chat
      </button>
    </div>
  );
}
