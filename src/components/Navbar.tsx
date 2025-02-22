import { Link } from "react-router-dom"
import { AtomIcon } from "./atom-icon"
import { Button } from "./ui/button"

export default function Navbar() {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/20 bg-gray-10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <AtomIcon className="w-6 h-6" /><span className="font-bold font-space-grotesk">INOS</span> 
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/research" className="text-md text-black hover:text-white transition-colors font-space-grotesk">
                Research
              </Link>
              <Link to="/developer" className="text-md text-black hover:text-white transition-colors font-space-grotesk">
                Developer
              </Link>
              <Link to="/safety" className="text-md text-black hover:text-white transition-colors">
                Safety
              </Link>
              <div className="h-4 w-px bg-white/20" />
              <Link to="/privacy" className="text-md text-black hover:text-white transition-colors">
                Privacy
              </Link>
              
            </nav>
            <Button variant="outline" className="border-white/20 text-black font-bold hover:bg-white/10">
              Get Started
            </Button>
          </div>
        </div>
      </header>
    )
}