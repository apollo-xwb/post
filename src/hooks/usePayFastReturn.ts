import { useEffect, useRef } from 'react';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../App';
import type { Order } from '../types';

export type PayFastReturnResult = {
  orderId: string;
  outcome: 'paid' | 'cancelled' | 'pending' | 'failed';
  order?: Order;
  payfastRef?: string;
};

type Listener = (result: PayFastReturnResult) => void;

const listeners = new Set<Listener>();

export function subscribePayFastReturn(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(result: PayFastReturnResult) {
  listeners.forEach((l) => l(result));
}

function clearPayFastQueryParams() {
  const url = new URL(window.location.href);
  url.searchParams.delete('payfast_return');
  url.searchParams.delete('payfast_cancel');
  url.searchParams.delete('m_payment_id');
  window.history.replaceState({}, '', url.pathname + url.search);
}

export function usePayFastReturnHandler() {
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;

    const params = new URLSearchParams(window.location.search);
    const isReturn = params.get('payfast_return') === '1';
    const isCancel = params.get('payfast_cancel') === '1';
    const orderId = params.get('m_payment_id');

    if (!orderId || (!isReturn && !isCancel)) return;

    handled.current = true;

    const orderRef = doc(db, 'orders', orderId);

    if (isCancel) {
      void (async () => {
        try {
          const snap = await getDoc(orderRef);
          if (snap.exists()) {
            await updateDoc(orderRef, {
              paymentStatus: 'cancelled',
              staffNote: 'PayFast payment cancelled by customer',
            });
          }
        } catch (e) {
          console.warn('Failed to mark cancelled payment', e);
        }
        notify({ orderId, outcome: 'cancelled' });
        clearPayFastQueryParams();
      })();
      return;
    }

    const unsubscribe = onSnapshot(
      orderRef,
      (snap) => {
        if (!snap.exists()) {
          notify({ orderId, outcome: 'pending' });
          return;
        }
        const order = snap.data() as Order;
        const status = order.paymentStatus;

        if (status === 'paid') {
          notify({
            orderId,
            outcome: 'paid',
            order,
            payfastRef: order.payfastPaymentId,
          });
          clearPayFastQueryParams();
          unsubscribe();
        } else if (status === 'failed') {
          notify({ orderId, outcome: 'failed', order });
          clearPayFastQueryParams();
          unsubscribe();
        } else if (status === 'cancelled') {
          notify({ orderId, outcome: 'cancelled', order });
          clearPayFastQueryParams();
          unsubscribe();
        }
      },
      (err) => console.warn('PayFast return listener error', err)
    );

    const timeout = window.setTimeout(() => {
      void getDoc(orderRef).then((snap) => {
        if (!snap.exists()) {
          notify({ orderId, outcome: 'pending' });
          return;
        }
        const order = snap.data() as Order;
        if (order.paymentStatus !== 'paid') {
          notify({ orderId, outcome: 'pending', order });
        }
      });
    }, 90000);

    return () => {
      unsubscribe();
      window.clearTimeout(timeout);
    };
  }, []);
}
