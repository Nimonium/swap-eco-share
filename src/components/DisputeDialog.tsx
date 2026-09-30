import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Upload, X, Loader2, ShieldAlert } from "lucide-react";

export type DisputeCategory =
  | "item_not_as_described"
  | "item_damaged"
  | "no_show"
  | "non_delivery"
  | "other";

interface DisputeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  swap: any;
  currentUserId: string;
}

export const DISPUTE_CATEGORY_LABELS: Record<DisputeCategory, string> = {
  item_not_as_described: "Item not as described",
  item_damaged: "Item arrived damaged / broken",
  no_show: "Trading partner did not show up",
  non_delivery: "Item was not delivered",
  other: "Other trade issue",
};

export const DisputeDialog = ({
  isOpen,
  onClose,
  swap,
  currentUserId,
}: DisputeDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [category, setCategory] = useState<DisputeCategory>("item_not_as_described");
  const [description, setDescription] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<{ file: Blob; preview: string; name: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!swap) return null;

  const isUserOwner = swap.owner_id === currentUserId;
  const againstUserId = isUserOwner ? swap.proposer_id : swap.owner_id;
  const partnerName = isUserOwner
    ? swap.proposer?.full_name || "Swap Partner"
    : swap.owner?.full_name || "Item Owner";
  const itemTitle = swap.item?.title || "Trade Item";

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (evidenceFiles.length + files.length > 5) {
      toast({
        title: "Limit Exceeded",
        description: "You can upload a maximum of 5 evidence photos.",
        variant: "destructive",
      });
      return;
    }

    try {
      const processed: { file: Blob; preview: string; name: string }[] = [];
      for (const file of files) {
        const compressed = await compressImage(file, 500);
        processed.push({
          file: compressed,
          preview: URL.createObjectURL(compressed),
          name: file.name,
        });
      }
      setEvidenceFiles((prev) => [...prev, ...processed]);
    } catch (err: any) {
      console.error("[Dispute Evidence] Compression failed:", err);
      toast({
        title: "Photo Processing Error",
        description: "Failed to process photo evidence.",
        variant: "destructive",
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeEvidence = (index: number) => {
    setEvidenceFiles((prev) => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[index].preview);
      copy.splice(index, 1);
      return copy;
    });
  };

  const handleClose = () => {
    evidenceFiles.forEach((f) => URL.revokeObjectURL(f.preview));
    setEvidenceFiles([]);
    setDescription("");
    setCategory("item_not_as_described");
    onClose();
  };

  const trimmedDesc = description.trim();
  const isDescValid = trimmedDesc.length >= 20 && trimmedDesc.length <= 1000;

  const fileDisputeMutation = useMutation({
    mutationFn: async () => {
      if (!isDescValid) {
        throw new Error("Description must be between 20 and 1000 characters.");
      }

      setIsSubmitting(true);

      // 1. Insert dispute row
      const { data: dispute, error: disputeErr } = await supabase
        .from("disputes")
        .insert({
          swap_id: swap.id,
          filed_by: currentUserId,
          against_user_id: againstUserId,
          category,
          description: trimmedDesc,
          status: "open",
        })
        .select()
        .single();

      if (disputeErr) {
        console.error("[Dispute Insert Error]:", disputeErr);
        throw disputeErr;
      }

      // 2. Upload any evidence files into storage and record in dispute_evidence
      if (evidenceFiles.length > 0) {
        for (let i = 0; i < evidenceFiles.length; i++) {
          const item = evidenceFiles[i];
          const fileName = `${Date.now()}_${i}.jpg`;
          const storagePath = `disputes/${dispute.id}/${fileName}`;

          const { error: uploadErr } = await supabase.storage
            .from("item-media")
            .upload(storagePath, item.file, {
              contentType: "image/jpeg",
              upsert: true,
            });

          if (uploadErr) {
            console.warn("[Dispute Photo Upload Warning]:", uploadErr);
            continue;
          }

          const { error: recordErr } = await supabase
            .from("dispute_evidence")
            .insert({
              dispute_id: dispute.id,
              uploaded_by: currentUserId,
              storage_path: storagePath,
              media_type: "image",
            });

          if (recordErr) {
            console.warn("[Dispute Evidence Record Warning]:", recordErr);
          }
        }
      }

      return dispute;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["swaps"] });
      queryClient.invalidateQueries({ queryKey: ["disputes"] });
      toast({
        title: "Dispute Submitted",
        description: "Your dispute has been filed. Our team will review the details and evidence.",
      });
      handleClose();
    },
    onError: (err: any) => {
      console.error("[Dispute Mutation Failed]:", err);
      toast({
        title: "Failed to File Dispute",
        description: err.message || "An unexpected error occurred while filing the dispute.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-destructive">
            <ShieldAlert className="h-5 w-5" />
            Report a Problem with This Swap
          </DialogTitle>
          <DialogDescription>
            Formally open a dispute regarding your exchange for <strong>"{itemTitle}"</strong> with{" "}
            <strong>{partnerName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Category Select */}
          <div className="space-y-1.5">
            <Label htmlFor="dispute-category" className="text-sm font-semibold">
              Issue Category <span className="text-destructive">*</span>
            </Label>
            <Select
              value={category}
              onValueChange={(val) => setCategory(val as DisputeCategory)}
            >
              <SelectTrigger id="dispute-category">
                <SelectValue placeholder="Select the main issue" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DISPUTE_CATEGORY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description Textarea */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="dispute-desc" className="text-sm font-semibold">
                Detailed Explanation <span className="text-destructive">*</span>
              </Label>
              <span
                className={`text-xs ${
                  trimmedDesc.length < 20
                    ? "text-amber-500 font-medium"
                    : trimmedDesc.length > 1000
                    ? "text-destructive font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {trimmedDesc.length} / 1000 (min 20)
              </span>
            </div>
            <Textarea
              id="dispute-desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe clearly what occurred, item discrepancies, delivery status, or agreements made..."
              className="resize-none"
            />
            {trimmedDesc.length > 0 && trimmedDesc.length < 20 && (
              <p className="text-[11px] text-amber-500">
                Please provide at least 20 characters so the review team has sufficient context.
              </p>
            )}
          </div>

          {/* Evidence Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              Photo Evidence <span className="text-xs text-muted-foreground font-normal">(Optional, up to 5 photos)</span>
            </Label>

            {evidenceFiles.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {evidenceFiles.map((ev, index) => (
                  <div
                    key={index}
                    className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted group"
                  >
                    <img
                      src={ev.preview}
                      alt={`Evidence ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeEvidence(index)}
                      className="absolute top-1 right-1 bg-black/70 hover:bg-destructive text-white rounded-full p-1 transition-colors"
                      title="Remove image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {evidenceFiles.length < 5 && (
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFilesSelected}
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2 text-xs"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Add Photo Evidence
                </Button>
              </div>
            )}
          </div>

          <div className="p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground space-y-1 border border-border/50">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              What happens after filing?
            </p>
            <p>
              Your dispute will be marked as open for administrative review. Both you and your trading partner can see the dispute and submit additional evidence photos.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => fileDisputeMutation.mutate()}
            disabled={!isDescValid || isSubmitting}
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
              </>
            ) : (
              "Submit Dispute"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
