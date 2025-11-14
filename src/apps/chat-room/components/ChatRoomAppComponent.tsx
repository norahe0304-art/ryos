import { useState, useCallback, useEffect, useRef } from "react";
import { AppProps } from "../../base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { helpItems, appMetadata } from "..";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowUp, Loader2 } from "lucide-react";
import { ChatRoomMenuBar } from "./ChatRoomMenuBar";
import { useThemeStore } from "@/stores/useThemeStore";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export function ChatRoomAppComponent({
  isWindowOpen,
  onClose,
  isForeground,
  skipInitialSound,
  instanceId,
  onNavigateNext,
  onNavigatePrevious,
}: AppProps) {
  const [showHelp, setShowHelp] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [username, setUsername] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentTheme = useThemeStore((state) => state.current);
  const isXpTheme = currentTheme === "xp" || currentTheme === "win98";

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize with welcome message if username is set
  useEffect(() => {
    const savedUsername = localStorage.getItem("chat-room-username");
    if (savedUsername && !hasStarted) {
      setUsername(savedUsername);
      setHasStarted(true);
      // Add welcome message
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: `hey ${savedUsername}, welcome back. what's on your mind?`,
          timestamp: Date.now(),
        },
      ]);
    }
  }, [hasStarted]);

  const handleStartChat = useCallback(() => {
    const trimmed = username.trim();
    if (!trimmed) return;

    localStorage.setItem("chat-room-username", trimmed);
    setHasStarted(true);
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: `hey ${trimmed}, nice to meet you. what brings you here?`,
        timestamp: Date.now(),
      },
    ]);
  }, [username]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!username || !input.trim() || isLoading) return;

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: input.trim(),
        timestamp: Date.now(),
      };

      // Add user message immediately
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);

      try {
        // Build messages array for API
        const apiMessages = [
          ...messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          {
            role: "user" as const,
            content: input.trim(),
          },
        ];

        const response = await fetch("/api/chat-room-ai", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
            messages: apiMessages,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to get response");
        }

        const data = await response.json();
        const aiMessage: Message = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: data.reply,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, aiMessage]);
      } catch (error) {
        console.error("Error sending message:", error);
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "oops, something went wrong. try again?",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [username, input, messages, isLoading]
  );

  if (!isWindowOpen) return null;

  const menuBar = (
    <ChatRoomMenuBar
      onClose={onClose}
      onShowHelp={() => setShowHelp(true)}
      onShowAbout={() => setShowAbout(true)}
    />
  );

  return (
    <>
      {!isXpTheme && isForeground && menuBar}
      <WindowFrame
        title="Chat Room"
        onClose={onClose}
        isForeground={isForeground}
        appId="chat-room"
        skipInitialSound={skipInitialSound}
        instanceId={instanceId}
        onNavigateNext={onNavigateNext}
        onNavigatePrevious={onNavigatePrevious}
        menuBar={isXpTheme ? menuBar : undefined}
      >
        <div className="flex h-full flex-col bg-white">
          {!hasStarted ? (
            // Username input screen
            <div className="flex flex-1 items-center justify-center p-8">
              <div className="w-full max-w-md space-y-4">
                <h2 className="text-2xl font-bold text-center">
                  Welcome to Chat Room
                </h2>
                <p className="text-center text-gray-600">
                  Enter your name to start chatting with a retro AI
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleStartChat();
                  }}
                  className="space-y-4"
                >
                  <Input
                    type="text"
                    placeholder="Your name..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleStartChat();
                      }
                    }}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!username.trim()}
                  >
                    Start Chat
                  </Button>
                </form>
              </div>
            </div>
          ) : (
            // Chat interface
            <>
              {/* Messages area */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          message.role === "user"
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-black"
                        }`}
                      >
                        {message.role === "user" && (
                          <div className="text-xs font-semibold mb-1 opacity-80">
                            {username}
                          </div>
                        )}
                        {message.role === "assistant" && (
                          <div className="text-xs font-semibold mb-1 opacity-80">
                            AI
                          </div>
                        )}
                        <div className="whitespace-pre-wrap break-words">
                          {message.content}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-lg px-4 py-2">
                        <div className="text-xs font-semibold mb-1 opacity-80">
                          AI
                        </div>
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input area */}
              <div className="border-t bg-white p-4">
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <Input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                    disabled={isLoading}
                    autoFocus
                  />
                  <Button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    size="icon"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowUp className="w-4 h-4" />
                    )}
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>

        <HelpDialog
          isOpen={showHelp}
          onOpenChange={setShowHelp}
          helpItems={helpItems}
          appName="Chat Room"
        />
        <AboutDialog
          isOpen={showAbout}
          onOpenChange={setShowAbout}
          metadata={appMetadata}
        />
      </WindowFrame>
    </>
  );
}
