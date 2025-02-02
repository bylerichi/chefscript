import { useState, useEffect } from 'react';
import { X, CreditCard } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { loadScript } from "@paypal/paypal-js";

interface TokenPackage {
  tokens: number;
  price: number;
  description: string;
}

const TOKEN_PACKAGES: TokenPackage[] = [
  { tokens: 30, price: 3, description: 'Perfect for trying out the service' },
  { tokens: 200, price: 17, description: 'Most popular for regular bloggers' },
  { tokens: 800, price: 70, description: 'Best value for power users' }
];

interface TokenPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TokenPurchaseModal({ isOpen, onClose }: TokenPurchaseModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<TokenPackage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paypalError, setPaypalError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadPayPal() {
      if (!selectedPackage) return;

      try {
        const paypal = await loadScript({
          clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID,
          currency: "USD",
          intent: "capture",
        });

        if (!mounted) return;

        if (!paypal?.Buttons) {
          throw new Error('PayPal SDK failed to load');
        }

        const container = document.getElementById('paypal-button-container');
        if (!container) return;

        container.innerHTML = '';
        setPaypalError(null);

        const button = paypal.Buttons({
          style: {
            layout: 'horizontal',
            color: 'blue',
            shape: 'rect',
            label: 'pay'
          },
          createOrder: (_data: any, actions: any) => {
            return actions.order.create({
              purchase_units: [{
                amount: {
                  value: selectedPackage.price.toString(),
                  currency_code: 'USD'
                },
                description: `${selectedPackage.tokens} Tokens Package`
              }]
            });
          },
          onApprove: async (_data: any, actions: any) => {
            setIsProcessing(true);
            try {
              const order = await actions.order.capture();
              if (order.status === 'COMPLETED') {
                await handleTokenPurchase(selectedPackage.tokens);
                onClose();
              }
            } catch (error) {
              console.error('Payment processing error:', error);
              setPaypalError('Failed to process payment. Please try again.');
            } finally {
              setIsProcessing(false);
            }
          },
          onError: (err: any) => {
            console.error('PayPal error:', err);
            setPaypalError('There was an error with PayPal. Please try again.');
          }
        });

        await button.render('#paypal-button-container');
      } catch (error) {
        if (mounted) {
          console.error('PayPal initialization error:', error);
          setPaypalError('Failed to load PayPal. Please try again later.');
        }
      }
    }

    loadPayPal();

    return () => {
      mounted = false;
      const container = document.getElementById('paypal-button-container');
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [selectedPackage, onClose]);

  async function handleTokenPurchase(tokenAmount: number) {
    try {
      const { error } = await supabase.rpc('add_tokens', {
        token_amount: tokenAmount
      });

      if (error) throw error;
    } catch (error) {
      console.error('Token purchase error:', error);
      throw error;
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Purchase Tokens</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {paypalError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{paypalError}</p>
          </div>
        )}

        <div className="grid gap-4 mb-6">
          {TOKEN_PACKAGES.map((pkg) => (
            <button
              key={pkg.tokens}
              onClick={() => setSelectedPackage(pkg)}
              disabled={isProcessing}
              className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                selectedPackage?.tokens === pkg.tokens
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-primary hover:bg-primary/5'
              } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div>
                <span className="font-medium">{pkg.tokens} Tokens</span>
                <p className="text-sm text-gray-500">{pkg.description}</p>
              </div>
              <div className="flex items-center">
                <span className="font-bold text-lg">${pkg.price}</span>
                <CreditCard className="ml-2 h-4 w-4" />
              </div>
            </button>
          ))}
        </div>

        {selectedPackage && (
          <div className="mb-6">
            <div id="paypal-button-container" className={isProcessing ? 'opacity-50 pointer-events-none' : ''}></div>
          </div>
        )}

        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Token Usage</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• Recipe generation: 1 token per recipe</li>
            <li>• Style creation: 2 tokens per style</li>
          </ul>
        </div>

        <p className="mt-4 text-sm text-gray-500 text-center">
          Secure payment processing through PayPal. Tokens are added instantly to your account.
        </p>
      </div>
    </div>
  );
}