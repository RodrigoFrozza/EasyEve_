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
    <div className="flex h-screen w-64 flex-col bg-eve-dark border-r border-eve-border">
      <div className="flex h-16 items-center gap-2 border-b border-eve-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-eve-accent">
          <span className="text-lg font-bold text-black" title="Easy Eve Holding's">E</span>
        </div>
        <span className="text-xl font-bold text-white tracking-tight">Easy <span className="text-eve-accent">Eve</span></span>
      </div>

      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
        {navigation.map((item) => {
          const hasChildren = item.children && item.children.length > 0
          const isOpen = openMenus.includes(item.name)
          const isActive = item.href ? pathname === item.href : item.children?.some(child => pathname === child.href)

          if (hasChildren) {
            return (
              <div key={item.name} className="space-y-1">
                <button
                  onClick={() => toggleMenu(item.name)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive && !isOpen
                      ? 'bg-eve-accent/20 text-eve-accent'
                      : 'text-gray-400 hover:bg-eve-panel hover:text-white'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5" />
                    {item.name}
                    {!hasPremium && item.name === 'Fit Management' && (
                      <Lock className="h-3 w-3 text-eve-accent/50" />
                    )}
                  </div>
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                {isOpen && (
                  <div className="ml-9 space-y-1">
                    {item.children?.map((child) => {
                      const isChildActive = pathname === child.href
                      const isRestricted = !hasPremium && item.name === 'Fit Management'
                      
                      if (isRestricted) {
                        return (
                          <div
                            key={child.name}
                            className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-gray-600 cursor-not-allowed"
                          >
                            {child.name}
                            <Lock className="h-3 w-3" />
                          </div>
                        )
                      }

                      return (
                        <Link
                          key={child.name}
                          href={child.href}
                          className={cn(
                            'block rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                            isChildActive
                              ? 'text-eve-accent'
                              : 'text-gray-500 hover:text-white'
                          )}
                        >
                          {child.name}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          return (
            <Link
              key={item.name}
              href={item.href!}
              title={item.name}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-eve-accent/20 text-eve-accent'
                  : 'text-gray-400 hover:bg-eve-panel hover:text-white'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
        
        <div className="pt-4 mt-4 border-t border-eve-border">
          <Link
            href={subscriptionItem.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors border border-transparent',
              pathname === subscriptionItem.href
                ? 'bg-eve-accent2/20 text-eve-accent2 border-eve-accent2/30'
                : 'text-eve-accent2 hover:bg-eve-accent2/10 hover:text-eve-accent2'
            )}
          >
            <subscriptionItem.icon className="h-5 w-5 fill-current" />
            {subscriptionItem.name}
          </Link>
        </div>
      </nav>

      <div className="border-t border-eve-border p-4">
        {session?.user?.role === 'master' && (
          <Link
            href="/dashboard/admin"
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              pathname === '/dashboard/admin'
                ? 'bg-eve-accent/20 text-eve-accent'
                : 'text-eve-accent hover:bg-eve-accent/10 hover:text-eve-accent'
            )}
          >
            <Shield className="h-5 w-5" />
            Admin
          </Link>
        )}

        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-eve-panel hover:text-white"
        >
          <Settings className="h-5 w-5" />
          Settings
        </Link>

        <a
          href={DISCORD_LINK}
          target="_blank"
          rel="noopener noreferrer"
          title="Join our Discord"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[#5865F2] transition-colors hover:bg-[#5865F2]/10 hover:text-[#5865F2]"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
        </a>
      </div>

      <div className="border-t border-eve-border p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-eve-panel hover:text-white">
              <Avatar className="h-8 w-8">
                <AvatarImage src={session?.user?.characterId ? `https://images.evetech.net/characters/${session.user.characterId}/portrait?size=32` : ''} />
                <AvatarFallback>{characterName[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-white">
                  {characterName}
                </p>
                <p className="text-xs text-gray-500">
                  {session?.user?.characters?.length || 0} characters
                </p>
              </div>
              <ChevronDown className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {session?.user?.characters?.map((char) => (
              <DropdownMenuItem key={char.id} className="text-xs">
                <Avatar className="mr-2 h-5 w-5">
                  <AvatarImage src={`https://images.evetech.net/characters/${char.id}/portrait?size=32`} />
                  <AvatarFallback>{char.name[0]}</AvatarFallback>
                </Avatar>
                {char.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-red-400 cursor-pointer"
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
