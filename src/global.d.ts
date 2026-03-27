// src/global.d.ts
export {};

declare global {
  interface Window {
    // Estas son las funciones que Android nos prestará
    AndroidHardware?: {
      startTransbankPayment: (amount: number, orderId: string) => void;
      printThermalTicket: (orderId: string, itemsJson: string, total: number, isTotem: boolean) => void;
    };
    // Estas son las funciones que nosotros le prestaremos a Android
    onPaymentSuccess?: (orderId: string) => void;
    onPaymentError?: (errorMsg: string) => void;
  }
}