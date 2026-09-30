import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getMediaUrl } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  User,
  Loader2,
  ArrowRightLeft,
  ArrowRight,
  ExternalLink,
  AlertTriangle,
  RotateCcw,
  Star,
  ShieldAlert,
  ShieldCheck,
  Scale,
} from "lucide-react";
import { DisputeDialog, DISPUTE_CATEGORY_LABELS, DisputeCategory } from "@/components/DisputeDialog";
import { DisputeDetailsModal, DISPUTE_STATUS_CONFIG, DisputeStatus } from "@/components/DisputeDetailsModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SwapChatSheet } from "@/components/SwapChatSheet";
import { formatDistanceToNow } from "date-fns";

const Swap = () => {
  const [activeTab, setActiveTab] = useState("active");
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Review Dialog State
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [selectedSwapForReview, setSelectedSwapForReview] = useState<any | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewHoverRating, setReviewHoverRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState("");

  // Real-time Chat Panel State
  const [selectedSwapForChat, setSelectedSwapForChat] = useState<any | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Dispute Center State
  const [selectedSwapForDispute, setSelectedSwapForDispute] = useState<any | null>(null);
  const [isDisputeDialogOpen, setIsDisputeDialogOpen] = useState(false);
  const [selectedDisputeForDetails, setSelectedDisputeForDetails] = useState<any | null>(null);
  const [isDisputeDetailsOpen, setIsDisputeDetailsOpen] = useState(false);

  // Fetch unread messages count for current user
  const { data: unreadMessages = [] } = useQuery({
    queryKey: ["unread-swap-messages", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("swap_messages")
        .select("id, swap_id, sender_id, read_at")
        .is("read_at", null)
        .neq("sender_id", user.id);

      if (error) {
        // Table might not exist yet before migration is run
        console.warn("[EcoSwapSquare] Unread messages fetch:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!user,
  });

  const unreadCountBySwap = useMemo(() => {
    const map: Record<string, number> = {};
    unreadMessages.forEach((msg: any) => {
      map[msg.swap_id] = (map[msg.swap_id] || 0) + 1;
    });
    return map;
  }, [unreadMessages]);

  // Real-time subscription to update unread badge live across swap cards
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("global-swap-messages-unread")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "swap_messages",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["unread-swap-messages"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "swap_messages",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["unread-swap-messages"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // Fetch real user swaps from Supabase
  const {
    data: swaps = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["my-swaps", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("swaps")
        .select(
          `
          *,
          item:items!swaps_item_id_fkey (
            id,
            title,
            category,
            condition,
            price_value,
            city,
            item_media (id, storage_path, media_type)
          ),
          offered_item:items!swaps_offered_item_id_fkey (
            id,
            title,
            category,
            condition,
            price_value,
            city,
            item_media (id, storage_path, media_type)
          ),
          proposer:profiles!swaps_proposer_id_fkey (
            id,
            full_name,
            avatar_url,
            city
          ),
          owner:profiles!swaps_owner_id_fkey (
            id,
            full_name,
            avatar_url,
            city
          )
        `
        )
        .or(`proposer_id.eq.${user.id},owner_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[EcoSwapSquare Supabase Error] Failed to fetch swaps:", error);
        throw error;
      }
      return data || [];
    },
    enabled: !!user,
  });

  // Status update mutation (Accept / Decline / Completed)
  const updateSwapStatusMutation = useMutation({
    mutationFn: async ({
      swapId,
      status,
    }: {
      swapId: string;
      status: "pending" | "accepted" | "declined" | "completed";
    }) => {
      const { data, error } = await supabase
        .from("swaps")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", swapId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["my-swaps"] });
      toast({
        title: "Swap Updated",
        description: `This swap is now marked as ${data.status}.`,
      });
    },
    onError: (err: any) => {
      console.error("[EcoSwapSquare Supabase Error] Failed to update swap status:", err);
      toast({
        title: "Update Failed",
        description: err.message || "Could not update swap status.",
        variant: "destructive",
      });
    },
  });

  // Fetch reviews submitted by the current user to identify completed swaps already reviewed
  const { data: userReviews = [] } = useQuery({
    queryKey: ["user-reviews-given", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("reviews")
        .select("id, swap_id, rating, comment")
        .eq("reviewer_id", user.id);

      if (error) {
        console.error("[EcoSwapSquare Supabase Error] Failed to fetch user reviews:", error);
        throw error;
      }
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch disputes involving current user
  const { data: userDisputes = [], isLoading: disputesLoading } = useQuery({
    queryKey: ["disputes", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("disputes")
        .select(`
          id,
          swap_id,
          filed_by,
          against_user_id,
          category,
          description,
          status,
          resolution_notes,
          created_at,
          resolved_at,
          filer:profiles!filed_by(full_name, avatar_url),
          against_user:profiles!against_user_id(full_name, avatar_url),
          swap:swaps!swap_id(
            id,
            status,
            item:items!item_id(title, condition, price_value, item_media(storage_path)),
            offered_item:items!offered_item_id(title, condition, price_value, item_media(storage_path))
          )
        `)
        .or(`filed_by.eq.${user.id},against_user_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("[EcoSwapSquare] Disputes fetch:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!user,
  });

  const disputesBySwapId = useMemo(() => {
    const map: Record<string, any> = {};
    userDisputes.forEach((d: any) => {
      map[d.swap_id] = d;
    });
    return map;
  }, [userDisputes]);

  const activeDisputesCount = useMemo(() => {
    return userDisputes.filter(
      (d: any) => d.status === "open" || d.status === "under_review"
    ).length;
  }, [userDisputes]);

  // Submit Review Mutation
  const submitReviewMutation = useMutation({
    mutationFn: async ({
      swapId,
      revieweeId,
      rating,
      comment,
    }: {
      swapId: string;
      revieweeId: string;
      rating: number;
      comment: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("reviews")
        .insert({
          swap_id: swapId,
          reviewer_id: user.id,
          reviewee_id: revieweeId,
          rating,
          comment: comment.trim() || null,
        })
        .select()
        .single();

      if (error) {
        console.error("[EcoSwapSquare Supabase Error] Review submission error:", error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-reviews-given", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["my-swaps", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({
        title: "Review Submitted ✓",
        description: "Thank you for rating your swap experience and building community trust!",
      });
      setIsReviewDialogOpen(false);
      setSelectedSwapForReview(null);
      setReviewRating(5);
      setReviewComment("");
    },
    onError: (err: any) => {
      console.error("[EcoSwapSquare Supabase Error] Failed to submit review:", err);
      toast({
        title: "Could Not Submit Review",
        description: err.message || "Failed to submit review.",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-500";
      case "accepted":
        return "bg-blue-500";
      case "completed":
        return "bg-emerald-500";
      case "declined":
        return "bg-rose-500";
      default:
        return "bg-muted";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "accepted":
        return <CheckCircle className="h-4 w-4" />;
      case "completed":
        return <Package className="h-4 w-4" />;
      case "declined":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const filteredSwaps = swaps.filter((swap: any) => {
    if (activeTab === "active") return ["pending", "accepted"].includes(swap.status);
    if (activeTab === "completed") return swap.status === "completed";
    return true;
  });

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="container mx-auto px-4 py-16 flex-1 flex flex-col items-center justify-center text-center">
          <Package className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Sign in to View Your Swaps</h2>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Track your ongoing offers, accept proposals, and coordinate exchanges.
          </p>
          <Link to="/auth">
            <Button variant="eco" size="lg">
              Sign In to Your Account
            </Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">My Swaps</h1>
            <p className="text-muted-foreground">Manage your incoming proposals, active trades, and completed swaps</p>
          </div>
          <Link to="/browse">
            <Button variant="outline" className="gap-2 self-start">
              <ArrowRightLeft className="h-4 w-4" />
              Browse More Items
            </Button>
          </Link>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-xl grid-cols-4">
            <TabsTrigger value="active">Active Swaps</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="disputes" className="relative gap-1.5">
              <span>Disputes</span>
              {activeDisputesCount > 0 && (
                <Badge
                  variant="destructive"
                  className="h-4 min-w-[16px] px-1 text-[9px] font-bold rounded-full"
                >
                  {activeDisputesCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">All Swaps</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-6 mt-6">
            {activeTab === "disputes" ? (
              /* Disputes List View */
              disputesLoading ? (
                <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p>Loading dispute cases...</p>
                </div>
              ) : userDisputes.length === 0 ? (
                <Card className="border-border border-dashed">
                  <CardContent className="py-16 text-center space-y-4">
                    <ShieldCheck className="h-14 w-14 text-emerald-500 mx-auto" />
                    <div>
                      <h3 className="text-lg font-semibold mb-1">No Trade Disputes</h3>
                      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        You don't have any active or past trade disputes. If an accepted or completed exchange ever encounters an issue, you can file a case directly from your swap card.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {userDisputes.map((dispute: any) => {
                    const isFiler = dispute.filed_by === user?.id;
                    const statusConfig =
                      DISPUTE_STATUS_CONFIG[dispute.status as DisputeStatus] ||
                      DISPUTE_STATUS_CONFIG.open;
                    const categoryLabel =
                      DISPUTE_CATEGORY_LABELS[dispute.category as DisputeCategory] ||
                      dispute.category;

                    const targetItem = dispute.swap?.item;
                    const targetMedia = targetItem?.item_media?.[0];
                    const targetImageUrl = getMediaUrl(targetMedia?.storage_path);

                    const partnerName = isFiler
                      ? dispute.against_user?.full_name || "Swap Partner"
                      : dispute.filer?.full_name || "Swap Partner";

                    return (
                      <Card
                        key={dispute.id}
                        className="border-border hover:shadow-md transition-shadow overflow-hidden bg-card"
                      >
                        <CardHeader className="bg-muted/30 pb-3 border-b border-border/50">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={statusConfig.variant}
                                className={statusConfig.className}
                              >
                                {statusConfig.label}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {isFiler ? "Filed by you" : `Filed against trade`}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Case #{dispute.id.slice(0, 8)}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(dispute.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </CardHeader>

                        <CardContent className="p-4 sm:p-6 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden flex-shrink-0 border border-border">
                                <img
                                  src={targetImageUrl}
                                  alt={targetItem?.title || "Item"}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div>
                                <h4 className="font-semibold text-sm line-clamp-1">
                                  {targetItem?.title || "Swap Item"}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                  Partner: <strong className="text-foreground">{partnerName}</strong> • Category: <strong className="text-foreground">{categoryLabel}</strong>
                                </p>
                              </div>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 self-start sm:self-auto text-xs"
                              onClick={() => {
                                setSelectedDisputeForDetails(dispute);
                                setIsDisputeDetailsOpen(true);
                              }}
                            >
                              <ShieldAlert className="h-3.5 w-3.5 text-primary" />
                              View Dispute & Evidence
                            </Button>
                          </div>

                          <div className="p-3 bg-muted/40 rounded-lg text-xs leading-relaxed text-muted-foreground border border-border/40">
                            <p className="line-clamp-2 italic">
                              "{dispute.description}"
                            </p>
                          </div>

                          {dispute.resolution_notes && (
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs space-y-1">
                              <p className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle className="h-3.5 w-3.5" /> Resolution Notes:
                              </p>
                              <p className="text-foreground/90 line-clamp-2">
                                {dispute.resolution_notes}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )
            ) : isError ? (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="py-12 text-center space-y-4">
                  <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold text-destructive mb-1">
                      Failed to Load Swaps
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      {error instanceof Error ? error.message : "A database query error occurred while fetching your swaps."}
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => refetch()} className="gap-2">
                    <RotateCcw className="h-4 w-4" /> Retry Query
                  </Button>
                </CardContent>
              </Card>
            ) : isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p>Loading your swaps...</p>
              </div>
            ) : filteredSwaps.length === 0 ? (
              <Card className="border-border border-dashed">
                <CardContent className="py-16 text-center space-y-4">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold mb-1">No swaps found</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                      {activeTab === "active"
                        ? "You don't have any active swap proposals right now."
                        : activeTab === "completed"
                        ? "You haven't completed any swaps yet."
                        : "No swap history found for your account."}
                    </p>
                  </div>
                  <Link to="/browse">
                    <Button variant="swap">Start Browsing Items</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredSwaps.map((swap: any) => {
                  const isUserOwner = user?.id === swap.owner_id;
                  const isUserProposer = user?.id === swap.proposer_id;
                  const otherPerson = isUserOwner ? swap.proposer : swap.owner;
                  const roleLabel = isUserOwner ? "Incoming Proposal" : "Your Proposal";
                  const hasReviewed = userReviews.some((r: any) => r.swap_id === swap.id);

                  const targetItem = swap.item;
                  const targetMedia = targetItem?.item_media?.[0];
                  const targetImageUrl = getMediaUrl(targetMedia?.storage_path);

                  const offeredItem = swap.offered_item;
                  const offeredMedia = offeredItem?.item_media?.[0];
                  const offeredImageUrl = getMediaUrl(offeredMedia?.storage_path);

                  return (
                    <Card key={swap.id} className="hover:shadow-md transition-shadow border-border">
                      <CardHeader className="pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border border-border">
                              <AvatarImage src={otherPerson?.avatar_url || ""} />
                              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                {otherPerson?.full_name ? otherPerson.full_name.charAt(0).toUpperCase() : "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-base">
                                  {otherPerson?.full_name || "Community Member"}
                                </h3>
                                <Badge variant="outline" className="text-[10px] font-normal">
                                  {roleLabel}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {otherPerson?.city || "Local Swapper"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <Badge
                              variant="secondary"
                              className={`${getStatusColor(swap.status)} text-white flex items-center gap-1.5`}
                            >
                              {getStatusIcon(swap.status)}
                              <span className="capitalize">{swap.status}</span>
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(swap.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* Comparison Grid: Item Requested vs Item Offered */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-muted/20 rounded-xl border border-border">
                          {/* Item Requested */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-xs text-muted-foreground uppercase tracking-wider">
                                {isUserOwner ? "Your Item (Requested)" : "Target Item"}
                              </h4>
                              {targetItem?.id && (
                                <Link
                                  to={`/item/${targetItem.id}`}
                                  className="text-xs text-primary hover:underline flex items-center gap-1"
                                >
                                  View <ExternalLink className="h-3 w-3" />
                                </Link>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-14 h-14 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                                <img
                                  src={targetImageUrl}
                                  alt={targetItem?.title || "Item"}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div>
                                <h5 className="font-semibold text-sm line-clamp-1">
                                  {targetItem?.title || "Unknown Item"}
                                </h5>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                  <span>{targetItem?.condition}</span>
                                  {targetItem?.price_value && <span>• ${targetItem.price_value}</span>}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Offered Item */}
                          <div className="space-y-2 border-t md:border-t-0 md:border-l border-border pt-3 md:pt-0 md:pl-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-xs text-muted-foreground uppercase tracking-wider">
                                {isUserOwner ? "Offered in Exchange" : "Your Offer"}
                              </h4>
                              {offeredItem?.id && (
                                <Link
                                  to={`/item/${offeredItem.id}`}
                                  className="text-xs text-primary hover:underline flex items-center gap-1"
                                >
                                  View <ExternalLink className="h-3 w-3" />
                                </Link>
                              )}
                            </div>

                            {offeredItem ? (
                              <div className="flex items-center gap-3">
                                <div className="w-14 h-14 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                                  <img
                                    src={offeredImageUrl}
                                    alt={offeredItem.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div>
                                  <h5 className="font-semibold text-sm line-clamp-1">
                                    {offeredItem.title}
                                  </h5>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                    <span>{offeredItem.condition}</span>
                                    {offeredItem.price_value && <span>• ${offeredItem.price_value}</span>}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground italic">
                                Direct trade proposal (no specific catalog item offered)
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Proposal Message */}
                        {swap.message && (
                          <div className="bg-muted/40 rounded-lg p-3 text-sm border border-border/50">
                            <p className="text-muted-foreground text-xs font-semibold mb-1">Proposal Message:</p>
                            <p className="text-foreground italic">"{swap.message}"</p>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                          {/* Owner actions when swap is pending */}
                          {swap.status === "pending" && isUserOwner && (
                            <>
                              <Button
                                variant="swap"
                                size="sm"
                                disabled={updateSwapStatusMutation.isPending}
                                onClick={() =>
                                  updateSwapStatusMutation.mutate({
                                    swapId: swap.id,
                                    status: "accepted",
                                  })
                                }
                              >
                                Accept Swap
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={updateSwapStatusMutation.isPending}
                                onClick={() =>
                                  updateSwapStatusMutation.mutate({
                                    swapId: swap.id,
                                    status: "declined",
                                  })
                                }
                              >
                                Decline
                              </Button>
                            </>
                          )}

                          {/* Either party can complete when accepted */}
                          {swap.status === "accepted" && (
                            <Button
                              variant="eco"
                              size="sm"
                              disabled={updateSwapStatusMutation.isPending}
                              onClick={() =>
                                updateSwapStatusMutation.mutate({
                                  swapId: swap.id,
                                  status: "completed",
                                })
                              }
                            >
                              <CheckCircle className="h-4 w-4 mr-1.5" />
                              Mark as Completed
                            </Button>
                          )}

                          {/* Leave Review or Review Submitted for Completed Swaps */}
                          {swap.status === "completed" && (
                            hasReviewed ? (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <CheckCircle className="h-3.5 w-3.5" />
                                <span>Review Submitted ✓</span>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 border-amber-500/40 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 dark:text-amber-400 font-medium shadow-sm"
                                onClick={() => {
                                  setSelectedSwapForReview(swap);
                                  setReviewRating(5);
                                  setReviewHoverRating(0);
                                  setReviewComment("");
                                  setIsReviewDialogOpen(true);
                                }}
                              >
                                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                                <span>Leave a Review</span>
                              </Button>
                            )
                          )}

                          {/* Dispute Action for Accepted or Completed Swaps */}
                          {(swap.status === "accepted" || swap.status === "completed") && (
                            disputesBySwapId[swap.id] ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 text-xs font-medium shadow-xs"
                                onClick={() => {
                                  setSelectedDisputeForDetails(disputesBySwapId[swap.id]);
                                  setIsDisputeDetailsOpen(true);
                                }}
                              >
                                <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                                <span>View Dispute</span>
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5"
                                onClick={() => {
                                  setSelectedSwapForDispute(swap);
                                  setIsDisputeDialogOpen(true);
                                }}
                              >
                                <AlertTriangle className="h-3.5 w-3.5" />
                                <span>Report Problem</span>
                              </Button>
                            )
                          )}

                          {swap.status !== "declined" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="ml-auto relative gap-1.5 hover:bg-primary/10 hover:text-primary hover:border-primary/40 font-medium shadow-xs"
                              onClick={() => {
                                setSelectedSwapForChat(swap);
                                setIsChatOpen(true);
                              }}
                            >
                              <MessageSquare className="h-4 w-4" />
                              <span>Message</span>
                              {(unreadCountBySwap[swap.id] || 0) > 0 && (
                                <Badge
                                  variant="destructive"
                                  className="h-5 min-w-[20px] px-1 text-[10px] font-bold rounded-full flex items-center justify-center -mr-1 animate-pulse"
                                >
                                  {unreadCountBySwap[swap.id]}
                                </Badge>
                              )}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Leave Review Dialog */}
        <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                Rate Your Swap Experience
              </DialogTitle>
              <DialogDescription>
                {selectedSwapForReview && (
                  <span>
                    Leave public feedback for{" "}
                    <strong className="text-foreground">
                      {(user?.id === selectedSwapForReview.owner_id
                        ? selectedSwapForReview.proposer?.full_name
                        : selectedSwapForReview.owner?.full_name) || "your swap partner"}
                    </strong>.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-3">
              {/* Clickable 5-Star Rating Selector */}
              <div className="space-y-2 text-center">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Overall Rating
                </label>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const activeRating = reviewHoverRating || reviewRating;
                    const isFilled = star <= activeRating;
                    return (
                      <button
                        key={star}
                        type="button"
                        className="p-1 rounded-md hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-primary/40"
                        onMouseEnter={() => setReviewHoverRating(star)}
                        onMouseLeave={() => setReviewHoverRating(0)}
                        onClick={() => setReviewRating(star)}
                        aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                      >
                        <Star
                          className={`h-8 w-8 transition-colors ${
                            isFilled
                              ? "text-amber-500 fill-amber-500 drop-shadow-sm"
                              : "text-muted-foreground/30 hover:text-amber-400/50"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  {reviewRating === 5 && "5 Stars — Outstanding Swap Experience"}
                  {reviewRating === 4 && "4 Stars — Very Good & Smooth Trade"}
                  {reviewRating === 3 && "3 Stars — Good / Fair Trade"}
                  {reviewRating === 2 && "2 Stars — Mediocre Experience"}
                  {reviewRating === 1 && "1 Star — Poor Experience"}
                </p>
              </div>

              {/* Optional Comment */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground block">
                  Feedback Comment <span className="text-muted-foreground text-xs font-normal">(Optional)</span>
                </label>
                <Textarea
                  placeholder="How was the item condition? Friendly communication? Punctual exchange?"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="min-h-[90px] resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {reviewComment.length}/500
                </p>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsReviewDialogOpen(false)}
                disabled={submitReviewMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="swap"
                disabled={submitReviewMutation.isPending}
                onClick={() => {
                  if (!selectedSwapForReview) return;
                  const revieweeId =
                    user?.id === selectedSwapForReview.owner_id
                      ? selectedSwapForReview.proposer_id
                      : selectedSwapForReview.owner_id;
                  submitReviewMutation.mutate({
                    swapId: selectedSwapForReview.id,
                    revieweeId,
                    rating: reviewRating,
                    comment: reviewComment,
                  });
                }}
                className="gap-2"
              >
                {submitReviewMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Star className="h-4 w-4 fill-current" />
                    Submit Review
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Real-time In-App Swap Chat Sheet */}
        <SwapChatSheet
          swap={selectedSwapForChat}
          isOpen={isChatOpen}
          onClose={() => {
            setIsChatOpen(false);
            setSelectedSwapForChat(null);
          }}
          currentUserId={user?.id}
        />

        {/* File Dispute Dialog */}
        <DisputeDialog
          isOpen={isDisputeDialogOpen}
          onClose={() => {
            setIsDisputeDialogOpen(false);
            setSelectedSwapForDispute(null);
          }}
          swap={selectedSwapForDispute}
          currentUserId={user?.id || ""}
        />

        {/* Dispute Case & Evidence Details Modal */}
        <DisputeDetailsModal
          isOpen={isDisputeDetailsOpen}
          onClose={() => {
            setIsDisputeDetailsOpen(false);
            setSelectedDisputeForDetails(null);
          }}
          dispute={selectedDisputeForDetails}
          currentUserId={user?.id || ""}
        />
      </main>

      <Footer />
    </div>
  );
};

export default Swap;