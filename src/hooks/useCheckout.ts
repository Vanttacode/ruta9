// src/hooks/useCheckout.ts
import { useState, useEffect } from 'react';
import { cartItems, cartTotal, clearCart } from '../store/cartStore';
import { supabase } from '../lib/supabase';

export type CheckoutStatus = 'IDLE' | 'PROCESSING' | 'SAVING' | 'SUCCESS' | 'ERROR';

export function useCheckout(locationId: string) {
  const [status, setStatus] = useState<CheckoutStatus>('IDLE');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    // Escucha el evento que dispara la app nativa de Android cuando Transbank responde
    const handlePaymentResult = async (event: Event) => {
      const { success, trxId, error } = (event as CustomEvent).detail;

      if (success) {
        setStatus('SAVING');
        await finalizeOrder(trxId);
      } else {
        setStatus('ERROR');
        setErrorMsg(error || "Transacción rechazada por el banco.");
        setTimeout(() => setStatus('IDLE'), 6000); // Vuelve al inicio tras un error
      }
    };

    window.addEventListener('PaymentResult', handlePaymentResult);
    return () => window.removeEventListener('PaymentResult', handlePaymentResult);
  }, [locationId]);

  const startPayment = () => {
    const total = cartTotal.get();
    if (total === 0) return;

    setStatus('PROCESSING');
    
    // Contrato con el Hardware
    if (typeof window !== 'undefined' && (window as any).AndroidBridge) {
      (window as any).AndroidBridge.startPaymentTransaction(total.toString());
    } else {
      // Modo Desarrollo en PC: Simulamos un pago exitoso tras 3 segundos
      console.warn("⚠️ AndroidBridge no detectado. Simulando MDB en PC...");
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('PaymentResult', { 
          detail: { success: true, trxId: 'DEV-' + Date.now() } 
        }));
      }, 3000);
    }
  };

  const finalizeOrder = async (trxId: string) => {
    try {
      const items = cartItems.get();
      const total = cartTotal.get();
      // Generamos ID visual (Ej: A4F)
      const shortId = Math.random().toString(36).substring(2, 5).toUpperCase();

      // 1. Guardar Cabecera
      const { data: order, error: orderErr } = await supabase
        .from('ruta9_orders')
        .insert({
          short_id: shortId,
          location_id: locationId,
          total_amount: total,
          status: 'received',
          origin: 'totem',
          payment_method: 'tarjeta',
          transbank_response: { trxId }
        })
        .select().single();

      if (orderErr) throw new Error("Error DB: Orders");

      // 2. Guardar Items
      const orderItemsData = items.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.lineTotal / item.quantity,
        total_price: item.lineTotal,
        modifiers_snapshot: item.modifiers
      }));

      const { error: itemsErr } = await supabase.from('ruta9_order_items').insert(orderItemsData);
      if (itemsErr) throw new Error("Error DB: Items");

      // 3. Imprimir Ticket (Adaptado a 58mm -> max 32 chars)
      const printData = {
        order: shortId,
        date: new Date().toLocaleString('es-CL'),
        total: total,
        items: items.map(i => ({ q: i.quantity, n: i.product.name.substring(0, 15), p: i.lineTotal }))
      };

      if (typeof window !== 'undefined' && (window as any).AndroidBridge?.printCustomerTicket) {
        (window as any).AndroidBridge.printCustomerTicket(JSON.stringify(printData));
      }

      setOrderId(shortId);
      setStatus('SUCCESS');
      clearCart();

    } catch (err: any) {
      console.error(err);
      setStatus('ERROR');
      setErrorMsg("Error guardando el pedido. Busque asistencia.");
    }
  };

  return { status, errorMsg, orderId, startPayment, setStatus };
}