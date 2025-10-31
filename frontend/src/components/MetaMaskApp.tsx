// src/components/MetaMaskApp.tsx
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Wallet, Play, Square, Trash2, Heart, AlertTriangle, Settings, ChevronDown, ChevronUp, Rocket, Zap, Info, Languages, User } from 'lucide-react';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import WalletStats from './WalletStats';
import NFTMintSection from './NFTMintSection';
import { useLanguage } from '../contexts/LanguageContext';
import { createWalletClient, viemConnector } from '@farcaster/auth-client';

// Farcaster Auth client
const farcasterClient = createWalletClient({
  relay: 'https://relay.farcaster.xyz',
  ethereum: viemConnector({ rpcUrl: 'https://mainnet.base.org' })
});

interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

interface AdvancedSettings {
  gasMode: 'wallet' | 'custom';
  minGasCreateClone: number;
  minGasPing: number;
  maxFee: number;
  priority: number;
  gasBuffer: number;
}

export default function MetaMaskApp() {
  const { t, language, setLanguage } = useLanguage();

  // Farcaster auth state
  const [fcSignedIn, setFcSignedIn] = useState(false);
  const [fid, setFid] = useState<number | null>(null);
  const [username, setUsername] = useState<string>('');
  const [custodyAddress, setCustodyAddress] = useState<`0x${string}` | ''>('');

  // App states kept for UI continuity
  const [cloneCount, setCloneCount] = useState<number>(1);
  const [pingsPerClone, setPingsPerClone] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettings>({
    gasMode: 'wallet',
    minGasCreateClone: 180000,
    minGasPing: 50000,
    maxFee: 0.05,
    priority: 0.01,
    gasBuffer: 20
  });

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const now = new Date();
    setLogs(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        timestamp: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        message,
        type
      }
    ]);
  };

  const clearLogs = async () => {
    setLogs([]);
    addLog('Logs cleared', 'info');
    toast.success(t('toast.logsCleared') || 'Logs cleared');
  };

  async function signInWithFarcaster() {
    try {
      if (!custodyAddress || !custodyAddress.startsWith('0x') || custodyAddress.length !== 42) {
        toast.error('Geçerli custody adresi gir');
        return;
      }

      // Bu iki değer daha sonra .env veya server’dan gelecek
      const authKey = 'YOUR_FARCASTER_AUTH_KEY';
      const channelToken = 'YOUR_CHANNEL_TOKEN';

      const userFid = fid ?? 383612; // varsayılan senin FID
      const { message, isError, error } = farcasterClient.buildSignInMessage({
        address: custodyAddress,
        fid: userFid,
        uri: window.location.origin + '/login',
        domain: window.location.hostname,
        nonce: Math.random().toString(36).slice(2, 12)
      });

      if (isError || !message) {
        throw error ?? new Error('SIWF build failed');
      }

      // İlk aşama: kullanıcıya mesajı dış cüzdanıyla imzalat
      // Metamask kaldırıldı. Şimdilik clipboard’a kopyalatıyoruz.
      await navigator.clipboard.writeText(message);
      toast.info('Mesaj panoya kopyalandı. Dış cüzdanınla imzayı al ve imzayı gir.');

      const signature = prompt('İmzayı 0x ile yapıştır') as `0x${string}`;
      if (!signature || !signature.startsWith('0x')) {
        toast.error('İmza gerekli');
        return;
      }

      const res = await farcasterClient.authenticate({
        authKey,
        channelToken,
        message,
        signature,
        authMethod: 'authAddress',
        fid: userFid,
        username,
        bio: '',
        displayName: '',
        pfpUrl: ''
      });

      if (res.isError || res.data?.state !== 'completed') {
        throw res.error ?? new Error('Auth failed');
      }

      setFcSignedIn(true);
      setFid(res.data.fid ?? userFid);
      addLog('Farcaster sign-in completed', 'success');
      toast.success('Farcaster oturumu açıldı');
    } catch (e: any) {
      addLog(`Farcaster sign-in error: ${e?.message || e}`, 'error');
      toast.error('Farcaster oturumu açılamadı');
    }
  }

  function signOutFarcaster() {
    setFcSignedIn(false);
    setFid(null);
    setUsername('');
    addLog('Signed out from Farcaster', 'info');
  }

  // Geçici stublar: zincir işlemleri Farcaster akışına taşınana kadar pasif
  const deployRealPinger = async () => {
    toast.info('İşlem akışı Farcaster’a taşınacak. Şimdilik pasif.');
    addLog('Deploy is disabled in Farcaster-only mode', 'warning');
  };
  const startProcess = async () => {
    toast.info('İşlem akışı Farcaster’a taşınacak. Şimdilik pasif.');
    addLog('Start is disabled in Farcaster-only mode', 'warning');
  };
  const stopProcess = () => {
    setIsProcessing(false);
    addLog('Process stopped by user', 'warning');
  };

  const getLogTypeColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800';
      case 'error': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800';
      case 'warning': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800';
      default: return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-6">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">
            {t('header.title')}
          </h1>

          {/* Language Selector - Button Group */}
          <div className="flex justify-center gap-2 mb-4">
            <Button
              variant={language === 'en' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLanguage('en')}
              className="min-w-[100px]"
            >
              {t('language.english')}
            </Button>
            <Button
              variant={language === 'tr' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLanguage('tr')}
              className="min-w-[100px]"
            >
              {t('language.turkish')}
            </Button>
          </div>

          <p className="text-muted-foreground text-lg">
            {t('header.subtitle')}
          </p>
        </header>

        {/* Security Notice */}
        <Alert className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <strong>{t('security.title')}</strong> {t('security.message')}
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Farcaster Sign-in */}
            <Card className="border-2 border-primary/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Farcaster
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!fcSignedIn ? (
                  <div className="space-y-3">
                    <div className="grid gap-2">
                      <Label htmlFor="custody">Custody address</Label>
                      <Input
                        id="custody"
                        placeholder="0x..."
                        value={custodyAddress}
                        onChange={(e) => setCustodyAddress(e.target.value as `0x${string}`)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="username">Farcaster username (optional)</Label>
                      <Input
                        id="username"
                        placeholder="mrvoodoo"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    </div>
                    <Button onClick={signInWithFarcaster} className="w-full" size="lg">
                      <User className="mr-2 h-4 w-4" />
                      Sign in with Farcaster
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm">Signed in</p>
                      {fid && <p className="text-sm opacity-80">FID: {fid}</p>}
                      {username && <p className="text-sm opacity-80">@{username}</p>}
                    </div>
                    <Button variant="outline" size="sm" onClick={signOutFarcaster} className="w-full">
                      Sign out
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* NFT Mint Section */}
            <NFTMintSection
              // EVM provider kaldırıldı. İlk aşamada null geçiyoruz.
              web3Provider={null as any}
              isConnected={fcSignedIn}
              isOnBaseNetwork={true}
              onLog={addLog}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Deploy Contract Button */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="h-5 w-5" />
                  {t('deploy.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={deployRealPinger}
                  disabled
                  size="lg"
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
                >
                  <Rocket className="mr-2 h-5 w-5" />
                  {t('deploy.button')}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Zincir işlemleri Farcaster akışına taşınacak. Şimdilik pasif.
                </p>
              </CardContent>
            </Card>

            {/* Parameters */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>{t('farming.title')}</CardTitle>
                <CardDescription>
                  {t('farming.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="cloneCount">{t('farming.cloneCount')}</Label>
                  <div id="cloneCount" className="mt-2 flex items-center gap-3">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <label key={n} className="inline-flex items-center">
                        <input
                          type="radio"
                          name="cloneCount"
                          value={n}
                          checked={cloneCount === n}
                          onChange={() => setCloneCount(n)}
                          className="appearance-none w-3.5 h-3.5 rounded-full bg-gray-300 cursor-pointer checked:bg-blue-600 transition-colors"
                          disabled
                        />
                        <span className="sr-only">{n}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pingsPerClone">{t('farming.pingsPerClone')}</Label>
                  <div id="pingsPerClone" className="mt-2 flex items-center gap-2 flex-wrap">
                    {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                      <label key={n} className="inline-flex items-center">
                        <input
                          type="radio"
                          name="pingsPerClone"
                          value={n}
                          checked={pingsPerClone === n}
                          onChange={() => setPingsPerClone(n)}
                          className="appearance-none w-3 h-3 rounded-full bg-gray-300 cursor-pointer checked:bg-green-600 transition-colors"
                          disabled
                        />
                        <span className="sr-only">{n}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Advanced Settings */}
                <Collapsible open={showAdvancedSettings} onOpenChange={setShowAdvancedSettings}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Settings className="mr-2 h-4 w-4" />
                      {t('farming.advanced')}
                      {showAdvancedSettings ? (
                        <ChevronUp className="ml-2 h-4 w-4" />
                      ) : (
                        <ChevronDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 mt-3">
                    <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800 dark:text-amber-200">
                        {t('farming.advancedWarning')}
                      </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="minGasCreateClone">{t('farming.minGasCreateClone')}</Label>
                        <Input
                          id="minGasCreateClone"
                          type="number"
                          min="100000"
                          value={advancedSettings.minGasCreateClone}
                          onChange={(e) => setAdvancedSettings(prev => ({
                            ...prev,
                            minGasCreateClone: parseInt(e.target.value) || 180000
                          }))}
                          disabled
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="minGasPing">{t('farming.minGasPing')}</Label>
                        <Input
                          id="minGasPing"
                          type="number"
                          min="30000"
                          value={advancedSettings.minGasPing}
                          onChange={(e) => setAdvancedSettings(prev => ({
                            ...prev,
                            minGasPing: parseInt(e.target.value) || 50000
                          }))}
                          disabled
                        />
                      </div>
                    </div>

                    {advancedSettings.gasMode === 'custom' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="maxFee">{t('farming.maxFee')}</Label>
                          <Input
                            id="maxFee"
                            type="number"
                            step="0.001"
                            min="0.001"
                            value={advancedSettings.maxFee}
                            onChange={(e) => setAdvancedSettings(prev => ({
                              ...prev,
                              maxFee: parseFloat(e.target.value) || 0.05
                            }))}
                            disabled
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="priority">{t('farming.priority')}</Label>
                          <Input
                            id="priority"
                            type="number"
                            step="0.001"
                            min="0.001"
                            value={advancedSettings.priority}
                            onChange={(e) => setAdvancedSettings(prev => ({
                              ...prev,
                              priority: parseFloat(e.target.value) || 0.01
                            }))}
                            disabled
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="gasBuffer">{t('farming.gasBuffer')}</Label>
                      <Input
                        id="gasBuffer"
                        type="number"
                        min="0"
                        max="100"
                        value={advancedSettings.gasBuffer}
                        onChange={(e) => setAdvancedSettings(prev => ({
                          ...prev,
                          gasBuffer: parseInt(e.target.value) || 20
                        }))}
                        disabled
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>

            {/* Control Buttons */}
            <Card className="shadow-lg">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  {!isProcessing ? (
                    <Button
                      onClick={startProcess}
                      disabled
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      size="lg"
                    >
                      <Zap className="mr-2 h-4 w-4" />
                      {t('farming.startButton')}
                    </Button>
                  ) : (
                    <Button
                      onClick={stopProcess}
                      variant="destructive"
                      className="flex-1"
                      size="lg"
                    >
                      <Square className="mr-2 h-4 w-4" />
                      {t('farming.stopButton')}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  İşlem butonları Farcaster imzalama akışına taşındıktan sonra aktif olacak.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Wallet Activity */}
        <div className="mb-6">
          <WalletStats
            account={''}
            isConnected={fcSignedIn}
            isOnBaseNetwork={true}
          />
        </div>

        {/* Logs Panel */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('logs.title')}</CardTitle>
                <CardDescription>
                  {t('logs.description')}
                </CardDescription>
              </div>
              <Button
                onClick={clearLogs}
                variant="outline"
                size="sm"
              >
                <Trash2 className="h-4 w-4" />
                {t('logs.clear')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[420px] w-full rounded-md border p-4">
              {logs.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  {t('logs.empty')}
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log, index) => (
                    <div key={log.id}>
                      <div className={`p-3 rounded-lg border ${getLogTypeColor(log.type)}`}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm flex-1">{log.message}</p>
                          <span className="text-xs opacity-70 whitespace-nowrap">
                            {log.timestamp}
                          </span>
                        </div>
                      </div>
                      {index < logs.length - 1 && <Separator className="my-2" />}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Information Section */}
        <Card className="shadow-lg mt-6 border-blue-200 bg-blue-50/50 dark:bg-blue-950/10 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Info className="h-5 w-5" />
              {t('info.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">🔹</span>
                <div>
                  <strong>{t('info.deployedContracts')}</strong> {t('info.deployedContractsDesc')}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">🔹</span>
                <div>
                  <strong>{t('info.transactions')}</strong> {t('info.transactionsDesc')}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">🔹</span>
                <div>
                  <strong>{t('info.uniqueContracts')}</strong> {t('info.uniqueContractsDesc')}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">🔹</span>
                <div>
                  <strong>{t('info.createNFTs')}</strong> {t('info.createNFTsDesc')}
                </div>
              </div>
            </div>

            <Separator className="bg-blue-200 dark:bg-blue-800" />

            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-amber-600 dark:text-amber-400">⚡</span>
                <div>{t('info.costs')}</div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 dark:text-green-400">💬</span>
                <div>
                  {t('info.contact')}{' '}
                  <a
                    href="https://x.com/MrVooDooNFT"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium inline-flex items-center gap-1"
                  >
                    @MrVooDooNFT
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-muted-foreground">
          <p>
            © 2025. {t('footer.builtWith')} <Heart className="inline h-4 w-4 text-red-500" /> {t('footer.using')}{' '}
            <a
              href="https://caffeine.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              caffeine.ai
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
