"use client"

import { Link } from "react-router-dom"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import image1 from "@/assets/18.png"
import image2 from "@/assets/19.png"
import image3 from "@/assets/12.png"
import image4 from "@/assets/13.png"
import image5 from "@/assets/14.png"
import image6 from "@/assets/15.png"
import { AtomIcon } from "@/components/atom-icon"
import {
  Play,
  Home,
  Bell,
  ArrowRightLeft,
  Shield,
  Smartphone,
  Zap,
  Globe,
  Lock,
  BarChart3,
  Wallet,
  Download,
} from "lucide-react"
import Navbar from "@/components/Navbar"

export default function LandingPage() {
  const [activeTestimonial, setActiveTestimonial] = useState(0)

  const features = [
    {
      image: image3,
      title: "IFTTT Workflow Builder",
      description: "Create powerful trading strategies with drag-and-drop automation. Set custom triggers and actions for market conditions.",
    },
    {
      image: image4,
      title: "Token Launch Platform",
      description: "Launch your token with AI-powered scoring, instant creation, and automated liquidity management.",
    },
    {
      image: image5,
      title: "AI Trading Agents",
      description: "Deploy self-learning agents that adapt to market conditions with predictive analysis and risk management.",
    },
    {
      image: image6,
      title: "Strategy Marketplace",
      description: "Browse and clone battle-tested trading strategies from top performers. Instant deployment with one click.",
    },
  ]

  const testimonials = [
    {
      quote: "The most intuitive crypto platform I've ever used. Simply amazing!",
      author: "Trading Professional",
      role: "Crypto Analyst",
    },
    {
      quote: "Revolutionary features and incredible security. A game-changer.",
      author: "Investment Manager",
      role: "Portfolio Manager",
    },
    {
      quote: "Perfect for both beginners and advanced traders. Highly recommended!",
      author: "Tech Enthusiast",
      role: "Early Adopter",
    },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <Navbar/>

      {/* Hero Section */}
      <main className="relative pt-32 pb-16 px-4 overflow-hidden">
        {/* Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_5px,transparent_5px)] bg-[size:80px_80px]"></div>
        
        <div className="container mx-auto max-w-6xl relative">
          <div className="text-center mb-16">
            <h1 className="font-space-grotesk text-6xl md:text-8xl font-bold mb-6 relative">
              Manage your wall<span className="text-red-500">*</span>t easily!
              <span className="text-blue-500">{"{ INJective }"}</span>
              <div className="absolute -right-8 top-0 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl"></div>
              <div className="absolute -left-8 bottom-0 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl"></div>
            </h1>
            <p className="text-gray-500 text-lg mb-8 font-space-grotesk">
             One Single OS for all yur trading needs From DeFi to Automations,Build For <span className="text-violet-800">{"{Injective}"}</span> 
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link to="/dashboard"><Button size="lg" className="rounded-md px-8 bg-black text-white hover:bg-blue-700 font-space-grotesk">
                Get Started 
              </Button> </Link>
              <Link to="https://youtu.be/0vS2Gt2MnYk"><Button variant="ghost" size="lg" className="rounded-md gap-2 font-space-grotesk">
                <Play className="w-4 h-4" /> Watch Demo
              </Button></Link>
            </div>
          </div>
        </div>
      </main>

      {/* Features Grid */}
      <section className="w-full py-20 relative overflow-hidden">       
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_5px,transparent_5px)] bg-[size:80px_80px]"></div>
        
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-red-500">{"{FLUXOS}"}</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              The first hyper-intelligent decentralized trading ecosystem with IFTTT automation
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, i) => (
              <Card
                key={i}
                className="p-6 hover:shadow-xl transition-shadow duration-300 bg-white/50 backdrop-blur-sm border-0 hover:scale-105 transform"
              >
                <div className="flex justify-center items-center mb-6">
                  <div className="h-32 w-32 overflow-hidden rounded-lg">
                    <img 
                      src={feature.image} 
                      alt={feature.title}
                      className="w-full h-32 object-cover hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-500">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid - Interactive Trading Platform Style */}
      <section className="w-full py-20 relative overflow-hidden">
        <div className="w-full max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src={image1} alt="Powerful Features" className="w-10 h-10" />
              <h2 className="text-4xl font-bold text-red-500">{"{Trading Tools}"}</h2>
            </div>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Professional-grade trading tools powered by AI and automation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[1500px] mx-auto">
            {/* IFTTT Workflow Builder */}
            <div className="group">
              <div className="h-full bg-white/80 backdrop-blur-sm p-6 rounded-xl border border-red-500/20 hover:border-blue-500/20 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(59,130,246,0.1)] hover:scale-[1.02]">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <ArrowRightLeft className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold">IFTTT Workflow Builder</h3>
                </div>
                <div className="space-y-4">
                  <div className="p-3 bg-gray-50 rounded-lg text-sm">
                    IF price  MA(200) THEN buy()
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm">
                    IF RSI  30 THEN accumulate()
                  </div>
                </div>
              </div>
            </div>

            {/* Token Launch Wizard */}
            <div className="group">
              <div className="h-full bg-white/80 backdrop-blur-sm p-6 rounded-xl border border-red-500/20 hover:border-purple-500/20 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(147,51,234,0.1)] hover:scale-[1.02]">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-purple-50 rounded-xl">
                    <Zap className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-semibold">Token Launch Wizard</h3>
                </div>
                <div className="flex gap-3 mb-4">
                  <div className="h-2 w-full bg-purple-200 rounded-full">
                    <div className="h-2 w-2/3 bg-purple-500 rounded-full"></div>
                  </div>
                  <span className="text-sm text-purple-600">65%</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 bg-purple-50 rounded-lg text-center">
                    <div className="font-medium">Liquidity</div>
                    <div className="text-purple-600">$500K</div>
                  </div>
                  <div className="p-2 bg-purple-50 rounded-lg text-center">
                    <div className="font-medium">Score</div>
                    <div className="text-purple-600">8.5/10</div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Trading Agents */}
            <div className="group">
              <div className="h-full bg-white/80 backdrop-blur-sm p-6 rounded-xl border border-red-500/20 hover:border-green-500/20 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(34,197,94,0.1)] hover:scale-[1.02]">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-green-50 rounded-xl">
                    <AtomIcon className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold">AI Trading Agents</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                    <span>Agent #1</span>
                    <span className="text-green-600">+12.5%</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                    <span>Agent #2</span>
                    <span className="text-green-600">+8.3%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Risk Management */}
            <div className="group">
              <div className="h-full bg-white/80 backdrop-blur-sm p-6 rounded-xl border border-red-500/20 hover:border-red-500/20 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(239,68,68,0.1)] hover:scale-[1.02]">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-red-50 rounded-xl">
                    <Shield className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-xl font-semibold">Risk Management</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-red-50 rounded-lg text-center">
                    <div className="text-sm font-medium">Max Drawdown</div>
                    <div className="text-red-600">5%</div>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg text-center">
                    <div className="text-sm font-medium">Stop Loss</div>
                    <div className="text-red-600">2%</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Strategy Marketplace */}
            <div className="group">
              <div className="h-full bg-white/80 backdrop-blur-sm p-6 rounded-xl border border-red-500/20 hover:border-orange-500/20 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(249,115,22,0.1)] hover:scale-[1.02]">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-orange-50 rounded-xl">
                    <Globe className="w-8 h-8 text-orange-600" />
                  </div>
                  <h3 className="text-xl font-semibold">Strategy Marketplace</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg text-sm">
                    <span>Trend Follower</span>
                    <span className="text-orange-600">⭐️ 4.9</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg text-sm">
                    <span>Mean Reversion</span>
                    <span className="text-orange-600">⭐️ 4.8</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Analytics */}
            <div className="group">
              <div className="h-full bg-white/80 backdrop-blur-sm p-6 rounded-xl border border-red-500/20 hover:border-cyan-500/20 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(6,182,212,0.1)] hover:scale-[1.02]">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-cyan-50 rounded-xl">
                    <BarChart3 className="w-8 h-8 text-cyan-600" />
                  </div>
                  <h3 className="text-xl font-semibold">Performance Analytics</h3>
                </div>
                <div className="flex items-end gap-1 h-20">
                  {[40, 70, 55, 90, 60, 75].map((height, i) => (
                    <div key={i} className="flex-1 bg-cyan-100 rounded-t-sm" style={{ height: `${height}%` }}></div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Trading Tools - Clean and modern */}
      <section className="w-full py-24 bg-white relative overflow-hidden">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Advanced Trading Tools</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Professional-grade tools powered by AI and real-time analytics
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
              <div className="mb-6">
                <AtomIcon className="w-12 h-12 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold mb-4">AI Strategy Builder</h3>
              <p className="text-gray-500 mb-6">
                Create sophisticated trading strategies with our AI-powered workflow builder
              </p>
              <Button size="lg" className="w-full text-red-500">Learn More</Button>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
              <div className="mb-6">
                <BarChart3 className="w-12 h-12 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Real-Time Analytics</h3>
              <p className="text-gray-500 mb-6">
                Monitor your strategies with professional-grade analytics and insights
              </p>
              <Button size="lg" className="w-full text-red-500">Learn More</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile App Section */}
      <section className="w-full py-24 bg-gradient-to-b from-white to-gray-50">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Trade on the Go</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Download our mobile app and take your  experience to the next level.<span className="text-red-500">{"{Coming Soon}"}</span>
            </p>
          </div>
          <div className="flex justify-center gap-4">
            <Button size="lg" className="gap-2 bg-black text-white">
              <Download className="w-5 h-5" /> App Store
            </Button>
            <Button size="lg" variant="outline" className="gap-2 bg-black text-white">
              <Download className="w-5 h-5" /> Google Play
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="w-full py-24 bg-blue-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)]"></div>
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-white mb-4">What Traders Say</h2>
            </div>
            <div className="relative">
              <div className="text-center text-white">
                <blockquote className="text-2xl font-medium mb-6">"{testimonials[activeTestimonial].quote}"</blockquote>
                <div className="font-semibold">{testimonials[activeTestimonial].author}</div>
                <div className="text-blue-200">{testimonials[activeTestimonial].role}</div>
              </div>
              <div className="flex justify-center mt-8 gap-2">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveTestimonial(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === activeTestimonial ? "bg-white" : "bg-white/30"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="w-full py-24 bg-gray-50 relative">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl mx-auto text-center relative">
            {/* Image on top left */}
            <img 
              src={image1} 
              alt="Newsletter Top Left" 
              className="absolute -left-24 -top-16 w-32 h-32 opacity-80 md:-left-48 md:w-40 md:h-40"
            />
            {/* Image on bottom left */}
            <img 
              src={image2} 
              alt="Newsletter Bottom Left" 
              className="absolute -right-24 -bottom-16 w-32 h-32 opacity-80 md:-right-48 md:w-40 md:h-40"
            />
            <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
            <p className="text-gray-500 mb-8">
              Get the latest crypto news and updates delivered directly to your inbox
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button size="lg" className="bg-black text-white">Subscribe</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <AtomIcon className="w-6 h-6" />
                <span className="text-lg font-bold">FLUXOS</span>
              </div>
              <p className="text-sm text-gray-400">
                Different way of work and
                <br />
                thinking about good experience
                <br />
                AI experience.
              </p>
            </div>
            {[
              {
                title: "Product",
                links: ["How it works", "Features", "Pricing", "Support"],
              },
              {
                title: "Resources",
                links: ["Blog", "User guides", "Webinars", "Developers"],
              },
              {
                title: "Company",
                links: ["About us", "Careers", "Press", "Contact"],
              },
            ].map((column, i) => (
              <div key={i}>
                <h3 className="font-medium mb-4">{column.title}</h3>
                <ul className="space-y-2">
                  {column.links.map((link, j) => (
                    <li key={j}>
                      <Link to="/" className="text-sm text-gray-400 hover:text-white transition-colors">
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
