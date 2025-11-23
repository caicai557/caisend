import { useState, useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { createAccount, listAccounts, startSession, listMessages, sendMessage, type Account, type Message } from "./bindings";
import { cn } from "./utils";
import { Plus, Play, QrCode, Send, MessageSquare } from "lucide-react";

function App() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [newAccountName, setNewAccountName] = useState("");
  const [qrStatus, setQrStatus] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAccounts();

    const unlistenQr = listen<string>("qr-update", (event) => {
      setQrStatus(event.payload);
      setTimeout(() => setQrStatus(null), 5000);
    });

    const unlistenMsg = listen<Message>("msg-new", (event) => {
      if (selectedAccount && event.payload.account_id === selectedAccount.id) {
        setMessages(prev => [...prev, event.payload]);
      }
    });

    return () => {
      unlistenQr.then((f) => f());
      unlistenMsg.then((f) => f());
    };
  }, [selectedAccount]);

  useEffect(() => {
    if (selectedAccount) {
      loadMessages(selectedAccount.id);
    }
  }, [selectedAccount]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadAccounts() {
    try {
      const list = await listAccounts();
      setAccounts(list);
    } catch (error) {
      console.error("Failed to list accounts:", error);
    }
  }

  async function loadMessages(accountId: string) {
    try {
      const list = await listMessages(accountId);
      setMessages(list);
    } catch (error) {
      console.error("Failed to list messages:", error);
    }
  }

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!newAccountName) return;
    try {
      await createAccount(newAccountName);
      setNewAccountName("");
      loadAccounts();
    } catch (error) {
      console.error("Failed to create account:", error);
    }
  }

  async function handleStartSession(id: string) {
    try {
      await startSession(id);
    } catch (error) {
      console.error("Failed to start session:", error);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAccount || !newMessage.trim()) return;
    try {
      const msg = await sendMessage(selectedAccount.id, newMessage);
      setMessages(prev => [...prev, msg]);
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex">
      {/* Sidebar */}
      <div className="w-80 border-r border-zinc-800 p-4 flex flex-col">
        <header className="mb-6">
          <h1 className="text-xl font-bold tracking-tight mb-4">Teleflow 2025</h1>
          <form onSubmit={handleCreateAccount} className="flex gap-2">
            <input
              type="text"
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              placeholder="New Account"
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white p-1.5 rounded">
              <Plus className="w-4 h-4" />
            </button>
          </form>
        </header>

        <div className="flex-1 overflow-y-auto space-y-2">
          {accounts.map((account) => (
            <div
              key={account.id}
              onClick={() => setSelectedAccount(account)}
              className={cn(
                "p-3 rounded-lg cursor-pointer transition-colors border border-transparent",
                selectedAccount?.id === account.id ? "bg-zinc-800 border-zinc-700" : "hover:bg-zinc-900"
              )}
            >
              <div className="flex justify-between items-start">
                <h3 className="font-medium">{account.name}</h3>
                <button
                  onClick={(e) => { e.stopPropagation(); handleStartSession(account.id); }}
                  className="text-zinc-500 hover:text-emerald-400"
                >
                  <Play className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 text-zinc-500 text-xs mt-1">
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  account.status === "active" ? "bg-emerald-500" : "bg-zinc-600"
                )} />
                <span className="capitalize">{account.status}</span>
              </div>
            </div>
          ))}
        </div>

        {qrStatus && (
          <div className="mt-4 p-3 bg-emerald-900/20 border border-emerald-900/50 rounded-lg flex items-center gap-3 text-emerald-400 text-sm">
            <QrCode className="w-4 h-4 shrink-0" />
            <span className="truncate">{qrStatus}</span>
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-zinc-900/30">
        {selectedAccount ? (
          <>
            <header className="h-14 border-b border-zinc-800 flex items-center px-6 bg-zinc-950/50">
              <h2 className="font-semibold">{selectedAccount.name}</h2>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "max-w-[80%] p-3 rounded-2xl text-sm",
                    msg.direction === "out"
                      ? "ml-auto bg-indigo-600 text-white rounded-br-none"
                      : "bg-zinc-800 text-zinc-200 rounded-bl-none"
                  )}
                >
                  <p>{msg.content}</p>
                  <div className={cn(
                    "text-[10px] mt-1 opacity-70",
                    msg.direction === "out" ? "text-indigo-200" : "text-zinc-500"
                  )}>
                    {new Date(msg.created_at * 1000).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-950/50">
              <form onSubmit={handleSendMessage} className="flex gap-4">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
            <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
            <p>Select an account to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
