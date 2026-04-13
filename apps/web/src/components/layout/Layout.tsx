import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  BarChart, 
  Users, 
  Building2, 
  Briefcase, 
  CheckSquare, 
  FileText, 
  Wallet, 
  Settings,
  GitMerge,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  const navigation = [
    { name: "Command Center", href: "/", icon: BarChart },
    { name: "Operating Model", href: "/operating-model", icon: GitMerge },
    { name: "Contacts", href: "/contacts", icon: Users },
    { name: "Properties", href: "/properties", icon: Building2 },
    { name: "Deals", href: "/deals", icon: Briefcase },
    { name: "Tasks", href: "/tasks", icon: CheckSquare },
    { name: "Documents", href: "/documents", icon: FileText },
    { name: "Finance", href: "/finance", icon: Wallet },
    { name: "Integrations", href: "/integrations", icon: Settings },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <div className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <div className="font-serif font-bold text-xl text-sidebar-foreground tracking-wide">
            MURIVEST <span className="text-primary font-sans text-xs tracking-[0.2em] ml-2 align-middle">OS</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          <div className="text-xs font-mono tracking-widest text-sidebar-foreground/50 mb-4 px-3">SYSTEM MODULES</div>
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm transition-colors",
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium border-l-2 border-primary" 
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground border-l-2 border-transparent"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </div>
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 bg-sidebar-accent flex items-center justify-center text-xs font-medium text-sidebar-foreground">
              LD
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-sidebar-foreground">L. Director</span>
              <span className="text-xs text-sidebar-foreground/50">Executive</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex items-center justify-between px-8 border-b bg-card">
          <div className="flex items-center gap-4 text-muted-foreground">
            <Search className="h-4 w-4" />
            <input 
              type="text" 
              placeholder="Search across all modules..." 
              className="bg-transparent border-none focus:outline-none text-sm w-64 text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-4 text-sm font-mono text-muted-foreground">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-8 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
