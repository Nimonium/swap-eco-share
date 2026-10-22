import React, { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

export const useWishlist = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const idsQueryKey = useMemo(() => ["wishlist-ids", user?.id], [user?.id]);

  // Query all saved item IDs for the current user
  const {
    data: savedIdsArray = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: idsQueryKey,
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("item_id")
        .eq("user_id", user.id);

      if (error) {
        console.error("[useWishlist] Error fetching saved IDs:", error);
        throw error;
      }
      return (data || []).map((row) => row.item_id);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  const savedItemIds = useMemo(() => new Set<string>(savedIdsArray), [savedIdsArray]);

  const isSaved = (itemId: string): boolean => {
    if (!itemId) return false;
    return savedItemIds.has(itemId);
  };

  // Toggle Save Mutation with Optimistic Updates and Cache Synchronization
  const toggleMutation = useMutation({
    mutationFn: async ({
      itemId,
      shouldSave,
    }: {
      itemId: string;
      shouldSave: boolean;
      itemTitle?: string;
    }) => {
      if (!user?.id) {
        throw new Error("You must be logged in to save items.");
      }

      if (shouldSave) {
        const { error } = await supabase.from("wishlist_items").insert({
          user_id: user.id,
          item_id: itemId,
        });

        if (error) {
          console.error("[useWishlist] Failed to save item:", error);
          throw error;
        }
      } else {
        const { error } = await supabase
          .from("wishlist_items")
          .delete()
          .eq("user_id", user.id)
          .eq("item_id", itemId);

        if (error) {
          console.error("[useWishlist] Failed to remove saved item:", error);
          throw error;
        }
      }
    },
    onMutate: async ({ itemId, shouldSave, itemTitle }) => {
      // 1. Cancel ongoing refetches to prevent overwriting optimistic updates
      await queryClient.cancelQueries({ queryKey: idsQueryKey });
      await queryClient.cancelQueries({ queryKey: ["saved-items", user?.id] });

      // 2. Snapshot previous cache values for rollback
      const previousIds = queryClient.getQueryData<string[]>(idsQueryKey) || [];
      const previousSavedRows = queryClient.getQueryData<any[]>(["saved-items", user?.id]);

      // 3. Optimistically update saved IDs list
      queryClient.setQueryData<string[]>(idsQueryKey, (old = []) => {
        if (shouldSave) {
          return old.includes(itemId) ? old : [...old, itemId];
        } else {
          return old.filter((id) => id !== itemId);
        }
      });

      // 4. Optimistically update the /saved page list if cached
      if (previousSavedRows) {
        if (!shouldSave) {
          queryClient.setQueryData<any[]>(["saved-items", user?.id], (old = []) =>
            old.filter((row: any) => row.item_id !== itemId)
          );
        }
      }

      return { previousIds, previousSavedRows, itemId, shouldSave, itemTitle };
    },
    onError: (err: any, _variables, context) => {
      // Rollback to prior snapshot
      if (context?.previousIds) {
        queryClient.setQueryData(idsQueryKey, context.previousIds);
      }
      if (context?.previousSavedRows) {
        queryClient.setQueryData(["saved-items", user?.id], context.previousSavedRows);
      }

      toast({
        title: "Could not update saved items",
        description: err?.message || "Failed to update your wishlist. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: (_data, variables) => {
      if (variables.shouldSave) {
        toast({
          title: "Added to Saved Items",
          description: variables.itemTitle
            ? `"${variables.itemTitle}" has been saved to your wishlist.`
            : "Item saved to your wishlist.",
        });
      } else {
        toast({
          title: "Removed from Saved Items",
          description: variables.itemTitle
            ? `"${variables.itemTitle}" was removed from your wishlist.`
            : "Item removed from your wishlist.",
        });
      }
    },
    onSettled: () => {
      // Invalidate to guarantee true backend consistency
      queryClient.invalidateQueries({ queryKey: idsQueryKey });
      queryClient.invalidateQueries({ queryKey: ["saved-items", user?.id] });
    },
  });

  const toggleSave = (itemId: string, itemTitle?: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Unauthenticated handling: Do NOT make a database call; prompt to sign in
    if (!isAuthenticated || !user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save items to your wishlist.",
        action: (
          <ToastAction altText="Sign In" onClick={() => navigate("/auth")}>
            Sign In
          </ToastAction>
        ),
      });
      return;
    }

    const currentlySaved = isSaved(itemId);
    toggleMutation.mutate({
      itemId,
      shouldSave: !currentlySaved,
      itemTitle,
    });
  };

  return {
    savedItemIds,
    isSaved,
    toggleSave,
    isLoading,
    isPending: toggleMutation.isPending,
    refetch,
  };
};
