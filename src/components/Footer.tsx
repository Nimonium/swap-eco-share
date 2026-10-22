import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-foreground text-background py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <img 
                src="/logo-icon.png" 
                alt="EcoSwapSquare" 
                className="w-8 h-8 rounded-md object-contain" 
              />
              <span className="text-2xl font-bold">EcoSwapSquare</span>
            </div>
            <p className="text-background/80 leading-relaxed">
              Building a sustainable future through community-driven product exchanges.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/browse" className="text-background/80 hover:text-primary transition-colors">
                  Browse Items
                </Link>
              </li>
              <li>
                <Link to="/list-item" className="text-background/80 hover:text-primary transition-colors">
                  List Item
                </Link>
              </li>
              <li>
                <Link to="/profile" className="text-background/80 hover:text-primary transition-colors">
                  My Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-semibold mb-4">Popular Categories</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/browse" className="text-background/80 hover:text-primary transition-colors">
                  Electronics
                </Link>
              </li>
              <li>
                <Link to="/browse" className="text-background/80 hover:text-primary transition-colors">
                  Fashion
                </Link>
              </li>
              <li>
                <Link to="/browse" className="text-background/80 hover:text-primary transition-colors">
                  Books
                </Link>
              </li>
              <li>
                <Link to="/browse" className="text-background/80 hover:text-primary transition-colors">
                  Home & Garden
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-background/20 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-background/60 text-sm">
            © {new Date().getFullYear()} EcoSwapSquare. All rights reserved.
          </p>
          <p className="text-background/60 text-sm mt-2 md:mt-0">
            Made with 💚 for a sustainable future
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;