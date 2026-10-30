import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { cartService } from '../services/cartService';
import { CartResponse } from '../types/cart';
import { cartError } from '../utils/cart';

interface CartContextType {
  cart: CartResponse | null;
  loading: boolean;
  busy: boolean;
  error: string;
  refresh: () => Promise<void>;
  addItem: (variantId: number, quantity: number) => Promise<CartResponse>;
  updateItem: (itemId: number, quantity: number) => Promise<CartResponse>;
  removeItem: (itemId: number) => Promise<CartResponse>;
  clear: () => Promise<CartResponse>;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, isCustomer, isAuthenticated, isLoading: authLoading, token } = useAuth();
  const owner = !authLoading && isAuthenticated && isCustomer ? String(user?.id || token) : '';
  const [snapshot, setSnapshot] = useState<{ owner: string; cart: CartResponse | null; error: string; loading: boolean }>({ owner: '', cart: null, error: '', loading: false });
  const [busy, setBusy] = useState(false);
  const operation = useRef(false);
  const generation = useRef(0);
  const refreshSequence = useRef(0);

  const refresh = useCallback(async () => {
    if (!owner) return;
    const session = generation.current;
    const sequence = ++refreshSequence.current;
    setSnapshot(previous => ({ owner, cart: previous.owner === owner ? previous.cart : null, error: '', loading: true }));
    try {
      const cart = await cartService.getCart();
      if (generation.current === session && refreshSequence.current === sequence) setSnapshot({ owner, cart, error: '', loading: false });
    } catch (failure) {
      if (generation.current === session && refreshSequence.current === sequence) setSnapshot(previous => ({ ...previous, owner, error: cartError(failure), loading: false }));
    }
  }, [owner]);

  useEffect(() => {
    generation.current += 1;
    operation.current = false;
    setBusy(false);
    if (owner) void refresh();
    return () => { generation.current += 1; };
  }, [owner, refresh]);

  const run = async (action: () => Promise<CartResponse>) => {
    if (!owner) throw new Error('Vui lòng đăng nhập bằng tài khoản khách hàng.');
    if (operation.current) throw new Error('Đang cập nhật giỏ hàng. Vui lòng chờ.');
    operation.current = true;
    setBusy(true);
    const session = generation.current;
    // Invalidate a GET started before this write; its older snapshot must not replace the result.
    ++refreshSequence.current;
    try {
      const cart = await action();
      if (generation.current !== session) throw new Error('Phiên đăng nhập đã thay đổi. Vui lòng tải lại giỏ hàng.');
      ++refreshSequence.current;
      setSnapshot({ owner, cart, error: '', loading: false });
      return cart;
    } catch (failure) {
      throw new Error(cartError(failure));
    } finally {
      if (generation.current === session) { operation.current = false; setBusy(false); }
    }
  };

  return <CartContext.Provider value={{
    cart: snapshot.owner === owner && owner ? snapshot.cart : null,
    loading: Boolean(owner) && (snapshot.owner !== owner || snapshot.loading),
    error: snapshot.owner === owner && owner ? snapshot.error : '',
    busy,
    refresh,
    addItem: (variantId, quantity) => run(() => cartService.addItem(variantId, quantity)),
    updateItem: (itemId, quantity) => run(() => cartService.updateItem(itemId, quantity)),
    removeItem: itemId => run(() => cartService.removeItem(itemId)),
    clear: () => run(() => cartService.clear()),
  }}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}
