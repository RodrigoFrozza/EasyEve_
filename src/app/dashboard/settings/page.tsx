import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { Settings, User, Bell, Shield, Database, Palette, Link2 } from 'lucide-react'
import { getSession } from '@/lib/session'

export default async function SettingsPage() {
  const session = await getSession()

  const user = session?.user ? await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { characters: true }
  }) : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-gray-400">Manage your account and preferences</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-eve-panel border-eve-border">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <User className="h-5 w-5 text-eve-accent" />
                Profile
              </CardTitle>
              <CardDescription>Your EVE Online account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={session?.user?.characterId ? `https://images.evetech.net/characters/${session.user.characterId}/portrait?size=128` : ''} />
                  <AvatarFallback>{(user?.characters[0]?.name || 'U')[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-medium text-white">{user?.characters[0]?.name || 'Capsuleer'}</h3>
                  <p className="text-sm text-gray-400">
                    {user?.characters?.length || 0} linked characters
                  </p>
                </div>
              </div>

              <Separator className="bg-eve-border" />

              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">Email Notifications</p>
                    <p className="text-sm text-gray-400">Receive updates about your activities</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">Skill Queue Alerts</p>
                    <p className="text-sm text-gray-400">Get notified when skills complete</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">Market Price Alerts</p>
                    <p className="text-sm text-gray-400">Notifications for price changes</p>
                  </div>
                  <Switch />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-eve-panel border-eve-border">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-eve-accent" />
                Security
              </CardTitle>
              <CardDescription>Manage your account security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Active Characters</p>
                  <p className="text-sm text-gray-400">Characters linked to your account</p>
                </div>
                <Badge variant="secondary">{user?.characters?.length || 0}</Badge>
              </div>

              <Separator className="bg-eve-border" />

              <div>
                <h4 className="font-medium text-white mb-2">Linked Characters</h4>
                <div className="space-y-2">
                  {user?.characters?.map((char) => (
                    <div key={char.id} className="flex items-center justify-between p-2 rounded-lg bg-eve-dark/50">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={`https://images.evetech.net/characters/${char.id}/portrait?size=32`} />
                          <AvatarFallback>{char.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-white">{char.name}</p>
                          <p className="text-xs text-gray-500">ID: {char.id}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-eve-panel border-eve-border">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Palette className="h-5 w-5 text-eve-accent" />
                Appearance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Theme</span>
                <Badge variant="eve">Dark (EVE Style)</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Accent Color</span>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full bg-[#00d4ff]" />
                  <span className="text-sm text-white">Cyan</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-eve-panel border-eve-border">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Database className="h-5 w-5 text-eve-accent" />
                Data Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start border-eve-border">
                Export Data
              </Button>
              <Button variant="outline" className="w-full justify-start border-eve-border">
                Import Data
              </Button>
              <Button variant="outline" className="w-full justify-start border-red-500/50 text-red-400 hover:bg-red-500/10">
                Delete All Data
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-eve-panel border-eve-border">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Link2 className="h-5 w-5 text-eve-accent" />
                Connected Services
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">EVE Online ESI</span>
                <Badge variant="success">Connected</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">zKillboard</span>
                <Badge variant="secondary">Not Connected</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Discord</span>
                <Badge variant="secondary">Not Connected</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
