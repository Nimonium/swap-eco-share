import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isToday, isYesterday } from "date-fns";
import {
  Send,
  MessageSquare,
  Check,
  CheckCheck,
  Loader2,
  Shield,
  ArrowRightLeft,
  Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

interface SwapChatSheetProps {
  swap: any | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
}

export const SwapChatSheet: React.FC<SwapChatSheetProps> = ({
  swap,
  isOpen,
  onClose,
  currentUserId,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isUserOwner = currentUserId === swap?.owner_id;
  const otherPerson = isUserOwner ? swap?.proposer : swap?.owner;

  const targetItem = swap?.item;
  const offeredItem = swap?.offered_item;

  const getMediaUrl = (storagePath?: string | null) => {
    if (!storagePath) return "/placeholder.svg";
    if (storagePath.startsWith("http")) return storagePath;
    const { data } = supabase.storage.from("item-media").getPublicUrl(storagePath);
    return data.publicUrl;
  };

  const targetImageUrl = getMediaUrl(targetItem?.item_media?.[0]?.storage_path);
  const offeredImageUrl = offeredItem?.item_media?.[0]?.storage_path
    ? getMediaUrl(offeredItem.item_media[0].storage_path)
    : null;

  // 1. Fetch message history for this swap
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["swap-messages", swap?.id],
    queryFn: async () => {
      if (!swap?.id) return [];
      const { data, error } = await supabase
        .from("swap_messages")
        .select(`
          id,
          swap_id,
          sender_id,
          content,
          created_at,
          read_at
        `)
        .eq("swap_id", swap.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[EcoSwapSquare Chat] Error loading message history:", error);
        throw error;
      }
      return data || [];
    },
    enabled: !!swap?.id && isOpen,
  });

  // 2. Mark unread messages as read
  const markMessagesAsRead = async (swapId: string) => {
    if (!currentUserId || !swapId) return;
    try {
      const { error } = await supabase
        .from("swap_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("swap_id", swapId)
        .is("read_at", null)
        .neq("sender_id", currentUserId);

      if (error) {
        console.warn("[EcoSwapSquare Chat] Mark as read error:", error);
      } else {
        queryClient.invalidateQueries({ queryKey: ["unread-swap-messages"] });
      }
    } catch (err) {
      console.warn("[EcoSwapSquare Chat] Mark as read exception:", err);
    }
  };

  // Mark messages as read when opening sheet
  useEffect(() => {
    if (isOpen && swap?.id && currentUserId) {
      markMessagesAsRead(swap.id);
    }
  }, [isOpen, swap?.id, currentUserId]);

  // 3. Realtime Subscription via postgres_changes
  useEffect(() => {
    if (!swap?.id || !isOpen) return;

    const channelName = `swap-chat-${swap.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "swap_messages",
          filter: `swap_id=eq.${swap.id}`,
        },
        (payload) => {
          const newMsg = payload.new as any;

          // Merge newly arrived realtime message into query cache
          queryClient.setQueryData<any[]>(["swap-messages", swap.id], (old = []) => {
            if (old.some((m) => m.id === newMsg.id)) {
              return old;
            }
            return [...old, newMsg];
          });

          // If the message is from the other party and chat is open, immediately mark as read
          if (newMsg.sender_id !== currentUserId) {
            markMessagesAsRead(swap.id);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "swap_messages",
          filter: `swap_id=eq.${swap.id}`,
        },
        (payload) => {
          const updatedMsg = payload.new as any;
          queryClient.setQueryData<any[]>(["swap-messages", swap.id], (old = []) => {
            return old.map((m) => (m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m));
          });
        }
      )
      .subscribe();

    // Clean up realtime subscription on close/unmount to prevent connection leaks
    return () => {
      supabase.removeChannel(channel);
    };
  }, [swap?.id, isOpen, currentUserId, queryClient]);

  // 4. Auto-scroll to latest message
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => scrollToBottom("auto"), 80);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom("smooth");
    }
  }, [messages.length]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // 5. Send Message Mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!currentUserId || !swap?.id) {
        throw new Error("Missing user or swap ID");
      }

      const trimmed = content.trim();
      if (!trimmed) return null;

      const { data, error } = await supabase
        .from("swap_messages")
        .insert({
          swap_id: swap.id,
          sender_id: currentUserId,
          content: trimmed,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (newMsg) => {
      if (newMsg) {
        queryClient.setQueryData<any[]>(["swap-messages", swap?.id], (old = []) => {
          if (old.some((m) => m.id === newMsg.id)) return old;
          return [...old, newMsg];
        });
      }
      setInputText("");
    },
    onError: (err: any) => {
      console.error("[EcoSwapSquare Chat] Error sending message:", err);
      const isRlsError =
        err?.code === "42501" ||
        err?.message?.toLowerCase().includes("row-level security") ||
        err?.message?.toLowerCase().includes("policy") ||
        err?.message?.toLowerCase().includes("permission denied");

      toast({
        title: "Unable to Send Message",
        description: isRlsError
          ? "Unable to send message right now."
          : err?.message || "Failed to send message.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(inputText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isToday(date)) {
        return format(date, "h:mm a");
      }
      if (isYesterday(date)) {
        return `Yesterday, ${format(date, "h:mm a")}`;
      }
      return format(date, "MMM d, h:mm a");
    } catch {
      return "";
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col h-full bg-background border-l border-border"
      >
        {/* Header */}
        <SheetHeader className="p-4 border-b border-border bg-card/60 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between gap-3 pr-6">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-border">
                <AvatarImage src={otherPerson?.avatar_url || ""} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {otherPerson?.full_name ? otherPerson.full_name.charAt(0).toUpperCase() : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <SheetTitle className="text-base font-semibold leading-tight">
                  {otherPerson?.full_name || "Community Member"}
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <span>{otherPerson?.city || "Local Swapper"}</span>
                  <span>•</span>
                  <Badge variant="outline" className="text-[10px] capitalize py-0 px-1.5 font-normal">
                    {swap?.status || "active"} swap
                  </Badge>
                </SheetDescription>
              </div>
            </div>
          </div>

          {/* Swap Items Summary Bar */}
          <div className="flex items-center gap-2 p-2 bg-muted/40 rounded-lg border border-border/50 text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-8 h-8 rounded bg-muted overflow-hidden flex-shrink-0 border border-border/50">
                <img
                  src={targetImageUrl}
                  alt={targetItem?.title || "Target"}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="truncate">
                <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                  {isUserOwner ? "Your Item" : "Requested"}
                </p>
                <p className="font-medium text-foreground truncate">
                  {targetItem?.title || "Item"}
                </p>
              </div>
            </div>

            <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />

            <div className="flex items-center gap-2 flex-1 min-w-0 justify-end text-right">
              <div className="truncate">
                <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                  {isUserOwner ? "Their Offer" : "Your Offer"}
                </p>
                <p className="font-medium text-foreground truncate">
                  {offeredItem?.title || "Direct Trade"}
                </p>
              </div>
              <div className="w-8 h-8 rounded bg-muted overflow-hidden flex-shrink-0 border border-border/50">
                {offeredImageUrl ? (
                  <img
                    src={offeredImageUrl}
                    alt={offeredItem?.title || "Offer"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground font-semibold">
                    🤝
                  </div>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Message History List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Initial proposal message note (from swaps.message) */}
          {swap?.message && (
            <div className="p-3 bg-muted/30 border border-border/40 rounded-xl text-center space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground flex items-center justify-center gap-1">
                <Clock className="h-3 w-3" /> Initial Proposal Note
              </p>
              <p className="text-xs text-foreground italic">"{swap.message}"</p>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h4 className="font-semibold text-sm">Start the conversation</h4>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Coordinate pickup location, exchange times, and item condition questions directly here.
              </p>
            </div>
          ) : (
            messages.map((msg: any) => {
              const isMe = msg.sender_id === currentUserId;
              const isRead = !!msg.read_at;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"} space-y-1`}
                >
                  <div
                    className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words shadow-sm ${
                      isMe
                        ? "bg-primary text-primary-foreground rounded-br-xs"
                        : "bg-muted text-foreground border border-border/60 rounded-bl-xs"
                    }`}
                  >
                    {msg.content}
                  </div>

                  <div className="flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground">
                    <span>{formatMessageTime(msg.created_at)}</span>
                    {isMe && (
                      <span title={isRead ? "Read by recipient" : "Delivered"}>
                        {isRead ? (
                          <CheckCheck className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Check className="h-3 w-3 text-muted-foreground" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-border bg-card/60 backdrop-blur-sm">
          <form onSubmit={handleSendMessage} className="space-y-2">
            <div className="relative flex items-end gap-2">
              <Textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message... (Press Enter to send)"
                maxLength={2000}
                rows={1}
                className="resize-none min-h-[44px] max-h-32 text-sm pr-12 py-2.5 leading-normal rounded-xl bg-background border-border"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!inputText.trim() || sendMessageMutation.isPending}
                className="h-10 w-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground flex-shrink-0 shadow-sm transition-transform active:scale-95"
              >
                {sendMessageMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
              <span className="flex items-center gap-1">
                <Shield className="h-3 w-3 text-muted-foreground" />
                Protected by community safety guidelines
              </span>
              <span>{inputText.length} / 2000</span>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
};
