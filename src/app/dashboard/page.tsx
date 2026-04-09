import { prisma } from '@/lib/prisma'
export const dynamic = 'force-dynamic'
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
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  MessageSquare,
  Info
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getSession } from '@/lib/session'
import { getCharacterWalletJournal } from '@/lib/esi'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LeaderboardList } from '@/components/dashboard/LeaderboardList'

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

  const getStartOfDay = (date: Date) => {
    const d = new Date(date)
    d.setUTCHours(0, 0, 0, 0)
    return d
  }

  const getStartOfWeek = (date: Date) => {
    const d = new Date(date)
    const day = d.getUTCDay()
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1)
    d.setUTCDate(diff)
    d.setUTCHours(0, 0, 0, 0)
    return d
  }

  const getStartOfMonth = (date: Date) => {
    const d = new Date(date)
    d.setUTCDate(1)
    d.setUTCHours(0, 0, 0, 0)
    return d
  }

  const now = new Date()

  const [dailyLeaderboard, weeklyLeaderboard, monthlyLeaderboard] = await Promise.all([
    prisma.activity.findMany({
      where: {
        type: 'RATTING',
        startTime: { gte: getStartOfDay(now) }
      },
      select: {
        id: true,
        data: true,
        startTime: true,
        user: {
          select: {
            id: true,
            characters: {
              where: { isMain: true },
              select: { id: true, name: true }
            }
          }
        }
      }
    }),
    prisma.activity.findMany({
      where: {
        type: 'RATTING',
        startTime: { gte: getStartOfWeek(now) }
      },
      select: {
        id: true,
        data: true,
        startTime: true,
        user: {
          select: {
            id: true,
            characters: {
              where: { isMain: true },
              select: { id: true, name: true }
            }
          }
        }
      }
    }),
    prisma.activity.findMany({
      where: {
        type: 'RATTING',
        startTime: { gte: getStartOfMonth(now) }
      },
      select: {
        id: true,
        data: true,
        startTime: true,
        user: {
          select: {
            id: true,
            characters: {
              where: { isMain: true },
              select: { id: true, name: true }
            }
          }
        }
      }
    })
  ])

  const calculateTotalTracking = (activities: any[]) => {
    return activities.reduce((sum: number, a: any) => {
      const bounty = a.data?.totalBounty || a.data?.automatedBounties || 0
      return sum + Number(bounty)
    }, 0)
  }

  const aggregateByUser = (activities: any[]) => {
    const grouped: Record<string, { userId: string; total: number; characterName: string }> = {}
    for (const a of activities) {
      const userId = a.user.id
      const mainChar = a.user.characters[0]
      if (!grouped[userId]) {
        grouped[userId] = {
          userId,
          total: 0,
          characterName: mainChar?.name || 'Unknown'
        }
      }
      const bounty = a.data?.totalBounty || a.data?.automatedBounties || 0
      grouped[userId].total += Number(bounty)
    }
    return Object.values(grouped).sort((a, b) => b.total - a.total).slice(0, 5)
  }

  const dailyStats = aggregateByUser(dailyLeaderboard)
  const weeklyStats = aggregateByUser(weeklyLeaderboard)
  const monthlyStats = aggregateByUser(monthlyLeaderboard)

  const characters: Array<{ id: number; name: string; totalSp: number; walletBalance: number; location: string | null; ship: string | null }> = user?.characters || []
  const mainCharacter = characters[0]

  const totalSP = characters.reduce((sum: number, c: { totalSp: number }) => sum + c.totalSp, 0)
  const totalWallet = characters.reduce((sum: number, c: { walletBalance: number }) => sum + c.walletBalance, 0)

  // Removed legacy wallet journal fetching to optimize dashboard performance
  const recentActivity: any[] = []
  
  const getActivityTitle = (activity: any) => {
    return 'Transaction'
  }
  
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

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-eve-panel border-eve-border lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Your Characters</CardTitle>
            <Link href="/dashboard/characters">
              <Button variant="outline" size="sm" className="border-eve-border">
                Manage
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {characters.length === 0 ? (
              <p className="text-gray-500">No characters linked yet.</p>
            ) : (
              characters.map((char) => (
                <div
                  key={char.id}
                  className="flex items-center gap-3 rounded-lg border border-eve-border bg-eve-dark/50 p-3"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={`https://images.evetech.net/characters/${char.id}/portrait?size=128`} />
                    <AvatarFallback>{char.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-white text-sm">{char.name}</h3>
                      {char.id === mainCharacter?.id && (
                        <Badge variant="eve" className="text-[10px]">Main</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
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
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Ratting Leaderboard</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Tabs defaultValue="daily" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-eve-dark h-8">
                <TabsTrigger value="daily" className="text-[10px] h-6">D</TabsTrigger>
                <TabsTrigger value="weekly" className="text-[10px] h-6">W</TabsTrigger>
                <TabsTrigger value="monthly" className="text-[10px] h-6">M</TabsTrigger>
              </TabsList>
              
              <TabsContent value="daily">
                <LeaderboardList data={dailyStats} />
              </TabsContent>
              <TabsContent value="weekly">
                <LeaderboardList data={weeklyStats} />
              </TabsContent>
              <TabsContent value="monthly">
                <LeaderboardList data={monthlyStats} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-eve-panel border-eve-border">
        <CardHeader>
          <CardTitle className="text-white">Wallet Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.length === 0 ? (
              <p className="text-gray-500 text-sm">No recent transactions.</p>
            ) : (
              recentActivity.map((activity: any) => (
                <div key={activity.id} className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm p-2 hover:bg-eve-dark/50 rounded-md transition-colors">
                  <Avatar className="h-10 w-10 shrink-0 border border-eve-border">
                    <AvatarImage src={`https://images.evetech.net/characters/${activity.characterId}/portrait?size=64`} />
                    <AvatarFallback>{activity.characterName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className={`truncate font-medium ${activity.amount > 0 ? 'text-green-400' : activity.amount < 0 ? 'text-red-400' : 'text-gray-400'}`}>
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
