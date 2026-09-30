import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getAvatarUrl, getMediaUrl, compressImage } from "@/lib/storage";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  User,
  MapPin,
  Calendar,
  Star,
  Package,
  PlusCircle,
  Edit3,
  Upload,
  Camera,
  Loader2,
  Repeat,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  UserX,
  Shield,
  Mail,
  Bell,
  BellRing,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Switch } from "@/components/ui/switch";
import {
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  isPushNotificationSupported,
} from "@/utils/pushNotifications";

const VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  "BCiMqSA-8LMPUyfANcW7vk8IFzTkc30qhqe_-N0-ocVJpbBFLlqD9xuhek7cc8WIsWRl89RFzB28IsYFu6XIS3g";

const Profile = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(true);
  const [isPushSubscribing, setIsPushSubscribing] = useState(false);
  const [avatarFile, setAvatarFile] = useState<Blob | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auth Protection Guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to view your profile.",
      });
      navigate("/auth");
    }
  }, [authLoading, isAuthenticated, navigate, toast]);

  // 1. Fetch User Profile
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("[EcoSwapSquare Supabase Error] Failed to fetch profile:", error);
        throw error;
      }
      return data;
    },
    enabled: !!user,
  });

  // 2. Fetch User's Listed Items (all statuses)
  const {
    data: userItems = [],
    isLoading: itemsLoading,
  } = useQuery({
    queryKey: ["my-items", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("items")
        .select(
          `
          *,
          item_media (*)
        `
        )
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[EcoSwapSquare Supabase Error] Failed to fetch user items:", error);
        throw error;
      }
      return data || [];
    },
    enabled: !!user,
  });

  // 3. Fetch User's Received Reviews
  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ["profile-reviews", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("reviews")
        .select(`
          id,
          rating,
          comment,
          created_at,
          reviewer:profiles!reviews_reviewer_id_fkey (
            id,
            full_name,
            avatar_url,
            city
          )
        `)
        .eq("reviewee_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[EcoSwapSquare Supabase Error] Failed to fetch profile reviews:", error);
        throw error;
      }
      return data || [];
    },
    enabled: !!user,
  });

  // 4. Fetch User's Blocked Members
  const { data: blockedUsers = [], isLoading: blocksLoading } = useQuery({
    queryKey: ["my-blocked-users", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("blocks")
        .select(`
          id,
          blocked_id,
          created_at,
          blocked_user:profiles!blocks_blocked_id_fkey (
            id,
            full_name,
            avatar_url,
            city
          )
        `)
        .eq("blocker_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[EcoSwapSquare Supabase Error] Failed to fetch blocked users:", error);
        throw error;
      }
      return data || [];
    },
    enabled: !!user,
  });

  // Unblock user mutation
  const unblockMutation = useMutation({
    mutationFn: async (blockId: string) => {
      const { error } = await supabase
        .from("blocks")
        .delete()
        .eq("id", blockId);

      if (error) {
        console.error("[EcoSwapSquare Supabase Error] Failed to unblock user:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-blocked-users", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["user-blocks", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["published-items"] });
      queryClient.invalidateQueries({ queryKey: ["home-published-items"] });
      toast({
        title: "Member Unblocked",
        description: "You have unblocked this user. Their listings will now appear in your feed again.",
      });
    },
    onError: (err: any) => {
      console.error("[EcoSwapSquare Supabase Error] Unblock failed:", err);
      toast({
        title: "Unblock Failed",
        description: err.message || "Failed to unblock member.",
        variant: "destructive",
      });
    },
  });

  // Populate form fields when opening edit dialog
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setCity(profile.city || "");
      setBio(profile.bio || "");
      setEmailNotificationsEnabled(profile.email_notifications_enabled ?? true);
      setPushNotificationsEnabled(profile.push_notifications_enabled ?? true);
    }
  }, [profile, isEditDialogOpen]);

  // Push notification toggle handler
  const handleTogglePushNotifications = async (enabled: boolean) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to update notification settings.",
        variant: "destructive",
      });
      return;
    }

    if (!isPushNotificationSupported()) {
      toast({
        title: "Browser Not Supported",
        description: "Web Push Notifications are not supported in this browser.",
        variant: "destructive",
      });
      return;
    }

    setIsPushSubscribing(true);

    try {
      if (enabled) {
        const result = await subscribeToPushNotifications(VAPID_PUBLIC_KEY);

        if (!result.success) {
          if (result.permission === "denied") {
            toast({
              title: "Notifications Blocked",
              description:
                "Notifications are blocked in your browser settings. Please click the lock or settings icon next to the URL to allow notifications.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Subscription Failed",
              description: result.error || "Failed to register browser push subscription.",
              variant: "destructive",
            });
          }
          setIsPushSubscribing(false);
          return;
        }

        const subJson = result.subscription?.toJSON();
        const endpoint = result.subscription?.endpoint;
        const p256dh = subJson?.keys?.p256dh;
        const authKey = subJson?.keys?.auth;

        if (endpoint && p256dh && authKey) {
          const { error: upsertErr } = await supabase.from("push_subscriptions").upsert(
            {
              user_id: user.id,
              endpoint,
              p256dh,
              auth: authKey,
            },
            { onConflict: "user_id,endpoint" }
          );

          if (upsertErr) {
            console.error("[WebPush] Failed to store push subscription in database:", upsertErr);
          }
        }

        // Update profile preferences
        const { error: profileUpdateErr } = await supabase
          .from("profiles")
          .update({ push_notifications_enabled: true })
          .eq("id", user.id);

        if (profileUpdateErr) throw profileUpdateErr;

        queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
        toast({
          title: "Push Notifications Enabled",
          description: "You will receive real-time browser alerts for swap offers and messages.",
        });
      } else {
        // Unsubscribe from browser PushManager
        await unsubscribeFromPushNotifications();

        // Remove subscriptions from database
        await supabase.from("push_subscriptions").delete().eq("user_id", user.id);

        // Update profile preferences
        const { error: profileUpdateErr } = await supabase
          .from("profiles")
          .update({ push_notifications_enabled: false })
          .eq("id", user.id);

        if (profileUpdateErr) throw profileUpdateErr;

        queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
        toast({
          title: "Push Notifications Disabled",
          description: "You will not receive browser push notifications for swap activity.",
        });
      }
    } catch (err: any) {
      console.error("[WebPush] Toggle push notification error:", err);
      toast({
        title: "Update Failed",
        description: err.message || "Failed to update push notification preferences.",
        variant: "destructive",
      });
    } finally {
      setIsPushSubscribing(false);
    }
  };

  // Instant notification preference toggle mutation
  const toggleNotificationsMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("profiles")
        .update({ email_notifications_enabled: enabled })
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast({
        title: data.email_notifications_enabled ? "Email Notifications Enabled" : "Email Notifications Disabled",
        description: data.email_notifications_enabled
          ? "You will receive email notifications about new proposals, messages, and reviews."
          : "You will not receive email notifications about swap activity.",
      });
    },
    onError: (err: any) => {
      console.error("[EcoSwapSquare] Toggle notification preferences failed:", err);
      toast({
        title: "Update Failed",
        description: err.message || "Failed to update notification preferences.",
        variant: "destructive",
      });
    },
  });

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file, 400);
      setAvatarFile(compressed);
      setAvatarPreview(URL.createObjectURL(compressed));
    } catch (err) {
      console.error("Failed to compress avatar image:", err);
      toast({
        title: "Image Error",
        description: "Could not process avatar image. Please try another.",
        variant: "destructive",
      });
    }
  };

  // Profile Update Mutation
  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      let updatedAvatarUrl = profile?.avatar_url || null;

      // If user uploaded a new avatar, upload to 'avatars' bucket
      if (avatarFile) {
        const fileExt = "jpg";
        const storagePath = `${user.id}/avatar_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(storagePath, avatarFile, {
            contentType: "image/jpeg",
            upsert: true,
          });

        if (uploadError) {
          console.error("[EcoSwapSquare Supabase Error] Avatar bucket upload error:", uploadError);
          // If bucket doesn't exist yet, we still proceed with profile text update
        } else {
          updatedAvatarUrl = storagePath;
        }
      }

      const { data, error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim() || null,
          city: city.trim() || null,
          bio: bio.trim() || null,
          avatar_url: updatedAvatarUrl,
          email_notifications_enabled: emailNotificationsEnabled,
          push_notifications_enabled: pushNotificationsEnabled,
        })
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved.",
      });
      setIsEditDialogOpen(false);
      setAvatarFile(null);
      setAvatarPreview(null);
    },
    onError: (err: any) => {
      console.error("[EcoSwapSquare Supabase Error] Failed to update profile:", err);
      toast({
        title: "Update Failed",
        description: err.message || "Failed to update profile.",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Published</Badge>;
      case "draft":
        return <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 dark:text-amber-300">Draft</Badge>;
      case "swapped":
        return <Badge className="bg-blue-600 text-white hover:bg-blue-600">Swapped</Badge>;
      case "removed":
        return <Badge variant="outline" className="text-muted-foreground">Removed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderRatingStars = (rating: number | null | undefined, count?: number) => {
    const num = Number(rating) || 0;
    return (
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-4 w-4 ${
                star <= Math.round(num)
                  ? "text-amber-500 fill-amber-500"
                  : "text-muted-foreground/30"
              }`}
            />
          ))}
        </div>
        <span className="text-xs font-semibold text-foreground">
          {num > 0 ? `${num.toFixed(1)} / 5.0` : "No ratings yet"}
        </span>
        {count !== undefined && count > 0 && (
          <span className="text-xs text-muted-foreground font-normal">
            ({count} {count === 1 ? "review" : "reviews"})
          </span>
        )}
      </div>
    );
  };

  if (authLoading || (profileLoading && !profile)) {
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

  const currentAvatarUrl = avatarPreview || getAvatarUrl(profile?.avatar_url);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="container mx-auto px-4 py-8 flex-1 max-w-5xl">
        {/* Profile Card Header */}
        <Card className="border-border shadow-sm mb-10 overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-primary/80 via-primary to-success/80 relative" />
          
          <CardContent className="relative pt-0 pb-8 px-6 sm:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-16 sm:-mt-14 mb-6 gap-4">
              {/* Avatar */}
              <div className="relative group">
                <Avatar className="h-28 w-28 sm:h-32 sm:w-32 border-4 border-background shadow-md bg-muted">
                  <AvatarImage src={currentAvatarUrl} alt={profile?.full_name || "User avatar"} className="object-cover" />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-3xl">
                    {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Edit Profile Action Button */}
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(true)}
                className="gap-2 self-start sm:self-auto shadow-sm"
              >
                <Edit3 className="h-4 w-4 text-primary" />
                Edit Profile
              </Button>
            </div>

            {/* Profile Info Details */}
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                  {profile?.full_name || user?.user_metadata?.full_name || "Eco Swapper"}
                </h1>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>

              {profile?.bio ? (
                <p className="text-foreground text-sm max-w-2xl leading-relaxed whitespace-pre-line">
                  {profile.bio}
                </p>
              ) : (
                <p className="text-muted-foreground text-sm italic">
                  No bio added yet. Tell the community what you like to swap!
                </p>
              )}

              <div className="flex flex-wrap items-center gap-y-2 gap-x-6 pt-2 text-sm text-muted-foreground border-t border-border">
                {profile?.city && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>{profile.city}</span>
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Joined {profile?.created_at ? format(new Date(profile.created_at), "MMMM yyyy") : "Recently"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Repeat className="h-4 w-4 text-emerald-500" />
                  <span className="font-medium text-foreground">{profile?.swap_count || 0}</span>
                  <span>Completed Swaps</span>
                </div>

                <div className="flex items-center gap-2">
                  {renderRatingStars(profile?.rating_avg, reviews.length)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User's Listed Items Section */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">My Listed Items</h2>
              <p className="text-sm text-muted-foreground">
                All items you have listed across EcoSwapSquare ({userItems.length})
              </p>
            </div>

            <Link to="/list-item">
              <Button variant="eco" className="gap-2 shadow-sm">
                <PlusCircle className="h-4 w-4" />
                List New Item
              </Button>
            </Link>
          </div>

          {itemsLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p>Loading your items...</p>
            </div>
          ) : userItems.length === 0 ? (
            <Card className="border-dashed border-border">
              <CardContent className="py-16 text-center space-y-4">
                <Package className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold mb-1">No items listed yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Share pre-loved belongings with your community and start swapping today.
                  </p>
                </div>
                <Link to="/list-item">
                  <Button variant="eco" className="gap-2">
                    <PlusCircle className="h-4 w-4" />
                    List Your First Item
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {userItems.map((item: any) => {
                const mediaList = item.item_media || [];
                const firstMedia = mediaList.find((m: any) => m.media_type === "image" || !m.media_type);
                const imageUrl = getMediaUrl(firstMedia?.storage_path);

                return (
                  <Card
                    key={item.id}
                    className="border-border hover:shadow-md transition-shadow overflow-hidden flex flex-col group cursor-pointer"
                    onClick={() => navigate(`/item/${item.id}`)}
                  >
                    <div className="relative aspect-video w-full bg-muted overflow-hidden">
                      <img
                        src={imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                      <div className="absolute top-2 left-2">
                        {getStatusBadge(item.status)}
                      </div>
                      <Badge className="absolute bottom-2 right-2 bg-black/70 text-white backdrop-blur-sm text-xs">
                        {item.condition}
                      </Badge>
                    </div>

                    <CardContent className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-xs text-muted-foreground uppercase font-semibold">
                            {item.category}
                          </span>
                          {item.price_value && (
                            <span className="text-xs font-bold text-primary">
                              ~${Number(item.price_value).toLocaleString()}
                            </span>
                          )}
                        </div>

                        <h3 className="font-semibold text-base line-clamp-1 group-hover:text-primary transition-colors">
                          {item.title}
                        </h3>

                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {item.description}
                        </p>
                      </div>

                      <div className="pt-4 mt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                        </span>

                        <span className="text-primary font-medium flex items-center gap-1 hover:underline">
                          Manage Item <ExternalLink className="h-3 w-3" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Reviews Received Section */}
        <div className="space-y-6 pt-6 border-t border-border mt-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Star className="h-6 w-6 text-amber-500 fill-amber-500" />
                Community Reviews & Feedback
              </h2>
              <p className="text-sm text-muted-foreground">
                Ratings and testimonials from your verified swap partners ({reviews.length})
              </p>
            </div>
            {profile?.rating_avg && Number(profile.rating_avg) > 0 ? (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-sm font-semibold self-start sm:self-auto">
                <span>Overall Rating:</span>
                <span>{Number(profile.rating_avg).toFixed(1)} / 5.0</span>
              </div>
            ) : null}
          </div>

          {reviewsLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p>Loading community reviews...</p>
            </div>
          ) : reviews.length === 0 ? (
            <Card className="border-dashed border-border">
              <CardContent className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                  <Star className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold">No reviews received yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Once you complete swaps with other community members, their star ratings and feedback will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map((rev: any) => {
                const reviewer = rev.reviewer;
                const reviewerAvatar = reviewer?.avatar_url
                  ? getAvatarUrl(reviewer.avatar_url)
                  : "";
                const reviewerName = reviewer?.full_name || "Eco Swapper";

                return (
                  <Card key={rev.id} className="border-border bg-card shadow-sm">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-border">
                            <AvatarImage src={reviewerAvatar} alt={reviewerName} />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                              {reviewerName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-semibold text-foreground leading-tight">
                              {reviewerName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {reviewer?.city || "Community Member"}
                            </p>
                          </div>
                        </div>

                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatDistanceToNow(new Date(rev.created_at), { addSuffix: true })}
                        </span>
                      </div>

                      {/* Star Rating */}
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= rev.rating
                                ? "text-amber-500 fill-amber-500"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                        <span className="text-xs font-semibold ml-1.5 text-foreground">
                          {rev.rating}.0
                        </span>
                      </div>

                      {/* Comment */}
                      {rev.comment ? (
                        <p className="text-sm text-foreground/90 italic bg-muted/40 p-3 rounded-md border border-border/40">
                          "{rev.comment}"
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          Rating submitted without written comment.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Email Notification Preferences Section */}
        <div className="space-y-4 pt-6 border-t border-border mt-10">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Mail className="h-6 w-6 text-primary" />
              Notification Preferences
            </h2>
            <p className="text-sm text-muted-foreground">
              Control when EcoSwapSquare emails you about trade proposals, chat messages, and community activity
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email Notifications Card */}
            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-6">
                <div className="flex flex-col justify-between h-full gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-primary" />
                      <Label htmlFor="email-notifications-toggle" className="text-base font-semibold cursor-pointer">
                        Email Notifications
                      </Label>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      Receive email alerts for incoming swap proposals, trade acceptances, direct messages, and reviews.
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <span className="text-xs text-muted-foreground">
                      {profile?.email_notifications_enabled ?? true ? "Active" : "Disabled"}
                    </span>
                    <Switch
                      id="email-notifications-toggle"
                      checked={profile?.email_notifications_enabled ?? true}
                      disabled={toggleNotificationsMutation.isPending}
                      onCheckedChange={(checked) => {
                        toggleNotificationsMutation.mutate(checked);
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Browser Push Notifications Card */}
            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-6">
                <div className="flex flex-col justify-between h-full gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <BellRing className="h-5 w-5 text-primary" />
                      <Label htmlFor="push-notifications-toggle" className="text-base font-semibold cursor-pointer">
                        Browser Push Notifications
                      </Label>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      Get instant desktop or mobile browser alerts in real time even when this website tab isn't open.
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <span className="text-xs text-muted-foreground">
                      {isPushSubscribing
                        ? "Configuring..."
                        : profile?.push_notifications_enabled ?? true
                        ? "Active"
                        : "Disabled"}
                    </span>
                    <Switch
                      id="push-notifications-toggle"
                      checked={profile?.push_notifications_enabled ?? true}
                      disabled={isPushSubscribing}
                      onCheckedChange={(checked) => {
                        handleTogglePushNotifications(checked);
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Blocked Members Section */}
        <div className="space-y-6 pt-6 border-t border-border mt-10">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <UserX className="h-6 w-6 text-destructive" />
              Blocked Members
            </h2>
            <p className="text-sm text-muted-foreground">
              Users you have blocked cannot propose swaps with you and their listings are excluded from your feed ({blockedUsers.length})
            </p>
          </div>

          {blocksLoading ? (
            <div className="py-8 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm">Loading blocked members...</p>
            </div>
          ) : blockedUsers.length === 0 ? (
            <Card className="border-dashed border-border">
              <CardContent className="py-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                  <Shield className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold">No blocked members</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  You haven't blocked any community members.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {blockedUsers.map((b: any) => {
                const blockedProfile = b.blocked_user;
                const blockedAvatar = blockedProfile?.avatar_url
                  ? getAvatarUrl(blockedProfile.avatar_url)
                  : "";
                const blockedName = blockedProfile?.full_name || "Community Member";

                return (
                  <Card key={b.id} className="border-border bg-card">
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-10 w-10 border border-border flex-shrink-0">
                          <AvatarImage src={blockedAvatar} alt={blockedName} />
                          <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
                            {blockedName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate text-foreground">
                            {blockedName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Blocked {format(new Date(b.created_at), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => unblockMutation.mutate(b.id)}
                        disabled={unblockMutation.isPending}
                        className="text-xs flex-shrink-0 hover:bg-muted"
                      >
                        {unblockMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Unblock"
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Edit3 className="h-5 w-5 text-primary" />
              Edit Profile
            </DialogTitle>
            <DialogDescription>
              Update your personal bio, location, and community avatar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-3">
            {/* Avatar Upload Preview */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border border-border shadow-sm">
                <AvatarImage src={avatarPreview || getAvatarUrl(profile?.avatar_url)} className="object-cover" />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                  {fullName ? fullName.charAt(0).toUpperCase() : "U"}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Camera className="h-4 w-4" /> Change Avatar
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  Compressed automatically (&lt; 500KB)
                </p>
              </div>
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-sm font-semibold">
                Full Name
              </Label>
              <Input
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Alex Morgan"
              />
            </div>

            {/* City */}
            <div className="space-y-2">
              <Label htmlFor="city" className="text-sm font-semibold">
                City / Location
              </Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. San Francisco, CA"
              />
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio" className="text-sm font-semibold">
                About Me (Bio)
              </Label>
              <Textarea
                id="bio"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share your interests, what you collect, or preferred trade items..."
              />
            </div>

            {/* Email Notifications Toggle */}
            <div className="flex items-center justify-between p-3.5 bg-muted/40 border border-border/60 rounded-xl gap-3">
              <div className="space-y-0.5 min-w-0">
                <Label htmlFor="dialog-email-notifications-toggle" className="text-sm font-semibold cursor-pointer block">
                  Email Notifications
                </Label>
                <p className="text-xs text-muted-foreground">
                  Email me about new messages and swap activity
                </p>
              </div>
              <Switch
                id="dialog-email-notifications-toggle"
                checked={emailNotificationsEnabled}
                onCheckedChange={setEmailNotificationsEnabled}
                className="flex-shrink-0"
              />
            </div>

            {/* Push Notifications Toggle */}
            <div className="flex items-center justify-between p-3.5 bg-muted/40 border border-border/60 rounded-xl gap-3">
              <div className="space-y-0.5 min-w-0">
                <Label htmlFor="dialog-push-notifications-toggle" className="text-sm font-semibold cursor-pointer block">
                  Push Notifications
                </Label>
                <p className="text-xs text-muted-foreground">
                  Receive browser notifications for new swaps and chats
                </p>
              </div>
              <Switch
                id="dialog-push-notifications-toggle"
                checked={pushNotificationsEnabled}
                onCheckedChange={setPushNotificationsEnabled}
                className="flex-shrink-0"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={updateProfileMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="eco"
              onClick={() => updateProfileMutation.mutate()}
              disabled={updateProfileMutation.isPending}
              className="gap-2"
            >
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Profile;
