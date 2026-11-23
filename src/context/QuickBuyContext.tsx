import { createContext, useContext, useState, ReactNode } from 'react';
import { ProductResponse } from '../types/product';
import QuickBuyModal from '../components/product/QuickBuyModal';

interface QuickBuyContextType {
  openQuickBuy: (product: ProductResponse) => void;
  closeQuickBuy: () => void;
}

const QuickBuyContext = createContext<QuickBuyContextType | undefined>(undefined);

export function QuickBuyProvider({ children }: { children: ReactNode }) {
  const [targetProduct, setTargetProduct] = useState<ProductResponse | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const openQuickBuy = (product: ProductResponse) => {
    setTargetProduct(product);
    setIsOpen(true);
  };

  const closeQuickBuy = () => {
    setIsOpen(false);
    setTargetProduct(null);
  };

  return (
    <QuickBuyContext.Provider value={{ openQuickBuy, closeQuickBuy }}>
      {children}
      <QuickBuyModal
        isOpen={isOpen}
        onClose={closeQuickBuy}
        product={targetProduct}
      />
    </QuickBuyContext.Provider>
  );
}

export function useQuickBuy() {
  const context = useContext(QuickBuyContext);
  return context;
}
