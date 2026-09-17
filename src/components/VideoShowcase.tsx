import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Sparkles, 
  CheckCircle, 
  MapPin, 
  ShieldCheck, 
  Leaf,
  Layers,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";

interface StoryTab {
  id: string;
  title: string;
  subtitle: string;
  type: "video" | "photo";
  src: string;
  poster: string;
  duration: string;
  badge: string;
  story: string;
}

const STORIES: StoryTab[] = [
  {
    id: "story-1",
    title: "Eco Handover in the City",
    subtitle: "Watch community members exchange gear in a local green park plaza",
    type: "video",
    src: "/showcase/eco_story.mp4",
    poster: "/showcase/community_swapping.jpg",
    duration: "0:45 min",
    badge: "Featured Story",
    story: "Maya and Leo met at Central Park Eco Square to trade a plant cutting for a vintage camera lens. Safe, sunny, and zero carbon footprint.",
  },
  {
    id: "story-2",
    title: "The Creative Studio Trade",
    subtitle: "How a guitar found music again and headphones powered a podcast",
    type: "photo",
    src: "/showcase/acoustic_guitar.jpg",
    poster: "/showcase/acoustic_guitar.jpg",
    duration: "Photo Story",
    badge: "Sound & Audio",
    story: "Sophie hadn't played her acoustic guitar in 3 years. She swapped it with David for studio wireless headphones. Now both instruments are making sounds daily.",
  },
  {
    id: "story-3",
    title: "Vintage Lens Revival",
    subtitle: "Passing on high-performance optics to the next generation",
    type: "photo",
    src: "/showcase/vintage_camera.jpg",
    poster: "/showcase/vintage_camera.jpg",
    duration: "Photo Story",
    badge: "Tech & Gear",
    story: "Instead of collecting dust in a drawer, this mirrorless Fujifilm body went straight to a local student photographer in exchange for sustainable lifestyle gear.",
  },
];

const VideoShowcase = () => {
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const activeStory = STORIES[activeStoryIndex];

  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleToggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleRestart = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
  };

  return (
    <section id="video-showcase" className="py-20 lg:py-28 bg-slate-950 text-white relative overflow-hidden">
      {/* Background radial highlights */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 -left-20 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="container mx-auto px-4 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 px-3.5 py-1 text-xs">
            <Sparkles className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
            Visual Stories & Community Experience
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            See How Simple Swapping Really Is
          </h2>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            From discovering matching gear to secure in-person handovers, watch how our members keep quality goods in circulation.
          </p>
        </div>

        {/* Video Player & Story Selector Grid */}
        <div className="grid lg:grid-cols-12 gap-8 items-center">
          
          {/* Main Media Player (8 cols) */}
          <div className="lg:col-span-8">
            <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl group">
              
              {/* If Video */}
              {activeStory.type === "video" ? (
                <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
                  <video
                    ref={videoRef}
                    src={activeStory.src}
                    poster={activeStory.poster}
                    playsInline
                    loop
                    muted={isMuted}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    className="w-full h-full object-cover"
                  />

                  {/* Top overlay badge */}
                  <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                    <Badge className="bg-slate-900/80 backdrop-blur-md text-emerald-300 border-emerald-500/30">
                      ● Live Demo Video
                    </Badge>
                  </div>

                  {/* Big center play button if not playing */}
                  {!isPlaying && (
                    <div 
                      onClick={handleTogglePlay}
                      className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-[2px] cursor-pointer transition-opacity"
                    >
                      <button
                        type="button"
                        className="w-20 h-20 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-2xl transition-all transform hover:scale-110"
                        aria-label="Play Video"
                      >
                        <Play className="h-8 w-8 fill-current ml-1" />
                      </button>
                    </div>
                  )}

                  {/* Player controls toolbar */}
                  <div className="absolute bottom-0 inset-x-0 z-20 p-4 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleTogglePlay}
                        className="h-9 w-9 text-white hover:text-emerald-300 hover:bg-white/10 rounded-full"
                      >
                        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleRestart}
                        className="h-9 w-9 text-white hover:text-emerald-300 hover:bg-white/10 rounded-full"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleToggleMute}
                        className="h-9 w-9 text-white hover:text-emerald-300 hover:bg-white/10 rounded-full"
                      >
                        {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      </Button>
                      
                      <span className="text-xs text-slate-300 font-mono">
                        {isPlaying ? "Playing Story" : "Paused"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 hidden sm:inline">
                        1080p HD • Eco Community Video
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Photo Story View */
                <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
                  <img
                    src={activeStory.src}
                    alt={activeStory.title}
                    className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent flex flex-col justify-end p-6">
                    <Badge className="w-fit mb-2 bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                      {activeStory.badge}
                    </Badge>
                    <h3 className="text-2xl font-bold text-white mb-2">{activeStory.title}</h3>
                    <p className="text-sm text-slate-300 max-w-xl">{activeStory.story}</p>
                  </div>
                </div>
              )}

              {/* Story Narrative Footer */}
              <div className="p-6 bg-slate-900 border-t border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">
                      {activeStory.title}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {activeStory.story}
                    </p>
                  </div>
                  <Link to="/browse" className="shrink-0">
                    <Button className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold gap-2 rounded-xl">
                      Find Similar Swaps
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>

            </div>
          </div>

          {/* Story Playlist / Benefits Column (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            
            <div className="text-sm font-bold text-slate-300 uppercase tracking-wider px-1">
              Select A Chapter
            </div>

            {/* Playlist Cards */}
            <div className="space-y-3">
              {STORIES.map((story, idx) => {
                const isSelected = idx === activeStoryIndex;
                return (
                  <div
                    key={story.id}
                    onClick={() => {
                      setActiveStoryIndex(idx);
                      if (story.type === "video") {
                        setTimeout(() => {
                          if (videoRef.current) {
                            videoRef.current.currentTime = 0;
                            videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
                          }
                        }, 100);
                      }
                    }}
                    className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                      isSelected
                        ? "bg-slate-800/90 border-emerald-500/60 shadow-lg shadow-emerald-950/40"
                        : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-slate-800">
                        <img
                          src={story.poster}
                          alt={story.title}
                          className="w-full h-full object-cover"
                        />
                        {story.type === "video" && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Play className="h-4 w-4 text-emerald-300 fill-emerald-300" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide">
                            {story.badge}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {story.duration}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white truncate">
                          {story.title}
                        </h4>
                        <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                          {story.subtitle}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Community Highlights */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-800/30 space-y-3 mt-4">
              <div className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Community Safety Standard
              </div>
              <ul className="text-xs text-slate-300 space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Public safe-exchange meetup spots in 50+ cities</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Verified member reviews and mutual condition sign-off</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>100% free swap credits with zero transaction fees</span>
                </li>
              </ul>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};

export default VideoShowcase;
