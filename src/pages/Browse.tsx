import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWishlist } from "@/hooks/useWishlist";
import { getMediaUrl } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Sparkles,
  Filter,
  MapPin,
  Clock,
  Heart,
  Loader2,
  Package,
  PlusCircle,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { formatDistanceToNow } from "date-fns";

const CATEGORIES = ["All", "Electronics", "Fashion", "Books", "Crafts", "Sports", "Appliances", "Furniture", "Other"];

const Browse = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [aiQuery, setAiQuery] = useState("");
  const [aiResults, setAiResults] = useState<any[]>([]);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const { isSaved, toggleSave } = useWishlist();

  // Query user's blocked users list
  const { data: userBlocks = [] } = useQuery({
    queryKey: ["user-blocks", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("blocks")
        .select("blocked_id")
        .eq("blocker_id", user.id);

      if (error) {
        console.error("[EcoSwapSquare Supabase Error] Failed to fetch user blocks:", error);
        throw error;
      }
      return data || [];
    },
    enabled: !!user,
  });

  const blockedUserIds = useMemo(
    () => new Set(userBlocks.map((b: any) => b.blocked_id)),
    [userBlocks]
  );

  // Fetch real published items from Supabase
  const {
    data: items = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["published-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select(
          `
          *,
          profiles!items_owner_id_fkey (
            full_name,
            city,
            avatar_url
          ),
          item_media (
            id,
            storage_path,
            media_type,
            angle_index
          )
        `
        )
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[EcoSwapSquare Supabase Error] Failed to fetch published items:", error);
        throw error;
      }
      return data || [];
    },
  });

  useEffect(() => {
    if (isError && error) {
      console.error("[EcoSwapSquare Supabase Error] Browse items query error:", error);
    }
  }, [isError, error]);

  // Client-side search & category filtering (excluding blocked users)
  const filteredItems = useMemo(() => {
    return items.filter((item: any) => {
      // Exclude items from blocked users
      if (blockedUserIds.has(item.owner_id)) return false;

      const matchesCategory =
        selectedCategory === "All" || item.category?.toLowerCase() === selectedCategory.toLowerCase();

      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const titleMatch = item.title?.toLowerCase().includes(q);
      const descMatch = item.description?.toLowerCase().includes(q);
      const catMatch = item.category?.toLowerCase().includes(q);
      const cityMatch = item.city?.toLowerCase().includes(q);
      const wantedMatch = Array.isArray(item.wanted_items) &&
        item.wanted_items.some((w: string) => w.toLowerCase().includes(q));

      return titleMatch || descMatch || catMatch || cityMatch || wantedMatch;
    });
  }, [items, searchQuery, selectedCategory, blockedUserIds]);

  // Real Swap AI matching using keyword overlap against real items (excluding blocked users)
  const handleAiSearch = () => {
    if (!aiQuery.trim()) return;
    setIsAiSearching(true);

    const tokens = aiQuery
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2);

    const matches = items.filter((item: any) => {
      if (blockedUserIds.has(item.owner_id)) return false;

      const itemKeywords = [
        item.title?.toLowerCase() || "",
        item.description?.toLowerCase() || "",
        item.category?.toLowerCase() || "",
        ...(item.wanted_items || []).map((w: string) => w.toLowerCase()),
      ].join(" ");

      return tokens.some((token) => itemKeywords.includes(token));
    });

    setAiResults(matches);
    setIsAiSearching(false);
  };



  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="container mx-auto px-4 py-8 flex-1">
        {/* Page Title & Action */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Browse Items</h1>
            <p className="text-muted-foreground">
              Discover amazing pre-loved items and find perfect swap matches with community members
            </p>
          </div>
          <Link to="/list-item">
            <Button variant="eco" className="gap-2 self-start">
              <PlusCircle className="h-4 w-4" />
              List an Item
            </Button>
          </Link>
        </div>

        <Tabs defaultValue="browse" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="browse">Browse All</TabsTrigger>
            <TabsTrigger value="ai-swap" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Swap AI
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Browse All */}
          <TabsContent value="browse" className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, description, tags, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Category Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <span>Filter: {selectedCategory}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Categories</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {CATEGORIES.map((cat) => (
                    <DropdownMenuItem
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={selectedCategory === cat ? "font-bold text-primary" : ""}
                    >
                      {cat}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Category Quick Pills */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {CATEGORIES.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="rounded-full flex-shrink-0 text-xs"
                >
                  {category}
                </Button>
              ))}
            </div>

            {/* Content Display */}
            {isError ? (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="py-12 text-center space-y-4">
                  <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold text-destructive mb-1">
                      Failed to Load Items
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      {error instanceof Error ? error.message : "A database query error occurred while fetching items."}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      If the database tables have not been created yet, please run the SQL migration in your Supabase SQL Editor.
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
                <p>Loading published items...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <Card className="border-border border-dashed">
                <CardContent className="py-16 text-center space-y-4">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold mb-1">No items found</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                      {searchQuery || selectedCategory !== "All"
                        ? "Try clearing your search query or selecting a different category."
                        : "Be the first person in your community to list an item for swap!"}
                    </p>
                  </div>
                  <Link to="/list-item">
                    <Button variant="eco" className="gap-2">
                      <PlusCircle className="h-4 w-4" />
                      List the First Item
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map((item: any) => {
                  const media = item.item_media || [];
                  const firstPhoto = media.find((m: any) => m.media_type === "image" || !m.media_type);
                  const imageUrl = getMediaUrl(firstPhoto?.storage_path);
                  const isItemSaved = isSaved(item.id);
                  const isOwner = !!user && user.id === item.owner_id;
                  const owner = item.profiles;

                  return (
                    <Card
                      key={item.id}
                      className="group hover:shadow-lg transition-all duration-300 overflow-hidden border-border flex flex-col cursor-pointer"
                      onClick={() => navigate(`/item/${item.id}`)}
                    >
                      <CardContent className="p-0 flex-1 flex flex-col">
                        <div className="relative">
                          <div className="w-full h-48 bg-muted overflow-hidden flex items-center justify-center">
                            <img
                              src={imageUrl}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          </div>

                          {!isOwner && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => toggleSave(item.id, item.title, e)}
                              className={`absolute top-2 right-2 rounded-full backdrop-blur-md transition-all ${
                                isItemSaved
                                  ? "bg-rose-500/90 hover:bg-rose-600 text-white shadow-md"
                                  : "bg-black/40 hover:bg-black/60 text-white"
                              }`}
                              aria-label={isItemSaved ? "Remove from wishlist" : "Save to wishlist"}
                            >
                              <Heart className={`h-4 w-4 ${isItemSaved ? "fill-current" : ""}`} />
                            </Button>
                          )}

                          <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground">
                            {item.condition}
                          </Badge>
                        </div>

                        <div className="p-4 flex-1 flex flex-col">
                          <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors line-clamp-1">
                            {item.title}
                          </h3>

                          <div className="flex items-center gap-2 mb-3">
                            <Badge variant="secondary" className="text-xs">
                              {item.category}
                            </Badge>
                            {item.price_value && (
                              <span className="text-xs font-semibold text-primary">
                                ~${item.price_value}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center text-sm text-muted-foreground space-x-4 mb-3">
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate max-w-[120px]">
                                {item.city || owner?.city || "Local"}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>
                                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                              </span>
                            </div>
                          </div>

                          {item.wanted_items && item.wanted_items.length > 0 && (
                            <div className="mb-4 mt-auto">
                              <p className="text-xs text-muted-foreground mb-1 font-medium">Looking for:</p>
                              <div className="flex flex-wrap gap-1">
                                {item.wanted_items.slice(0, 2).map((w: string, idx: number) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {w}
                                  </Badge>
                                ))}
                                {item.wanted_items.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{item.wanted_items.length - 2} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}

                          <Button
                            variant="swap"
                            className="w-full mt-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/item/${item.id}`);
                            }}
                          >
                            Propose Swap
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Tab 2: Swap AI Assistant */}
          <TabsContent value="ai-swap" className="space-y-6">
            <Card className="border-border">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-bold">Swap AI Assistant</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Describe what you have or what you are seeking. Our AI scans real published items to find match opportunities.
                </p>

                <Textarea
                  placeholder="e.g. 'I have a vintage turntable and I am looking for photography gear or guitar pedals'..."
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  className="min-h-[100px]"
                />

                <Button
                  onClick={handleAiSearch}
                  className="w-full gap-2"
                  variant="eco"
                  disabled={!aiQuery.trim() || isAiSearching}
                >
                  {isAiSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Find AI Matches
                </Button>
              </CardContent>
            </Card>

            {aiResults.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Matched Community Items ({aiResults.length})
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aiResults.map((product: any) => {
                    const firstPhoto = (product.item_media || []).find(
                      (m: any) => m.media_type === "image" || !m.media_type
                    );
                    const imageUrl = getMediaUrl(firstPhoto?.storage_path);

                    return (
                      <Card
                        key={product.id}
                        className="border-primary/30 hover:border-primary transition-all cursor-pointer"
                        onClick={() => navigate(`/item/${product.id}`)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                              <img
                                src={imageUrl}
                                alt={product.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-base mb-1 truncate">{product.title}</h4>
                              <p className="text-xs text-muted-foreground mb-2">
                                {product.city || product.profiles?.city || "Local"} • {product.category}
                              </p>
                              {product.wanted_items && product.wanted_items.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {product.wanted_items.map((item: string, index: number) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {item}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              <Button
                                size="sm"
                                variant="swap"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/item/${product.id}`);
                                }}
                              >
                                View & Propose Swap
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default Browse;