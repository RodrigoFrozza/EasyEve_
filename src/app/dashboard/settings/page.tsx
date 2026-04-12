import { prisma } from '@/lib/prisma'
export const dynamic = 'force-dynamic'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { Settings, User, Bell, Shield, Database, Palette, Link2, Globe } from 'lucide-react'
import { getSession } from '@/lib/session'
import { getTranslations } from '@/i18n/server'
import { DataManagement } from '@/components/settings/DataManagement'
import { LanguageSelector } from '@/components/settings/LanguageSelectorClient'

export default async function SettingsPage() {
  const { t } = await getTranslations()
  const session = await getSession()

  const user = session?.user ? await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { characters: true }
  }) : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">{t('settings.title')}</h1>
        <p className="text-gray-400">{t('settings.manageAccount')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-eve-panel border-eve-border">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <User className="h-5 w-5 text-eve-accent" />
                {t('settings.profile')}
              </CardTitle>
              <CardDescription>{t('settings.profileDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={session?.user?.characterId ? `https://images.evetech.net/characters/${session.user.characterId}/portrait?size=128` : ''} />
                  <AvatarFallback>{(user?.characters[0]?.name || 'U')[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-medium text-white">{user?.characters[0]?.name || t('settings.capsuleer')}</h3>
                  <p className="text-sm text-gray-400">
                    {t('settings.linkedCharactersCount', { count: user?.characters?.length || 0 })}
                  </p>
                </div>
              </div>

              <Separator className="bg-eve-border" />

              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">{t('settings.emailNotifications')}</p>
                    <p className="text-sm text-gray-400">{t('settings.emailNotificationsDesc')}</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">{t('settings.skillQueueAlerts')}</p>
                    <p className="text-sm text-gray-400">{t('settings.skillQueueAlertsDesc')}</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">{t('settings.marketPriceAlerts')}</p>
                    <p className="text-sm text-gray-400">{t('settings.marketPriceAlertsDesc')}</p>
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
                {t('settings.security')}
              </CardTitle>
              <CardDescription>{t('settings.securityDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{t('settings.activeCharacters')}</p>
                  <p className="text-sm text-gray-400">{t('settings.activeCharactersDesc')}</p>
                </div>
                <Badge variant="secondary">{user?.characters?.length || 0}</Badge>
              </div>

              <Separator className="bg-eve-border" />

              <div>
                <h4 className="font-medium text-white mb-2">{t('settings.linkedCharactersTitle')}</h4>
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
                        {t('settings.remove')}
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
                {t('settings.appearance')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">{t('settings.theme')}</span>
                <Badge variant="eve">{t('settings.darkEveStyle')}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">{t('settings.accentColor')}</span>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full bg-[#00d4ff]" />
                  <span className="text-sm text-white">{t('settings.cyan')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-eve-panel border-eve-border">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Globe className="h-5 w-5 text-eve-accent" />
                {t('settings.language')}
              </CardTitle>
              <CardDescription>{t('settings.languageDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <LanguageSelector />
            </CardContent>
          </Card>

          <Card className="bg-eve-panel border-eve-border">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Database className="h-5 w-5 text-eve-accent" />
                {t('settings.dataManagement')}
              </CardTitle>
              <CardDescription>{t('settings.dataManagementDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <DataManagement />
            </CardContent>
          </Card>

          <Card className="bg-eve-panel border-eve-border">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Link2 className="h-5 w-5 text-eve-accent" />
                {t('settings.connectedServices')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">EVE Online ESI</span>
                <Badge variant="success">{t('settings.esiConnected')}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">zKillboard</span>
                <Badge variant="secondary">{t('settings.esiNotConnected')}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Discord</span>
                <Badge variant="secondary">{t('settings.esiNotConnected')}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}