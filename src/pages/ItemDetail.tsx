import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getMediaUrl } from "@/lib/storage";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Tag,
  DollarSign,
  Star,
  Repeat,
  ShieldCheck,
  Video,
  Loader2,
  Share2,
  Edit3,
  Trash2,
  Flag,
  UserX,
  Shield,
  MoreVertical,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const CATEGORIES = [
  "Electronics",
  "Fashion",
  "Books",
  "Crafts",
  "Sports",
  "Appliances",
  "Furniture",
  "Musical Instruments",
  "Collectibles",
  "Other",
];

const CONDITIONS = [
  { value: "Like New", label: "Like New - Pristine condition with original packaging" },
  { value: "Very Good", label: "Very Good - Minor cosmetic signs of wear, fully functional" },
  { value: "Good", label: "Good - Noticeable wear, fully functional" },
  { value: "Fair", label: "Fair - Significant wear or cosmetic defects, functional" },
  { value: "For Parts", label: "For Parts - Not fully working or needs repair" },
];

const ItemDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Swap dialog state
  const [isSwapDialogOpen, setIsSwapDialogOpen] = useState(false);
  const [selectedMyItemId, setSelectedMyItemId] = useState<string>("none");
  const [swapMessage, setSwapMessage] = useState("");

  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editCondition, setEditCondition] = useState("");
  const [editPriceValue, setEditPriceValue] = useState("");
  const [editExchangePreference, setEditExchangePreference] = useState("swap");
  const [editWantedItems, setEditWantedItems] = useState("");

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Report dialog state
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string>("fake_listing");
  const [reportDetails, setReportDetails] = useState<string>("");

  // Block confirmation dialog state
  const [isBlockConfirmOpen, setIsBlockConfirmOpen] = useState(false);

  // 1. Fetch Item Data with Owner Profile and Item Media
  const {
    data: item,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["item", id],
    queryFn: async () => {
      if (!id) throw new Error("Item ID is required");

      const { data, error } = await supabase
        .from("items")
        .select(
          `
          *,
          profiles!items_owner_id_fkey (
            id,
            full_name,
            avatar_url,
            city,
            bio,
            rating_avg,
            swap_count
          ),
          item_media (*)
        `
        )
        .eq("id", id)
        .single();

      if (error) {
        console.error("[EcoSwapSquare Supabase Error] Failed to fetch item detail:", error);
        throw error;
      }
      return data;
    },
    enabled: !!id,
  });

  // Populate Edit Form fields when item data loads or edit dialog is opened
  useEffect(() => {
    if (item) {
      setEditTitle(item.title || "");
      setEditDescription(item.description || "");
      setEditCategory(item.category || "");
      setEditCondition(item.condition || "Good");
      setEditPriceValue(
        item.price_value !== null && item.price_value !== undefined
          ? String(item.price_value)
          : ""
      );
      setEditExchangePreference(item.exchange_preference || "swap");
      setEditWantedItems(
        Array.isArray(item.wanted_items) ? item.wanted_items.join(", ") : ""
      );
    }
  }, [item, isEditDialogOpen]);

  // 2. Fetch logged-in user's published items for the swap proposal
  const { data: userItems = [] } = useQuery({
    queryKey: ["my-published-items", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("items")
        .select("id, title, category, condition")
        .eq("owner_id", user.id)
        .eq("status", "published");

      if (error) {
        console.error("[EcoSwapSquare Supabase Error] Failed to fetch user published items:", error);
        throw error;
      }
      return data;
    },
    enabled: !!user && isSwapDialogOpen,
  });

  // 3. Propose Swap Mutation
  const proposeSwapMutation = useMutation({
    mutationFn: async () => {
      if (!user || !item) throw new Error("Missing user or item data");

      const offeredId = selectedMyItemId === "none" ? null : selectedMyItemId;

      const { data, error } = await supabase
        .from("swaps")
        .insert({
          item_id: item.id,
          owner_id: item.owner_id,
          proposer_id: user.id,
          offered_item_id: offeredId,
          message: swapMessage.trim() || null,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-swaps"] });
      toast({
        title: "Swap Proposal Sent!",
        description: "The owner will be notified of your offer.",
      });
      setIsSwapDialogOpen(false);
      setSwapMessage("");
      setSelectedMyItemId("none");
      navigate("/swap");
    },
    onError: (err: any) => {
      console.error("[EcoSwapSquare Supabase Error] Failed to propose swap:", err);
      toast({
        title: "Error Proposing Swap",
        description: err.message || "Failed to submit swap proposal.",
        variant: "destructive",
      });
    },
  });

  // 4. Edit Item Mutation
  const editItemMutation = useMutation({
    mutationFn: async (updatedData: {
      title: string;
      description: string;
      category: string;
      condition: string;
      price_value: number | null;
      exchange_preference: string;
      wanted_items: string[] | null;
    }) => {
      if (!item?.id) throw new Error("Missing item id");

      const { data, error } = await supabase
        .from("items")
        .update(updatedData)
        .eq("id", item.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item", id] });
      queryClient.invalidateQueries({ queryKey: ["my-items"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      toast({
        title: "Listing Updated",
        description: "Your item details have been successfully updated.",
      });
      setIsEditDialogOpen(false);
    },
    onError: (err: any) => {
      console.error("[EcoSwapSquare Supabase Error] Failed to update item details:", err);
      toast({
        title: "Error Updating Listing",
        description: err.message || "Failed to update item details.",
        variant: "destructive",
      });
    },
  });

  // 5. Delete (Soft-Delete) Item Mutation
  const deleteItemMutation = useMutation({
    mutationFn: async () => {
      if (!item?.id) throw new Error("Missing item id");

      const { error } = await supabase
        .from("items")
        .update({ status: "removed" })
        .eq("id", item.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-items"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["item", id] });
      toast({
        title: "Listing Removed",
        description: "Your listing has been removed from the marketplace.",
      });
      setIsDeleteDialogOpen(false);
      navigate("/browse");
    },
    onError: (err: any) => {
      console.error("[EcoSwapSquare Supabase Error] Failed to delete item listing:", err);
      toast({
        title: "Error Removing Listing",
        description: err.message || "Failed to remove item listing.",
        variant: "destructive",
      });
    },
  });

  // 6. User Blocks Query
  const { data: userBlocks = [] } = useQuery({
    queryKey: ["user-blocks", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("blocks")
        .select("id, blocked_id")
        .eq("blocker_id", user.id);

      if (error) {
        console.error("[EcoSwapSquare Supabase Error] Failed to fetch user blocks in ItemDetail:", error);
        throw error;
      }
      return data || [];
    },
    enabled: !!user,
  });

  const activeBlock = userBlocks.find((b: any) => b.blocked_id === item?.owner_id);
  const isUserBlocked = !!activeBlock;

  // 7. Submit Report Mutation
  const submitReportMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      if (!item) throw new Error("Item not loaded");

      const { data, error } = await supabase
        .from("reports")
        .insert({
          reporter_id: user.id,
          reported_item_id: item.id,
          reported_user_id: item.owner_id,
          reason: reportReason,
          details: reportDetails.trim() || null,
        })
        .select()
        .single();

      if (error) {
        console.error("[EcoSwapSquare Supabase Error] Failed to submit report:", error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Report Submitted",
        description: "Report submitted — our team will review it. Thank you for keeping our community safe.",
      });
      setIsReportDialogOpen(false);
      setReportReason("fake_listing");
      setReportDetails("");
    },
    onError: (err: any) => {
      console.error("[EcoSwapSquare Supabase Error] Report submission failed:", err);
      toast({
        title: "Report Failed",
        description: err.message || "Failed to submit report.",
        variant: "destructive",
      });
    },
  });

  // 8. Block User Mutation
  const blockUserMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      if (!item?.owner_id) throw new Error("Owner not specified");

      const { data, error } = await supabase
        .from("blocks")
        .insert({
          blocker_id: user.id,
          blocked_id: item.owner_id,
        })
        .select()
        .single();

      if (error) {
        console.error("[EcoSwapSquare Supabase Error] Failed to block user:", error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-blocks", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["published-items"] });
      queryClient.invalidateQueries({ queryKey: ["home-published-items"] });
      toast({
        title: "User Blocked",
        description: `${owner?.full_name || "User"} has been blocked. Their listings will no longer appear in your feed.`,
      });
      setIsBlockConfirmOpen(false);
    },
    onError: (err: any) => {
      console.error("[EcoSwapSquare Supabase Error] Block user failed:", err);
      toast({
        title: "Could Not Block User",
        description: err.message || "Failed to block user.",
        variant: "destructive",
      });
    },
  });

  // 9. Unblock User Mutation
  const unblockUserMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      if (!activeBlock) throw new Error("No active block found");

      const { error } = await supabase
        .from("blocks")
        .delete()
        .eq("id", activeBlock.id);

      if (error) {
        console.error("[EcoSwapSquare Supabase Error] Failed to unblock user:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-blocks", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["published-items"] });
      queryClient.invalidateQueries({ queryKey: ["home-published-items"] });
      toast({
        title: "User Unblocked",
        description: `${owner?.full_name || "User"} has been unblocked.`,
      });
    },
    onError: (err: any) => {
      console.error("[EcoSwapSquare Supabase Error] Unblock failed:", err);
      toast({
        title: "Could Not Unblock",
        description: err.message || "Failed to unblock user.",
        variant: "destructive",
      });
    },
  });

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a title for your item.",
        variant: "destructive",
      });
      return;
    }
    if (!editCategory) {
      toast({
        title: "Category Required",
        description: "Please select a category.",
        variant: "destructive",
      });
      return;
    }
    if (!editCondition) {
      toast({
        title: "Condition Required",
        description: "Please select an item condition.",
        variant: "destructive",
      });
      return;
    }
    if (!editDescription.trim()) {
      toast({
        title: "Description Required",
        description: "Please provide a detailed description.",
        variant: "destructive",
      });
      return;
    }

    const parsedPrice = editPriceValue ? parseFloat(editPriceValue) : null;
    const parsedWantedItems = editWantedItems
      ? editWantedItems.split(",").map((s) => s.trim()).filter(Boolean)
      : null;

    editItemMutation.mutate({
      title: editTitle.trim(),
      description: editDescription.trim(),
      category: editCategory,
      condition: editCondition,
      price_value: isNaN(parsedPrice as number) ? null : parsedPrice,
      exchange_preference: editExchangePreference,
      wanted_items: parsedWantedItems,
    });
  };

  const isOwner = !!user && user.id === item?.owner_id;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 container mx-auto px-4 py-16 text-center space-y-4">
          <h2 className="text-2xl font-bold">Item Not Found</h2>
          <p className="text-muted-foreground">The item you are looking for does not exist or has been removed.</p>
          <Button onClick={() => navigate("/browse")} variant="eco">
            Browse Items
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const photos = (item.item_media || []).filter((m: any) => m.media_type === "image" || !m.media_type);
  const video = (item.item_media || []).find((m: any) => m.media_type === "video");
  const owner = item.profiles as any;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="container mx-auto px-4 py-8 flex-1 max-w-6xl">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/browse"
            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Browse
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(window.location.href);
                  toast({ title: "Link Copied", description: "Listing URL copied to clipboard." });
                }
              }}
              className="gap-1.5"
            >
              <Share2 className="h-4 w-4" /> Share
            </Button>
            {!isOwner && isAuthenticated && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsReportDialogOpen(true)}
                className="gap-1.5 text-muted-foreground hover:text-destructive"
              >
                <Flag className="h-4 w-4" /> Report
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Media Gallery */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="overflow-hidden border-border bg-card">
              <CardContent className="p-0">
                {photos.length > 0 ? (
                  <div className="relative w-full">
                    <Carousel className="w-full">
                      <CarouselContent>
                        {photos.map((photo: any, index: number) => (
                          <CarouselItem key={photo.id || index}>
                            <div className="relative aspect-[4/3] bg-muted/40 w-full overflow-hidden flex items-center justify-center">
                              <img
                                src={getMediaUrl(photo.storage_path)}
                                alt={`${item.title} angle ${index + 1}`}
                                className="w-full h-full object-contain"
                              />
                              <Badge className="absolute bottom-3 right-3 bg-black/70 text-white backdrop-blur-sm">
                                Angle {index + 1} of {photos.length}
                              </Badge>
                            </div>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      {photos.length > 1 && (
                        <>
                          <CarouselPrevious className="left-3 bg-white/80 hover:bg-white text-black" />
                          <CarouselNext className="right-3 bg-white/80 hover:bg-white text-black" />
                        </>
                      )}
                    </Carousel>
                  </div>
                ) : (
                  <div className="aspect-[4/3] bg-muted flex items-center justify-center text-muted-foreground">
                    No images uploaded
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Video Player if available */}
            {video && (
              <Card className="border-border">
                <CardHeader className="py-3 px-4 flex flex-row items-center gap-2">
                  <Video className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base font-semibold">10-Second 360° Video Preview</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <video
                    src={getMediaUrl(video.storage_path)}
                    controls
                    className="w-full rounded-lg bg-black aspect-video object-contain"
                  />
                </CardContent>
              </Card>
            )}

            {/* Item Description */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-xl">Item Details & Condition</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-foreground leading-relaxed whitespace-pre-line">{item.description}</p>

                {item.wanted_items && item.wanted_items.length > 0 && (
                  <div className="pt-4 border-t border-border space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                      <Tag className="h-4 w-4 text-primary" /> What the owner is looking for:
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {item.wanted_items.map((wanted: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="px-2.5 py-1">
                          {wanted}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Details & Owner Card */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border-border shadow-sm">
              <CardContent className="p-6 space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="bg-primary text-primary-foreground font-medium">
                      {item.condition}
                    </Badge>
                    <Badge variant="secondary">{item.category}</Badge>
                    <Badge variant="outline" className="capitalize">
                      {item.exchange_preference}
                    </Badge>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                    {item.title}
                  </h1>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {item.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" /> {item.city}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />{" "}
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                {item.price_value !== null && item.price_value !== undefined && (
                  <div className="p-4 bg-muted/40 rounded-xl border border-border flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Estimated Value</p>
                      <p className="text-2xl font-bold text-foreground">
                        ${Number(item.price_value).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      Fair-Swap Anchor
                    </Badge>
                  </div>
                )}

                {/* Actions: Removed Status vs Owner Edit/Delete vs Visitor Propose Swap */}
                <div className="space-y-3 pt-2">
                  {item.status === "removed" ? (
                    <div className="p-3 bg-muted border border-border rounded-lg text-center text-muted-foreground font-medium text-sm">
                      This listing has been removed from the marketplace.
                    </div>
                  ) : isOwner ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-center text-primary font-medium text-sm">
                        This is your listing. You can manage it below.
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          variant="outline"
                          size="lg"
                          className="w-full gap-2 border-primary/40 hover:bg-primary/10 text-primary font-semibold"
                          onClick={() => setIsEditDialogOpen(true)}
                        >
                          <Edit3 className="h-4 w-4" /> Edit Listing
                        </Button>
                        <Button
                          variant="destructive"
                          size="lg"
                          className="w-full gap-2 font-semibold"
                          onClick={() => setIsDeleteDialogOpen(true)}
                        >
                          <Trash2 className="h-4 w-4" /> Remove
                        </Button>
                      </div>
                    </div>
                  ) : isUserBlocked ? (
                    <div className="p-4 bg-muted/60 border border-border rounded-xl text-center space-y-2">
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-destructive uppercase tracking-wider">
                        <UserX className="h-4 w-4" />
                        <span>Member Blocked</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        You have blocked this member. Unblock them to propose a swap or view their other listings.
                      </p>
                    </div>
                  ) : (
                    <Button
                      variant="eco"
                      size="lg"
                      className="w-full text-base font-semibold gap-2 shadow-md"
                      onClick={() => {
                        if (!isAuthenticated) {
                          toast({
                            title: "Sign in required",
                            description: "Please sign in to propose a swap.",
                          });
                          navigate("/auth");
                        } else {
                          setIsSwapDialogOpen(true);
                        }
                      }}
                    >
                      <Repeat className="h-5 w-5" /> Propose Swap
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Owner Profile Card */}
            <Card className="border-border">
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base text-muted-foreground uppercase tracking-wider font-semibold">
                  Listed By
                </CardTitle>
                {!isOwner && isAuthenticated && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Owner actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem
                        onClick={() => setIsReportDialogOpen(true)}
                        className="cursor-pointer gap-2 text-foreground"
                      >
                        <Flag className="h-4 w-4 text-amber-500" />
                        <span>Report Listing or Member</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {isUserBlocked ? (
                        <DropdownMenuItem
                          onClick={() => unblockUserMutation.mutate()}
                          disabled={unblockUserMutation.isPending}
                          className="cursor-pointer gap-2 text-foreground"
                        >
                          <Shield className="h-4 w-4 text-primary" />
                          <span>Unblock Member</span>
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => setIsBlockConfirmOpen(true)}
                          className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                        >
                          <UserX className="h-4 w-4" />
                          <span>Block Member</span>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 border border-border">
                    <AvatarImage src={owner?.avatar_url || ""} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                      {owner?.full_name ? owner.full_name.charAt(0).toUpperCase() : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg text-foreground">
                        {owner?.full_name || "Community Member"}
                      </h3>
                      {owner?.rating_avg && Number(owner.rating_avg) > 0 ? (
                        <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded text-xs font-semibold text-amber-600 dark:text-amber-400">
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                          <span>{Number(owner.rating_avg).toFixed(1)}</span>
                        </div>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{owner?.city || item.city || "Member"}</span>
                      {owner?.rating_avg && Number(owner.rating_avg) > 0 ? (
                        <>
                          <span>•</span>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`h-3 w-3 ${
                                  s <= Math.round(Number(owner.rating_avg))
                                    ? "text-amber-500 fill-amber-500"
                                    : "text-muted-foreground/30"
                                }`}
                              />
                            ))}
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>

                {owner?.bio && (
                  <p className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-3">
                    "{owner.bio}"
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Rating</p>
                      <p className="font-semibold text-sm">
                        {owner?.rating_avg && Number(owner.rating_avg) > 0
                          ? `${Number(owner.rating_avg).toFixed(1)} / 5.0`
                          : "New Swapper"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Completed</p>
                      <p className="font-semibold text-sm">{owner?.swap_count || 0} Swaps</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Propose Swap Dialog */}
      <Dialog open={isSwapDialogOpen} onOpenChange={setIsSwapDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Repeat className="h-5 w-5 text-primary" />
              Propose a Swap for {item.title}
            </DialogTitle>
            <DialogDescription>
              Select an item from your collection to offer or propose a direct trade with a message.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Offer Your Item</Label>
              <Select value={selectedMyItemId} onValueChange={setSelectedMyItemId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select one of your items" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- No Item (Direct message / Cash / Service) --</SelectItem>
                  {userItems.map((ui: any) => (
                    <SelectItem key={ui.id} value={ui.id}>
                      {ui.title} ({ui.category} • {ui.condition})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {userItems.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  You don't have any published items yet. You can still propose a swap or{" "}
                  <Link to="/list-item" className="text-primary underline">
                    list an item first
                  </Link>
                  .
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="swap-msg" className="text-sm font-semibold">
                Message to Owner
              </Label>
              <Textarea
                id="swap-msg"
                placeholder="Explain why this is a great match or suggest a meeting spot..."
                rows={3}
                value={swapMessage}
                onChange={(e) => setSwapMessage(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsSwapDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="eco"
              onClick={() => proposeSwapMutation.mutate()}
              disabled={proposeSwapMutation.isPending}
              className="gap-2"
            >
              {proposeSwapMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                </>
              ) : (
                "Send Proposal"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Listing Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-primary" /> Edit Item Details
            </DialogTitle>
            <DialogDescription>
              Update your listing's information. Photos and multi-angle captures are preserved.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-title" className="text-sm font-semibold">
                Item Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={120}
                placeholder="e.g. Vintage 1978 Vinyl Turntable"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  Category <span className="text-destructive">*</span>
                </Label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  Condition <span className="text-destructive">*</span>
                </Label>
                <Select value={editCondition} onValueChange={setEditCondition}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map((cond) => (
                      <SelectItem key={cond.value} value={cond.value}>
                        {cond.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description" className="text-sm font-semibold">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="edit-description"
                rows={4}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Detail the specifications, usage history, included accessories, or flaws..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-price" className="text-sm font-semibold flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Estimated Value ($ USD)
              </Label>
              <Input
                id="edit-price"
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 150"
                value={editPriceValue}
                onChange={(e) => setEditPriceValue(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Anchor value for fair-swap calculations.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Exchange Preference</Label>
              <RadioGroup
                value={editExchangePreference}
                onValueChange={setEditExchangePreference}
                className="grid grid-cols-3 gap-2 sm:gap-3"
              >
                <div className="flex items-center space-x-2 border border-border p-2.5 rounded-lg hover:border-primary cursor-pointer">
                  <RadioGroupItem value="swap" id="edit-pref-swap" />
                  <Label htmlFor="edit-pref-swap" className="cursor-pointer text-xs sm:text-sm font-medium">
                    Swap / Trade
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border border-border p-2.5 rounded-lg hover:border-primary cursor-pointer">
                  <RadioGroupItem value="rent" id="edit-pref-rent" />
                  <Label htmlFor="edit-pref-rent" className="cursor-pointer text-xs sm:text-sm font-medium">
                    Rent / Lend
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border border-border p-2.5 rounded-lg hover:border-primary cursor-pointer">
                  <RadioGroupItem value="purchase" id="edit-pref-purchase" />
                  <Label htmlFor="edit-pref-purchase" className="cursor-pointer text-xs sm:text-sm font-medium">
                    Purchase
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-wanted" className="text-sm font-semibold flex items-center gap-1.5">
                <Tag className="h-4 w-4 text-muted-foreground" />
                Wanted Items in Return
              </Label>
              <Input
                id="edit-wanted"
                placeholder="Comma separated, e.g. Studio Monitors, Books, Turntable"
                value={editWantedItems}
                onChange={(e) => setEditWantedItems(e.target.value)}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={editItemMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="eco"
                disabled={editItemMutation.isPending}
                className="gap-2"
              >
                {editItemMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving Changes...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete / Remove Item Confirmation AlertDialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this listing?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove "{item.title}" from the marketplace so it no longer appears in Browse or receives new swap proposals. Your completed swaps and trade history will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteItemMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteItemMutation.mutate();
              }}
              disabled={deleteItemMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              {deleteItemMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Removing...
                </>
              ) : (
                "Remove Listing"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report Listing / Member Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Flag className="h-5 w-5 text-amber-500" />
              Report Listing or Member
            </DialogTitle>
            <DialogDescription>
              Help maintain a safe community. Reports are strictly confidential and reviewed promptly by our moderation team.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Reason for Report</Label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fake_listing">Fake or Misleading Listing</SelectItem>
                  <SelectItem value="prohibited_item">Prohibited or Hazardous Item</SelectItem>
                  <SelectItem value="harassment">Harassment or Abusive Behavior</SelectItem>
                  <SelectItem value="fraud">Fraud, Scam, or Counterfeit Item</SelectItem>
                  <SelectItem value="other">Other Community Violation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                Additional Details <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Textarea
                placeholder="Provide any context that will help our team evaluate this report (max 500 characters)..."
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                maxLength={500}
                className="min-h-[100px] resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">{reportDetails.length}/500</p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsReportDialogOpen(false)}
              disabled={submitReportMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => submitReportMutation.mutate()}
              disabled={submitReportMutation.isPending}
              className="gap-2"
            >
              {submitReportMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <Flag className="h-4 w-4" /> Submit Report
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Member Confirmation AlertDialog */}
      <AlertDialog open={isBlockConfirmOpen} onOpenChange={setIsBlockConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-destructive" />
              Block {owner?.full_name || "this member"}?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You won't see swaps or listings from this user anymore. You will not be able to propose swaps to each other.
              </p>
              <p className="text-xs text-muted-foreground">
                You can unblock them at any time from your profile settings.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={blockUserMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                blockUserMutation.mutate();
              }}
              disabled={blockUserMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              {blockUserMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Blocking...
                </>
              ) : (
                "Block Member"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
};

export default ItemDetail;
