import { Button } from "@/components/ui/button";
import { Search, User, Menu } from "lucide-react";
import { Link } from "react-router-dom";

const Header = () => {

  return (
    <header className="bg-background border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img 
              src="/lovable-uploads/d78455cc-27aa-43e6-8db5-4ecaf6148ba7.png" 
              alt="EcoSwapSquare Logo" 
              className="w-8 h-8"
            />
            <span className="text-2xl font-bold text-primary">EcoSwapSquare</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-foreground hover:text-primary transition-colors">Home</Link>
            <Link to="/browse" className="text-foreground hover:text-primary transition-colors">Browse</Link>
            <Link to="/swap" className="text-foreground hover:text-primary transition-colors">My Swaps</Link>
            <Link to="/about" className="text-foreground hover:text-primary transition-colors">About</Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="hidden md:flex">
              <Search className="h-4 w-4" />
            </Button>
            
            <Link to="/auth">
              <Button variant="ghost" className="hidden md:flex">
                <User className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="eco" className="hidden md:flex">
                Get Started
              </Button>
            </Link>
            
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