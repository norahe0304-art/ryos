import { useState, useCallback, useRef, useEffect } from "react";
import { AppProps } from "../../base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { helpItems, appMetadata } from "..";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Waves, Loader2 } from "lucide-react";
import { MessageInBottleMenuBar } from "./MessageInBottleMenuBar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface Bottle {
  id: string;
  message: string;
  timestamp: number;
}

export function MessageInBottleAppComponent({
  onClose,
  isWindowOpen,
  isForeground = true,
  skipInitialSound,
  instanceId,
}: AppProps) {
  const [message, setMessage] = useState("");
  const [currentBottle, setCurrentBottle] = useState<Bottle | null>(null);
  const [isThrowing, setIsThrowing] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days > 0) {
      return `${days} day${days > 1 ? "s" : ""} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    } else {
      return "just now";
    }
  };

  const throwBottle = useCallback(async () => {
    if (!message.trim() || isThrowing) return;

    setIsThrowing(true);
    try {
      const response = await fetch("/api/message-in-bottle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: message.trim() }),
      });

      // Read response as text first (can only read once)
      const responseText = await response.text();

      if (!response.ok) {
        let errorMessage = "Failed to throw bottle";
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (parseError) {
          // If response is not JSON, use the text or status
          errorMessage = responseText || `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // Parse successful response (we don't need the data, just verify it's valid)
      try {
        if (responseText) {
          JSON.parse(responseText);
        }
      } catch (parseError) {
        // If response is empty or invalid JSON, that's okay - we still succeeded
      }

      setMessage("");
      toast.success("Bottle thrown into the sea!", {
        description: "Your message is now floating in the ocean.",
      });
    } catch (error) {
      console.error("Error throwing bottle:", error);
      toast.error("Failed to throw bottle", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsThrowing(false);
    }
  }, [message, isThrowing]);

  const pickBottle = useCallback(async () => {
    if (isPicking) return;

    setIsPicking(true);
    setCurrentBottle(null);
    try {
      const response = await fetch("/api/message-in-bottle", {
        method: "GET",
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 404) {
          toast.info("The sea is empty", {
            description: "Be the first to throw a bottle!",
          });
          return;
        }
        throw new Error(errorData.message || errorData.error || "Failed to pick bottle");
      }

      const data = await response.json();
      setCurrentBottle(data.bottle);
      toast.success("Bottle picked up!", {
        description: "You found a message from the sea.",
      });
    } catch (error) {
      console.error("Error picking bottle:", error);
      toast.error("Failed to pick bottle", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsPicking(false);
    }
  }, [isPicking]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        throwBottle();
      }
    },
    [throwBottle]
  );

  useEffect(() => {
    if (currentBottle && scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [currentBottle]);

  if (!isWindowOpen) return null;

  const menuBar = (
    <MessageInBottleMenuBar
      onClose={onClose}
      onShowHelp={() => setIsHelpOpen(true)}
      onShowAbout={() => setIsAboutOpen(true)}
    />
  );

  return (
    <>
      <WindowFrame
        title="TextBottle"
        onClose={onClose}
        isForeground={isForeground}
        appId="message-in-bottle"
        skipInitialSound={skipInitialSound}
        instanceId={instanceId}
        menuBar={menuBar}
      >
      <div className="flex flex-col h-full w-full min-h-0" style={{ backgroundColor: '#e0f2fe' }}>
        {/* Ocean Header */}
        <div className="px-6 py-4 border-b border-blue-200" style={{ backgroundColor: '#dbeafe' }}>
          <div className="flex items-center gap-2">
            <Waves className="w-5 h-5" style={{ color: '#2563eb' }} />
            <h2 className="text-lg font-semibold" style={{ color: '#1e3a8a' }}>
              TextBottle
            </h2>
          </div>
          <p className="text-sm mt-1" style={{ color: '#1e40af' }}>
            Throw your message into the sea, or pick up a bottle from the ocean
          </p>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col p-6 gap-4 overflow-hidden">
          {/* Throw Bottle Section */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-200">
            <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
              Throw a Bottle
            </label>
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Write your message..."
                maxLength={1000}
                className="flex-1"
                disabled={isThrowing}
              />
              <Button
                onClick={throwBottle}
                disabled={!message.trim() || isThrowing}
                className="shrink-0"
              >
                {isThrowing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs mt-2" style={{ color: '#6b7280' }}>
              {message.length}/1000 characters
            </p>
          </div>

          {/* Pick Bottle Section */}
          <div className="flex-1 flex flex-col bg-white rounded-lg shadow-sm border border-blue-200 overflow-hidden">
            <div className="p-4 border-b border-blue-200 flex items-center justify-between">
              <h3 className="text-sm font-medium" style={{ color: '#374151' }}>
                Pick Up a Bottle
              </h3>
              <Button
                onClick={pickBottle}
                disabled={isPicking}
                variant="outline"
                size="sm"
              >
                {isPicking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Fishing...
                  </>
                ) : (
                  <>
                    <Waves className="w-4 h-4 mr-2" />
                    Cast Net
                  </>
                )}
              </Button>
            </div>

            {/* Bottle Display */}
            <ScrollArea className="flex-1 p-4">
              <div ref={scrollAreaRef} className="h-full">
                {currentBottle ? (
                  <div className="space-y-4">
                    <div className="rounded-lg p-4 border-2 border-blue-200" style={{ backgroundColor: '#eff6ff' }}>
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">🌊</div>
                        <div className="flex-1">
                          <p className="whitespace-pre-wrap break-words" style={{ color: '#1f2937' }}>
                            {currentBottle.message}
                          </p>
                          <p className="text-xs mt-3" style={{ color: '#6b7280' }}>
                            {formatTime(currentBottle.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center" style={{ color: '#6b7280' }}>
                    <Waves className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-sm">
                      {isPicking
                        ? "Fishing for a bottle..."
                        : "Click 'Cast Net' to pick up a bottle from the sea"}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      </WindowFrame>
      <HelpDialog
        isOpen={isHelpOpen}
        onOpenChange={setIsHelpOpen}
        helpItems={helpItems}
        appName="TextBottle"
      />
      <AboutDialog
        isOpen={isAboutOpen}
        onOpenChange={setIsAboutOpen}
        metadata={appMetadata}
      />
    </>
  );
}

