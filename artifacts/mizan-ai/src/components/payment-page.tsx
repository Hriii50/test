'use client';

import { useEffect, useState } from 'react';
import { Check, CreditCard, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  getCreateBillingCheckoutMutationOptions,
  getGetBillingSessionQueryOptions,
  useGetBillingPrice,
} from '@workspace/api-client-react';
import { Button, FormError, PageTitle, Panel } from '@/components/mizan-ui';

const request = { credentials: 'include' as const };

function formatAmount(amount: number, currency: string): string {
  const currencyCode = currency.toUpperCase();
  const formatter = new Intl.NumberFormat('ar-KW', {
    style: 'currency',
    currency: currencyCode,
  });
  const exponent = formatter.resolvedOptions().maximumFractionDigits ?? 2;
  return formatter.format(amount / 10 ** exponent);
}

export function PaymentPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [wasCancelled, setWasCancelled] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const price = useGetBillingPrice({ request });
  const payment = useQuery({
    ...getGetBillingSessionQueryOptions(
      { session_id: sessionId ?? 'cs_test_not_checked_yet' },
      { request },
    ),
    enabled: Boolean(sessionId),
    retry: false,
  });
  const checkout = useMutation(getCreateBillingCheckoutMutationOptions({
    request,
    mutation: {
      onSuccess: ({ url }) => window.location.assign(url),
      onError: () => setCheckoutError('تعذّر بدء الدفع. حاول مرة أخرى بعد قليل.'),
    },
  }));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSessionId(params.get('session_id'));
    setWasCancelled(params.get('canceled') === '1');
  }, []);

  const paid = payment.data?.status === 'paid';
  const processing = payment.data?.status === 'processing';

  return <div data-testid="page-payment">
    <PageTitle
      eyebrow="دفع آمن"
      title="دفعة لمرة واحدة"
      description="تتم معالجة بيانات البطاقة بأمان لدى Stripe. لا نخزّن معلومات بطاقتك."
    />

    {paid ? (
      <Panel className="mx-auto max-w-2xl p-7 text-center sm:p-10">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-800">
          <Check size={28} />
        </span>
        <h2 className="mt-5 text-xl font-bold text-secondary">تم تأكيد الدفع</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">وصلنا تأكيد Stripe، وتم حفظ الدفعة في حسابك.</p>
        {payment.data?.amount !== null && payment.data?.amount !== undefined && payment.data.currency && (
          <p className="mt-5 text-2xl font-semibold text-secondary number-ltr">
            {formatAmount(payment.data.amount, payment.data.currency)}
          </p>
        )}
      </Panel>
    ) : (
      <div className="mx-auto grid max-w-4xl gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <Panel className="p-6 sm:p-8">
          {price.isLoading ? (
            <div className="space-y-3" role="status" aria-label="جارٍ تحميل السعر">
              <div className="skeleton h-5 w-32 rounded-lg" />
              <div className="skeleton h-8 w-56 rounded-lg" />
              <div className="skeleton h-5 w-40 rounded-lg" />
            </div>
          ) : price.data ? (
            <>
              <p className="text-xs font-semibold text-emerald-800">عنصر الدفع</p>
              <h2 className="mt-2 text-xl font-bold text-secondary">{price.data.name}</h2>
              {price.data.description && (
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{price.data.description}</p>
              )}
              <div className="my-6 border-t border-border" />
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">المبلغ المستحق</span>
                <span className="text-2xl font-bold text-secondary number-ltr">
                  {formatAmount(price.data.amount, price.data.currency)}
                </span>
              </div>
            </>
          ) : (
            <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              تفاصيل الدفع غير متاحة حالياً. يرجى المحاولة لاحقاً.
            </div>
          )}

          {wasCancelled && (
            <p role="status" className="mt-5 rounded-xl bg-muted p-3 text-sm text-secondary">
              أُلغيت عملية الدفع، ولم يتم تحصيل أي مبلغ.
            </p>
          )}
          {processing && (
            <p role="status" className="mt-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">
              الدفع قيد التأكيد من Stripe. أعد تحميل الصفحة بعد لحظات للتحقق من حالته.
            </p>
          )}
          {payment.isError && sessionId && (
            <FormError message="تعذّر التحقق من حالة الدفع. أعد تحميل الصفحة أو تواصل مع الدعم." />
          )}
          <FormError message={checkoutError} />
          <Button
            className="mt-6 w-full"
            disabled={!price.data || checkout.isPending || price.isLoading}
            onClick={() => {
              setCheckoutError('');
              checkout.mutate({ data: {} });
            }}
            testId="button-start-checkout"
          >
            <CreditCard size={17} />
            {checkout.isPending ? 'جارٍ التحويل إلى Stripe…' : 'المتابعة إلى الدفع الآمن'}
          </Button>
        </Panel>

        <Panel className="h-fit bg-[#f5f3ea] p-6 sm:p-7">
          <div className="mb-5 grid size-11 place-items-center rounded-xl bg-white text-emerald-800">
            <LockKeyhole size={19} />
          </div>
          <h2 className="font-semibold text-secondary">دفع موثوق وآمن</h2>
          <ul className="mt-4 space-y-4 text-xs leading-6 text-muted-foreground">
            <li className="flex items-start gap-2"><ShieldCheck size={16} className="mt-1 shrink-0 text-emerald-800" /> تنتقل إلى صفحة Stripe المشفّرة لإتمام العملية.</li>
            <li className="flex items-start gap-2"><ShieldCheck size={16} className="mt-1 shrink-0 text-emerald-800" /> لا نطلب رقم البطاقة داخل MIZAN.</li>
            <li className="flex items-start gap-2"><ShieldCheck size={16} className="mt-1 shrink-0 text-emerald-800" /> لا نعرض الدفع على أنه ناجح إلا بعد تأكيد Stripe.</li>
          </ul>
        </Panel>
      </div>
    )}
  </div>;
}
