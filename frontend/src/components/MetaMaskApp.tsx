import { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { Button } from '@/components/ui/button';
import { Web3Provider } from "../lib/web3";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Wallet, Play, Square, Trash2, Heart, AlertTriangle, Network, Settings, ChevronDown, ChevronUp, Rocket, Zap, Target, ExternalLink, Info, Languages } from 'lucide-react';
import { toast } from 'sonner';
import { useActor } from '../hooks/useActor';
import { useLogs, useClearLogs } from '../hooks/useQueries';
import { Web3Provider } from '../lib/web3';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import WalletStats from './WalletStats';
import NFTMintSection from './NFTMintSection';
import { useLanguage } from '../contexts/LanguageContext';
const IS_DESKTOP = !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);


// --- Base public RPC üzerinden receipt bekleme (fallback) ---
async function waitForReceiptPublic(txHash: string, timeoutMs = 180000, pollMs = 1500) {
  const rpcUrl = "https://mainnet.base.org";
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getTransactionReceipt",
        params: [txHash]
      })
    });
    const json = await res.json();
    if (json?.result) return json.result; // receipt bulundu
    await new Promise(r => setTimeout(r, pollMs));
  }
  throw new Error("Receipt timeout on public RPC");
}
// --- Pre-wait & retry helper for eth_sendTransaction ---
async function sendTransactionWithRetry(eth: any, tx: any, retries = 1) {
  // küçük bir gecikme: kullanıcı cüzdan modalını görsün
  await new Promise(r => setTimeout(r, 700));

  try {
    // doğrudan Farcaster wallet provider'ına gönder
    return await eth.request({
      method: "eth_sendTransaction",
      params: [tx],
    });
  } catch (err: any) {
    // kullanıcı reddederse kısa bekleme sonrası tekrar dene
    if (
      retries > 0 &&
      (err?.message?.includes("rejected") || err?.message?.includes("user"))
    ) {
      await new Promise(r => setTimeout(r, 500));
      return await sendTransactionWithRetry(eth, tx, retries - 1);
    }
    throw err;
  }
}


// --- Provider ve public RPC arasında yarış (hangisi önce dönerse onu alır) ---
async function waitForReceiptRace(provider: any, txHash: string, timeoutMs = 10000) {
  const providerPromise = (async () => {
    try {
      return await Promise.race([
        provider.waitForTransaction(txHash),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("provider_timeout")), timeoutMs)
        ),
      ]);
    } catch {
      return null;
    }
  })();

  const publicPromise = waitForReceiptPublic(txHash);

  // İki beklemeyi aynı anda başlat — hangisi önce receipt dönerse onu al
  const result = await Promise.race([providerPromise, publicPromise]);
  if (!result) throw new Error("Receipt not found (both failed)");
  return result;
}
// --- Public-first bekleme (masaüstünde ping için hızlı) ---
async function waitForReceiptPublicFirst(txHash: string, publicTimeoutMs = 9000, pollMs = 1000) {
  const rpcUrl = "https://mainnet.base.org";
  const t0 = Date.now();
  while (Date.now() - t0 < publicTimeoutMs) {
    try {
      const res = await fetch(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_getTransactionReceipt",
          params: [txHash]
        })
      });
      const json = await res.json();
      if (json?.result) return json.result;
    } catch {}
    await new Promise(r => setTimeout(r, pollMs));
  }
  // Public yetişmezse eski race’e dön
  return await waitForReceiptRace(web3Provider, txHash);
}

// Base Network Configuration
const BASE_NETWORK = {
  chainId: '0x2105', // 8453 in hex
  chainName: 'Base',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: ['https://mainnet.base.org'],
  blockExplorerUrls: ['https://basescan.org'],
};

// Fixed Factory contract address
const FACTORY_ADDR = '0x0ae36d90d4e295a4b87274eec0c1520fd5f6f842';

// Factory ABI exactly as specified
const FACTORY_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "addr",
        "type": "address"
      }
    ],
    "name": "Cloned",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "createClone",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// Pinger contract ABI
const PINGER_ABI = [
  {
    "inputs": [],
    "name": "ping",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "counter",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Pinger contract bytecode
const PINGER_BYTECODE = "0x608060405234801561001057600080fd5b50600080819055506101a8806100276000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c80635c36b1861461003b57806361bc221a14610045575b600080fd5b610043610063565b005b61004d610078565b60405161005a9190610087565b60405180910390f35b600160008082825461007591906100a2565b92505081905550565b60008054905090565b6000819050919050565b61009a8161007e565b82525050565b60006100ab8261007e565b91506100b68361007e565b92508282019050808211156100ce576100cd6100f8565b5b92915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fdfea2646970667358221220a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890123464736f6c63430008130033";

// Helper function to filter only function definitions from ABI
const getFunctionABI = (abi: any[]) => {
  return abi.filter(item => item.type === 'function');
};

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
  const [account, setAccount] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [currentChainId, setCurrentChainId] = useState<string>('');
  const [isOnBaseNetwork, setIsOnBaseNetwork] = useState(false);
  const [cloneCount, setCloneCount] = useState<number>(1);
  const [pingsPerClone, setPingsPerClone] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [web3Provider, setWeb3Provider] = useState<Web3Provider | null>(null);
  const [createdClones, setCreatedClones] = useState<string[]>([]);
  const [deployedPingers, setDeployedPingers] = useState<string[]>([]);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<string>('');
  const [ethProvider, setEthProvider] = useState<any>(null);
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettings>({
    gasMode: 'wallet',
    minGasCreateClone: 180000,
    minGasPing: 50000,
    maxFee: 0.05,
    priority: 0.01,
    gasBuffer: 20
  });

  const { actor } = useActor();
  const { data: backendLogs, refetch: refetchLogs } = useLogs();
  const clearLogsMutation = useClearLogs();

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const now = new Date();
    const logEntry: LogEntry = {
      id: Date.now().toString(),
      timestamp: now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      }),
      message,
      type
    };
    setLogs(prev => [...prev, logEntry]);
    
    if (actor) {
      const fullTimestamp = now.toLocaleString('en-US');
      actor.addLog(`[${fullTimestamp}] [${type.toUpperCase()}] ${message}`).catch(console.error);
    }
  };

  const clearLogs = async () => {
    try {
      setLogs([]);
      setCreatedClones([]);
      setDeployedPingers([]);
      
      if (actor) {
        await clearLogsMutation.mutateAsync();
        await refetchLogs();
      }
      
      addLog('Logs cleared', 'info');
      toast.success(t('toast.logsCleared'));
    } catch (error) {
      console.error('Error clearing logs:', error);
      addLog('Error clearing logs', 'error');
      toast.error(t('toast.logsClearFailed'));
    }
  };

  const detectWallet = () => {
    if (typeof window.ethereum !== 'undefined') {
      if (window.ethereum.isMetaMask) {
        return 'MetaMask';
      } else if (window.ethereum.isRabby) {
        return 'Rabby';
      } else if (window.ethereum.isWalletConnect) {
        return 'WalletConnect';
      } else {
        return 'Unknown Wallet';
      }
    }
    return null;
  };

  const checkWallet = () => {
    if (typeof window.ethereum !== 'undefined') {
      return true;
    }
    toast.error(t('toast.noWallet'));
    addLog('No compatible wallet found', 'error');
    return false;
  };

  const checkNetwork = async (provider: Web3Provider) => {
    try {
      const chainId = await provider.getChainId();
      setCurrentChainId(chainId);
      const isBase = chainId === BASE_NETWORK.chainId;
      setIsOnBaseNetwork(isBase);
      
      if (isBase) {
        addLog('Successfully connected to Base network', 'success');
      } else {
        addLog(`Wrong network detected (Chain ID: ${chainId}). Please switch to Base network.`, 'warning');
      }
      
      return isBase;
    } catch (error: any) {
      addLog(`Network check error: ${error.message}`, 'error');
      return false;
    }
  };

  const switchToBaseNetwork = async () => {
    if (!web3Provider || !window.ethereum) return;

    try {
      addLog('Initiating switch to Base network...', 'info');
      
      await web3Provider.switchNetwork(BASE_NETWORK.chainId);
      addLog('Successfully switched to Base network', 'success');
      toast.success(t('toast.networkSwitched'));
      
      await checkNetwork(web3Provider);
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          addLog('Adding Base network to wallet...', 'info');
          await web3Provider.addNetwork(BASE_NETWORK);
          addLog('Base network successfully added and activated', 'success');
          toast.success(t('toast.networkSwitched'));
          
          await checkNetwork(web3Provider);
        } catch (addError: any) {
          addLog(`Error adding Base network: ${addError.message}`, 'error');
          toast.error(t('toast.networkSwitchFailed'));
        }
      } else {
        addLog(`Network switch error: ${switchError.message}`, 'error');
        toast.error(t('toast.networkSwitchFailed'));
      }
    }
  };

const connectWallet = async () => {
  try {
    addLog('Connecting Farcaster wallet...', 'info');

    // Mini App context (isteğe bağlı, ileride kullanılabilir)
    const ctx = await sdk.context.get();

    // Farcaster Mini App provider
    const eth = await sdk.wallet.getEthereumProvider();
    if (!eth) {
      addLog('No Farcaster provider found', 'error');
      toast.error(t('toast.noWallet'));
      return;
    }

    // Mevcut projenin kendi wrapper'ı
    const provider = new Web3Provider(eth as any);

    // Adresleri al, yoksa iste
    let addrs: string[] = [];
    try {
      addrs = await sdk.wallet.getAddresses();
    } catch {
      addrs = [];
    }
    if (!addrs || addrs.length === 0) {
      const req = await sdk.wallet.requestAddresses();
      addrs = req ?? [];
    }
    if (!addrs || addrs.length === 0) {
      addLog('No wallet address returned from Farcaster', 'error');
      return;
    }

    setAccount(addrs[0]);
    setIsConnected(true);
    setWeb3Provider(provider);
    setConnectedWallet('Farcaster');

    addLog('Wallet connected via Farcaster', 'success');
    toast.success(t('toast.walletConnected'));

    await checkNetwork(provider);
  } catch (error: any) {
    addLog(`Farcaster wallet error: ${error?.message || error}`, 'error');
    toast.error(t('toast.walletConnectFailed'));
  }
};


  const disconnectWallet = () => {
    setAccount('');
    setIsConnected(false);
    setCurrentChainId('');
    setIsOnBaseNetwork(false);
    setWeb3Provider(null);
    setCreatedClones([]);
    setDeployedPingers([]);
    setConnectedWallet('');
    addLog('Wallet disconnected', 'info');
    toast.info(t('toast.walletDisconnected'));
  };

  const deployRealPinger = async () => {
    if (!web3Provider || !isConnected) {
      toast.error(t('toast.connectWalletFirst'));
      return;
    }

    if (!isOnBaseNetwork) {
      toast.error(t('toast.switchToBase'));
      return;
    }

    setIsDeploying(true);
    addLog('Deploying real Pinger contract...', 'info');
    addLog(`Deploying on Base network (Chain ID: ${BASE_NETWORK.chainId})`, 'info');
    addLog(`Gas mode: ${advancedSettings.gasMode === 'wallet' ? 'Wallet suggested' : 'Custom'}`, 'info');

    try {
      const gasParams = await calculateGasParams('deploy', 500000);
      
      const deployTxHash = await web3Provider.deployContract(
        PINGER_ABI,
        PINGER_BYTECODE,
        [],
        gasParams
      );
      
      addLog(`Deployment transaction sent to blockchain: ${deployTxHash}`, 'info');
      
      const deployReceipt = await web3Provider.waitForTransaction(deployTxHash);
      
      if (deployReceipt.status === '0x1' && deployReceipt.contractAddress) {
        const contractAddress = deployReceipt.contractAddress;
        setDeployedPingers(prev => [...prev, contractAddress]);
        
        addLog(`✓ Real Pinger contract successfully deployed: ${contractAddress}`, 'success');
        addLog(`Block: ${parseInt(deployReceipt.blockNumber, 16)}, Gas Used: ${parseInt(deployReceipt.gasUsed, 16).toLocaleString()}`, 'info');
        addLog(`Transaction Hash: ${deployTxHash}`, 'info');
        
        toast.success(t('toast.deploySuccess'));
      } else {
        addLog('Deployment transaction failed', 'error');
        toast.error(t('toast.deployFailed'));
      }
    } catch (error: any) {
      addLog(`Deployment error: ${error.message}`, 'error');
      toast.error(t('toast.deployFailed'));
    } finally {
      setIsDeploying(false);
    }
  };

  const calculateGasParams = async (methodName: string, estimatedGas?: number) => {
    try {
      let gasLimit = estimatedGas || (methodName === 'createClone' ? advancedSettings.minGasCreateClone : advancedSettings.minGasPing);
      
      if (methodName === 'deploy') {
        gasLimit = estimatedGas || 500000;
      }
      
      if (estimatedGas) {
        gasLimit = Math.ceil(estimatedGas * (1 + advancedSettings.gasBuffer / 100));
      }
      
      if (methodName === 'createClone') {
        gasLimit = Math.max(gasLimit, advancedSettings.minGasCreateClone);
      } else if (methodName === 'ping') {
        gasLimit = Math.max(gasLimit, advancedSettings.minGasPing);
      }

      const gasParams: any = {
        gasLimit
      };

      if (advancedSettings.gasMode === 'custom') {
        gasParams.maxFeePerGas = Math.floor(advancedSettings.maxFee * 1000000000);
        gasParams.maxPriorityFeePerGas = Math.floor(advancedSettings.priority * 1000000000);
        
        addLog(`Gas parameters (Custom): Gas Limit: ${gasLimit.toLocaleString()}, Max Fee: ${advancedSettings.maxFee} gwei, Priority Fee: ${advancedSettings.priority} gwei`, 'info');
      } else {
        addLog(`Gas parameters (Wallet suggested): Gas Limit: ${gasLimit.toLocaleString()}, fees will be suggested by wallet`, 'info');
      }

      return gasParams;
    } catch (error: any) {
      addLog(`Gas parameter calculation error: ${error.message}`, 'error');
      const minGas = methodName === 'createClone' ? advancedSettings.minGasCreateClone : advancedSettings.minGasPing;
      const gasParams: any = {
        gasLimit: minGas
      };
      
      if (advancedSettings.gasMode === 'custom') {
        gasParams.maxFeePerGas = Math.floor(advancedSettings.maxFee * 1000000000);
        gasParams.maxPriorityFeePerGas = Math.floor(advancedSettings.priority * 1000000000);
      }
      
      return gasParams;
    }
  };

  const extractCloneAddress = (receipt: any): string | null => {
    try {
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() === FACTORY_ADDR.toLowerCase()) {
          if (log.topics && log.topics.length > 1) {
            const cloneAddress = '0x' + log.topics[1].slice(-40);
            return cloneAddress;
          }
        }
      }
      return null;
    } catch (error) {
      addLog(`Clone address extraction error: ${error}`, 'error');
      return null;
    }
  };

  const startProcess = async () => {
    if (!web3Provider || !isConnected) {
      toast.error(t('toast.connectWalletFirst'));
      return;
    }

    if (!isOnBaseNetwork) {
      toast.error(t('toast.switchToBase'));
      return;
    }

    setIsProcessing(true);
    setCreatedClones([]);
    addLog(`Starting process: ${cloneCount} clones will be created, ${pingsPerClone} pings per clone`, 'info');
    addLog(`Factory contract address: ${FACTORY_ADDR}`, 'info');
    addLog(`Processing on Base network (Chain ID: ${BASE_NETWORK.chainId})`, 'info');
    addLog(`Gas mode: ${advancedSettings.gasMode === 'wallet' ? 'Wallet suggested' : 'Custom'}`, 'info');
    
    if (advancedSettings.gasMode === 'custom') {
      addLog(`Using custom gas settings - Max Fee: ${advancedSettings.maxFee} gwei, Priority: ${advancedSettings.priority} gwei, Gas Buffer: ${advancedSettings.gasBuffer}%`, 'info');
    } else {
      addLog(`Using wallet suggested gas fees with Gas Buffer: ${advancedSettings.gasBuffer}%`, 'info');
    }

    const newClones: string[] = [];

    try {
      for (let i = 1; i <= cloneCount; i++) {
        addLog(`Creating clone ${i}/${cloneCount}...`, 'info');
        
        try {
          let estimatedGas: number | undefined;
          try {
            estimatedGas = await web3Provider.estimateGas(FACTORY_ADDR, getFunctionABI(FACTORY_ABI), 'createClone', []);
            addLog(`Gas estimate for clone ${i}: ${estimatedGas.toLocaleString()}`, 'info');
          } catch (estimateError: any) {
            addLog(`Gas estimation failed, using minimum value: ${estimateError.message}`, 'warning');
          }

          const gasParams = await calculateGasParams('createClone', estimatedGas);
          
          const cloneTxHash = await web3Provider.callContract(
            FACTORY_ADDR,
            getFunctionABI(FACTORY_ABI),
            'createClone',
            [],
            gasParams
          );
          addLog(`Clone ${i} transaction sent to blockchain: ${cloneTxHash}`, 'info');
          
          // Önce mevcut provider ile beklemeyi dene
const cloneReceipt = await waitForReceiptRace(web3Provider, cloneTxHash);


          if (cloneReceipt.status === '0x1') {
            const cloneAddress = extractCloneAddress(cloneReceipt);
            if (cloneAddress) {
              newClones.push(cloneAddress);
              setCreatedClones(prev => [...prev, cloneAddress]);
              addLog(`Clone ${i} successfully created: ${cloneAddress}`, 'success');
              addLog(`Block: ${parseInt(cloneReceipt.blockNumber, 16)}, Gas Used: ${parseInt(cloneReceipt.gasUsed, 16).toLocaleString()}`, 'info');
              
              for (let j = 1; j <= pingsPerClone; j++) {
                addLog(`Clone ${i} (${cloneAddress}) - Sending ping ${j}/${pingsPerClone}...`, 'info');
                
                try {
                  // Sadece masaüstü mini app için küçük ısınma
if (IS_DESKTOP) {
  try { await sdk.actions.ready?.(); } catch {}
  try { await ethProvider?.request?.({ method: "eth_chainId" }); } catch {}
  await new Promise(r => setTimeout(r, 400)); // çok kısa bekleme
}

                  let pingEstimatedGas: number | undefined;
                  try {
                    pingEstimatedGas = await web3Provider.estimateGas(cloneAddress, getFunctionABI(PINGER_ABI), 'ping', []);
                    addLog(`Gas estimate for clone ${i} - ping ${j}: ${pingEstimatedGas.toLocaleString()}`, 'info');
                  } catch (estimateError: any) {
                    addLog(`Ping gas estimation failed, using minimum value: ${estimateError.message}`, 'warning');
                  }

                  const pingGasParams = await calculateGasParams('ping', pingEstimatedGas);
                  
const pingTx = {
  from: account,
  to: cloneAddress,
  data: "0x5c36b186", // ping() fonksiyonunun selector'ı
  gas: "0xC350" // yaklaşık 50,000
};

if (!ethProvider || typeof ethProvider.request !== "function") {
  addLog("Farcaster provider missing for ping", "error");
  throw new Error("ethProvider is not ready");
}

const pingTxHash = await sendTransactionWithRetry(ethProvider, pingTx);
addLog(`Clone ${i} - Ping ${j} transaction sent: ${pingTxHash}`, 'info');



// Yeni bekleme sistemi (provider + public race)
const pingReceipt = (typeof window !== "undefined" && !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent))
  ? await waitForReceiptPublicFirst(pingTxHash, 9000, 1000)   // masaüstü web
  : await waitForReceiptRace(web3Provider, pingTxHash);       // mobil/diğerleri


if (pingReceipt && pingReceipt.status === '0x1') {
  addLog(`Clone ${i} - Ping ${j} successful`, 'success');
  addLog(`Block: ${parseInt(pingReceipt.blockNumber, 16)}, Gas Used: ${parseInt(pingReceipt.gasUsed, 16).toLocaleString()}`, 'info');
} else {
  addLog(`Clone ${i} - Ping ${j} transaction failed`, 'error');
}

                } catch (pingError: any) {
                  addLog(`Clone ${i} - Ping ${j} error: ${pingError.message}`, 'error');
                }
              }
            } else {
              addLog(`Clone ${i} created but address could not be extracted`, 'warning');
              addLog(`Block: ${parseInt(cloneReceipt.blockNumber, 16)}, Gas Used: ${parseInt(cloneReceipt.gasUsed, 16).toLocaleString()}`, 'info');
            }
          } else {
            addLog(`Clone ${i} transaction failed`, 'error');
            continue;
          }
        } catch (cloneError: any) {
          addLog(`Clone ${i} creation error: ${cloneError.message}`, 'error');
        }
      }

      addLog(`All operations completed! Total ${newClones.length} clones successfully created.`, 'success');
      if (newClones.length > 0) {
        addLog(`Total ${newClones.length * pingsPerClone} ping operations performed.`, 'success');
      }
      toast.success(t('toast.operationsComplete'));
    } catch (error: any) {
      addLog(`General operation error: ${error.message}`, 'error');
      toast.error('Error occurred during operations!');
    } finally {
      setIsProcessing(false);
    }
  };

  const stopProcess = () => {
    setIsProcessing(false);
    addLog('Process stopped by user', 'warning');
    toast.warning(t('toast.processStopped'));
  };

useEffect(() => {
  let cancelled = false;

  (async () => {
    try {
      const inMini = await sdk.isInMiniApp?.();
      addLog("isInMiniApp=" + String(inMini), "info");
      if (!inMini) {
        addLog("Not running inside Warpcast Mini App", "warning");
        return;
      }

      addLog("Calling sdk.actions.ready()", "info");
      await sdk.actions.ready();
      if (cancelled) return;

      const eth: any = await sdk.wallet.getEthereumProvider?.();
      setEthProvider(eth);
      addLog("provider=" + String(!!eth) + " request=" + typeof eth?.request, "info");
      if (!eth || typeof eth.request !== "function") {
        addLog("Ethereum provider not available", "error");
        return;
      }

      addLog("Checking accounts…", "info");
      let accounts: string[] = await eth.request({ method: "eth_accounts" });
      if (!accounts?.[0]) {
        addLog("Requesting accounts…", "info");
        accounts = await eth.request({ method: "eth_requestAccounts" });
      }
      if (!accounts?.[0]) {
        addLog("No account returned", "error");
        return;
      }

      // Farcaster bağlantısı tamamlandı
      setAccount(accounts[0]);
      addLog("Connected: " + accounts[0], "success");

      // Provider ve network state'lerini güncelle
      const provider = new Web3Provider(eth);
      setWeb3Provider(provider);
      setIsConnected(true);
      setIsOnBaseNetwork(true);


    } catch (e: any) {
      addLog(`Auto-connect error: ${e?.message || String(e)}`, "error");
      console.error(e);
    }
  })();

  return () => { cancelled = true; };
}, []);





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

        {/* Network Warning */}
        {web3Provider && !isOnBaseNetwork && (
          <Alert className="mb-6 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <div className="flex items-center justify-between">
                <span>{t('network.warning')}</span>
                <Button 
                  onClick={switchToBaseNetwork}
                  size="sm"
                  className="ml-4"
                >
                  <Network className="mr-2 h-4 w-4" />
                  {t('network.switchButton')}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Wallet Connection */}
            <Card className="border-2 border-primary/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  {t('wallet.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isConnected ? (
                  <Button onClick={connectWallet} className="w-full" size="lg">
                    <Wallet className="mr-2 h-4 w-4" />
                    {t('wallet.connect')}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-mono break-all">{account}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={disconnectWallet} className="w-full">
                      {t('wallet.disconnect')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* NFT Mint Section */}
            <NFTMintSection
              web3Provider={web3Provider}
              isConnected={isConnected}
              isOnBaseNetwork={isOnBaseNetwork}
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
                  disabled={!isConnected || !isOnBaseNetwork || isDeploying}
                  size="lg"
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
                >
                  <Rocket className="mr-2 h-5 w-5" />
                  {isDeploying ? t('deploy.deploying') : t('deploy.button')}
                </Button>
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
              <CardContent className="space-y-4">
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
        disabled={isProcessing}
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
        disabled={isProcessing}
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
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        {t('farming.advancedWarning')}
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <Label>{t('farming.gasMode')}</Label>
                      <RadioGroup
                        value={advancedSettings.gasMode}
                        onValueChange={(value: 'wallet' | 'custom') => 
                          setAdvancedSettings(prev => ({ ...prev, gasMode: value }))
                        }
                        disabled={isProcessing}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="wallet" id="wallet" />
                          <Label htmlFor="wallet">{t('farming.walletSuggested')}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="custom" id="custom" />
                          <Label htmlFor="custom">{t('farming.custom')}</Label>
                        </div>
                      </RadioGroup>
                    </div>

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
                          disabled={isProcessing}
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
                          disabled={isProcessing}
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
                            disabled={isProcessing}
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
                            disabled={isProcessing}
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
                        disabled={isProcessing}
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
                      disabled={!isConnected || !isOnBaseNetwork}
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
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Wallet Activity */}
        <div className="mb-6">
          <WalletStats 
            account={account}
            isConnected={isConnected}
            isOnBaseNetwork={isOnBaseNetwork}
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
                disabled={clearLogsMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
                {clearLogsMutation.isPending ? t('logs.clearing') : t('logs.clear')}
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

        {/* Contract Information */}
        <Card className="shadow-lg mt-6">
          <CardHeader>
            <CardTitle>{t('contract.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-semibold mb-1">{t('contract.factory')}</p>
              <p className="text-xs font-mono break-all">{FACTORY_ADDR}</p>
            </div>
            {createdClones.length > 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-semibold mb-2">{t('contract.clones')} ({createdClones.length}):</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {createdClones.map((clone, index) => (
                    <p key={clone} className="text-xs font-mono break-all">
                      {index + 1}. {clone}
                    </p>
                  ))}
                </div>
              </div>
            )}
            {deployedPingers.length > 0 && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <p className="text-sm font-semibold mb-2 text-emerald-700 dark:text-emerald-400">{t('contract.pingers')} ({deployedPingers.length}):</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {deployedPingers.map((pinger, index) => (
                    <p key={pinger} className="text-xs font-mono break-all text-emerald-600 dark:text-emerald-300">
                      {index + 1}. {pinger}
                    </p>
                  ))}
                </div>
              </div>
            )}
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
                    <ExternalLink className="h-3 w-3" />
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
