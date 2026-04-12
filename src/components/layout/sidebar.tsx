'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut as clientSignOut } from '@/lib/session-client'
import { cn } from '@/lib/utils'
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

const adminNavigation = [
  { name: 'Admin', href: '/dashboard/admin', icon: Shield },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [openMenus, setOpenMenus] = useState<string[]>(['Fit Management'])

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
                  </div>
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                {isOpen && (
                  <div className="ml-9 space-y-1">
                    {item.children?.map((child) => {
                      const isChildActive = pathname === child.href
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

        {session?.user?.role === 'master' && (
          <div className="pt-4 mt-4 border-t border-eve-border">
            {adminNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-eve-accent/20 text-eve-accent'
                      : 'text-eve-accent hover:bg-eve-accent/10 hover:text-eve-accent'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      <div className="border-t border-eve-border p-4">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-eve-panel hover:text-white"
        >
          <Settings className="h-5 w-5" />
          Settings
        </Link>
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
