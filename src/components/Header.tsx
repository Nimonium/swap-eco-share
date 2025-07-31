import { Button } from "@/components/ui/button";
import { Search, User, Menu } from "lucide-react";

const Header = () => {
  return (
    <header className="bg-background border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <img 
              src="/lovable-uploads/d78455cc-27aa-43e6-8db5-4ecaf6148ba7.png" 
              alt="EcoSwapSquare Logo" 
              className="w-8 h-8"
            />
            <span className="text-2xl font-bold text-primary">EcoSwapSquare</span>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="/" className="text-foreground hover:text-primary transition-colors">Home</a>
            <a href="/browse" className="text-foreground hover:text-primary transition-colors">Browse</a>
            <a href="/swap" className="text-foreground hover:text-primary transition-colors">My Swaps</a>
            <a href="/about" className="text-foreground hover:text-primary transition-colors">About</a>
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="hidden md:flex">
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="hidden md:flex">
              <User className="h-4 w-4" />
            </Button>
            <Button variant="eco" className="hidden md:flex">
              List Item
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;