import { Bot, Home, Settings, Workflow, Wallet, BarChart2, Brain, Rocket } from "lucide-react"

export const navigationConfig = {
  dockIcons: [
    { icon: Home, label: "Home", path: "/dashboard" },
    { icon: Workflow, label: " Builder", path: "/builder" },
    { icon: Wallet, label: "Wallet", path: "/wallet" },
  
    { icon: Rocket, label: "Launch", path: "/token" },
    { icon: Brain, label: "AI Agents", path: "/tokens" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ]
}
