import { Leaf, Facebook, Twitter, Instagram, Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-secondary text-secondary-foreground">
      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {/* Logo and Description */}
          <div className="col-span-1 sm:col-span-2">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Leaf className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg sm:text-xl font-bold">AgroFresh GH</span>
            </div>
            <p className="text-secondary-foreground/80 mb-4 sm:mb-6 max-w-md text-sm sm:text-base">
              Connecting Ghana's farmers with vendors to reduce waste, increase profits, 
              and ensure fresh produce reaches every table across the country.
            </p>
            <div className="flex space-x-3 sm:space-x-4">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-secondary-foreground/10 rounded-lg flex items-center justify-center hover:bg-primary transition-colors cursor-pointer">
                <Facebook className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-secondary-foreground/10 rounded-lg flex items-center justify-center hover:bg-primary transition-colors cursor-pointer">
                <Twitter className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-secondary-foreground/10 rounded-lg flex items-center justify-center hover:bg-primary transition-colors cursor-pointer">
                <Instagram className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-secondary-foreground/80 hover:text-secondary-foreground transition-colors text-sm sm:text-base">About Us</a></li>
              <li><a href="#" className="text-secondary-foreground/80 hover:text-secondary-foreground transition-colors text-sm sm:text-base">How it Works</a></li>
              <li><a href="#" className="text-secondary-foreground/80 hover:text-secondary-foreground transition-colors text-sm sm:text-base">Pricing</a></li>
              <li><a href="#" className="text-secondary-foreground/80 hover:text-secondary-foreground transition-colors text-sm sm:text-base">Support</a></li>
              <li><a href="#" className="text-secondary-foreground/80 hover:text-secondary-foreground transition-colors text-sm sm:text-base">Blog</a></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Contact</h3>
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-secondary-foreground/80 text-sm sm:text-base">+233 20 123 4567</span>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-secondary-foreground/80 text-sm sm:text-base">hello@agrofresh.gh</span>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-secondary-foreground/80 text-sm sm:text-base">Accra, Ghana</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-secondary-foreground/20 mt-6 sm:mt-8 pt-6 sm:pt-8 flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
          <div className="text-secondary-foreground/60 text-xs sm:text-sm text-center sm:text-left">
            © 2025 AgroFresh GH. All rights reserved.
          </div>
          <div className="flex flex-wrap justify-center sm:justify-end space-x-4 sm:space-x-6 text-xs sm:text-sm">
            <a href="#" className="text-secondary-foreground/60 hover:text-secondary-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="text-secondary-foreground/60 hover:text-secondary-foreground transition-colors">Terms of Service</a>
            <a href="#" className="text-secondary-foreground/60 hover:text-secondary-foreground transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
