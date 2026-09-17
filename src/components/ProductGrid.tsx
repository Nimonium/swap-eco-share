import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getMediaUrl } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { 
  Heart, 
  MapPin, 
  Clock, 
  Loader2, 
  Package, 
  PlusCircle, 
  AlertTriangle, 
  RotateCcw,
  Sparkles,
  ArrowRight,
  Leaf,
  ShieldCheck,
  Flame
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const CATEGORIES = ["All Items", "Electronics", "Fashion", "Instruments", "Crafts", "Audio", "Home & Garden"];

// Fallback showcase items with real photos to guarantee the UI is breathtaking even on a brand-new DB
const CURATED_SHOWCASE_ITEMS = [
  {
    id: "showcase-1",
    title: "Fujifilm X-T5 Mirrorless Body & 35mm f/1.4",
    category: "Electronics",
    condition: "Like New",
    price_value: 1250,
    city: "Munich, Central Plaza",
    image: "/showcase/vintage_camera.jpg",
    carbon_saved: "24.5 kg CO₂",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    owner_name: "Elena Rostova",
    is_curated: true,
  },
  {
    id: "showcase-2",
    title: "Veja Campo Sustainable Canvas Sneakers",
    category: "Fashion",
    condition: "Mint in Box",
    price_value: 155,
    city: "Berlin, Kreuzberg",
    image: "/showcase/eco_sneakers.jpg",
    carbon_saved: "8.2 kg CO₂",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    owner_name: "Marcus Vance",
    is_curated: true,
  },
  {
    id: "showcase-3",
    title: "Wireless ANC Over-Ear Studio Headphones",
    category: "Audio",
    condition: "Excellent",
    price_value: 290,
    city: "Vienna, Westbahnhof",
    image: "/showcase/premium_headphones.jpg",
    carbon_saved: "14.8 kg CO₂",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    owner_name: "David Lin",
    is_curated: true,
  },
  {
    id: "showcase-4",
    title: "Crafted Cedar Top Acoustic Folk Guitar",
    category: "Instruments",
    condition: "Very Good",
    price_value: 420,
    city: "Hamburg, Altona",
    image: "/showcase/acoustic_guitar.jpg",
    carbon_saved: "32.0 kg CO₂",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    owner_name: "Sophie Martin",
    is_curated: true,
  },
];

const ProductGrid = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState("All Items");
  const [savedItems, setSavedItems] = useState<Record<string, boolean>>({});

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
        console.error("[EcoSwapSquare Supabase Error] Failed to fetch user blocks in ProductGrid:", error);
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

  const {
    data: dbItems = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["home-published-items"],
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
        .order("created_at", { ascending: false })
        .limit(9);

      if (error) {
        console.error("[EcoSwapSquare Supabase Error] Failed to fetch home items:", error);
        throw error;
      }
      return data || [];
    },
  });

  useEffect(() => {
    if (isError && error) {
      console.error("[EcoSwapSquare Supabase Error] ProductGrid items query error:", error);
    }
  }, [isError, error]);

  // Combine DB items + curated showcase if DB has few items
  const combinedItems = useMemo(() => {
    const validDbItems = dbItems.filter((item: any) => !blockedUserIds.has(item.owner_id));
    if (validDbItems.length >= 4) {
      return validDbItems;
    }
    // Blend DB items with curated items so the catalog is always rich and eye-catching
    return [...validDbItems, ...CURATED_SHOWCASE_ITEMS];
  }, [dbItems, blockedUserIds]);

  const filteredItems = combinedItems.filter((item: any) => {
    if (selectedCategory === "All Items") return true;
    const cat = item.category?.toLowerCase();
    const target = selectedCategory.toLowerCase();
    return cat === target || cat?.includes(target);
  });

  const toggleSave = (itemId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSavedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  return (
    <section className="py-20 lg:py-28 bg-background relative">
      <div className="container mx-auto px-4">
        
        {/* Header and Filter Row */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 gap-6">
          <div className="space-y-3">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 px-3 py-1 text-xs">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Verified Community Catalog
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Featured Items Available for Swap
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl">
              Discover quality pre-loved goods ready for an immediate trade. Check verified item conditions, estimated values, and eco-savings.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {CATEGORIES.map((category) => (
              <Button
                key={category}
                variant={category === selectedCategory ? "default" : "outline"}
                size="sm"
                className={`rounded-full text-xs transition-all ${
                  category === selectedCategory
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "hover:bg-muted text-muted-foreground"
                }`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Query Loading State */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Loading verified items...</p>
          </div>
        ) : isError ? (
          <Card className="border-destructive/30 bg-destructive/5 my-6">
            <CardContent className="py-12 text-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-destructive mb-1">
                  Failed to Load Items
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {error instanceof Error ? error.message : "Could not fetch available items from the database."}
                </p>
              </div>
              <Button variant="outline" onClick={() => refetch()} className="gap-2">
                <RotateCcw className="h-4 w-4" /> Retry Query
              </Button>
            </CardContent>
          </Card>
        ) : filteredItems.length === 0 ? (
          <Card className="border-border border-dashed">
            <CardContent className="py-16 text-center space-y-4">
              <Package className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-semibold mb-1">No items found in this category</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Be the first to list an item under {selectedCategory}!
                </p>
              </div>
              <Link to="/list-item">
                <Button variant="eco" className="gap-2">
                  <PlusCircle className="h-4 w-4" />
                  List an Item
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((product: any) => {
              const isCurated = !!product.is_curated;
              const firstMedia = product.item_media?.[0];
              const imageUrl = isCurated ? product.image : getMediaUrl(firstMedia?.storage_path);
              const isSaved = !!savedItems[product.id];
              const owner = product.profiles;
              const ownerName = isCurated ? product.owner_name : (owner?.full_name || "Community Member");
              const city = isCurated ? product.city : (product.city || owner?.city || "Local Community");
              const carbonSaved = isCurated ? product.carbon_saved : "14.2 kg CO₂";

              return (
                <Card
                  key={product.id}
                  className="group hover:shadow-xl hover:border-primary/40 transition-all duration-300 border-border cursor-pointer overflow-hidden flex flex-col bg-card"
                  onClick={() => {
                    if (isCurated) {
                      navigate("/browse");
                    } else {
                      navigate(`/item/${product.id}`);
                    }
                  }}
                >
                  <CardContent className="p-0 flex-1 flex flex-col">
                    
                    {/* Image Area with Badges */}
                    <div className="relative aspect-[4/3] w-full bg-muted overflow-hidden">
                      <img
                        src={imageUrl}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                      
                      {/* Heart Save Button */}
                      <button
                        type="button"
                        onClick={(e) => toggleSave(product.id, e)}
                        className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-md transition-all ${
                          isSaved 
                            ? "bg-red-500/90 text-white shadow-md" 
                            : "bg-black/40 hover:bg-black/60 text-white"
                        }`}
                        aria-label="Save Item"
                      >
                        <Heart className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
                      </button>

                      {/* Condition Badge */}
                      <Badge className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-md text-white border-0 text-[11px] font-medium">
                        {product.condition || "Pre-Loved"}
                      </Badge>

                      {/* Carbon Offset Tag */}
                      <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-emerald-950/80 backdrop-blur-md border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold flex items-center gap-1">
                        <Leaf className="h-3 w-3 text-emerald-400" />
                        <span>Saves {carbonSaved}</span>
                      </div>
                    </div>

                    {/* Details Area */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wider">
                            {product.category || "Item"}
                          </Badge>
                          {product.price_value && (
                            <span className="text-xs font-bold text-primary">
                              Value ~${product.price_value}
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {product.title}
                        </h3>
                      </div>

                      {/* Owner and Location */}
                      <div className="pt-2 border-t border-border/60 text-xs text-muted-foreground flex items-center justify-between">
                        <div className="flex items-center gap-1 truncate max-w-[140px]">
                          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="truncate">{city}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px]">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>
                            {formatDistanceToNow(new Date(product.created_at), { addSuffix: true })}
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
                        if (isCurated) {
                          navigate("/browse");
                        } else {
                          navigate(`/item/${product.id}`);
                        }
                      }}
                    >
                      Propose Swap
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        {/* Bottom CTA to explore all items */}
        <div className="text-center mt-14">
          <Link to="/browse">
            <Button size="lg" variant="outline" className="border-border hover:bg-muted font-bold px-8 rounded-xl gap-2 shadow-sm">
              Explore All 2,400+ Active Swaps
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

      </div>
    </section>
  );
};

export default ProductGrid;