import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMediaUrl, compressImage } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Upload,
  Loader2,
  FileText,
  User,
  ExternalLink,
  Shield,
  Image as ImageIcon,
} from "lucide-react";
import { DISPUTE_CATEGORY_LABELS, DisputeCategory } from "./DisputeDialog";
import { format, formatDistanceToNow } from "date-fns";

export type DisputeStatus =
  | "open"
  | "under_review"
  | "resolved_favor_filer"
  | "resolved_favor_other"
  | "resolved_mutual"
  | "closed_no_action";

export const DISPUTE_STATUS_CONFIG: Record<
  DisputeStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string }
> = {
  open: {
    label: "Open",
    variant: "outline",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  under_review: {
    label: "Under Review",
    variant: "outline",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  },
  resolved_favor_filer: {
    label: "Resolved (Favor of Filer)",
    variant: "outline",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  },
  resolved_favor_other: {
    label: "Resolved (Favor of Respondent)",
    variant: "outline",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  },
  resolved_mutual: {
    label: "Resolved (Mutual Agreement)",
    variant: "outline",
    className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
  },
  closed_no_action: {
    label: "Closed (No Action)",
    variant: "outline",
    className: "bg-muted text-muted-foreground border-border",
  },
};

interface DisputeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dispute: any;
  currentUserId: string;
}

export const DisputeDetailsModal = ({
  isOpen,
  onClose,
  dispute,
  currentUserId,
}: DisputeDetailsModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch all evidence photos for this dispute
  const { data: evidence = [], isLoading: evidenceLoading } = useQuery({
    queryKey: ["dispute-evidence", dispute?.id],
    queryFn: async () => {
      if (!dispute?.id) return [];
      const { data, error } = await supabase
        .from("dispute_evidence")
        .select(`
          id,
          dispute_id,
          uploaded_by,
          storage_path,
          media_type,
          created_at,
          uploader:profiles!uploaded_by(full_name, avatar_url)
        `)
        .eq("dispute_id", dispute.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[Dispute Evidence Fetch Error]:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!dispute?.id && isOpen,
  });

  // Upload additional evidence mutation
  const uploadEvidenceMutation = useMutation({
    mutationFn: async (files: File[]) => {
      setIsUploading(true);
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressed = await compressImage(file, 500);
        const fileName = `${Date.now()}_add_${i}.jpg`;
        const storagePath = `disputes/${dispute.id}/${fileName}`;

        const { error: uploadErr } = await supabase.storage
          .from("item-media")
          .upload(storagePath, compressed, {
            contentType: "image/jpeg",
            upsert: true,
          });

        if (uploadErr) {
          throw uploadErr;
        }

        const { error: insertErr } = await supabase.from("dispute_evidence").insert({
          dispute_id: dispute.id,
          uploaded_by: currentUserId,
          storage_path: storagePath,
          media_type: "image",
        });

        if (insertErr) {
          throw insertErr;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispute-evidence", dispute?.id] });
      toast({
        title: "Evidence Uploaded",
        description: "Your additional photos have been attached to this dispute.",
      });
    },
    onError: (err: any) => {
      console.error("[Upload Additional Evidence Failed]:", err);
      toast({
        title: "Upload Failed",
        description: err.message || "Failed to upload evidence photos.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
  });

  if (!dispute) return null;

  const isFiler = dispute.filed_by === currentUserId;
  const statusConfig =
    DISPUTE_STATUS_CONFIG[dispute.status as DisputeStatus] ||
    DISPUTE_STATUS_CONFIG.open;
  const categoryLabel =
    DISPUTE_CATEGORY_LABELS[dispute.category as DisputeCategory] || dispute.category;

  const filerName = dispute.filer?.full_name || (isFiler ? "You" : "Swap Partner");
  const respondentName =
    dispute.against_user?.full_name || (!isFiler ? "You" : "Swap Partner");

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    uploadEvidenceMutation.mutate(files);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Dispute Case #{dispute.id.slice(0, 8)}
              </DialogTitle>
              <Badge variant={statusConfig.variant} className={statusConfig.className}>
                {statusConfig.label}
              </Badge>
            </div>
            <DialogDescription>
              Opened on{" "}
              {format(new Date(dispute.created_at), "MMM d, yyyy 'at' h:mm a")} (
              {formatDistanceToNow(new Date(dispute.created_at), { addSuffix: true })})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Involved Parties & Category Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-muted/40 rounded-xl border border-border/60">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Issue Category
                </p>
                <p className="text-sm font-semibold text-foreground mt-0.5">
                  {categoryLabel}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Your Role
                </p>
                <p className="text-sm font-semibold text-foreground mt-0.5">
                  {isFiler ? "Dispute Filer" : "Respondent"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Filed By
                </p>
                <p className="text-sm text-foreground mt-0.5 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  {filerName} {isFiler && <span className="text-xs text-primary font-medium">(You)</span>}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Counterparty
                </p>
                <p className="text-sm text-foreground mt-0.5 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  {respondentName} {!isFiler && <span className="text-xs text-primary font-medium">(You)</span>}
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <h4 className="text-sm font-semibold text-foreground">Dispute Statement</h4>
              <div className="p-3.5 bg-card border border-border rounded-xl text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                {dispute.description}
              </div>
            </div>

            {/* Resolution Notes (Shown if present from admin) */}
            {dispute.resolution_notes && (
              <div className="space-y-1.5">
                <h4 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Administrative Resolution Notes
                </h4>
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {dispute.resolution_notes}
                  {dispute.resolved_at && (
                    <p className="text-xs text-muted-foreground mt-2 border-t border-emerald-500/20 pt-1.5">
                      Resolved on {format(new Date(dispute.resolved_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Evidence Gallery */}
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4 text-primary" />
                    Evidence Photos ({evidence.length})
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Photographic proof uploaded by either trade participant
                  </p>
                </div>

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
                    disabled={isUploading}
                    className="gap-1.5 text-xs"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5" /> Add Evidence
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {evidenceLoading ? (
                <div className="py-8 flex items-center justify-center text-muted-foreground gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-xs">Loading evidence...</span>
                </div>
              ) : evidence.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-border rounded-xl text-xs text-muted-foreground space-y-1">
                  <p>No photos have been uploaded for this dispute yet.</p>
                  <p>Either party can click "Add Evidence" above to attach relevant photos.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {evidence.map((item: any) => {
                    const isMyEvidence = item.uploaded_by === currentUserId;
                    const uploaderName =
                      item.uploader?.full_name || (isMyEvidence ? "You" : "Partner");
                    const imgUrl = getMediaUrl(item.storage_path, "item-media");

                    return (
                      <div
                        key={item.id}
                        className="group relative rounded-lg border border-border bg-card overflow-hidden shadow-xs hover:border-primary/50 transition-all cursor-pointer"
                        onClick={() => setSelectedPhoto(imgUrl)}
                      >
                        <div className="aspect-square bg-muted overflow-hidden">
                          <img
                            src={imgUrl}
                            alt="Dispute evidence"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        </div>
                        <div className="p-2 text-[11px] bg-card border-t border-border/40">
                          <p className="font-medium truncate text-foreground">
                            {isMyEvidence ? "Uploaded by You" : `By ${uploaderName}`}
                          </p>
                          <p className="text-muted-foreground text-[10px]">
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Size Photo Preview Modal */}
      {selectedPhoto && (
        <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
          <DialogContent className="max-w-3xl p-2 bg-black/95 border-none">
            <div className="relative flex items-center justify-center min-h-[300px]">
              <img
                src={selectedPhoto}
                alt="Enlarged evidence"
                className="max-h-[80vh] w-auto object-contain rounded-md"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
