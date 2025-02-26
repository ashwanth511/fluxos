import { Link } from "react-router-dom"
import { navigationConfig } from "@/config/navigation"

interface DockIconsProps {}

export default function DockIcons() {
  const { dockIcons } = navigationConfig;

  if (!dockIcons) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2">
      <div className="flex items-end gap-2 px-4 py-3 bg-white/80 backdrop-blur-md rounded-2xl border shadow-lg">
        {dockIcons.map((item, index) => {
          const path = `${item.path}`;

          return (
            <Link 
              key={index}
              to={path}
              className="group relative flex flex-col items-center"
            >
              <div className="p-3 rounded-xl bg-gray-50 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 group-hover:scale-110 group-hover:-translate-y-2">
                <item.icon size={28} />
              </div>
              <div className="absolute -bottom-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="px-2 py-1 rounded-md bg-gray-900 text-white text-xs whitespace-nowrap">
                  {item.label}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}