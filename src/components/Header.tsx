import { Button } from "@/components/ui/button";
import { Search, User, Menu, PlusCircle, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getAvatarUrl } from "@/lib/storage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Header = () => {
  const { user, isAuthenticated, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const avatarSrc = profile?.avatar_url
    ? getAvatarUrl(profile.avatar_url)
    : (user?.user_metadata?.avatar_url as string) || "";
  const displayName = profile?.full_name || user?.user_metadata?.full_name || "Member";

  const handleSignOut = async () => {
    try {
      await signOut(queryClient);
      navigate("/auth");
    } catch (err) {
      console.error("Failed to sign out:", err);
    }
  };

  return (
    <>
      {/* Top Live Community Bar */}
      <div className="bg-emerald-950 text-emerald-300 text-[11px] font-medium py-1.5 px-4 border-b border-emerald-900/50">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="hidden sm:inline text-emerald-200">Live Circular Marketplace:</span>
            <span>12,400+ items saved from landfills across 50 cities</span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-[11px] text-emerald-400">
            <span>✓ Verified Safe Meetups</span>
            <span>✓ Zero Seller Fees</span>
          </div>
        </div>
      </div>

      <header className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img 
              src="/logo.png" 
              alt="EcoSwapSquare Logo" 
              className="h-8 md:h-9 w-auto object-contain"
            />
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-foreground hover:text-primary transition-colors font-medium text-sm">
              Home
            </Link>
            <Link to="/browse" className="text-foreground hover:text-primary transition-colors font-medium text-sm">
              Browse
            </Link>
            <Link to="/swap" className="text-foreground hover:text-primary transition-colors font-medium text-sm">
              My Swaps
            </Link>
            <Link to="/about" className="text-foreground hover:text-primary transition-colors font-medium text-sm">
              About
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-3">
            <Link to="/list-item">
              <Button variant="eco" size="sm" className="hidden sm:inline-flex items-center gap-1.5 shadow-sm">
                <PlusCircle className="h-4 w-4" />
                <span>List an Item</span>
              </Button>
            </Link>

            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                    <Avatar className="h-9 w-9 border border-border">
                      <AvatarImage src={avatarSrc} alt={displayName} className="object-cover" />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                        {displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <p className="text-sm font-medium leading-none">{displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground mt-1 truncate">{user?.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4 text-primary" />
                      <span>My Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/list-item" className="cursor-pointer">
                      <PlusCircle className="mr-2 h-4 w-4 text-primary" />
                      <span>List an Item</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/swap" className="cursor-pointer">
                      <Search className="mr-2 h-4 w-4" />
                      <span>My Swaps</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/auth">
                  <Button variant="ghost" size="sm" className="hidden md:flex">
                    <User className="h-4 w-4 mr-1.5" />
                    Sign In
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button variant="outline" size="sm" className="hidden md:flex">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
            
            {/* Mobile Menu trigger */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 md:hidden">
                <DropdownMenuItem asChild>
                  <Link to="/">Home</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/browse">Browse</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/swap">My Swaps</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/list-item">List an Item</Link>
                </DropdownMenuItem>
                {isAuthenticated && (
                  <DropdownMenuItem asChild>
                    <Link to="/profile">My Profile</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/about">About</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isAuthenticated ? (
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    Sign Out
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem asChild>
                    <Link to="/auth">Sign In</Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
    </>
  );
};

export default Header;