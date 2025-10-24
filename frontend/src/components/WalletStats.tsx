import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, AlertCircle, RefreshCw, Loader2, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWalletStatsCache } from '@/hooks/useQueries';
import { useLanguage } from '@/contexts/LanguageContext';

interface WalletStatsProps {
  account: string;
  isConnected: boolean;
  isOnBaseNetwork: boolean;
}

interface NFTOwnership {
  contractAddress: string;
  tokenId: string;
  tokenType: 'ERC-721' | 'ERC-1155';
  balance?: number;
  contractName?: string;
  contractSymbol?: string;
  tokenURI?: string;
}

interface WalletStatistics {
  totalTransactions: number;
  ownedNFTs: number;
  nftDetails: NFTOwnership[];
  contractsDeployed: number;
  contractAddresses: string[];
  lastUpdated: number;
}

const ETHERSCAN_API_KEY = 'RDD9YF5WX8IYNCVZ76N2XIDECFMXNBZZZ7';
const ETHERSCAN_API_URL = 'https://api.etherscan.io/v2/api';
const BASE_CHAIN_ID = '8453';
const FACTORY_ADDRESS = '0x0ae36d90d4e295a4b87274eec0c1520fd5f6f842';

const PARALLEL_BATCH_SIZE = 5;
const BATCH_DELAY = 150;
const RPC_BATCH_SIZE = 8;
const RPC_BATCH_DELAY = 200;

export default function WalletStats({ account, isConnected, isOnBaseNetwork }: WalletStatsProps) {
  const { t } = useLanguage();
  const [stats, setStats] = useState<WalletStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nftModalOpen, setNftModalOpen] = useState(false);
  const { getCachedStats, setCachedStats } = useWalletStatsCache();

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchTransactionsPage = async (walletAddress: string, page: number): Promise<any[]> => {
    const response = await fetch(
      `${ETHERSCAN_API_URL}?chainid=${BASE_CHAIN_ID}&module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=99999999&page=${page}&offset=10000&sort=desc&apikey=${ETHERSCAN_API_KEY}`
    );
    const data = await response.json();
    
    if (data.status === '1') {
      return data.result || [];
    } else if (data.status === '0' && data.message === 'No transactions found') {
      return [];
    } else {
      throw new Error(`Failed to fetch transactions: ${data.message || 'Unknown error'}`);
    }
  };

  const fetchAllTransactions = async (walletAddress: string): Promise<any[]> => {
    const firstPage = await fetchTransactionsPage(walletAddress, 1);
    
    if (firstPage.length < 10000) {
      return firstPage;
    }

    const allTransactions: any[] = [...firstPage];
    let currentPage = 2;
    let hasMore = true;

    while (hasMore) {
      const batchPromises: Promise<any[]>[] = [];
      
      for (let i = 0; i < PARALLEL_BATCH_SIZE && hasMore; i++) {
        batchPromises.push(fetchTransactionsPage(walletAddress, currentPage));
        currentPage++;
      }

      const batchResults = await Promise.all(batchPromises);
      
      for (const transactions of batchResults) {
        if (transactions.length === 0) {
          hasMore = false;
          break;
        }
        
        allTransactions.push(...transactions);
        
        if (transactions.length < 10000) {
          hasMore = false;
          break;
        }
      }

      if (hasMore) {
        await sleep(BATCH_DELAY);
      }
    }

    return allTransactions;
  };

  const fetchNFTTransfersPage = async (walletAddress: string, page: number): Promise<any[]> => {
    const response = await fetch(
      `${ETHERSCAN_API_URL}?chainid=${BASE_CHAIN_ID}&module=account&action=tokennfttx&address=${walletAddress}&startblock=0&endblock=99999999&page=${page}&offset=10000&sort=asc&apikey=${ETHERSCAN_API_KEY}`
    );
    const data = await response.json();
    
    if (data.status === '1') {
      return data.result || [];
    } else if (data.status === '0' && data.message === 'No transactions found') {
      return [];
    } else {
      throw new Error(`Failed to fetch NFT transfers: ${data.message || 'Unknown error'}`);
    }
  };

  const fetchAllNFTTransfers = async (walletAddress: string): Promise<any[]> => {
    const firstPage = await fetchNFTTransfersPage(walletAddress, 1);
    
    if (firstPage.length < 10000) {
      return firstPage;
    }

    const allTransfers: any[] = [...firstPage];
    let currentPage = 2;
    let hasMore = true;

    while (hasMore) {
      const batchPromises: Promise<any[]>[] = [];
      
      for (let i = 0; i < PARALLEL_BATCH_SIZE && hasMore; i++) {
        batchPromises.push(fetchNFTTransfersPage(walletAddress, currentPage));
        currentPage++;
      }

      const batchResults = await Promise.all(batchPromises);
      
      for (const transfers of batchResults) {
        if (transfers.length === 0) {
          hasMore = false;
          break;
        }
        
        allTransfers.push(...transfers);
        
        if (transfers.length < 10000) {
          hasMore = false;
          break;
        }
      }

      if (hasMore) {
        await sleep(BATCH_DELAY);
      }
    }

    return allTransfers;
  };

  const calculateNFTOwnership = (transfers: any[], myAddress: string): NFTOwnership[] => {
    const myAddressLower = myAddress.toLowerCase();
    const nftMap = new Map<string, any>();

    for (const transfer of transfers) {
      const key = `${transfer.contractAddress.toLowerCase()}_${transfer.tokenID}`;
      const fromLower = transfer.from.toLowerCase();
      const toLower = transfer.to.toLowerCase();
      
      if (!nftMap.has(key)) {
        nftMap.set(key, {
          contractAddress: transfer.contractAddress,
          tokenId: transfer.tokenID,
          tokenName: transfer.tokenName || 'Unknown',
          tokenSymbol: transfer.tokenSymbol || 'N/A',
          tokenDecimal: transfer.tokenDecimal,
          lastOwner: null,
          balance: 0,
          isERC1155: transfer.tokenDecimal && transfer.tokenDecimal !== '0'
        });
      }

      const nft = nftMap.get(key);

      if (nft.isERC1155) {
        const value = parseInt(transfer.tokenValue || '1');
        if (toLower === myAddressLower) {
          nft.balance += value;
        }
        if (fromLower === myAddressLower) {
          nft.balance -= value;
        }
      } else {
        nft.lastOwner = toLower;
      }
    }

    const ownedNFTs: NFTOwnership[] = [];
    
    for (const [key, nft] of nftMap.entries()) {
      let isOwned = false;
      
      if (nft.isERC1155) {
        isOwned = nft.balance > 0;
      } else {
        isOwned = nft.lastOwner === myAddressLower;
      }

      if (isOwned) {
        ownedNFTs.push({
          contractAddress: nft.contractAddress,
          tokenId: nft.tokenId,
          tokenType: nft.isERC1155 ? 'ERC-1155' : 'ERC-721',
          balance: nft.isERC1155 ? nft.balance : undefined,
          contractName: nft.tokenName,
          contractSymbol: nft.tokenSymbol
        });
      }
    }

    return ownedNFTs;
  };

  const fetchFactoryClonedEvents = async (walletAddress: string, allTransactions: any[]): Promise<number> => {
    try {
      const response = await fetch(
        `${ETHERSCAN_API_URL}?chainid=${BASE_CHAIN_ID}&module=logs&action=getLogs&address=${FACTORY_ADDRESS}&fromBlock=0&toBlock=latest&apikey=${ETHERSCAN_API_KEY}`
      );
      const data = await response.json();
      
      if (data.status !== '1' || !data.result) {
        return 0;
      }

      const walletTxHashes = new Set(
        allTransactions.map(tx => tx.hash.toLowerCase())
      );

      const relevantEvents = data.result.filter((log: any) => 
        log.transactionHash && walletTxHashes.has(log.transactionHash.toLowerCase())
      );

      return relevantEvents.length;
    } catch (error) {
      console.warn('Failed to fetch factory cloned events:', error);
      return 0;
    }
  };

  const fetchWalletStats = async (walletAddress: string, forceRefresh = false) => {
    setLoading(true);
    setError(null);
    
    try {
      if (!forceRefresh) {
        const cachedData = await getCachedStats(walletAddress);
        if (cachedData) {
          console.log('Using cached wallet stats from backend');
          const parsed = JSON.parse(cachedData);
          setStats(parsed);
          setLoading(false);
          return;
        }
      }

      const allTransactions = await fetchAllTransactions(walletAddress);
      const totalTransactions = allTransactions.length;

      const allNFTTransfers = await fetchAllNFTTransfers(walletAddress);
      
      const nftDetails = calculateNFTOwnership(allNFTTransfers, walletAddress);
      const ownedNFTs = nftDetails.length;

      let directDeployments = 0;
      for (const tx of allTransactions) {
        if (!tx.to || tx.to === '' || tx.to === '0x0000000000000000000000000000000000000000') {
          directDeployments++;
        }
      }

      const factoryDeployments = await fetchFactoryClonedEvents(walletAddress, allTransactions);
      const totalContractsDeployed = directDeployments + factoryDeployments;

      const statsData: WalletStatistics = {
        totalTransactions,
        ownedNFTs,
        nftDetails,
        contractsDeployed: totalContractsDeployed,
        contractAddresses: [],
        lastUpdated: Date.now()
      };

      setStats(statsData);

      await setCachedStats(walletAddress, JSON.stringify(statsData));

    } catch (err: any) {
      console.error('Error fetching wallet stats:', err);
      
      let errorMessage = 'Unable to fetch wallet statistics. Please try again later.';
      
      if (err.message?.includes('rate limit') || err.message?.includes('429')) {
        errorMessage = 'API rate limit exceeded. Please wait a moment and try again.';
      } else if (err.message?.includes('API key')) {
        errorMessage = 'API key issue. Please check the configuration.';
      } else if (err.message?.includes('network') || err.message?.includes('fetch') || err.message?.includes('CORS')) {
        errorMessage = 'Network error or CORS issue. The API may not be accessible from your browser.';
      } else if (err.message?.includes('chainid') || err.message?.includes('unsupported')) {
        errorMessage = 'Chain ID not supported by the API. Base network statistics may not be available.';
      }
      
      setError(errorMessage);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (account && isConnected && isOnBaseNetwork) {
      fetchWalletStats(account, true);
    }
  };

  useEffect(() => {
    if (isConnected && isOnBaseNetwork && account) {
      fetchWalletStats(account);
    } else {
      setStats(null);
      setError(null);
    }
  }, [account, isConnected, isOnBaseNetwork]);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isConnected || !isOnBaseNetwork) {
    return null;
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {t('stats.title')}
            </CardTitle>
            {stats?.lastUpdated && (
              <p className="text-xs text-muted-foreground mt-1">
                {t('stats.lastUpdated')} {formatTimestamp(stats.lastUpdated)}
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('stats.refresh')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              {error}
            </AlertDescription>
          </Alert>
        )}
        
        {loading ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {t('stats.loading')}
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-6 w-16" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-6 w-16" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-6 w-16" />
              </div>
            </div>
          </div>
        ) : stats ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-lg">📊</span>
                <span className="text-sm font-medium">{t('stats.transactions')}</span>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800">
                {stats.totalTransactions.toLocaleString()}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-lg">🖼️</span>
                <span className="text-sm font-medium">{t('stats.ownedNFTs')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800">
                  {stats.ownedNFTs.toLocaleString()}
                </Badge>
                {stats.ownedNFTs > 0 && (
                  <Dialog open={nftModalOpen} onOpenChange={setNftModalOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                        {t('stats.viewDetails')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle>{t('stats.nftModalTitle')} ({stats.ownedNFTs})</DialogTitle>
                        <DialogDescription>
                          {t('stats.nftModalDescription')}
                        </DialogDescription>
                      </DialogHeader>
                      <ScrollArea className="h-[60vh] pr-4">
                        <div className="space-y-3">
                          {stats.nftDetails.map((nft, index) => (
                            <div key={`${nft.contractAddress}_${nft.tokenId}`} className="p-4 border rounded-lg bg-muted/50">
                              <div className="flex items-start gap-3">
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {nft.tokenType}
                                    </Badge>
                                    {nft.balance && nft.balance > 1 && (
                                      <Badge variant="secondary" className="text-xs">
                                        x{nft.balance}
                                      </Badge>
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-sm">
                                      {nft.contractName || t('stats.unknownCollection')}
                                      {nft.contractSymbol && nft.contractSymbol !== 'N/A' && (
                                        <span className="text-muted-foreground ml-1">({nft.contractSymbol})</span>
                                      )}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{t('stats.tokenId')} {nft.tokenId}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <a
                                      href={`https://basescan.org/token/${nft.contractAddress}?a=${nft.tokenId}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                    >
                                      {t('stats.viewOnBaseScan')}
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-lg">🚀</span>
                <span className="text-sm font-medium">{t('stats.deployedContracts')}</span>
              </div>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-800">
                {stats.contractsDeployed.toLocaleString()}
              </Badge>
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-4">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Connect wallet and switch to Base network to view statistics</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
