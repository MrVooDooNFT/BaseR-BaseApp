import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Web3Provider } from '../lib/web3';
import { useLanguage } from '../contexts/LanguageContext';

const NFT_FACTORY_ADDR = '0x5A5aea5bF11BaaF2f3f420C8e694425aC3590c8C';

const NFT_FACTORY_ABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "handle", "type": "string" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "mint",
    "outputs": [{ "internalType": "address", "name": "collection", "type": "address" }],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

interface NFTMintSectionProps {
  web3Provider: Web3Provider | null;
  isConnected: boolean;
  isOnBaseNetwork: boolean;
  onLog: (message: string, type: 'info' | 'success' | 'error' | 'warning') => void;
}

class ABIEncoder {
  static encodeFunctionData(abi: any[], functionName: string, params: any[]): string {
    const func = abi.find(f => f.name === functionName && f.type === 'function');
    if (!func) {
      throw new Error(`Function ${functionName} not found in ABI`);
    }

    const functionSelector = '0x6a627842';
    
    const encodedParams = this.encodeParameters(func.inputs, params);
    
    return functionSelector + encodedParams;
  }

  private static encodeParameters(inputs: any[], params: any[]): string {
    if (inputs.length === 0) return '';
    
    let staticData = '';
    let dynamicData = '';
    let dynamicOffset = inputs.length * 32;

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const param = params[i];

      if (input.type === 'string' || input.type === 'bytes' || input.type.endsWith('[]')) {
        staticData += this.encodeUint256(dynamicOffset);
        const encoded = this.encodeDynamicType(input.type, param);
        dynamicData += encoded;
        dynamicOffset += encoded.length / 2;
      } else if (input.type.startsWith('uint') || input.type.startsWith('int')) {
        staticData += this.encodeUint256(param);
      } else if (input.type === 'address') {
        staticData += this.encodeAddress(param);
      } else if (input.type === 'bool') {
        staticData += this.encodeBool(param);
      } else {
        throw new Error(`Unsupported type: ${input.type}`);
      }
    }

    return staticData + dynamicData;
  }

  private static encodeDynamicType(type: string, value: any): string {
    if (type === 'string') {
      return this.encodeString(value);
    } else if (type === 'bytes') {
      return this.encodeBytes(value);
    }
    throw new Error(`Unsupported dynamic type: ${type}`);
  }

  private static encodeString(str: string): string {
    const bytes = new TextEncoder().encode(str);
    const length = bytes.length;
    
    let encoded = this.encodeUint256(length);
    
    const hex = Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    const paddedHex = hex.padEnd(Math.ceil(hex.length / 64) * 64, '0');
    
    return encoded + paddedHex;
  }

  private static encodeBytes(bytes: Uint8Array): string {
    const length = bytes.length;
    let encoded = this.encodeUint256(length);
    
    const hex = Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    const paddedHex = hex.padEnd(Math.ceil(hex.length / 64) * 64, '0');
    
    return encoded + paddedHex;
  }

  private static encodeUint256(value: number | string): string {
    const num = typeof value === 'string' ? parseInt(value) : value;
    return num.toString(16).padStart(64, '0');
  }

  private static encodeAddress(address: string): string {
    const addr = address.startsWith('0x') ? address.slice(2) : address;
    return addr.toLowerCase().padStart(64, '0');
  }

  private static encodeBool(value: boolean): string {
    return value ? '0'.repeat(63) + '1' : '0'.repeat(64);
  }
}

export default function NFTMintSection({ 
  web3Provider, 
  isConnected, 
  isOnBaseNetwork, 
  onLog 
}: NFTMintSectionProps) {
  const { t } = useLanguage();
  const [handle, setHandle] = useState<string>('');
  const [amount, setAmount] = useState<string>('1');
  const [isMinting, setIsMinting] = useState(false);

  const mintNFTCollection = async () => {
    if (!web3Provider || !isConnected) {
      toast.error(t('toast.connectWalletFirst'));
      return;
    }

    if (!isOnBaseNetwork) {
      toast.error(t('toast.switchToBase'));
      return;
    }

    if (!handle.trim()) {
      toast.error(t('toast.enterHandle'));
      return;
    }

    const amountNum = parseInt(amount);
    if (amountNum < 1 || amountNum > 10) {
      toast.error(t('toast.invalidAmount'));
      return;
    }

    setIsMinting(true);
    onLog(`Minting NFT collection with handle: ${handle}, amount: ${amountNum}...`, 'info');

    try {
      const accounts = await web3Provider.getAccounts();
      if (accounts.length === 0) {
        throw new Error('No accounts connected');
      }

      const data = ABIEncoder.encodeFunctionData(NFT_FACTORY_ABI, 'mint', [handle, amountNum]);

      onLog(`Function selector: 0x6a627842 (mint)`, 'info');
      onLog(`Estimating gas for NFT minting transaction...`, 'info');

      let gasEstimate: number | null = null;
      try {
        const estimateHex = await (web3Provider as any).ethereum.request({
          method: 'eth_estimateGas',
          params: [{
            to: NFT_FACTORY_ADDR,
            from: accounts[0],
            data: data,
            value: '0x0'
          }],
        });
        gasEstimate = parseInt(estimateHex, 16);
        onLog(`Gas estimate: ${gasEstimate.toLocaleString()}`, 'info');
      } catch (estimateError: any) {
        onLog(`Gas estimation failed: ${estimateError.message}`, 'warning');
        onLog(`Will use wallet-suggested gas`, 'info');
      }

      onLog(`Sending transaction to NFTFactory at ${NFT_FACTORY_ADDR}...`, 'info');

      const transactionParameters: any = {
        to: NFT_FACTORY_ADDR,
        from: accounts[0],
        data: data,
        value: '0x0'
      };

      if (gasEstimate !== null) {
        transactionParameters.gas = '0x' + gasEstimate.toString(16);
        onLog(`Using estimated gas limit: ${gasEstimate.toLocaleString()}`, 'info');
      } else {
        onLog(`Using wallet-suggested gas parameters`, 'info');
      }

      const txHash = await web3Provider.sendTransaction(transactionParameters);

      onLog(`NFT minting transaction sent: ${txHash}`, 'info');
      toast.info('Transaction sent! Waiting for confirmation...');

      const receipt = await web3Provider.waitForTransaction(txHash);

      if (receipt.status === '0x1') {
        const gasUsed = parseInt(receipt.gasUsed, 16).toLocaleString();
        
        onLog(`✓ NFT collection successfully minted!`, 'success');
        onLog(`Transaction Hash: ${txHash}`, 'info');
        onLog(`Status: Success`, 'success');
        onLog(`Gas Used: ${gasUsed}`, 'info');
        
        let collectionAddress: string | null = null;
        
        for (const log of receipt.logs) {
          if (log.address.toLowerCase() === NFT_FACTORY_ADDR.toLowerCase()) {
            if (log.topics && log.topics.length > 1) {
              collectionAddress = '0x' + log.topics[1].slice(-40);
              break;
            }
          }
        }
        
        if (collectionAddress) {
          onLog(`New Collection Address: ${collectionAddress}`, 'success');
        }
        
        toast.success(t('toast.nftMintSuccess'));
        
        setHandle('');
        setAmount('1');
      } else {
        onLog(`NFT minting transaction failed`, 'error');
        toast.error(t('toast.nftMintFailed'));
      }
    } catch (error: any) {
      const errorMessage = error.message || error.toString();
      onLog(`NFT minting error: ${errorMessage}`, 'error');
      
      if (errorMessage.includes('user rejected') || errorMessage.includes('User denied')) {
        toast.error(t('toast.transactionRejected'));
      } else if (errorMessage.includes('insufficient funds')) {
        toast.error(t('toast.insufficientFunds'));
      } else {
        toast.error(t('toast.nftMintFailed'));
      }
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-center">
          {t('nft.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center mb-6">
          <img 
            src="https://mrvoodoonft.github.io/BaseR-Source/assets/nft.jpg" 
            alt="NFT Collection" 
            className="w-[25vw] min-w-[150px] max-w-[300px] h-auto rounded-lg shadow-md"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="nft-handle">{t('nft.handle')}</Label>
          <Input
            id="nft-handle"
            type="text"
            placeholder={t('nft.handlePlaceholder')}
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            disabled={isMinting}
            className="w-full"
          />
        </div>
        <div className="space-y-2">
<Label htmlFor="nft-amount">{t('nft.amount')}</Label>
<div id="nft-amount" className="mt-2 flex items-center gap-3">
  {Array.from({ length: 10 }, (_, i) => (i + 1)).map((n) => (
    <label key={n} className="inline-flex items-center">
      <input
        type="radio"
        name="nft-amount"
        value={n}
        checked={Number(amount) === n}
        onChange={() => setAmount(String(n))}
        className="appearance-none w-3.5 h-3.5 rounded-full bg-gray-300 cursor-pointer
                   checked:bg-blue-600 transition-colors"
        disabled={isMinting}
      />
      <span className="sr-only">{n}</span>
    </label>
  ))}
</div>

        </div>
        <Button 
          onClick={mintNFTCollection}
          disabled={!isConnected || !isOnBaseNetwork || isMinting || !handle.trim()}
          size="lg"
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
        >
          {isMinting ? t('nft.minting') : t('nft.mintButton')}
        </Button>
      </CardContent>
    </Card>
  );
}
