import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { formatSP, formatISK } from '@/lib/utils'
import { 
  Users, 
  Wallet, 
  Zap, 
  TrendingUp,
  MapPin,
  Ship,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  MessageSquare,
  Info
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getSession } from '@/lib/session'
import { getCharacterNotifications, getCharacterWalletJournal } from '@/lib/sde'

async function getCharacterDetails(charId: number) {
  const response = await fetch(`https://esi.evetech.net/latest/characters/${charId}/`, {
    next: { revalidate: 60 },
  })
  
  if (!response.ok) return null
  return response.json()
}

export default async function DashboardPage() {
  const session = await getSession()
  
  if (!session?.user?.id) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      characters: {
        orderBy: { totalSp: 'desc' }
      }
    }
  })

  const characters: Array<{ id: number; name: string; totalSp: number; walletBalance: number; location: string | null; ship: string | null }> = user?.characters || []
  const mainCharacter = characters[0]

  const totalSP = characters.reduce((sum: number, c: { totalSp: number }) => sum + c.totalSp, 0)
  const totalWallet = characters.reduce((sum: number, c: { walletBalance: number }) => sum + c.walletBalance, 0)

  // Fetch activity (notifications & journal)
  const activityPromises = characters.map(async (char) => {
    const [notifs, journal] = await Promise.all([
      getCharacterNotifications(char.id, char.id),
      getCharacterWalletJournal(char.id, char.id)
    ])
    
    const mappedNotifs = Array.isArray(notifs) ? notifs.map(n => ({
      id: `notif-${n.notification_id}`,
      type: 'notification',
      subType: n.type,
      timestamp: n.timestamp,
      characterName: char.name,
      characterId: char.id
    })) : []

    const mappedJournal = Array.isArray(journal) ? journal
      .filter((entry: any) => entry.ref_type === 'bounty_prizes' || entry.ref_type === 'bounty_prize')
      .map((entry: any) => ({
        id: `journal-${entry.id}`,
        type: 'bounty',
        subType: entry.ref_type,
        timestamp: entry.date,
        amount: entry.amount,
        characterName: char.name,
        characterId: char.id
      })) : []
      
    return [...mappedNotifs, ...mappedJournal]
  })

  const activityResults = await Promise.allSettled(activityPromises)
  const allActivity = activityResults
    .filter((r): r is PromiseFulfilledResult<any[]> => r.status === 'fulfilled')
    .flatMap(r => r.value)
    
  allActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  const recentActivity = allActivity.slice(0, 30)

  const timeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays}d ${diffInHours % 24}h ago`;
    return date.toLocaleDateString();
  }

  const getActivityIcon = (item: any) => {
    if (item.type === 'bounty') return <Wallet className="h-4 w-4 text-green-400" />
    
    const typeArgs = item.subType || ''
    if (typeArgs.includes('ContactAdd')) return <Users className="h-4 w-4 text-blue-400" />
    if (typeArgs.includes('Structure') || typeArgs.includes('Loss')) return <ArrowDownRight className="h-4 w-4 text-red-400" />
    if (typeArgs.includes('Skill')) return <Clock className="h-4 w-4 text-purple-400" />
    if (typeArgs.includes('Corp') || typeArgs.includes('CharAppAccept')) return <Users className="h-4 w-4 text-green-400" />
    return <Info className="h-4 w-4 text-gray-400" />
  }

  const getActivityColor = (item: any) => {
    if (item.type === 'bounty') return 'bg-green-500/20'

    const typeArgs = item.subType || ''
    if (typeArgs.includes('ContactAdd')) return 'bg-blue-500/20'
    if (typeArgs.includes('Structure') || typeArgs.includes('Loss')) return 'bg-red-500/20'
    if (typeArgs.includes('Skill')) return 'bg-purple-500/20'
    if (typeArgs.includes('Corp') || typeArgs.includes('CharAppAccept')) return 'bg-green-500/20'
    return 'bg-gray-500/20'
  }

  const getActivityTitle = (item: any) => {
    if (item.type === 'bounty') return `Bounty Claimed (+${formatISK(item.amount)})`
    return (item.subType || '').replace(/([A-Z])/g, ' $1').trim()
  }

  const stats = [
    {
      title: 'Total SP',
      value: formatSP(totalSP),
      icon: Zap,
      description: `${characters.length} characters`,
      color: 'text-eve-accent'
    },
    {
      title: 'Total ISK',
      value: formatISK(totalWallet),
      icon: Wallet,
      description: 'Across all characters',
      color: 'text-green-400'
    },
    {
      title: 'Characters',
      value: characters.length.toString(),
      icon: Users,
      description: 'Linked accounts',
      color: 'text-blue-400'
    },
    {
      title: 'Efficiency',
      value: '94%',
      icon: TrendingUp,
      description: 'This week',
      color: 'text-eve-accent2'
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400">Welcome back, {mainCharacter?.name || 'Capsuleer'}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="bg-eve-panel border-eve-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <p className="text-xs text-gray-500">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-eve-panel border-eve-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Your Characters</CardTitle>
            <Link href="/dashboard/characters">
              <Button variant="outline" size="sm" className="border-eve-border">
                Manage
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {characters.length === 0 ? (
              <p className="text-gray-500">No characters linked yet.</p>
            ) : (
              characters.map((char) => (
                <div
                  key={char.id}
                  className="flex items-center gap-4 rounded-lg border border-eve-border bg-eve-dark/50 p-4"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={`https://images.evetech.net/characters/${char.id}/portrait?size=128`} />
                    <AvatarFallback>{char.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-white">{char.name}</h3>
                      {char.id === mainCharacter?.id && (
                        <Badge variant="eve" className="text-xs">Main</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        {formatSP(char.totalSp)}
                      </span>
                      {char.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {char.location}
                        </span>
                      )}
                      {char.ship && (
                        <span className="flex items-center gap-1">
                          <Ship className="h-3 w-3" />
                          {char.ship}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-green-400">
                      {formatISK(char.walletBalance)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Wallet
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-eve-panel border-eve-border">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/dashboard/fleet" className="block">
              <div className="flex items-center justify-between rounded-lg border border-eve-border bg-eve-dark/50 p-4 transition-colors hover:bg-eve-dark">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-eve-accent/20">
                    <Users className="h-5 w-5 text-eve-accent" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Fleet Calculator</h3>
                    <p className="text-sm text-gray-400">Calculate fleet profits</p>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-gray-500" />
              </div>
            </Link>

            <Link href="/dashboard/mining" className="block">
              <div className="flex items-center justify-between rounded-lg border border-eve-border bg-eve-dark/50 p-4 transition-colors hover:bg-eve-dark">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                    <TrendingUp className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Track Mining</h3>
                    <p className="text-sm text-gray-400">Log your mining sessions</p>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-gray-500" />
              </div>
            </Link>

            <Link href="/dashboard/fits" className="block">
              <div className="flex items-center justify-between rounded-lg border border-eve-border bg-eve-dark/50 p-4 transition-colors hover:bg-eve-dark">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
                    <Ship className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Manage Fits</h3>
                    <p className="text-sm text-gray-400">Create and save ship fits</p>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-gray-500" />
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-eve-panel border-eve-border">
        <CardHeader>
          <CardTitle className="text-white">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.length === 0 ? (
              <p className="text-gray-500 text-sm">No recent activity.</p>
            ) : (
              recentActivity.map((activity: any) => (
                <div key={activity.id} className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm p-2 hover:bg-eve-dark/50 rounded-md transition-colors">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${getActivityColor(activity)}`}>
                    {getActivityIcon(activity)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`truncate font-medium ${activity.type === 'bounty' ? 'text-green-400' : 'text-white'}`}>
                      {getActivityTitle(activity)}
                    </p>
                    <p className="text-xs text-eve-accent font-medium mt-0.5">
                      {activity.characterName}
                    </p>
                  </div>
                  <div className="text-right shrink-0 mt-1 sm:mt-0">
                    <span className="text-gray-500 text-xs">{timeAgo(activity.timestamp)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
