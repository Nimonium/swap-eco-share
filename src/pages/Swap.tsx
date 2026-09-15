import { useState } from "react";
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
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { formatDistanceToNow } from "date-fns";

const Swap = () => {
  const [activeTab, setActiveTab] = useState("active");
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

      if (error) throw error;
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
      toast({
        title: "Update Failed",
        description: err.message || "Could not update swap status.",
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
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="active">Active Swaps</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="all">All Swaps</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-6 mt-6">
            {isError ? (
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

                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-auto"
                            onClick={() => {
                              toast({
                                title: "Chat / Coordination",
                                description: `You can coordinate delivery with ${
                                  otherPerson?.full_name || "the user"
                                }!`,
                              });
                            }}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Message
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default Swap;