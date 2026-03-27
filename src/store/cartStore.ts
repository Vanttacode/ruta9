// src/store/cartStore.ts
import { atom, computed } from 'nanostores';

// Tipos basados en nuestra base de datos
export interface Product {
  id: string;
  name: string;
  base_price: number;
  image_url: string;
  category_id: string;
  has_modifiers: boolean;
}

export interface CartItem {
  id: string; // UUID temporal para la línea del carrito
  product: Product;
  quantity: number;
  modifiers: any[]; // Lo dejamos preparado para los extras
  lineTotal: number;
}

// Store principal (Inicia vacío)
export const cartItems = atom<CartItem[]>([]);

// Computed: Suma el total a pagar en tiempo real
export const cartTotal = computed(cartItems, items => 
  items.reduce((total, item) => total + item.lineTotal, 0)
);

// Acciones puras
export function addToCart(product: Product) {
  const currentItems = cartItems.get();
  
  // Buscamos si el producto ya está en el carrito (sin modificadores)
  const existingIndex = currentItems.findIndex(item => item.product.id === product.id && item.modifiers.length === 0);
  
  if (existingIndex >= 0) {
    // Si existe, sumamos 1 a la cantidad
    const newItems = [...currentItems];
    newItems[existingIndex].quantity += 1;
    newItems[existingIndex].lineTotal += product.base_price;
    cartItems.set(newItems);
  } else {
    // Si es nuevo, creamos la línea
    cartItems.set([...currentItems, {
      id: crypto.randomUUID(),
      product,
      quantity: 1,
      modifiers: [],
      lineTotal: product.base_price
    }]);
  }
}

export function removeFromCart(itemId: string) {
  cartItems.set(cartItems.get().filter(item => item.id !== itemId));
}

export function clearCart() {
  cartItems.set([]);
}