import { Leaf, Facebook, Twitter, Instagram, Mail } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-foreground text-background py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
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
            <div className="flex space-x-4">
              <Facebook className="h-5 w-5 text-background/60 hover:text-primary cursor-pointer transition-colors" />
              <Twitter className="h-5 w-5 text-background/60 hover:text-primary cursor-pointer transition-colors" />
              <Instagram className="h-5 w-5 text-background/60 hover:text-primary cursor-pointer transition-colors" />
              <Mail className="h-5 w-5 text-background/60 hover:text-primary cursor-pointer transition-colors" />
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-background/80 hover:text-primary transition-colors">How It Works</a></li>
              <li><a href="#" className="text-background/80 hover:text-primary transition-colors">Browse Items</a></li>
              <li><a href="#" className="text-background/80 hover:text-primary transition-colors">List Item</a></li>
              <li><a href="#" className="text-background/80 hover:text-primary transition-colors">My Account</a></li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-semibold mb-4">Popular Categories</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-background/80 hover:text-primary transition-colors">Electronics</a></li>
              <li><a href="#" className="text-background/80 hover:text-primary transition-colors">Fashion</a></li>
              <li><a href="#" className="text-background/80 hover:text-primary transition-colors">Books</a></li>
              <li><a href="#" className="text-background/80 hover:text-primary transition-colors">Home & Garden</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-background/80 hover:text-primary transition-colors">Help Center</a></li>
              <li><a href="#" className="text-background/80 hover:text-primary transition-colors">Safety Guidelines</a></li>
              <li><a href="#" className="text-background/80 hover:text-primary transition-colors">Terms of Service</a></li>
              <li><a href="#" className="text-background/80 hover:text-primary transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-background/20 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-background/60 text-sm">
            © 2024 EcoSwapSquare. All rights reserved.
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