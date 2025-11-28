import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Heart } from 'lucide-react';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-black/30 backdrop-blur-md border-t border-white/10 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About Section */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">ChessHub</h3>
            <p className="text-white/60 text-sm leading-relaxed">
              A free, open-source chess platform for players of all levels. Play, learn, and compete with players worldwide.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="text-white/60 hover:text-purple-400 text-sm transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/how-to-play" className="text-white/60 hover:text-purple-400 text-sm transition-colors">
                  How to Play
                </Link>
              </li>
              <li>
                <Link to="/rules" className="text-white/60 hover:text-purple-400 text-sm transition-colors">
                  Chess Rules
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-white/60 hover:text-purple-400 text-sm transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">Community</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/tournaments" className="text-white/60 hover:text-purple-400 text-sm transition-colors">
                  Tournaments
                </Link>
              </li>
              <li>
                <Link to="/leaderboard" className="text-white/60 hover:text-purple-400 text-sm transition-colors">
                  Leaderboard
                </Link>
              </li>
              <li>
                <Link to="/forum" className="text-white/60 hover:text-purple-400 text-sm transition-colors">
                  Forum
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-white/60 hover:text-purple-400 text-sm transition-colors">
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">Connect</h3>
            <div className="flex space-x-4 mb-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
            </div>
            <p className="text-white/60 text-sm">
              <a href="/contact" className="hover:text-purple-400 transition-colors">
                Contact Support
              </a>
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-white/60 text-sm mb-4 md:mb-0">
            © {currentYear} ChessHub. All rights reserved.
          </p>
          <div className="flex items-center space-x-6 text-sm">
            <Link to="/privacy" className="text-white/60 hover:text-purple-400 transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-white/60 hover:text-purple-400 transition-colors">
              Terms of Service
            </Link>
            <Link to="/cookies" className="text-white/60 hover:text-purple-400 transition-colors">
              Cookie Policy
            </Link>
          </div>
        </div>

        {/* Made with Love */}
        <div className="text-center mt-6">
          <p className="text-white/40 text-xs flex items-center justify-center">
            Made with <Heart className="w-3 h-3 mx-1 text-red-400" fill="currentColor" /> by chess enthusiasts
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;