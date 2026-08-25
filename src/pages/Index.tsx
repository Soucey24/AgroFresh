import { Leaf, Users, Clock, Shield, TrendingUp, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Hero from "@/components/Hero";
import Navigation from "@/components/Navigation";
import Features from "@/components/Features";
import Stats from "@/components/Stats";
import Footer from "@/components/Footer";
import BackgroundSlideshow from "@/components/BackgroundSlideshow";

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative">
      <BackgroundSlideshow />
      <div className="relative z-20">
        <Navigation />
        <Hero />
        <Stats />
        <Features />
        
        {/* How it Works Section */}
        <section id="how-it-works" className="py-20 bg-card/40 backdrop-blur-sm">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
                How AgroFresh GH Works
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Connecting Ghana's farmers with vendors in three simple steps
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="text-center group">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Leaf className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Farmers List Crops</h3>
                <p className="text-muted-foreground">
                  Farmers upload fresh produce with quantities, prices, and automatic 7-day expiration timers
                </p>
              </div>
              
              <div className="text-center group">
                <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Users className="h-8 w-8 text-accent-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Vendors Order</h3>
                <p className="text-muted-foreground">
                  Restaurants, hostels, and individuals browse and order fresh produce directly from farmers
                </p>
              </div>
              
              <div className="text-center group">
                <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="h-8 w-8 text-secondary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Everyone Benefits</h3>
                <p className="text-muted-foreground">
                  Reduced waste, increased farmer income, and consistent fresh produce supply for all
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-20 gradient-primary relative">
          <div className="absolute inset-0 bg-black/20" />
          <div className="container mx-auto px-4 text-center relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white text-shadow">
              Ready to Transform Ghana's Agricultural Market?
            </h2>
            <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
              Join thousands of farmers and vendors already using AgroFresh GH to reduce waste and increase profits
            </p>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
};

export default Index;
