import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { compressImage } from "@/lib/storage";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Camera,
  Video,
  RotateCcw,
  CheckCircle2,
  Upload,
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Tag,
  DollarSign,
  MapPin,
  Sparkles,
  StopCircle,
} from "lucide-react";

interface CapturedPhoto {
  blob: Blob;
  previewUrl: string;
  name: string;
  angleIndex: number;
}

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

const DRAFT_STORAGE_KEY = "ecoswap_list_item_draft";

const ListItem = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // --- Step 1: Media Capture State ---
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordSecondsLeft, setRecordSecondsLeft] = useState(10);
  const [gyroSupported, setGyroSupported] = useState(false);
  const [gyroActive, setGyroActive] = useState(false);

  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const lastCapturedAlphaRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // --- Step 2: Form Data State (with auto-save) ---
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    condition: "Good",
    priceValue: "",
    exchangePreference: "swap",
    wantedItems: "",
    city: "",
  });

  // --- Step 3: Consent State ---
  const [consentOwnership, setConsentOwnership] = useState(false);
  const [consentAccuracy, setConsentAccuracy] = useState(false);
  const [consentPolicy, setConsentPolicy] = useState(false);
  const [signatureText, setSignatureText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Restore draft from localStorage on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        setFormData((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore
    }
  }, []);

  // Save draft to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
    } catch {
      // ignore
    }
  }, [formData]);

  // Auth redirect check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to list an item.",
      });
      navigate("/auth");
    }
  }, [authLoading, isAuthenticated, navigate, toast]);

  // Camera cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera access is not supported on this browser.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      videoStreamRef.current = stream;
      if (videoElementRef.current) {
        videoElementRef.current.srcObject = stream;
        await videoElementRef.current.play();
      }
      setIsCameraActive(true);

      // Check device orientation availability
      if (typeof window !== "undefined" && "DeviceOrientationEvent" in window) {
        // Some browsers require explicit permission
        if (typeof (DeviceOrientationEvent as any).requestPermission === "function") {
          try {
            const perm = await (DeviceOrientationEvent as any).requestPermission();
            if (perm === "granted") {
              initDeviceOrientation();
            }
          } catch {
            // fallback
          }
        } else {
          initDeviceOrientation();
        }
      }
    } catch (err: any) {
      console.warn("Camera init failed:", err);
      setCameraError(err.message || "Unable to access camera. You can manually upload photos below.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((t) => t.stop());
      videoStreamRef.current = null;
    }
    if (videoElementRef.current) {
      videoElementRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    window.removeEventListener("deviceorientation", handleOrientation);
    setGyroActive(false);
  };

  const initDeviceOrientation = () => {
    window.addEventListener("deviceorientation", handleOrientation);
    setGyroSupported(true);
    setGyroActive(true);
  };

  const handleOrientation = (e: DeviceOrientationEvent) => {
    const alpha = e.alpha;
    if (alpha === null) return;

    if (lastCapturedAlphaRef.current === null) {
      lastCapturedAlphaRef.current = alpha;
      return;
    }

    const diff = Math.abs(alpha - lastCapturedAlphaRef.current);
    const normalizedDiff = diff > 180 ? 360 - diff : diff;

    // Trigger capture every ~18° rotation if we haven't reached 6 photos yet
    if (normalizedDiff >= 18) {
      lastCapturedAlphaRef.current = alpha;
      captureFrameFromVideo();
    }
  };

  const captureFrameFromVideo = async () => {
    if (!videoElementRef.current) return;
    const video = videoElementRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        const compressed = await compressImage(blob, 500);
        const url = URL.createObjectURL(compressed);

        setPhotos((prev) => {
          if (prev.length >= 8) return prev;
          const nextIndex = prev.length + 1;
          return [
            ...prev,
            {
              blob: compressed,
              previewUrl: url,
              name: `angle_${nextIndex}.jpg`,
              angleIndex: nextIndex,
            },
          ];
        });
      },
      "image/jpeg",
      0.85
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 8 - photos.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      const compressed = await compressImage(file, 500);
      const url = URL.createObjectURL(compressed);

      setPhotos((prev) => {
        if (prev.length >= 8) return prev;
        const nextIndex = prev.length + 1;
        return [
          ...prev,
          {
            blob: compressed,
            previewUrl: url,
            name: file.name || `photo_${nextIndex}.jpg`,
            angleIndex: nextIndex,
          },
        ];
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const startVideoRecording = () => {
    if (!videoStreamRef.current) return;
    try {
      const recorder = new MediaRecorder(videoStreamRef.current);
      mediaRecorderRef.current = recorder;
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/mp4" });
        setVideoBlob(blob);
        setVideoPreviewUrl(URL.createObjectURL(blob));
        setIsRecordingVideo(false);
      };

      recorder.start();
      setIsRecordingVideo(true);
      setRecordSecondsLeft(10);

      let timeLeft = 10;
      timerIntervalRef.current = setInterval(() => {
        timeLeft -= 1;
        setRecordSecondsLeft(timeLeft);
        if (timeLeft <= 0) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          stopVideoRecording();
        }
      }, 1000);
    } catch (err) {
      console.error("Failed to start video recording:", err);
    }
  };

  const stopVideoRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingVideo(false);
  };

  const handleRetryCapture = () => {
    photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setPhotos([]);
    setVideoBlob(null);
    setVideoPreviewUrl(null);
    lastCapturedAlphaRef.current = null;
    startCamera();
  };

  // Circular progress calculation: 6 photos target (16.6% each, max 100%)
  const photoProgress = Math.min(100, Math.round((photos.length / 6) * 100));

  // Form input handler
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateStep2 = () => {
    if (!formData.title.trim()) {
      toast({ title: "Validation Error", description: "Please enter a title.", variant: "destructive" });
      return false;
    }
    if (!formData.description.trim()) {
      toast({ title: "Validation Error", description: "Please enter a description.", variant: "destructive" });
      return false;
    }
    if (!formData.category) {
      toast({ title: "Validation Error", description: "Please select a category.", variant: "destructive" });
      return false;
    }
    if (!formData.condition) {
      toast({ title: "Validation Error", description: "Please select a condition.", variant: "destructive" });
      return false;
    }
    return true;
  };

  // Submit Listing Handler
  const handlePublish = async () => {
    if (!user) {
      toast({ title: "Error", description: "You must be signed in.", variant: "destructive" });
      return;
    }
    if (!consentOwnership || !consentAccuracy || !consentPolicy) {
      toast({
        title: "Consent Required",
        description: "Please check all three confirmation boxes.",
        variant: "destructive",
      });
      return;
    }
    if (!signatureText.trim()) {
      toast({
        title: "Signature Required",
        description: "Please type your full legal name as your digital signature.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    stopCamera();

    try {
      const itemId = crypto.randomUUID();

      // 1. Insert Item row
      const wantedList = formData.wantedItems
        ? formData.wantedItems
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      const { error: itemError } = await supabase.from("items").insert({
        id: itemId,
        owner_id: user.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        condition: formData.condition,
        price_value: formData.priceValue ? parseFloat(formData.priceValue) : null,
        exchange_preference: formData.exchangePreference,
        wanted_items: wantedList,
        city: formData.city.trim() || null,
        status: "published",
      });

      if (itemError) throw itemError;

      // 2. Upload captured photos and insert item_media rows
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const fileName = `angle_${i + 1}_${Date.now()}.jpg`;
        const storagePath = `${user.id}/${itemId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("item-media")
          .upload(storagePath, photo.blob, {
            contentType: "image/jpeg",
            upsert: true,
          });

        if (uploadError) {
          console.error("Failed to upload photo:", uploadError);
        } else {
          await supabase.from("item_media").insert({
            item_id: itemId,
            storage_path: storagePath,
            media_type: "image",
            angle_index: i + 1,
          });
        }
      }

      // 3. Upload video if captured
      if (videoBlob) {
        const videoPath = `${user.id}/${itemId}/preview_${Date.now()}.mp4`;
        const { error: videoUploadError } = await supabase.storage
          .from("item-media")
          .upload(videoPath, videoBlob, {
            contentType: "video/mp4",
            upsert: true,
          });

        if (!videoUploadError) {
          await supabase.from("item_media").insert({
            item_id: itemId,
            storage_path: videoPath,
            media_type: "video",
            angle_index: 0,
          });
        }
      }

      // 4. Insert Consent Record
      const { error: consentError } = await supabase.from("consent_records").insert({
        item_id: itemId,
        user_id: user.id,
        signature_text: signatureText.trim(),
        terms_version: "v1",
        user_agent: navigator.userAgent,
        signed_at: new Date().toISOString(),
      });

      if (consentError) throw consentError;

      // Clean up local draft
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
        // ignore
      }

      toast({
        title: "Success! Item Listed",
        description: "Your item has been published to the community.",
      });

      navigate(`/item/${itemId}`);
    } catch (err: any) {
      console.error("[EcoSwapSquare Supabase Error] Listing submission failed:", err);
      toast({
        title: "Listing Failed",
        description: err.message || "Something went wrong while publishing your item.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="container mx-auto px-4 py-8 flex-1 max-w-4xl">
        {/* Stepper Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">List an Item</h1>
              <p className="text-muted-foreground">Share what you have, discover what you need</p>
            </div>
            <Badge variant="outline" className="px-3 py-1 text-sm font-medium">
              Step {currentStep} of 3
            </Badge>
          </div>

          {/* Stepper Navigation Indicator */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div
              className={`p-3 rounded-lg border transition-all text-center ${
                currentStep === 1
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : currentStep > 1
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-border text-muted-foreground"
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 text-xs sm:text-sm">
                {currentStep > 1 ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <span>1.</span>}
                <span>Photos & Video</span>
              </div>
            </div>

            <div
              className={`p-3 rounded-lg border transition-all text-center ${
                currentStep === 2
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : currentStep > 2
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-border text-muted-foreground"
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 text-xs sm:text-sm">
                {currentStep > 2 ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <span>2.</span>}
                <span>Details & Price</span>
              </div>
            </div>

            <div
              className={`p-3 rounded-lg border transition-all text-center ${
                currentStep === 3
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-border text-muted-foreground"
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 text-xs sm:text-sm">
                <span>3.</span>
                <span>Consent & Publish</span>
              </div>
            </div>
          </div>
        </div>

        {/* STEP 1: Capture Photos & Video */}
        {currentStep === 1 && (
          <Card className="shadow-sm border-border">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Camera className="h-5 w-5 text-primary" />
                    Multi-Angle Capture
                  </CardTitle>
                  <CardDescription>
                    Capture at least 6 multi-angle photos and an optional 10s video clip.
                  </CardDescription>
                </div>

                {/* Progress Ring */}
                <div className="flex items-center gap-3 bg-muted/40 p-2 rounded-xl">
                  <div className="relative w-14 h-14 flex items-center justify-center">
                    <svg className="w-14 h-14 transform -rotate-90">
                      <circle
                        cx="28"
                        cy="28"
                        r="22"
                        stroke="currentColor"
                        strokeWidth="5"
                        fill="transparent"
                        className="text-muted"
                      />
                      <circle
                        cx="28"
                        cy="28"
                        r="22"
                        stroke="currentColor"
                        strokeWidth="5"
                        fill="transparent"
                        strokeDasharray={138.2}
                        strokeDashoffset={138.2 - (138.2 * photoProgress) / 100}
                        strokeLinecap="round"
                        className="text-primary transition-all duration-500"
                      />
                    </svg>
                    <span className="absolute text-xs font-bold text-foreground">
                      {photoProgress}%
                    </span>
                  </div>
                  <div className="text-xs">
                    <p className="font-semibold text-foreground">{photos.length} of 6 Photos</p>
                    <p className="text-muted-foreground">
                      {photoProgress >= 100 ? "Capture complete!" : "Rotate item or tap shutter"}
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Camera Stream / Viewport */}
              <div className="relative rounded-xl overflow-hidden bg-black/90 aspect-video flex items-center justify-center border border-border">
                {isCameraActive ? (
                  <video
                    ref={videoElementRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-6 space-y-4">
                    <Camera className="h-12 w-12 mx-auto text-muted-foreground" />
                    <div>
                      <p className="text-white font-medium">Live Camera Inactive</p>
                      <p className="text-sm text-gray-400">
                        Start your camera for 360° gyro-assisted capture or upload existing photos.
                      </p>
                    </div>
                    <Button onClick={startCamera} variant="eco" className="gap-2">
                      <Camera className="h-4 w-4" /> Start Camera
                    </Button>
                  </div>
                )}

                {/* Overlays on Live Camera */}
                {isCameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
                    <div className="flex justify-between items-start">
                      <Badge variant="secondary" className="bg-black/60 text-white backdrop-blur-sm">
                        {gyroActive ? "Gyro Auto-Capture: ACTIVE (~20° delta)" : "Manual Shutter Mode"}
                      </Badge>
                      {isRecordingVideo && (
                        <Badge variant="destructive" className="animate-pulse flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                          REC {recordSecondsLeft}s
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-center gap-4 pointer-events-auto">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={captureFrameFromVideo}
                        disabled={photos.length >= 8}
                        className="bg-white/80 hover:bg-white text-black font-medium"
                      >
                        <Camera className="h-4 w-4 mr-1.5" />
                        Snap Photo ({photos.length}/8)
                      </Button>

                      {!isRecordingVideo ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={startVideoRecording}
                          disabled={!!videoBlob}
                          className="gap-1.5"
                        >
                          <Video className="h-4 w-4" />
                          {videoBlob ? "Video Recorded" : "Record 10s Clip"}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={stopVideoRecording}
                          className="gap-1.5"
                        >
                          <StopCircle className="h-4 w-4" />
                          Stop Recording
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}

              {/* Action Buttons & Fallback Upload */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload-input"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={photos.length >= 8}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" /> Upload Photos
                  </Button>

                  {photos.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={handleRetryCapture} className="gap-1 text-muted-foreground">
                      <RotateCcw className="h-4 w-4" /> Reset
                    </Button>
                  )}
                </div>

                {isCameraActive && (
                  <Button variant="ghost" size="sm" onClick={stopCamera}>
                    Turn Off Camera
                  </Button>
                )}
              </div>

              {/* Photos Preview Grid */}
              {photos.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">
                    Captured Photos ({photos.length}/8)
                  </h4>
                  <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                    {photos.map((p, idx) => (
                      <div
                        key={idx}
                        className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted"
                      >
                        <img
                          src={p.previewUrl}
                          alt={`Angle ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1 rounded">
                          #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Video Preview */}
              {videoPreviewUrl && (
                <div className="p-3 bg-muted/40 rounded-lg border border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Video className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">10s Video Clip Attached</p>
                      <p className="text-xs text-muted-foreground">Ready for multi-angle preview</p>
                    </div>
                  </div>
                  <video src={videoPreviewUrl} controls className="h-12 w-20 rounded object-cover" />
                </div>
              )}

              {/* Next Button */}
              <div className="flex justify-end pt-4 border-t border-border">
                <Button
                  variant="eco"
                  size="lg"
                  onClick={() => {
                    if (photos.length === 0) {
                      toast({
                        title: "Photos Needed",
                        description: "Please capture or upload at least one photo of your item.",
                        variant: "destructive",
                      });
                      return;
                    }
                    stopCamera();
                    setCurrentStep(2);
                  }}
                  className="gap-2"
                >
                  Continue to Description
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: Description & Price */}
        {currentStep === 2 && (
          <Card className="shadow-sm border-border">
            <CardHeader>
              <CardTitle className="text-xl">Item Details & Preferences</CardTitle>
              <CardDescription>
                Describe your item accurately so others know what they're swapping for. (Draft auto-saved)
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-semibold">
                  Item Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="e.g. Vintage 1978 Vinyl Turntable in mint condition"
                  value={formData.title}
                  onChange={handleInputChange}
                  maxLength={120}
                />
              </div>

              {/* Category & Condition */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    Category <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(val) => setFormData((p) => ({ ...p, category: val }))}
                  >
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
                  <Select
                    value={formData.condition}
                    onValueChange={(val) => setFormData((p) => ({ ...p, condition: val }))}
                  >
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

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-semibold">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={4}
                  placeholder="Detail the specifications, usage history, included accessories, or any flaws..."
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </div>

              {/* Estimated Value & City */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priceValue" className="text-sm font-semibold flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    Estimated Value ($ USD)
                  </Label>
                  <Input
                    id="priceValue"
                    name="priceValue"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="e.g. 150"
                    value={formData.priceValue}
                    onChange={handleInputChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    Used for fair-swap calculations and swap balance.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city" className="text-sm font-semibold flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Location (City / Area)
                  </Label>
                  <Input
                    id="city"
                    name="city"
                    placeholder="e.g. San Francisco, CA"
                    value={formData.city}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* Exchange Preference */}
              <div className="space-y-3 pt-2">
                <Label className="text-sm font-semibold">Exchange Preference</Label>
                <RadioGroup
                  value={formData.exchangePreference}
                  onValueChange={(val) => setFormData((p) => ({ ...p, exchangePreference: val }))}
                  className="grid grid-cols-3 gap-3"
                >
                  <div className="flex items-center space-x-2 border border-border p-3 rounded-lg hover:border-primary cursor-pointer">
                    <RadioGroupItem value="swap" id="pref-swap" />
                    <Label htmlFor="pref-swap" className="cursor-pointer font-medium text-sm">
                      Swap / Trade
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 border border-border p-3 rounded-lg hover:border-primary cursor-pointer">
                    <RadioGroupItem value="rent" id="pref-rent" />
                    <Label htmlFor="pref-rent" className="cursor-pointer font-medium text-sm">
                      Rent / Lend
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 border border-border p-3 rounded-lg hover:border-primary cursor-pointer">
                    <RadioGroupItem value="purchase" id="pref-purchase" />
                    <Label htmlFor="pref-purchase" className="cursor-pointer font-medium text-sm">
                      Direct Purchase
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Wanted Items Tags */}
              <div className="space-y-2">
                <Label htmlFor="wantedItems" className="text-sm font-semibold flex items-center gap-1.5">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  What are you looking for in return?
                </Label>
                <Input
                  id="wantedItems"
                  name="wantedItems"
                  placeholder="Comma separated, e.g. Studio Monitors, Books, Espresso Machine"
                  value={formData.wantedItems}
                  onChange={handleInputChange}
                />
                <p className="text-xs text-muted-foreground">
                  Adding tags helps our Swap AI match you with users who have what you want!
                </p>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setCurrentStep(1)} className="gap-2">
                  <ChevronLeft className="h-4 w-4" /> Back to Media
                </Button>
                <Button
                  variant="eco"
                  size="lg"
                  onClick={() => {
                    if (validateStep2()) {
                      setCurrentStep(3);
                    }
                  }}
                  className="gap-2"
                >
                  Review & Sign
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: Consent & Publish */}
        {currentStep === 3 && (
          <div className="space-y-6">
            {/* Review Summary Card */}
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">Review Item Summary</CardTitle>
                <CardDescription>
                  Please double check your listing details before signing the legal consent.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Primary Thumbnail Preview */}
                  <div className="w-full md:w-48 h-48 rounded-lg overflow-hidden bg-muted flex-shrink-0 border border-border">
                    {photos.length > 0 ? (
                      <img
                        src={photos[0].previewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        No image
                      </div>
                    )}
                  </div>

                  {/* Summary Details */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary text-primary-foreground">{formData.condition}</Badge>
                      <Badge variant="secondary">{formData.category}</Badge>
                      <Badge variant="outline" className="capitalize">{formData.exchangePreference}</Badge>
                    </div>
                    <h3 className="text-2xl font-bold text-foreground">{formData.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-3">{formData.description}</p>

                    <div className="flex flex-wrap gap-4 pt-2 text-sm text-muted-foreground">
                      {formData.priceValue && (
                        <div>
                          <span className="font-semibold text-foreground">Estimated Value:</span> ${formData.priceValue}
                        </div>
                      )}
                      {formData.city && (
                        <div>
                          <span className="font-semibold text-foreground">Location:</span> {formData.city}
                        </div>
                      )}
                      <div>
                        <span className="font-semibold text-foreground">Photos:</span> {photos.length} captured
                      </div>
                    </div>

                    {formData.wantedItems && (
                      <div className="pt-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase">Seeking:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {formData.wantedItems.split(",").map((tag, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {tag.trim()}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Legal Consent & Signature Card */}
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Community Verification & Legal Consent
                </CardTitle>
                <CardDescription>
                  To keep EcoSwapSquare safe, authentic, and scam-free, all listers must attest to ownership and truthfulness.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* 3 Required Checkboxes */}
                <div className="space-y-4 bg-muted/30 p-4 rounded-xl border border-border">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="consent-owner"
                      checked={consentOwnership}
                      onCheckedChange={(checked) => setConsentOwnership(!!checked)}
                      className="mt-1"
                    />
                    <Label htmlFor="consent-owner" className="text-sm leading-relaxed cursor-pointer">
                      <span className="font-semibold text-foreground">Lawful Ownership:</span> I confirm that I am the lawful owner of this item or possess the explicit authority to exchange, lease, or transfer it.
                    </Label>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="consent-accuracy"
                      checked={consentAccuracy}
                      onCheckedChange={(checked) => setConsentAccuracy(!!checked)}
                      className="mt-1"
                    />
                    <Label htmlFor="consent-accuracy" className="text-sm leading-relaxed cursor-pointer">
                      <span className="font-semibold text-foreground">Accurate Representation:</span> I confirm that all photos, video recordings, condition evaluations, and descriptions provided are truthful and free of misrepresentation.
                    </Label>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="consent-policy"
                      checked={consentPolicy}
                      onCheckedChange={(checked) => setConsentPolicy(!!checked)}
                      className="mt-1"
                    />
                    <Label htmlFor="consent-policy" className="text-sm leading-relaxed cursor-pointer">
                      <span className="font-semibold text-foreground">Prohibited Items Compliance:</span> I confirm that this item does not violate community guidelines or prohibited item policies (no hazardous substances, weapons, stolen property, or illegal contraband).
                    </Label>
                  </div>
                </div>

                {/* Digital Signature Field */}
                <div className="space-y-2">
                  <Label htmlFor="signature" className="text-sm font-semibold">
                    Digital Signature (Full Legal Name) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="signature"
                    placeholder="Type your full legal name here"
                    value={signatureText}
                    onChange={(e) => setSignatureText(e.target.value)}
                    disabled={!consentOwnership || !consentAccuracy || !consentPolicy}
                    className="font-serif italic text-base"
                  />
                  <p className="text-xs text-muted-foreground">
                    {!consentOwnership || !consentAccuracy || !consentPolicy
                      ? "Check all three agreements above to unlock the signature field."
                      : "By signing, you submit a binding electronic consent record (Terms v1)."}
                  </p>
                </div>

                {/* Submit Actions */}
                <div className="flex justify-between pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(2)}
                    disabled={isSubmitting}
                    className="gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" /> Back to Edit Details
                  </Button>

                  <Button
                    variant="eco"
                    size="lg"
                    onClick={handlePublish}
                    disabled={
                      !consentOwnership ||
                      !consentAccuracy ||
                      !consentPolicy ||
                      !signatureText.trim() ||
                      isSubmitting
                    }
                    className="gap-2 min-w-[180px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Publishing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" /> Publish Listing
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default ListItem;
