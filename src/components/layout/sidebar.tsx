'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut as clientSignOut } from '@/lib/session-client'
import { cn, isPremium } from '@/lib/utils'
import {
  Home,
  Users,
  Target,
  Rocket,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Shield,
  Crown,
  Lock,
  LayoutGrid,
  Link as LinkIcon,
  MessageCircle,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useState } from 'react'

const DISCORD_LINK = 'https://discord.gg/6Tt7XP3JhH'

interface NavItem {
  name: string
  href?: string
  icon: any
  children?: { name: string; href: string }[]
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Characters', href: '/dashboard/characters', icon: Users },
  { name: 'Activity Tracker', href: '/dashboard/activity', icon: Target },
  { 
    name: 'Fit Management', 
    icon: Rocket,
    children: [
      { name: 'Fits', href: '/dashboard/fits' },
      { name: 'Fit Compare', href: '/dashboard/fits/compare' },
    ]
  },
]

const subscriptionItem = { name: 'Subscription', href: '/dashboard/subscription', icon: Crown }

const quickLinks = [
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Discord', href: DISCORD_LINK, icon: LinkIcon, external: true },
]

const sectionLabels = {
  main: 'NAVIGATION',
  subscription: 'ACCOUNT',
  quickLinks: 'QUICK LINKS',
}


export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [openMenus, setOpenMenus] = useState<string[]>(['Fit Management'])

  const hasPremium = isPremium(session?.user?.subscriptionEnd)

  const handleSignOut = () => {
    clientSignOut()
  }

  const toggleMenu = (name: string) => {
    setOpenMenus(prev => 
      prev.includes(name) 
        ? prev.filter(m => m !== name) 
        : [...prev, name]
    )
  }

  const characterName = session?.user?.characters?.find(c => c.id === session?.user?.characterId)?.name || 'User'

  return (
    <div className="flex h-screen w-64 flex-col bg-gradient-to-b from-[#0d1117] via-[#080b10] to-[#050708] border-r border-white/[0.06] relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-eve-accent/[0.08] via-transparent to-transparent opacity-50 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-[200px] bg-gradient-to-b from-eve-accent/[0.03] to-transparent pointer-events-none" />
      
      <div className="relative flex h-16 items-center gap-3 border-b border-white/[0.06] px-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#1a1f2e] via-[#151a24] to-[#0d1117] border border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)]">
          <span className="text-xl font-black bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent" title="Easy Eve Holding's">E</span>
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-bold text-white tracking-tight">Easy <span className="text-eve-accent">Eve</span></span>
          <span className="text-[10px] font-medium text-white/40 tracking-widest uppercase">Dashboard</span>
        </div>
      </div>

      <nav className="relative flex-1 space-y-6 p-4 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/[0.08] [&::-webkit-scrollbar-thumb]:rounded-full">
        <div className="space-y-3">
          <span className="text-[10px] font-bold text-white/[0.25] tracking-[0.2em] uppercase px-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-eve-accent/60" />
            {sectionLabels.main}
          </span>
          <div className="space-y-1.5">
            {navigation.map((item) => {
              const hasChildren = item.children && item.children.length > 0
              const isOpen = openMenus.includes(item.name)
              const isActive = item.href ? pathname === item.href : item.children?.some(child => pathname === child.href)

              if (hasChildren) {
                return (
                  <div key={item.name} className="space-y-1.5">
                    <button
                      onClick={() => toggleMenu(item.name)}
                      className={cn(
                        'group flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ease-out',
                        isActive && !isOpen
                          ? 'bg-gradient-to-r from-eve-accent/15 to-transparent text-eve-accent border-l-[2.5px] border-eve-accent ml-[-2px] pl-[13px] shadow-[0_0_25px_-8px_rgba(0,200,255,0.35)]'
                          : 'text-white/[0.55] hover:bg-white/[0.06] hover:text-white hover:scale-[1.02] hover:shadow-[0_0_20px_-5px_rgba(255,255,255,0.08)]'
                      )}
                    >
                      <div className="flex items-center gap-3.5">
                        <item.icon className={cn("h-5 w-5 transition-all duration-200", isActive && !isOpen ? "text-eve-accent" : "group-hover:text-eve-accent/70")} />
                        <span className={cn("transition-colors duration-200", !hasPremium && item.name === 'Fit Management' && "text-white/[0.3]")}>
                          {item.name}
                        </span>
                        {!hasPremium && item.name === 'Fit Management' && (
                          <Lock className="h-3.5 w-3.5 text-eve-accent/40" />
                        )}
                      </div>
                      <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")} />
                    </button>
                    <div className={cn(
                      "overflow-hidden transition-all duration-300 ease-out",
                      isOpen ? "max-h-48 opacity-100 ml-4 mt-1" : "max-h-0 opacity-0"
                    )}>
                      <div className="space-y-1 border-l border-white/[0.08] ml-2.5 pl-2.5">
                        {item.children?.map((child) => {
                          const isChildActive = pathname === child.href
                          const isRestricted = !hasPremium && item.name === 'Fit Management'
                          
                          if (isRestricted) {
                            return (
                              <div
                                key={child.name}
                                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-white/[0.25] cursor-not-allowed"
                              >
                                {child.name}
                                <Lock className="h-3 w-3 text-white/[0.15]" />
                              </div>
                            )
                          }

                          return (
                            <Link
                              key={child.name}
                              href={child.href}
                              className={cn(
                                "block rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                isChildActive
                                  ? "text-eve-accent bg-eve-accent/[0.1] border-l-[2px] border-eve-accent ml-[-2px] pl-[14px]"
                                  : "text-white/[0.45] hover:text-white hover:bg-white/[0.05] hover:pl-4"
                              )}
                            >
                              {child.name}
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              }

              return (
                <Link
                  key={item.name}
                  href={item.href!}
                  title={item.name}
                  className={cn(
                    "group flex items-center gap-3.5 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ease-out",
                    isActive
                      ? "bg-gradient-to-r from-eve-accent/15 to-transparent text-eve-accent border-l-[2.5px] border-eve-accent ml-[-2px] pl-[13px] shadow-[0_0_25px_-8px_rgba(0,200,255,0.35)]"
                      : "text-white/[0.55] hover:bg-white/[0.06] hover:text-white hover:scale-[1.02] hover:shadow-[0_0_20px_-5px_rgba(255,255,255,0.08)]"
                  )}
                >
                  <item.icon className={cn("h-5 w-5 transition-all duration-200", isActive && "text-eve-accent group-hover:text-eve-accent")} />
                  {item.name}
                </Link>
              )
            })}
          </div>
        </div>
        
        <div className="space-y-3">
          <span className="text-[10px] font-bold text-white/[0.25] tracking-[0.2em] uppercase px-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-eve-accent2/60" />
            {sectionLabels.subscription}
          </span>
          <div className="space-y-1.5 p-2 rounded-xl bg-gradient-to-br from-white/[0.02] to-transparent border border-white/[0.04]">
            <Link
              href={subscriptionItem.href}
              className={cn(
                "group flex items-center gap-3.5 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ease-out border border-transparent",
                pathname === subscriptionItem.href
                  ? "bg-gradient-to-r from-eve-accent2/20 to-transparent text-eve-accent2 border-eve-accent2/30 border-l-[2.5px] border-l-eve-accent2 ml-[-2px] pl-[13px] shadow-[0_0_25px_-8px_rgba(255,200,0,0.25)]"
                  : "text-eve-accent2/60 hover:bg-eve-accent2/10 hover:text-eve-accent2 hover:scale-[1.02] hover:shadow-[0_0_20px_-5px_rgba(255,200,0,0.12)]"
              )}
            >
              <subscriptionItem.icon className={cn("h-5 w-5 transition-all duration-200", pathname === subscriptionItem.href ? "text-eve-accent2" : "group-hover:text-eve-accent2/80")} />
              {subscriptionItem.name}
            </Link>
          </div>
        </div>

        {session?.user?.role === 'master' && (
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-white/[0.25] tracking-[0.2em] uppercase px-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400/60" />
              Admin
            </span>
            <div className="space-y-1.5">
              <Link
                href="/dashboard/admin"
                className={cn(
                  "group flex items-center gap-3.5 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ease-out",
                  pathname === '/dashboard/admin'
                    ? "bg-gradient-to-r from-red-500/15 to-transparent text-red-400 border-l-[2.5px] border-red-400 ml-[-2px] pl-[13px] shadow-[0_0_25px_-8px_rgba(255,50,50,0.25)]"
                    : "text-red-400/60 hover:bg-red-500/10 hover:text-red-400 hover:scale-[1.02] hover:shadow-[0_0_20px_-5px_rgba(255,50,50,0.1)]"
                )}
              >
                <Shield className="h-5 w-5 transition-all duration-200" />
                Admin Panel
              </Link>
            </div>
          </div>
        )}
      </nav>

      <div className="relative border-t border-white/[0.06] p-4 space-y-3">
        <span className="text-[10px] font-bold text-white/[0.25] tracking-[0.2em] uppercase px-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400/60" />
          {sectionLabels.quickLinks}
        </span>
        
        <div className="grid grid-cols-2 gap-2">
          {quickLinks.map((item) => (
            item.external ? (
              <a
                key={item.name}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-white/[0.55] transition-all duration-200 ease-out hover:bg-white/[0.06] hover:text-[#5865F2] hover:scale-[1.02] hover:shadow-[0_0_15px_-5px_rgba(88,101,242,0.15)]"
              >
                <MessageCircle className="h-5 w-5 transition-all duration-200 group-hover:fill-[#5865F2]/20" />
                <span className="truncate">{item.name}</span>
              </a>
            ) : (
              <Link
                key={item.name}
                href={item.href}
                className="group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-white/[0.55] transition-all duration-200 ease-out hover:bg-white/[0.06] hover:text-white hover:scale-[1.02] hover:shadow-[0_0_15px_-5px_rgba(255,255,255,0.08)]"
              >
                <item.icon className="h-5 w-5 transition-all duration-200 group-hover:text-eve-accent/80" />
                <span className="truncate">{item.name}</span>
              </Link>
            )
          ))}
        </div>
      </div>

      <div className="relative border-t border-white/[0.06] p-3 bg-gradient-to-b from-transparent to-black/20">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="group flex w-full items-center gap-3 rounded-xl bg-white/[0.03] p-2.5 text-sm font-medium text-white/80 transition-all duration-200 hover:bg-white/[0.06] hover:text-white hover:scale-[1.01] hover:shadow-[0_0_20px_-5px_rgba(255,255,255,0.06)] border border-white/[0.04]">
              <Avatar className="h-10 w-10 ring-2 ring-white/[0.08] transition-all duration-200 group-hover:ring-eve-accent/40 group-hover:shadow-[0_0_15px_rgba(0,200,255,0.2)]">
                <AvatarImage src={session?.user?.characterId ? `https://images.evetech.net/characters/${session.user.characterId}/portrait?size=32` : ''} />
                <AvatarFallback className="bg-white/[0.08] text-white/[0.6]">{characterName[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {characterName}
                </p>
                <p className="text-xs text-white/[0.35]">
                  {session?.user?.characters?.length || 0} character{(session?.user?.characters?.length || 0) !== 1 ? 's' : ''}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-white/[0.35] group-hover:text-white/[0.6] transition-colors duration-200" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-[#0d1117]/95 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <DropdownMenuLabel className="text-white/[0.5] font-normal">My Account</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/[0.08]" />
            {session?.user?.characters?.map((char) => (
              <DropdownMenuItem key={char.id} className="text-white/[0.6] focus:bg-white/[0.08] focus:text-white cursor-pointer">
                <Avatar className="mr-2 h-6 w-6">
                  <AvatarImage src={`https://images.evetech.net/characters/${char.id}/portrait?size=32`} />
                  <AvatarFallback className="bg-white/[0.08] text-white/[0.5] text-xs">{char.name[0]}</AvatarFallback>
                </Avatar>
                {char.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-white/[0.08]" />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-red-400/70 focus:bg-red-500/[0.1] focus:text-red-400 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
