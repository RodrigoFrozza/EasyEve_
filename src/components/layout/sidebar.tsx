'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut as clientSignOut } from '@/lib/session-client'
import { cn } from '@/lib/utils'
import {
  Home,
  Users,
  Target,
  Ship,
  Settings,
  LogOut,
  ChevronDown,
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

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Characters', href: '/dashboard/characters', icon: Users },
  { name: 'Activity Tracker', href: '/dashboard/activity', icon: Target },
  { name: 'Mining', href: '/dashboard/activity?type=MINING', icon: Gem },
  { name: 'Ratting', href: '/dashboard/activity?type=RATTING', icon: Crosshair },
  { name: 'Fits', href: '/dashboard/fits', icon: Ship },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const handleSignOut = () => {
    clientSignOut()
  }

  const characterName = session?.user?.characters?.find(c => c.id === session?.user?.characterId)?.name || 'User'

  return (
    <div className="flex h-screen w-64 flex-col bg-eve-dark border-r border-eve-border">
      <div className="flex h-16 items-center gap-2 border-b border-eve-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-eve-accent">
          <span className="text-lg font-bold text-black">E</span>
        </div>
        <span className="text-xl font-bold text-white">EasyEve</span>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
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
