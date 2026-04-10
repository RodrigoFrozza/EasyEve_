import { prisma } from '@/lib/prisma'
export const dynamic = 'force-dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { formatSP, formatISK, timeAgo } from '@/lib/utils'
import { TimeAgo } from '@/components/time-ago'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LeaderboardWrapper } from '@/components/dashboard/LeaderboardWrapper'
import { withCache } from '@/lib/cache'
import { 
  startOfDay, 
  startOfWeek, 
  startOfMonth 
} from 'date-fns'

interface RattingData {
  automatedBounties?: number
  automatedEss?: number
}

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

  const now = new Date()

  async function getStartDateForPeriod(period: 'daily' | 'weekly' | 'monthly' | 'alltime', baseDate: Date): Promise<Date> {
    if (period === 'alltime') {
      const earliestActivity = await prisma.activity.findFirst({
        orderBy: { startTime: 'asc' },
        select: { startTime: true }
      })
      return earliestActivity?.startTime || new Date('2024-01-01')
    }
    if (period === 'daily') return startOfDay(baseDate)
    if (period === 'weekly') return startOfWeek(baseDate, { weekStartsOn: 1 })
    return startOfMonth(baseDate)
  }

  const getLeaderboard = async (period: 'daily' | 'weekly' | 'monthly' | 'alltime') => {
    const startDate = await getStartDateForPeriod(period, now)

    return withCache(`leaderboard_${period}`, async () => {
      const activities = await prisma.activity.findMany({
        where: {
          type: 'ratting',
          startTime: { gte: startDate }
        },
        include: {
          user: {
            include: {
              characters: {
                where: { isMain: true },
                select: { id: true, name: true }
              }
            }
          }
        }
      })

      const grouped: Record<string, { userId: string; bounty: number; ess: number; total: number; characterName: string; characterId: number }> = {}
      for (const a of activities) {
        const userId = a.user.id
        const mainChar = a.user.characters[0]
        if (!grouped[userId]) {
          grouped[userId] = {
            userId,
            bounty: 0,
            ess: 0,
            total: 0,
            characterName: mainChar?.name || 'Unknown Capsuleer',
            characterId: mainChar?.id || 0
          }
        }
        const activityData = a.data as RattingData | null
        const actBounty = Number(activityData?.automatedBounties || 0)
        const actEss = Number(activityData?.automatedEss || 0)
        grouped[userId].bounty += actBounty
        grouped[userId].ess += actEss
        grouped[userId].total += actBounty + actEss
      }
      return Object.values(grouped).sort((a, b) => b.total - a.total).slice(0, 10)
    }, 60 * 1000) // 1 min cache
  }

  const [dailyStats, weeklyStats, monthlyStats, allTimeStats] = await Promise.all([
    getLeaderboard('daily'),
    getLeaderboard('weekly'),
    getLeaderboard('monthly'),
    getLeaderboard('alltime')
  ])

  const characters: Array<{ id: number; name: string; totalSp: number; walletBalance: number; location: string | null; ship: string | null }> = user?.characters || []
  const mainCharacter = characters[0]

  const totalSP = characters.reduce((sum: number, c: { totalSp: number }) => sum + c.totalSp, 0)
  const totalWallet = characters.reduce((sum: number, c: { walletBalance: number }) => sum + c.walletBalance, 0)

  // Removed legacy wallet journal fetching to optimize dashboard performance
  const recentActivity: any[] = []
  
  const getActivityTitle = (activity: any) => {
    return 'Transaction'
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

        <Card className="bg-eve-panel border-eve-border overflow-hidden">
          <CardHeader className="p-3 border-b border-white/5 bg-white/[0.02]">
            <CardTitle className="text-white text-xs uppercase tracking-widest font-black flex items-center gap-2">
              <TrendingUp className="h-3 w-3 text-cyan-400" />
              Ratting Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue="daily" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-transparent h-9 border-b border-white/5 rounded-none p-0">
                <TabsTrigger value="daily" className="text-[9px] font-bold uppercase tracking-tighter data-[state=active]:bg-white/5 data-[state=active]:text-cyan-400 rounded-none h-full">Daily</TabsTrigger>
                <TabsTrigger value="weekly" className="text-[9px] font-bold uppercase tracking-tighter data-[state=active]:bg-white/5 data-[state=active]:text-cyan-400 rounded-none h-full">Weekly</TabsTrigger>
                <TabsTrigger value="monthly" className="text-[9px] font-bold uppercase tracking-tighter data-[state=active]:bg-white/5 data-[state=active]:text-cyan-400 rounded-none h-full">Monthly</TabsTrigger>
                <TabsTrigger value="alltime" className="text-[9px] font-bold uppercase tracking-tighter data-[state=active]:bg-white/5 data-[state=active]:text-cyan-400 rounded-none h-full">All-Time</TabsTrigger>
              </TabsList>
              
              <div className="p-2">
              
              <TabsContent value="daily">
                <LeaderboardWrapper initialData={dailyStats} currentUserId={session?.user?.id} period="daily" refreshInterval={60000} />
              </TabsContent>
              <TabsContent value="weekly">
                <LeaderboardWrapper initialData={weeklyStats} currentUserId={session?.user?.id} period="weekly" refreshInterval={60000} />
              </TabsContent>
              <TabsContent value="monthly">
                <LeaderboardWrapper initialData={monthlyStats} currentUserId={session?.user?.id} period="monthly" refreshInterval={60000} />
              </TabsContent>
              <TabsContent value="alltime">
                <LeaderboardWrapper initialData={allTimeStats} currentUserId={session?.user?.id} period="alltime" refreshInterval={60000} />
              </TabsContent>
              </div>
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
                    <TimeAgo date={activity.timestamp} className="text-gray-500 text-xs" />
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
