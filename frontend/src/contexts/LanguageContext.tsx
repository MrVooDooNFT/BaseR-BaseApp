import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'tr';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  en: {
    // Header
    'header.title': 'BaseR by Mr VooDoo',
    'header.subtitle': 'Easily farm, deploy, and mint NFTs, all free w BaseR! Zero cost!',
    
    // Security Alert
    'security.title': 'Security:',
    'security.message': 'This application does not store or process any private keys. All transactions are signed directly from your wallet and sent to the blockchain.',
    
    // Network Warning
    'network.warning': "You're on the wrong network! This application works on Base network. Please switch to Base network.",
    'network.switchButton': 'Switch to Base',
    
    // Wallet Connection
    'wallet.title': 'Wallet Connection',
    'wallet.connect': 'Connect Wallet',
    'wallet.disconnect': 'Disconnect',
    'wallet.connecting': 'Connecting to',
    'wallet.connected': 'Wallet connected',
    
    // NFT Mint Section
    'nft.title': 'Create and Mint your NFT collection',
    'nft.handle': 'Handle',
    'nft.handlePlaceholder': 'Enter collection handle',
    'nft.amount': 'Amount (1-10)',
    'nft.amountPlaceholder': 'Select amount',
    'nft.mintButton': 'Mint Collection',
    'nft.minting': 'Minting...',
    
    // Deploy Contract
    'deploy.title': 'Deploy Contract',
    'deploy.button': 'Deploy A Contract 🚀',
    'deploy.deploying': 'Deploying...',
    
    // Transaction Farming
    'farming.title': 'Transaction Farming',
    'farming.description': 'The first number sets how many unique contracts you want to interact with. The second number defines how many transactions to send for each unique contract.',
    'farming.cloneCount': 'How many unique contracts to interact with',
    'farming.pingsPerClone': 'Transactions per contract',
    'farming.advanced': 'Advanced',
    'farming.advancedWarning': 'Do not change unless you know what you are doing',
    'farming.gasMode': 'Gas Mode',
    'farming.walletSuggested': 'Wallet suggested',
    'farming.custom': 'Custom',
    'farming.minGasCreateClone': 'MinGas(createClone)',
    'farming.minGasPing': 'MinGas(ping)',
    'farming.maxFee': 'MaxFee (gwei)',
    'farming.priority': 'Priority (gwei)',
    'farming.gasBuffer': 'GasBuffer (%)',
    'farming.startButton': 'Start Farming TX ⚡',
    'farming.stopButton': 'Stop',
    
    // Wallet Stats
    'stats.title': 'Wallet Activity',
    'stats.lastUpdated': 'Last updated:',
    'stats.refresh': 'Refresh',
    'stats.transactions': 'Transactions',
    'stats.ownedNFTs': 'Owned NFTs',
    'stats.deployedContracts': 'Deployed Contracts',
    'stats.viewDetails': 'View details',
    'stats.loading': 'Loading data from BaseScan…',
    'stats.nftModalTitle': 'Owned NFTs',
    'stats.nftModalDescription': 'Your NFT collection on Base network',
    'stats.viewOnBaseScan': 'View on BaseScan',
    'stats.tokenId': 'Token ID:',
    'stats.unknownCollection': 'Unknown Collection',
    
    // Logs
    'logs.title': 'Real-Time Logs',
    'logs.description': 'Transaction status and details (timestamped)',
    'logs.clear': 'Clear logs',
    'logs.clearing': 'Clearing...',
    'logs.empty': 'No logs yet. Start a transaction to see logs here.',
    
    // Contract Information
    'contract.title': 'Contract Information',
    'contract.factory': 'Factory Contract:',
    'contract.clones': 'Clone Contracts',
    'contract.pingers': 'Real Pinger Contracts',
    
    // Information Section
    'info.title': 'Information',
    'info.deployedContracts': 'Deployed Contracts:',
    'info.deployedContractsDesc': 'Real contract deployments (permanent footprint on Base chain). Avg cost: $0.0007 – $0.002',
    'info.transactions': 'Transactions (Tx):',
    'info.transactionsDesc': 'On-chain activity score (every tx boosts your footprint). Avg cost: $0.0001 – $0.0005',
    'info.uniqueContracts': 'Unique Contracts:',
    'info.uniqueContractsDesc': 'Unique contract interactions (each clone counts as a unique contract). Avg cost: $0.0002 – $0.0008',
    'info.createNFTs': 'Create NFTs:',
    'info.createNFTsDesc': 'Unique contract and Unique NFT creation, You will be creator and minter. Avg cost: $0.01 – $0.05',
    'info.costs': 'Costs vary with network congestion, so try using BaseR when gas prices are low. The app never charges any fees, only gas paid directly to the Base network.',
    'info.contact': 'For any questions, issues or suggestions, reach out on Farcaster:',
    
    // Language Selector
    'language.title': 'Language',
    'language.english': 'English',
    'language.turkish': 'Türkçe',
    
    // Footer
    'footer.builtWith': 'Built with',
    'footer.using': 'using',
    
    // Toast Messages
    'toast.walletConnected': 'Wallet successfully connected!',
    'toast.walletDisconnected': 'Wallet disconnected',
    'toast.networkSwitched': 'Switched to Base network!',
    'toast.networkSwitchFailed': 'Failed to add Base network!',
    'toast.operationsComplete': 'Operations completed successfully!',
    'toast.processStopped': 'Process stopped',
    'toast.logsCleared': 'Logs cleared successfully',
    'toast.logsClearFailed': 'Failed to clear logs',
    'toast.nftMintSuccess': 'NFT collection minted successfully!',
    'toast.nftMintFailed': 'Error occurred during minting!',
    'toast.deploySuccess': 'Pinger contract successfully deployed!',
    'toast.deployFailed': 'Error occurred during deployment!',
    'toast.connectWalletFirst': 'Please connect your wallet first!',
    'toast.switchToBase': 'Please switch to Base network!',
    'toast.enterHandle': 'Please enter a handle!',
    'toast.invalidAmount': 'Amount must be between 1 and 10!',
    'toast.transactionRejected': 'Transaction rejected by user',
    'toast.insufficientFunds': 'Insufficient funds for transaction',
    'toast.noWallet': 'No compatible wallet found! Please install MetaMask, Rabby, or WalletConnect.',
  },
  tr: {
    // Header
    'header.title': 'BaseR by Mr VooDoo',
    'header.subtitle': 'Kolayca farm yapın, sözleşme dağıtın ve NFT mintleyin, BaseR ile hepsi tamamen ücretsiz!',
    
    // Security Alert
    'security.title': 'Güvenlik:',
    'security.message': 'Bu uygulama hiçbir özel anahtarı saklamaz veya işlemez. Tüm işlemler doğrudan cüzdanınızdan imzalanır ve blockchain\'e gönderilir.',
    
    // Network Warning
    'network.warning': 'Yanlış ağdasınız! Bu uygulama Base ağında çalışır. Lütfen Base ağına geçin.',
    'network.switchButton': 'Base\'e Geç',
    
    // Wallet Connection
    'wallet.title': 'Cüzdan Bağlantısı',
    'wallet.connect': 'Cüzdan Bağla',
    'wallet.disconnect': 'Bağlantıyı Kes',
    'wallet.connecting': 'Bağlanıyor',
    'wallet.connected': 'Cüzdan bağlandı',
    
    // NFT Mint Section
    'nft.title': 'NFT koleksiyonunuzu oluşturun ve mint edin',
    'nft.handle': 'Koleksiyon Adı',
    'nft.handlePlaceholder': 'Koleksiyon adını girin',
    'nft.amount': 'Miktar (1-10)',
    'nft.amountPlaceholder': 'Miktar seçin',
    'nft.mintButton': 'Koleksiyonu Mint Et',
    'nft.minting': 'Mint ediliyor...',
    
    // Deploy Contract
    'deploy.title': 'Kontrat Deploy Et',
    'deploy.button': 'Kontrat Deploy Et 🚀',
    'deploy.deploying': 'Deploy ediliyor...',
    
    // Transaction Farming
    'farming.title': 'İşlem Farming',
    'farming.description': 'İlk sayı kaç benzersiz kontratla etkileşim kurmak istediğinizi belirler. İkinci sayı her benzersiz kontrat için kaç işlem gönderileceğini tanımlar.',
    'farming.cloneCount': 'Kaç Benzersiz Kontrat oluşturmak istiyorsunuz',
    'farming.pingsPerClone': 'Kontrat başına işlem sayısı',
    'farming.advanced': 'Gelişmiş',
    'farming.advancedWarning': 'Ne yaptığınızı bilmiyorsanız değiştirmeyin',
    'farming.gasMode': 'Gas Modu',
    'farming.walletSuggested': 'Cüzdan önerisi',
    'farming.custom': 'Özel',
    'farming.minGasCreateClone': 'MinGas(createClone)',
    'farming.minGasPing': 'MinGas(ping)',
    'farming.maxFee': 'MaxFee (gwei)',
    'farming.priority': 'Öncelik (gwei)',
    'farming.gasBuffer': 'GasBuffer (%)',
    'farming.startButton': 'TX Farming Başlat ⚡',
    'farming.stopButton': 'Durdur',
    
    // Wallet Stats
    'stats.title': 'Cüzdan Aktivitesi',
    'stats.lastUpdated': 'Son güncelleme:',
    'stats.refresh': 'Yenile',
    'stats.transactions': 'İşlemler',
    'stats.ownedNFTs': 'Sahip Olunan NFT\'ler',
    'stats.deployedContracts': 'Dağıtılan Kontratlar',
    'stats.viewDetails': 'Detayları görüntüle',
    'stats.loading': 'BaseScan\'den veri yükleniyor…',
    'stats.nftModalTitle': 'Sahip Olunan NFT\'ler',
    'stats.nftModalDescription': 'Base ağındaki NFT koleksiyonunuz',
    'stats.viewOnBaseScan': 'BaseScan\'de Görüntüle',
    'stats.tokenId': 'Token ID:',
    'stats.unknownCollection': 'Bilinmeyen Koleksiyon',
    
    // Logs
    'logs.title': 'Gerçek Zamanlı Loglar',
    'logs.description': 'İşlem durumu ve detayları (zaman damgalı)',
    'logs.clear': 'Logları temizle',
    'logs.clearing': 'Temizleniyor...',
    'logs.empty': 'Henüz log yok. Logları görmek için bir işlem başlatın.',
    
    // Contract Information
    'contract.title': 'Kontrat Bilgileri',
    'contract.factory': 'Factory Kontratı:',
    'contract.clones': 'Clone Kontratları',
    'contract.pingers': 'Gerçek Pinger Kontratları',
    
    // Information Section
    'info.title': 'Bilgi',
    'info.deployedContracts': 'Kontrat Deploy Etme:',
    'info.deployedContractsDesc': 'Gerçek kontrat dağıtımları (Base zincirinde kalıcı iz). Ortalama maliyet: $0.0007 – $0.002',
    'info.transactions': 'İşlemler (Tx):',
    'info.transactionsDesc': 'Zincir üstü aktivite skoru (her tx izinizi artırır). Ortalama maliyet: $0.0001 – $0.0005',
    'info.uniqueContracts': 'Benzersiz Kontratlar:',
    'info.uniqueContractsDesc': 'Benzersiz kontrat etkileşimleri (her clone benzersiz bir kontrat sayılır). Ortalama maliyet: $0.0002 – $0.0008',
    'info.createNFTs': 'NFT Oluştur:',
    'info.createNFTsDesc': 'Benzersiz kontrat ve Benzersiz NFT oluşturma, Siz yaratıcı ve mint eden olacaksınız. Ortalama maliyet: $0.01 – $0.05',
    'info.costs': 'Maliyetler ağ yoğunluğuna göre değişir, işlemlerinizi ağ yoğun değilken yapınız! Bu uygulama asla ücret talep etmez veya kesinti yapmaz, tüm maliyetler yalnızca doğrudan Base ağına ödenen gas ücretleridir.',
    'info.contact': 'Sorular, sorunlar veya öneriler için Farcaster\'da iletişime geçin:',
    
    // Language Selector
    'language.title': 'Dil',
    'language.english': 'English',
    'language.turkish': 'Türkçe',
    
    // Footer
    'footer.builtWith': 'ile yapıldı',
    'footer.using': 'kullanılarak',
    
    // Toast Messages
    'toast.walletConnected': 'Cüzdan başarıyla bağlandı!',
    'toast.walletDisconnected': 'Cüzdan bağlantısı kesildi',
    'toast.networkSwitched': 'Base ağına geçildi!',
    'toast.networkSwitchFailed': 'Base ağı eklenemedi!',
    'toast.operationsComplete': 'İşlemler başarıyla tamamlandı!',
    'toast.processStopped': 'İşlem durduruldu',
    'toast.logsCleared': 'Loglar başarıyla temizlendi',
    'toast.logsClearFailed': 'Loglar temizlenemedi',
    'toast.nftMintSuccess': 'NFT koleksiyonu başarıyla mint edildi!',
    'toast.nftMintFailed': 'Mint sırasında hata oluştu!',
    'toast.deploySuccess': 'Pinger kontratı başarıyla dağıtıldı!',
    'toast.deployFailed': 'Dağıtım sırasında hata oluştu!',
    'toast.connectWalletFirst': 'Lütfen önce cüzdanınızı bağlayın!',
    'toast.switchToBase': 'Lütfen Base ağına geçin!',
    'toast.enterHandle': 'Lütfen bir tanıtıcı girin!',
    'toast.invalidAmount': 'Miktar 1 ile 10 arasında olmalıdır!',
    'toast.transactionRejected': 'İşlem kullanıcı tarafından reddedildi',
    'toast.insufficientFunds': 'İşlem için yetersiz bakiye',
    'toast.noWallet': 'Uyumlu cüzdan bulunamadı! Lütfen MetaMask, Rabby veya WalletConnect yükleyin.',
  }
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    // Load language from localStorage or default to English
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'tr')) {
      setLanguageState(savedLanguage);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
