"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Bot, Home, Settings, Workflow, Wallet, BarChart2, Brain, Rocket, Send, Terminal } from "lucide-react"
import DockIcons from "@/components/DockIcons"
import WalletConnect from "@/components/WalletConnect"

export default function DashboardPage() {
  const [input, setInput] = useState("")

  const dockIcons = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Workflow, label: "IFTTT Builder", path: "/ifttt" },
    { icon: Wallet, label: "Wallet", path: "/wallet" },
    { icon: BarChart2, label: "Trading", path: "/trading" },
    { icon: Brain, label: "AI Agents", path: "/agents" },
    { icon: Rocket, label: "Launch", path: "/launch" },
    { icon: Terminal, label: "Console", path: "/console" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ]

const quickActions = [
  "Portfolio Analysis",
  "Market Trends",
  "Trading Strategy",
  "Risk Assessment"
]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <WalletConnect/>

      {/* Main Content */}
      <div className="pt-20 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Bot className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-semibold mb-2">Talk Data to Me</h1>
            <p className="text-gray-600">Choose a prompt below or write your own to start chatting with Seam</p>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <div className="text-sm text-gray-600 mb-4">Ask about:</div>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action, i) => (
                <Button key={i} variant="outline" size="sm" className="rounded-full">
                  {action}
                </Button>
              ))}
            </div>
          </div>

          {/* Chat Input */}
          <div className="relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask AI a question or make a request..."
              className="w-full pl-12 pr-12 py-10 h-32 bg-white border-gray-200 rounded-xl shadow-sm text-lg"
            />
            <Bot className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
            <Button size="lg" className="absolute right-4 top-1/2 -translate-y-1/2 bg-black text-white px-6 py-3">
              <span className="flex items-center">Ask <Send className="w-5 h-5 ml-2" /></span>
            </Button>
          </div>
        </div>
      </div>

      <DockIcons icons={dockIcons} />
    </div>
  )
}
