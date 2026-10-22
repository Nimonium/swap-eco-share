import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWishlist } from "@/hooks/useWishlist";
import { useToast } from "@/hooks/use-toast";
import { getMediaUrl } from "@/lib/storage";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Heart,
  MapPin,
  Clock,
  Loader2,
  Trash2,
  AlertTriangle,
  RotateCcw,
  PackageX,
  ArrowRight,
  ArrowRightLeft,
  Sparkles,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const Saved = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { toggleSave } = useWishlist();

  // Route-Guard Pattern (identical to /profile)
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to view your saved wishlist items.",
      });
      navigate("/auth");
    }
  }, [authLoading, isAuthenticated, navigate, toast]);

  // Query user's blocked users list to filter out items owned by blocked users
  const { data: userBlocks = [] } = useQuery({
    queryKey: ["user-blocks", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("blocks")
        .select("blocked_id")
        .eq("blocker_id", user.id);

      if (error) {
        console.error("[Saved Page] Failed to fetch user blocks:", error);
        throw error;
      }
      return data || [];
    },
    enabled: !!user?.id,
  });

  const blockedUserIds = useMemo(
    () => new Set(userBlocks.map((b: any) => b.blocked_id)),
    [userBlocks]
  );

  // Fetch saved wishlist items with left-join to items
  // RLS hides non-published items from non-owners, so removed/swapped items come back as null from the join
  const {
    data: savedRows = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["saved-items", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("wishlist_items")
        .select(`
          id,
          item_id,
          created_at,
          item:items (
            id,
            title,
            description,
            category,
            condition,
            price_value,
            city,
            status,
            owner_id,
            created_at,
            profiles!items_owner_id_fkey (
              full_name,
              city,
              avatar_url
            ),
            item_media (
              id,
              storage_path,
              media_type
            )
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[Saved Page] Failed to fetch wishlist items:", error);
        throw error;
      }
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Filter out items belonging to blocked users; preserve null items (unavailable) so user can see & remove them
  const visibleSavedRows = useMemo(() => {
    return savedRows.filter((row: any) => {
      if (!row.item) return true; // Show placeholder for unavailable items
      return !blockedUserIds.has(row.item.owner_id);
    });
  }, [savedRows, blockedUserIds]);

  if (authLoading || (!user && isLoading)) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Checking authentication...</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="container mx-auto px-4 py-8 flex-1 max-w-7xl">
        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 px-2.5 py-0.5 text-xs font-medium">
                <Heart className="h-3 w-3 mr-1 fill-current" />
                Private Wishlist
              </Badge>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Saved Items
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base mt-1">
              Keep track of items you love and want to propose swaps for.
            </p>
          </div>

          <Link to="/browse">
            <Button variant="outline" className="gap-2 self-start font-medium shadow-xs">
              <ArrowRightLeft className="h-4 w-4" />
              Browse More Listings
            </Button>
          </Link>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Loading your saved items...</p>
          </div>
        ) : isError ? (
          <Card className="border-destructive/30 bg-destructive/5 my-6">
            <CardContent className="py-12 text-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-destructive mb-1">
                  Failed to Load Saved Items
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {error instanceof Error ? error.message : "Could not fetch your saved wishlist items."}
                </p>
              </div>
              <Button variant="outline" onClick={() => refetch()} className="gap-2">
                <RotateCcw className="h-4 w-4" /> Retry Query
              </Button>
            </CardContent>
          </Card>
        ) : visibleSavedRows.length === 0 ? (
          /* Empty State */
          <Card className="border-border border-dashed my-8">
            <CardContent className="py-20 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
                <Heart className="h-8 w-8 fill-rose-500/30" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">Your Wishlist is Empty</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Browse community items and click the heart icon on anything you like to save it for future swaps.
                </p>
              </div>
              <Link to="/browse">
                <Button variant="eco" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Explore Browse Catalog
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          /* Grid of Saved Items */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {visibleSavedRows.map((row: any) => {
              const item = row.item;

              // CASE A: Item is no longer available (soft-deleted, swapped, or unpublished)
              if (!item) {
                return (
                  <Card
                    key={row.id}
                    className="border-dashed border-border/70 bg-muted/20 overflow-hidden flex flex-col justify-between"
                  >
                    <CardContent className="p-0 flex-1 flex flex-col">
                      <div className="aspect-[4/3] w-full bg-muted/60 flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
                        <PackageX className="h-10 w-10 text-muted-foreground/50 mb-2" />
                        <Badge variant="outline" className="bg-background text-muted-foreground border-border text-[11px] font-medium">
                          No longer available
                        </Badge>
                      </div>

                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div>
                          <h3 className="font-semibold text-base text-foreground/70 line-clamp-1">
                            Unavailable Listing
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                            This item was completed, removed, or made private by its owner.
                          </p>
                        </div>

                        <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Saved {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="p-4 pt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs text-destructive hover:bg-destructive/10 hover:border-destructive/30 gap-1.5"
                        onClick={() => toggleSave(row.item_id, "Unavailable item")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove from Wishlist
                      </Button>
                    </CardFooter>
                  </Card>
                );
              }

              // CASE B: Active, Published Item
              const photos = (item.item_media || []).filter(
                (m: any) => m.media_type === "image" || !m.media_type
              );
              const firstPhoto = photos[0];
              const imageUrl = getMediaUrl(firstPhoto?.storage_path);
              const owner = item.profiles;
              const city = item.city || owner?.city || "Local Community";

              return (
                <Card
                  key={row.id}
                  className="group hover:shadow-xl hover:border-primary/40 transition-all duration-300 border-border cursor-pointer overflow-hidden flex flex-col bg-card"
                  onClick={() => navigate(`/item/${item.id}`)}
                >
                  <CardContent className="p-0 flex-1 flex flex-col">
                    {/* Image Area */}
                    <div className="relative aspect-[4/3] w-full bg-muted overflow-hidden">
                      <img
                        src={imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />

                      {/* Active Heart Button (Filled) */}
                      <button
                        type="button"
                        onClick={(e) => toggleSave(item.id, item.title, e)}
                        className="absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-md transition-all bg-rose-500/90 hover:bg-rose-600 text-white shadow-md"
                        aria-label="Remove from wishlist"
                        title="Remove from wishlist"
                      >
                        <Heart className="h-4 w-4 fill-current" />
                      </button>

                      {/* Condition Badge */}
                      <Badge className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-md text-white border-0 text-[11px] font-medium">
                        {item.condition || "Pre-Loved"}
                      </Badge>
                    </div>

                    {/* Details Area */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wider">
                            {item.category || "Item"}
                          </Badge>
                          {item.price_value && (
                            <span className="text-xs font-bold text-primary">
                              Est. ~${item.price_value}
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {item.title}
                        </h3>
                      </div>

                      {/* Owner, Location, and Saved Time */}
                      <div className="pt-2 border-t border-border/60 text-xs text-muted-foreground flex items-center justify-between">
                        <div className="flex items-center gap-1 truncate max-w-[140px]">
                          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="truncate">{city}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px]">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="p-4 pt-0">
                    <Button
                      variant="swap"
                      className="w-full font-semibold text-xs h-9 gap-1.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/item/${item.id}`);
                      }}
                    >
                      View & Propose Swap
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Saved;
