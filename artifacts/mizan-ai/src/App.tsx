'use client';

import { type FormEvent, type ReactNode, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { QueryClient, QueryClientProvider, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Activity, ArrowDownLeft, ArrowLeft, ArrowUpLeft, CalendarDays,
  Check, ChevronLeft, CircleDollarSign, CreditCard, Edit3, Eye,
  EyeOff, FileText, Lightbulb, Plus, ShieldCheck, Sparkles, Target,
  Trash2, TrendingDown, Wallet,
} from 'lucide-react';
import {
  getCreateBudgetMutationOptions, getCreateGoalMutationOptions,
  getCreateOrderMutationOptions, getCreateTransactionMutationOptions,
  getDeleteBudgetMutationOptions, getDeleteGoalMutationOptions,
  getDeleteTransactionMutationOptions, getGetCurrentUserQueryKey,
  getGetDashboardQueryKey,
  getGetProfileQueryKey, getListBudgetsQueryKey, getListGoalsQueryKey,
  getListOrdersQueryKey, getListTransactionsQueryKey,
  getLoginUserMutationOptions, getLogoutUserMutationOptions,
  getRegisterUserMutationOptions, getUpdateBudgetMutationOptions,
  getUpdateGoalMutationOptions, getUpdateProfileMutationOptions,
  getUpdateTransactionMutationOptions, useGetCurrentUser, useGetDashboard,
  useGetFinancialAdvice, useGetProfile, useListBudgets, useListGoals,
  useListOrders, useListTransactions,
} from '@workspace/api-client-react';
import type { Budget, Order, SavingsGoal, Transaction, User } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  AddAction, Button, Currency, EmptyState, ErrorState, Field, FormActions,
  FormError, FormWrapper, LoadingState, Modal, PageTitle, Panel, Shell,
} from '@/components/mizan-ui';
import NotFound from '@/components/not-found';

const request = { credentials: 'include' as const };
const today = () => new Date().toISOString().slice(0, 10);
const thisMonth = () => new Date().toISOString().slice(0, 7);
const dateLabel = (date?: string | null) => date ? new Intl.DateTimeFormat('ar-KW', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date)) : 'غير محدد';
const percent = (n: number) => `${Math.round(n)}٪`;

function useLocation(): [string, (path: string) => void] {
  const pathname = usePathname() || '/';
  const router = useRouter();
  return [pathname, (path) => router.push(path)];
}

function BrandMark({ size = 'normal' }: { size?: 'normal' | 'large' }) {
  return <Link href="/" data-testid="link-brand-home" className="inline-flex items-center gap-3">
    <span className={`grid place-items-center rounded-2xl bg-emerald-700 text-white shadow-lg shadow-emerald-950/10 ${size === 'large' ? 'size-14' : 'size-11'}`}><span className="font-serif text-3xl font-bold">م</span></span>
    <span><span className={`block font-bold tracking-[.1em] text-secondary ${size === 'large' ? 'text-2xl' : 'text-lg'}`}>MIZAN</span><span className="block text-[9px] tracking-[.2em] text-muted-foreground">YOUR MONEY, IN BALANCE</span></span>
  </Link>;
}

function Landing() {
  return <main dir="rtl" className="min-h-[100dvh] overflow-hidden bg-background">
    <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-9"><BrandMark /><nav className="flex items-center gap-2"><Link href="/login" className="rounded-xl px-4 py-2.5 text-sm font-semibold text-secondary hover:bg-muted" data-testid="link-login">تسجيل الدخول</Link><Link href="/signup" className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800" data-testid="link-signup">ابدأ الآن</Link></nav></header>
    <section className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 pb-16 pt-12 sm:px-9 sm:pb-24 lg:grid-cols-[1fr_.9fr] lg:gap-16 lg:py-20">
      <div className="relative z-10 page-enter"><div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-800/10 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-900"><span className="size-1.5 rounded-full bg-emerald-600" /> مساحتك المالية، على طريقتك</div>
        <h1 className="max-w-2xl text-[42px] font-semibold leading-[1.22] tracking-tight text-secondary sm:text-6xl lg:text-[68px]">الميزان يبدأ<br />من <span className="relative whitespace-nowrap text-emerald-800">فهمك لأموالك<span className="absolute -bottom-2 right-0 h-1.5 w-3/4 rounded-full bg-amber-300/80" /></span></h1>
        <p className="mt-7 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">سجّل ما يهمّك، اكتشف عاداتك، وخطّط لأهدافك بهدوء. ميزان مساحة شخصية تساعدك على رؤية صورتك المالية بوضوح، من بياناتك أنت.</p>
        <div className="mt-8 flex flex-wrap gap-3"><Link href="/signup" className="inline-flex min-h-12 items-center gap-3 rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/10 transition hover:-translate-y-0.5 hover:bg-emerald-800" data-testid="link-start"><span>أنشئ مساحتك المجانية</span><ArrowLeft size={17} /></Link><Link href="/login" className="inline-flex min-h-12 items-center rounded-xl border border-border bg-card px-5 text-sm font-semibold text-secondary hover:bg-muted" data-testid="link-have-account">لديك حساب؟ ادخل</Link></div>
        <div className="mt-8 flex items-center gap-3 text-xs text-muted-foreground"><ShieldCheck size={16} className="text-emerald-700" /> بياناتك شخصية، ومبنية على ما تسجّله بنفسك.</div>
      </div>
      <div className="relative mx-auto w-full max-w-[550px] page-enter [animation-delay:120ms]">
        <div className="absolute -left-8 top-5 size-40 rounded-full bg-amber-200/30 blur-3xl" /><div className="absolute -bottom-7 right-8 size-52 rounded-full bg-emerald-200/35 blur-3xl" />
        <div className="relative rounded-[30px] border border-white/75 bg-[#fffefa] p-5 shadow-[0_28px_90px_rgba(30,54,65,.13)] sm:p-7">
          <div className="mb-6 flex items-center justify-between"><div><p className="text-xs text-muted-foreground">مساحتك المالية</p><h2 className="mt-1 text-lg font-bold text-secondary">نظرة متوازنة</h2></div><span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><Activity size={20} /></span></div>
          <div className="rounded-2xl bg-secondary p-5 text-white sm:p-6"><div className="flex items-center justify-between text-xs text-white/60"><span>ملخص الشهر · تصور توضيحي</span><CalendarDays size={16} /></div><div className="mt-5 flex items-end justify-between"><div><span className="text-xs text-white/60">صافي الادخار</span><div className="mt-1 text-3xl font-semibold tracking-tight number-ltr">— <small className="text-sm font-normal">د.ك</small></div></div><span className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] text-emerald-200">أرقامك تظهر بعد التسجيل</span></div><div className="mt-6 flex h-20 items-end gap-2" aria-hidden="true">{[32, 52, 42, 68, 48, 84, 61, 75, 48, 67, 88, 59].map((h, i) => <span key={i} className={`flex-1 rounded-t-md ${i === 10 ? 'bg-amber-300' : 'bg-emerald-300/45'}`} style={{ height: `${h}%` }} />)}</div><div className="mt-2 flex justify-between text-[10px] text-white/45"><span>بداية الشهر</span><span>نهايته</span></div></div>
          <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-2xl border border-border/80 p-4"><span className="flex items-center gap-2 text-[11px] text-muted-foreground"><ArrowDownLeft size={15} className="text-emerald-700" /> الدخل</span><div className="mt-3 text-xl font-semibold text-secondary number-ltr">— <small className="text-xs font-normal">د.ك</small></div></div><div className="rounded-2xl border border-border/80 p-4"><span className="flex items-center gap-2 text-[11px] text-muted-foreground"><ArrowUpLeft size={15} className="text-amber-700" /> المصروفات</span><div className="mt-3 text-xl font-semibold text-secondary number-ltr">— <small className="text-xs font-normal">د.ك</small></div></div></div>
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#f4f2e8] p-4"><span className="grid size-9 place-items-center rounded-xl bg-white text-amber-700"><Lightbulb size={18} /></span><span className="text-xs leading-5 text-secondary">ابدأ بتسجيل أول معاملة — حتى تتكوّن صورة تعكس واقعك.</span></div>
        </div><div className="absolute -bottom-6 -left-4 hidden rounded-2xl border border-border/60 bg-card px-4 py-3 shadow-xl sm:flex sm:items-center sm:gap-3"><span className="grid size-9 place-items-center rounded-full bg-amber-100 text-amber-800"><Target size={17} /></span><span className="text-xs font-semibold text-secondary">خطوة صغيرة، هدف أقرب</span></div>
      </div>
    </section>
    <section className="border-y border-border/70 bg-[#f5f3ea]">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-9 sm:py-20"><div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-end"><div><p className="text-xs font-semibold tracking-wide text-emerald-800">وضوح بلا تعقيد</p><h2 className="mt-3 max-w-lg text-3xl font-semibold leading-tight text-secondary sm:text-4xl">ترتيب أموالك يبدأ بخطوة بسيطة.</h2></div><p className="max-w-xl text-sm leading-7 text-muted-foreground">ليس عليك ربط حساباتك أو معرفة كل الإجابات. سجّل ما تريد الاحتفاظ به، وميزان يرتّب التفاصيل لتعود إليها وقتما تشاء.</p></div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[{ n: '١', title: 'سجّل ببساطة', body: 'دوّن دخلك ومصروفاتك بالطريقة التي تناسبك.', icon: FileText }, { n: '٢', title: 'شاهد الصورة', body: 'تابع اتجاهات الإنفاق والالتزامات من لوحة واحدة.', icon: Activity }, { n: '٣', title: 'ارسم هدفك', body: 'قسّم أهداف الادخار إلى تقدم واضح وقابل للمتابعة.', icon: Target }, { n: '٤', title: 'اختر بوعي', body: 'استفد من ملخصات مالية تستند إلى بياناتك المسجّلة.', icon: Sparkles }].map(({ n, title, body, icon: Icon }) => <article key={n} className="rounded-2xl border border-border/70 bg-card p-5"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-amber-700">{n} / ٤</span><Icon size={19} className="text-emerald-800" /></div><h3 className="mt-7 font-semibold text-secondary">{title}</h3><p className="mt-2 text-xs leading-6 text-muted-foreground">{body}</p></article>)}</div>
      </div>
    </section>
    <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 sm:px-9 sm:py-24 lg:grid-cols-2"><div className="relative overflow-hidden rounded-3xl bg-secondary p-7 text-white sm:p-10"><div className="absolute -left-12 -top-16 size-56 rounded-full border border-white/10" /><div className="absolute -left-2 -top-6 size-36 rounded-full border border-amber-300/20" /><p className="relative text-xs font-semibold text-amber-200">خصوصيتك أولاً</p><h2 className="relative mt-4 max-w-sm text-3xl font-semibold leading-snug">أنت تختار ما تسجّله. وأنت تملك قرارك.</h2><p className="relative mt-4 max-w-sm text-sm leading-7 text-white/60">ميزان مساحة شخصية لتدوين بياناتك المالية والعودة إليها. لا نعرض أرقاماً افتراضية على أنها واقعك.</p><div className="relative mt-8 flex items-center gap-2 text-xs text-emerald-200"><ShieldCheck size={16} /> حسابك محمي بتسجيل دخول آمن</div></div><div><p className="text-xs font-semibold text-emerald-800">مهيأ لتفاصيل حياتك</p><h2 className="mt-3 text-3xl font-semibold leading-tight text-secondary">تجربة عربية، بعملتك، وبإيقاعك.</h2><p className="mt-4 text-sm leading-7 text-muted-foreground">واجهة عربية من اليمين إلى اليسار، ودعم للدينار الكويتي بثلاث منازل عشرية. كل زاوية مصممة لتبقى قريبة وواضحة.</p><div className="mt-7 space-y-4">{[['واجهة عربية أصيلة', 'اتجاه كتابة وتنقل مريح من الهاتف أو الحاسوب.'], ['الدينار الكويتي', 'عرض المبالغ بالطريقة التي تناسب دقة عملتك.'], ['بياناتك كما هي', 'لا رصيد مختلق ولا توقعات بلا أساس.']].map(([title, desc]) => <div key={title} className="flex gap-3"><span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-800"><Check size={14} /></span><div><h3 className="text-sm font-semibold text-secondary">{title}</h3><p className="mt-1 text-xs text-muted-foreground">{desc}</p></div></div>)}</div></div></section>
    <section className="px-5 pb-16 sm:px-9 sm:pb-24"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 rounded-3xl border border-emerald-900/10 bg-emerald-50 px-7 py-9 sm:flex-row sm:px-12"><div><p className="text-xs font-semibold text-emerald-900">ابدأ من هنا</p><h2 className="mt-2 text-2xl font-semibold text-secondary">خطوتك المالية التالية تبدأ معك.</h2></div><Link href="/signup" className="inline-flex min-h-12 items-center gap-3 rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800" data-testid="link-final-cta">أنشئ حسابك <ArrowLeft size={17} /></Link></div></section>
    <footer className="border-t border-border bg-[#f5f3ea]"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-9"><BrandMark /><span>© ميزان · مساحتك المالية الخاصة</span></div></footer>
  </main>;
}

function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const [, setLocation] = useLocation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const register = useMutation(getRegisterUserMutationOptions({ request }));
  const login = useMutation(getLoginUserMutationOptions({ request }));
  const queryClient = useQueryClient();
  const busy = mode === 'signup' ? register.isPending : login.isPending;
  const submit = (e: FormEvent) => {
    e.preventDefault(); setError('');
    const options = { onSuccess: (res: { user: User }) => { queryClient.setQueryData(getGetCurrentUserQueryKey(), res.user); setLocation('/dashboard'); }, onError: () => setError('تعذّر إتمام تسجيل الدخول. تحقّق من بياناتك وحاول مجدداً.') };
    if (mode === 'signup') register.mutate({ data: { name: name.trim(), email: email.trim(), password } }, options);
    else login.mutate({ data: { email: email.trim(), password } }, options);
  };
  return <main dir="rtl" className="grid min-h-[100dvh] bg-background lg:grid-cols-[1fr_.88fr]">
    <section className="relative hidden overflow-hidden bg-secondary p-12 text-white lg:flex lg:flex-col lg:justify-between"><BrandMark size="large" /><div className="relative z-10 max-w-xl pb-16"><div className="mb-4 flex items-center gap-2 text-xs font-semibold text-amber-200"><Sparkles size={15} /> مساحتك تبدأ منك</div><h1 className="text-5xl font-semibold leading-tight">خطوة أقرب<br />إلى <span className="text-emerald-300">صورة أوضح.</span></h1><p className="mt-5 max-w-md text-sm leading-7 text-white/60">مساحة هادئة لتسجيل ما يهمّك مالياً ومتابعة ما تخطط له، ببياناتك أنت.</p><div className="mt-9 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"><ShieldCheck className="text-emerald-300" size={20} /><span className="text-xs leading-5 text-white/70">حسابك وبياناتك المالية في مساحة خاصة بك.</span></div></div><div className="absolute -left-24 bottom-10 size-80 rounded-full border border-white/10" /><div className="absolute -left-5 bottom-28 size-48 rounded-full border border-amber-200/10" /><div className="text-[10px] tracking-[.2em] text-white/35">MIZAN · FINANCIAL CLARITY</div></section>
    <section className="flex items-center justify-center px-5 py-10 sm:px-10"><div className="w-full max-w-md page-enter"><div className="mb-10 lg:hidden"><BrandMark size="large" /></div><Link href="/" className="mb-8 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-secondary"><ArrowLeft size={14} /> العودة للرئيسية</Link><p className="text-xs font-semibold text-emerald-800">{mode === 'signup' ? 'مساحة جديدة، لك وحدك' : 'سعداء بعودتك'}</p><h2 className="mt-2 text-3xl font-semibold text-secondary">{mode === 'signup' ? 'أنشئ حسابك' : 'تسجيل الدخول'}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{mode === 'signup' ? 'ابدأ بمساحة مالية شخصية وآمنة.' : 'ادخل إلى مساحتك المالية.'}</p>
        <form onSubmit={submit} className="mt-8 space-y-5" data-testid={`form-${mode}`}>
          {mode === 'signup' && <Field label="الاسم" name="name" value={name} onChange={setName} placeholder="اسمك الكامل" />}
          <Field label="البريد الإلكتروني" name="email" type="email" value={email} onChange={setEmail} placeholder="name@example.com" />
          <div className="relative"><Field label="كلمة المرور" name="password" type={showPassword ? 'text' : 'password'} minLength={8} value={password} onChange={setPassword} placeholder="٨ أحرف على الأقل" /><button type="button" aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'} data-testid="button-toggle-password" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-[38px] rounded-md p-1.5 text-muted-foreground hover:bg-muted">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
          {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert" data-testid="status-auth-error">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy} testId="button-auth-submit">{busy ? 'جارٍ التحقق…' : mode === 'signup' ? 'إنشاء الحساب' : 'دخول إلى حسابي'}<ArrowLeft size={16} /></Button>
        </form><div className="mt-7 border-t border-border pt-6 text-center text-sm text-muted-foreground">{mode === 'signup' ? 'لديك حساب بالفعل؟' : 'ليس لديك حساب؟'} <Link href={mode === 'signup' ? '/login' : '/signup'} className="font-semibold text-emerald-800 hover:underline" data-testid="link-auth-switch">{mode === 'signup' ? 'سجّل الدخول' : 'أنشئ حساباً'}</Link></div><p className="mt-8 text-center text-[11px] leading-5 text-muted-foreground">باستخدام ميزان، يمكنك تنظيم المعلومات التي تختار تدوينها فقط.</p></div></section>
  </main>;
}

function Guarded({ children }: { children: (user: User) => ReactNode }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: user, isLoading, isError, refetch } = useGetCurrentUser({ request });
  if (isLoading) return <main dir="rtl" className="min-h-[100dvh] p-5 sm:p-10"><div className="mx-auto max-w-6xl"><LoadingState /></div></main>;
  if (isError || !user) return <main dir="rtl" className="grid min-h-[100dvh] place-items-center bg-background p-5"><Panel className="max-w-md p-8 text-center"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-800"><ShieldCheck size={25} /></div><h1 className="mt-4 text-xl font-bold text-secondary">مساحتك بانتظارك</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">سجّل الدخول للوصول إلى بياناتك المالية الشخصية.</p><Link href="/login" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white" data-testid="link-guard-login">تسجيل الدخول <ArrowLeft size={16} /></Link><button className="mt-3 block w-full text-xs text-muted-foreground underline" onClick={() => refetch()} data-testid="button-check-session">إعادة المحاولة</button></Panel></main>;
  const logout = useMutation(getLogoutUserMutationOptions({ request }));
  return <Shell user={user} onLogout={() => logout.mutate(undefined, { onSuccess: () => { queryClient.clear(); setLocation('/login'); }, onError: () => setLocation('/login') })}>{children(user)}</Shell>;
}

function StatCard({ label, value, icon: Icon, tone, detail }: { label: string; value: number; icon: typeof Wallet; tone: 'green' | 'gold' | 'navy'; detail?: string }) {
  const toneClass = tone === 'green' ? 'bg-emerald-50 text-emerald-800' : tone === 'gold' ? 'bg-amber-50 text-amber-800' : 'bg-secondary/5 text-secondary';
  return <Panel className="p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-3 text-2xl font-semibold tracking-tight text-secondary" data-testid={`value-${label}`}><Currency value={value} /></p>{detail && <p className="mt-2 text-[11px] text-muted-foreground">{detail}</p>}</div><span className={`grid size-11 place-items-center rounded-2xl ${toneClass}`}><Icon size={20} /></span></div></Panel>;
}

function Dashboard({ user }: { user: User }) {
  const { data, isLoading, isError, refetch } = useGetDashboard({ request });
  const [, setLocation] = useLocation();
  if (isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;
  const maxSpend = Math.max(1, ...data.monthlySpending.map((p) => p.amount));
  const maxCategory = Math.max(1, ...data.spendingByCategory.map((p) => p.amount));
  return <div className="page-enter" data-testid="page-dashboard"><PageTitle eyebrow="مساحتك المالية" title={`أهلاً ${user.name.split(' ')[0]}، هذه صورتك`} description="ملخص بياناتك المسجّلة. أرقامك هنا هي أرقامك أنت." action={<Button onClick={() => setLocation('/transactions')} testId="button-new-transaction"><Plus size={17} /> تسجيل معاملة</Button>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><StatCard label="الدخل هذا الشهر" value={data.income} icon={ArrowDownLeft} tone="green" /><StatCard label="المصروفات هذا الشهر" value={data.expenses} icon={ArrowUpLeft} tone="gold" /><StatCard label="صافي الادخار" value={data.savings} icon={CircleDollarSign} tone="navy" /></div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_.7fr]"><Panel className="p-5 sm:p-6"><div className="mb-5 flex items-start justify-between"><div><h2 className="font-semibold text-secondary">اتجاه الإنفاق</h2><p className="mt-1 text-xs text-muted-foreground">من بيانات الأشهر المسجّلة</p></div><span className="rounded-lg bg-amber-50 p-2 text-amber-800"><TrendingDown size={17} /></span></div>
      {!data.monthlySpending.length ? <EmptyState title="لا توجد بيانات شهرية بعد" detail="ابدأ بتسجيل معاملاتك لتظهر اتجاهات الإنفاق هنا." icon={Activity} /> : <div className="flex h-52 items-end gap-2 border-b border-border px-1 pt-4 sm:gap-4">{data.monthlySpending.map((item) => <div className="flex h-full min-w-0 flex-1 flex-col justify-end" key={item.month} data-testid={`bar-month-${item.month}`}><span className="mb-2 text-center text-[10px] text-muted-foreground number-ltr"><Currency value={item.amount} compact /></span><div className="relative min-h-1 w-full rounded-t-lg bg-emerald-100"><div className="absolute inset-x-0 bottom-0 rounded-t-lg bg-emerald-700 transition-all duration-500" style={{ height: `${Math.max(5, item.amount / maxSpend * 100)}%` }} /></div><span className="mt-2 truncate text-center text-[10px] text-muted-foreground">{item.month}</span></div>)}</div>}
      </Panel>
      <Panel className="p-5 sm:p-6"><div className="mb-5"><h2 className="font-semibold text-secondary">أين يذهب إنفاقك؟</h2><p className="mt-1 text-xs text-muted-foreground">حسب الفئة</p></div>
      {!data.spendingByCategory.length ? <EmptyState title="التصنيفات ستظهر هنا" detail="أضف مصروفات مع تحديد الفئة لمتابعة توزيع إنفاقك." icon={Wallet} /> : <div className="space-y-4">{data.spendingByCategory.map((category) => <div key={category.category} data-testid={`category-spend-${category.category}`}><div className="mb-2 flex items-center justify-between gap-2 text-xs"><span className="truncate font-medium text-secondary">{category.category}</span><span className="text-muted-foreground"><Currency value={category.amount} /></span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-700 transition-all duration-500" style={{ width: `${Math.max(3, category.amount / maxCategory * 100)}%` }} /></div></div>)}</div>}
      </Panel></div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_.7fr]"><Panel className="p-5 sm:p-6"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold text-secondary">أحدث المعاملات</h2><p className="mt-1 text-xs text-muted-foreground">آخر ما سجلته في مساحتك</p></div><Link href="/transactions" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800" data-testid="link-all-transactions">كل المعاملات <ChevronLeft size={15} /></Link></div>
      {!data.recentTransactions.length ? <EmptyState title="بداية مرتّبة" detail="لم تسجّل معاملات بعد. دوّن أول دخل أو مصروف لتكوين ملخصك." action={<Button onClick={() => setLocation('/transactions')}><Plus size={16} /> تسجيل معاملة</Button>} icon={FileText} /> : <div className="divide-y divide-border">{data.recentTransactions.slice(0, 5).map((tx) => <TransactionRow tx={tx} key={tx.id} currency={user.currency} />)}</div>}</Panel>
      <Panel className="p-5 sm:p-6"><div className="mb-4 flex items-center gap-2"><span className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-800"><Activity size={18} /></span><div><h2 className="font-semibold text-secondary">تنبيهات الميزانية</h2><p className="mt-1 text-xs text-muted-foreground">متابعة حدودك المسجّلة</p></div></div>
        {!data.budgetAlerts.length ? <EmptyState title="لا توجد تنبيهات" detail="أنشئ ميزانية لفئة محددة لتتابع إنفاقك ضمن حدودك." action={<Button variant="secondary" onClick={() => setLocation('/budgets')}>إدارة الميزانيات <ChevronLeft size={15} /></Button>} /> : <div className="space-y-3">{data.budgetAlerts.map((alert) => <div key={alert.category} className={`rounded-xl border p-3.5 ${alert.exceeded ? 'border-amber-300/70 bg-amber-50/70' : 'border-border bg-background'}`} data-testid={`alert-budget-${alert.category}`}><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-secondary">{alert.category}</span><span className={`text-[10px] font-semibold ${alert.exceeded ? 'text-amber-900' : 'text-emerald-800'}`}>{alert.exceeded ? 'تجاوز الحد' : 'ضمن الميزانية'}</span></div><p className="mt-2 text-xs text-muted-foreground"><Currency value={alert.spent} /> من <Currency value={alert.limit} /></p></div>)}</div>}</Panel></div>
  </div>;
}

function TransactionRow({ tx, currency = 'KWD', actions }: { tx: Transaction; currency?: string; actions?: ReactNode }) {
  const income = tx.type === 'income';
  return <div className="flex items-center gap-3 py-3.5" data-testid={`row-transaction-${tx.id}`}><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${income ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>{income ? <ArrowDownLeft size={18} /> : <ArrowUpLeft size={18} />}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-secondary">{tx.title}</p><p className="mt-1 truncate text-[11px] text-muted-foreground">{tx.category} · {dateLabel(tx.date)}</p></div><span className={`text-sm font-semibold ${income ? 'text-emerald-800' : 'text-secondary'}`}><span className="number-ltr">{income ? '+' : '−'}<Currency value={tx.amount} currency={currency} /></span></span>{actions}</div>;
}

const transactionCategories = ['راتب', 'طعام ومشروبات', 'سكن', 'مواصلات', 'تسوق', 'صحة', 'تعليم', 'ترفيه', 'فواتير', 'أخرى'];
function Transactions({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useListTransactions({ request });
  const [open, setOpen] = useState(false); const [editing, setEditing] = useState<Transaction | null>(null);
  const [search, setSearch] = useState(''); const [filter, setFilter] = useState('all'); const [error, setError] = useState('');
  const [title, setTitle] = useState(''); const [amount, setAmount] = useState(''); const [type, setType] = useState<'expense' | 'income'>('expense'); const [category, setCategory] = useState(transactionCategories[1]); const [date, setDate] = useState(today()); const [note, setNote] = useState('');
  const reset = () => { setOpen(false); setEditing(null); setError(''); setTitle(''); setAmount(''); setType('expense'); setCategory(transactionCategories[1]); setDate(today()); setNote(''); };
  const success = () => { queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); reset(); };
  const create = useMutation(getCreateTransactionMutationOptions({ request, mutation: { onSuccess: success, onError: () => setError('تعذّر حفظ المعاملة. حاول مرة أخرى.') } }));
  const update = useMutation(getUpdateTransactionMutationOptions({ request, mutation: { onSuccess: success, onError: () => setError('تعذّر تحديث المعاملة.') } }));
  const remove = useMutation(getDeleteTransactionMutationOptions({ request, mutation: { onSuccess: success, onError: () => setError('تعذّر حذف المعاملة.') } }));
  const startEdit = (tx: Transaction) => { setEditing(tx); setTitle(tx.title); setAmount(String(tx.amount)); setType(tx.type); setCategory(tx.category); setDate(tx.date.slice(0, 10)); setNote(tx.note || ''); setOpen(true); };
  const submit = (e: FormEvent) => { e.preventDefault(); setError(''); const payload = { title: title.trim(), amount: Number(amount), type, category, date, note: note.trim() }; if (!payload.title || !Number.isFinite(payload.amount) || payload.amount <= 0) return setError('أدخل اسماً ومبلغاً صحيحين.'); if (editing) update.mutate({ id: editing.id, data: payload }); else create.mutate({ data: payload }); };
  const rows = useMemo(() => (data || []).filter((t) => (filter === 'all' || t.type === filter) && `${t.title} ${t.category} ${t.note || ''}`.toLowerCase().includes(search.toLowerCase())), [data, filter, search]);
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  return <div className="page-enter" data-testid="page-transactions"><PageTitle eyebrow="الحركة المالية" title="المعاملات" description="سجّل دخلك ومصروفاتك وارجع إلى تفاصيلها وقتما تحتاج." action={<AddAction onClick={() => setOpen(true)} label="معاملة جديدة" />} />
    <Panel className="p-4 sm:p-5"><div className="flex flex-col gap-3 sm:flex-row"><input aria-label="ابحث في المعاملات" placeholder="ابحث بالاسم أو الفئة…" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-search-transactions" className="min-h-11 flex-1 rounded-xl border border-input bg-background px-3.5 text-sm outline-none focus:border-emerald-700" /><div className="flex gap-2" role="group" aria-label="تصفية المعاملات">{[['all', 'الكل'], ['expense', 'مصروفات'], ['income', 'دخل']].map(([v, label]) => <button key={v} onClick={() => setFilter(v)} data-testid={`filter-transactions-${v}`} className={`rounded-xl px-3.5 text-xs font-semibold ${filter === v ? 'bg-secondary text-white' : 'bg-muted text-muted-foreground hover:text-secondary'}`}>{label}</button>)}</div></div>
      <div className="mt-4">{!rows.length ? <EmptyState title={search || filter !== 'all' ? 'لا توجد نتائج مطابقة' : 'سجّل أول معاملة'} detail={search || filter !== 'all' ? 'جرّب تغيير كلمات البحث أو نوع المعاملة.' : 'دوّن الدخل أو المصروف الذي تريد متابعته. لا توجد بيانات مسبقة في مساحتك.'} action={!search && filter === 'all' ? <AddAction onClick={() => setOpen(true)} label="إضافة معاملة" /> : undefined} icon={FileText} /> : <div className="divide-y divide-border">{rows.map((tx) => <TransactionRow key={tx.id} tx={tx} currency={user.currency} actions={<div className="flex"><button title="تعديل" aria-label={`تعديل ${tx.title}`} onClick={() => startEdit(tx)} data-testid={`button-edit-transaction-${tx.id}`} className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><Edit3 size={16} /></button><button title="حذف" aria-label={`حذف ${tx.title}`} onClick={() => { if (window.confirm(`حذف المعاملة «${tx.title}»؟`)) remove.mutate({ id: tx.id }); }} data-testid={`button-delete-transaction-${tx.id}`} className="rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-red-700"><Trash2 size={16} /></button></div>} />)}</div>}</div>
    </Panel>
    <Modal open={open} title={editing ? 'تعديل المعاملة' : 'معاملة جديدة'} onClose={reset}><FormWrapper onSubmit={submit} testId="form-transaction"><Field label="اسم المعاملة" name="transaction-title" value={title} onChange={setTitle} placeholder="مثال: مشتريات المنزل" /><div className="grid grid-cols-2 gap-3"><Field label="المبلغ (د.ك)" name="transaction-amount" type="number" min="0.001" step="0.001" value={amount} onChange={setAmount} /><Field label="النوع" name="transaction-type" value={type} onChange={(v) => setType(v as 'income' | 'expense')} options={['expense', 'income']} /></div><div className="grid grid-cols-2 gap-3"><Field label="الفئة" name="transaction-category" value={category} onChange={setCategory} options={transactionCategories} /><Field label="التاريخ" name="transaction-date" type="date" value={date} onChange={setDate} /></div><Field label="ملاحظة (اختياري)" name="transaction-note" type="textarea" required={false} value={note} onChange={setNote} placeholder="تفاصيل إضافية…" /><FormError message={error || (create.isError || update.isError ? 'تعذّر إتمام العملية.' : '')} /><FormActions busy={create.isPending || update.isPending} onCancel={reset} /></FormWrapper></Modal>
  </div>;
}

const budgetCategories = ['طعام ومشروبات', 'سكن', 'مواصلات', 'تسوق', 'صحة', 'تعليم', 'ترفيه', 'فواتير', 'أخرى'];
function Budgets({ user: _user }: { user: User }) {
  const qc = useQueryClient(); const { data, isLoading, isError, refetch } = useListBudgets({ request });
  const [open, setOpen] = useState(false); const [editing, setEditing] = useState<Budget | null>(null); const [category, setCategory] = useState(budgetCategories[0]); const [limit, setLimit] = useState(''); const [month, setMonth] = useState(thisMonth()); const [error, setError] = useState('');
  const reset = () => { setOpen(false); setEditing(null); setCategory(budgetCategories[0]); setLimit(''); setMonth(thisMonth()); setError(''); };
  const done = () => { qc.invalidateQueries({ queryKey: getListBudgetsQueryKey() }); qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); reset(); };
  const create = useMutation(getCreateBudgetMutationOptions({ request, mutation: { onSuccess: done, onError: () => setError('تعذّر حفظ الميزانية.') } }));
  const update = useMutation(getUpdateBudgetMutationOptions({ request, mutation: { onSuccess: done, onError: () => setError('تعذّر تحديث الميزانية.') } }));
  const remove = useMutation(getDeleteBudgetMutationOptions({ request, mutation: { onSuccess: done } }));
  const edit = (b: Budget) => { setEditing(b); setCategory(b.category); setLimit(String(b.limit)); setMonth(b.month.slice(0, 7)); setOpen(true); };
  const submit = (e: FormEvent) => { e.preventDefault(); if (!Number(limit) || Number(limit) <= 0) return setError('أدخل حداً صحيحاً أكبر من صفر.'); const data = { category, limit: Number(limit), month }; if (editing) update.mutate({ id: editing.id, data }); else create.mutate({ data }); };
  if (isLoading) return <LoadingState />; if (isError) return <ErrorState onRetry={() => refetch()} />;
  return <div className="page-enter" data-testid="page-budgets"><PageTitle eyebrow="حدود تساعدك" title="الميزانيات" description="ضع حداً شهرياً للفئات التي تهمّك، وتابع ما سُجّل منها." action={<AddAction onClick={() => setOpen(true)} label="ميزانية جديدة" />} />
    {!data?.length ? <Panel><EmptyState title="ابدأ بميزانية تناسبك" detail="اختر فئة وحدد مبلغاً شهرياً. ستظهر هنا المصروفات التي تسجّلها ضمن الفئة نفسها." icon={Wallet} action={<AddAction onClick={() => setOpen(true)} label="إنشاء ميزانية" />} /></Panel> :
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{data.map((b) => { const ratio = b.spent / Math.max(1, b.limit); const over = ratio >= 1; return <Panel key={b.id} className="p-5" data-testid={`card-budget-${b.id}`}><div className="flex items-start justify-between"><div><p className="text-xs text-muted-foreground">{b.month}</p><h2 className="mt-1 text-lg font-semibold text-secondary">{b.category}</h2></div><div className="flex"><button aria-label="تعديل الميزانية" onClick={() => edit(b)} data-testid={`button-edit-budget-${b.id}`} className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><Edit3 size={16} /></button><button aria-label="حذف الميزانية" onClick={() => { if (window.confirm(`حذف ميزانية ${b.category}؟`)) remove.mutate({ id: b.id }); }} data-testid={`button-delete-budget-${b.id}`} className="rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-red-700"><Trash2 size={16} /></button></div></div><div className="mt-6 flex items-end justify-between"><div><p className="text-[11px] text-muted-foreground">المنفق</p><p className="mt-1 text-xl font-semibold text-secondary"><Currency value={b.spent} /></p></div><div className="text-left"><p className="text-[11px] text-muted-foreground">الحد الشهري</p><p className="mt-1 text-sm font-medium text-muted-foreground"><Currency value={b.limit} /></p></div></div><div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full transition-all ${over ? 'bg-amber-600' : 'bg-emerald-700'}`} style={{ width: `${Math.min(100, ratio * 100)}%` }} /></div><div className="mt-3 flex justify-between text-[11px]"><span className={over ? 'font-semibold text-amber-800' : 'text-muted-foreground'}>{over ? 'تجاوزت الحد' : `متبقي ${percent(100 - ratio * 100)}`}</span><span className="text-muted-foreground"><Currency value={Math.max(0, b.limit - b.spent)} /> متبقية</span></div></Panel>; })}</div>}
    <Modal open={open} title={editing ? 'تعديل الميزانية' : 'ميزانية جديدة'} onClose={reset}><FormWrapper onSubmit={submit} testId="form-budget"><Field label="الفئة" name="budget-category" value={category} onChange={setCategory} options={budgetCategories} /><Field label="الحد الشهري (د.ك)" name="budget-limit" type="number" min="0.001" step="0.001" value={limit} onChange={setLimit} /><Field label="الشهر" name="budget-month" type="month" value={month} onChange={setMonth} /><FormError message={error} /><FormActions busy={create.isPending || update.isPending} onCancel={reset} /></FormWrapper></Modal>
  </div>;
}

function Goals({ user: _user }: { user: User }) {
  const qc = useQueryClient(); const { data, isLoading, isError, refetch } = useListGoals({ request });
  const [open, setOpen] = useState(false); const [editing, setEditing] = useState<SavingsGoal | null>(null); const [title, setTitle] = useState(''); const [target, setTarget] = useState(''); const [current, setCurrent] = useState('0'); const [targetDate, setTargetDate] = useState(''); const [error, setError] = useState('');
  const reset = () => { setOpen(false); setEditing(null); setTitle(''); setTarget(''); setCurrent('0'); setTargetDate(''); setError(''); };
  const done = () => { qc.invalidateQueries({ queryKey: getListGoalsQueryKey() }); qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); reset(); };
  const create = useMutation(getCreateGoalMutationOptions({ request, mutation: { onSuccess: done, onError: () => setError('تعذّر حفظ الهدف.') } }));
  const update = useMutation(getUpdateGoalMutationOptions({ request, mutation: { onSuccess: done, onError: () => setError('تعذّر تحديث الهدف.') } }));
  const remove = useMutation(getDeleteGoalMutationOptions({ request, mutation: { onSuccess: done } }));
  const edit = (g: SavingsGoal) => { setEditing(g); setTitle(g.title); setTarget(String(g.targetAmount)); setCurrent(String(g.currentAmount)); setTargetDate(g.targetDate?.slice(0, 10) || ''); setOpen(true); };
  const submit = (e: FormEvent) => { e.preventDefault(); if (!title.trim() || Number(target) <= 0 || Number(current) < 0) return setError('تحقّق من اسم الهدف والمبالغ المدخلة.'); const data = { title: title.trim(), targetAmount: Number(target), currentAmount: Number(current), targetDate: targetDate || null }; if (editing) update.mutate({ id: editing.id, data }); else create.mutate({ data }); };
  if (isLoading) return <LoadingState />; if (isError) return <ErrorState onRetry={() => refetch()} />;
  return <div className="page-enter" data-testid="page-goals"><PageTitle eyebrow="ما تخطط له" title="أهداف الادخار" description="حوّل أهدافك إلى تقدم تراه، وعدّل خطتك حين تحتاج." action={<AddAction onClick={() => setOpen(true)} label="هدف جديد" />} />
    {!data?.length ? <Panel><EmptyState title="ما الهدف الذي يشبهك؟" detail="رحلة قصيرة أو خطة طويلة — أضف هدفاً وحدد ما تريد ادخاره." icon={Target} action={<AddAction onClick={() => setOpen(true)} label="إضافة هدف ادخار" />} /></Panel> :
    <div className="grid gap-4 lg:grid-cols-2">{data.map((g) => { const pct = Math.min(100, Math.max(0, g.currentAmount / Math.max(g.targetAmount, 1) * 100)); return <Panel key={g.id} className="p-5 sm:p-6" data-testid={`card-goal-${g.id}`}><div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-800"><Target size={20} /></span><div className="min-w-0 flex-1"><h2 className="truncate text-base font-semibold text-secondary">{g.title}</h2><p className="mt-1 text-xs text-muted-foreground">{g.targetDate ? `الموعد المستهدف ${dateLabel(g.targetDate)}` : 'بلا موعد محدد'}</p></div><div className="flex"><button aria-label="تعديل الهدف" onClick={() => edit(g)} data-testid={`button-edit-goal-${g.id}`} className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><Edit3 size={16} /></button><button aria-label="حذف الهدف" onClick={() => { if (window.confirm(`حذف هدف ${g.title}؟`)) remove.mutate({ id: g.id }); }} data-testid={`button-delete-goal-${g.id}`} className="rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-red-700"><Trash2 size={16} /></button></div></div><div className="mt-7 flex items-end justify-between"><div><p className="text-[11px] text-muted-foreground">تم ادخاره</p><p className="mt-1 text-2xl font-semibold text-secondary"><Currency value={g.currentAmount} /></p></div><div className="text-left"><p className="text-[11px] text-muted-foreground">من الهدف</p><p className="mt-1 text-sm text-muted-foreground"><Currency value={g.targetAmount} /></p></div></div><div className="mt-4 h-3 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-l from-emerald-700 to-emerald-500 transition-all duration-700" style={{ width: `${pct}%` }} /></div><div className="mt-2 flex justify-between text-xs"><span className="font-semibold text-emerald-800">{percent(pct)} من الهدف</span><span className="text-muted-foreground">متبقي <Currency value={Math.max(0, g.targetAmount - g.currentAmount)} /></span></div></Panel>; })}</div>}
    <Modal open={open} title={editing ? 'تعديل هدف الادخار' : 'هدف ادخار جديد'} onClose={reset}><FormWrapper onSubmit={submit} testId="form-goal"><Field label="اسم الهدف" name="goal-title" value={title} onChange={setTitle} placeholder="مثال: رحلة الصيف" /><Field label="المبلغ المستهدف (د.ك)" name="goal-target" type="number" min="0.001" step="0.001" value={target} onChange={setTarget} /><Field label="المبلغ الذي ادخرته (د.ك)" name="goal-current" type="number" min="0" step="0.001" value={current} onChange={setCurrent} /><Field label="التاريخ المستهدف (اختياري)" name="goal-date" type="date" required={false} value={targetDate} onChange={setTargetDate} /><FormError message={error} /><FormActions busy={create.isPending || update.isPending} onCancel={reset} /></FormWrapper></Modal>
  </div>;
}

function Advisor() {
  const { data, isLoading, isError, refetch } = useGetFinancialAdvice({ request });
  if (isLoading) return <LoadingState label="جارٍ إعداد ملخصك المالي" />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} message="لا يمكن تحميل الرؤى المالية الآن. أعد المحاولة لاحقاً." />;
  const tone: Record<string, string> = { positive: 'border-emerald-200 bg-emerald-50/70 text-emerald-950', warning: 'border-amber-200 bg-amber-50/70 text-amber-950', insight: 'border-border bg-card text-secondary' };
  const icon: Record<string, typeof Lightbulb> = { positive: Check, warning: Activity, insight: Lightbulb };
  return <div className="page-enter" data-testid="page-advisor"><PageTitle eyebrow="رؤى على بياناتك" title="مستشارك المالي" description="ملخصات مبنية على المعلومات التي سجّلتها في مساحتك — وليست نصيحة مالية مضمونة." />
    <Panel className="relative mb-5 overflow-hidden bg-secondary p-6 text-white sm:p-8"><div className="absolute -left-9 -top-14 size-48 rounded-full border border-white/10" /><div className="relative flex items-start gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-amber-200/15 text-amber-200"><Sparkles size={23} /></span><div><p className="text-xs font-semibold text-amber-200">ملخصك الحالي</p><h2 className="mt-1 text-xl font-semibold">خطوة صغيرة، برؤية أوسع</h2><p className="mt-2 max-w-xl text-xs leading-6 text-white/60">هذه القراءة تعتمد على السجلات المتاحة في حسابك. كلما حدّثت بياناتك، أصبحت ملاحظاتك أقرب إلى واقعك.</p></div></div><div className="relative mt-7 grid grid-cols-3 gap-3"><div className="rounded-xl border border-white/10 bg-white/5 p-3"><p className="text-[10px] text-white/55">الدخل المسجّل</p><p className="mt-2 text-sm font-semibold"><Currency value={data.income} /></p></div><div className="rounded-xl border border-white/10 bg-white/5 p-3"><p className="text-[10px] text-white/55">المصروفات</p><p className="mt-2 text-sm font-semibold"><Currency value={data.expenses} /></p></div><div className="rounded-xl border border-white/10 bg-white/5 p-3"><p className="text-[10px] text-white/55">معدل الادخار</p><p className="mt-2 text-sm font-semibold">{percent(data.savingsRate)}</p></div></div></Panel>
    {!data.suggestions.length ? <Panel><EmptyState title="الرؤى تتشكل مع بياناتك" detail="سجّل دخلاً ومصروفاتك لتظهر لك ملاحظات مالية تستند إلى نشاطك." icon={Lightbulb} /></Panel> : <div className="space-y-3">{data.suggestions.map((s, i) => { const Icon = icon[s.kind] || Lightbulb; return <Panel key={`${s.title}-${i}`} className={`flex gap-4 p-5 ${tone[s.kind] || 'border-border bg-card text-secondary'}`} data-testid={`advisor-suggestion-${i}`}><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/75"><Icon size={18} /></span><div><h2 className="font-semibold">{s.title}</h2><p className="mt-1.5 text-sm leading-6 opacity-80">{s.detail}</p></div></Panel>; })}</div>}
    <p className="mt-5 text-[11px] leading-5 text-muted-foreground">المحتوى للتثقيف والتنظيم الشخصي، ولا يُعد توصية استثمارية أو بديلاً عن مختص.</p>
  </div>;
}

function Orders({ user: _user }: { user: User }) {
  const qc = useQueryClient(); const { data, isLoading, isError, refetch } = useListOrders({ request });
  const [open, setOpen] = useState(false); const [title, setTitle] = useState(''); const [amount, setAmount] = useState(''); const [date, setDate] = useState(today()); const [category, setCategory] = useState('فواتير'); const [status, setStatus] = useState<'paid' | 'pending'>('pending'); const [note, setNote] = useState(''); const [error, setError] = useState('');
  const reset = () => { setOpen(false); setTitle(''); setAmount(''); setDate(today()); setCategory('فواتير'); setStatus('pending'); setNote(''); setError(''); };
  const create = useMutation(getCreateOrderMutationOptions({ request, mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getListOrdersQueryKey() }); reset(); }, onError: () => setError('تعذّر تسجيل الالتزام.') } }));
  const submit = (e: FormEvent) => { e.preventDefault(); if (!title.trim() || Number(amount) <= 0) return setError('أدخل وصفاً ومبلغاً صحيحين.'); create.mutate({ data: { title: title.trim(), amount: Number(amount), date, category, status, note: note.trim() } }); };
  if (isLoading) return <LoadingState />; if (isError) return <ErrorState onRetry={() => refetch()} />;
  return <div className="page-enter" data-testid="page-orders"><PageTitle eyebrow="ما عليك متابعته" title="الالتزامات" description="احتفظ بسجل المدفوعات والمبالغ المعلّقة التي اخترت تدوينها." action={<AddAction onClick={() => setOpen(true)} label="التزام جديد" />} />
    {!data?.length ? <Panel><EmptyState title="لا توجد التزامات مسجّلة" detail="أضف التزاماً أو دفعة لتحتفظ بتفاصيلها في مكان واحد." icon={CreditCard} action={<AddAction onClick={() => setOpen(true)} label="إضافة التزام" />} /></Panel> :
    <Panel className="overflow-hidden"><div className="grid grid-cols-[1fr_auto] gap-4 border-b border-border bg-muted/50 px-5 py-3 text-[11px] font-semibold text-muted-foreground sm:grid-cols-[1.2fr_.7fr_.7fr_.7fr]"><span>الوصف</span><span className="text-left sm:text-right">المبلغ</span><span className="hidden sm:block">التاريخ</span><span className="hidden text-left sm:block">الحالة</span></div><div className="divide-y divide-border">{data.map((o: Order) => <div key={o.id} className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 sm:grid-cols-[1.2fr_.7fr_.7fr_.7fr]" data-testid={`row-order-${o.id}`}><div className="flex min-w-0 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary/5 text-secondary"><CreditCard size={17} /></span><span className="min-w-0"><span className="block truncate text-sm font-semibold text-secondary">{o.title}</span><span className="mt-1 block text-[10px] text-muted-foreground">{o.category}</span></span></div><span className="text-left text-sm font-semibold text-secondary sm:text-right"><Currency value={o.amount} currency={_user.currency} /></span><span className="hidden text-xs text-muted-foreground sm:block">{dateLabel(o.date)}</span><span className={`hidden w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold sm:inline-flex ${o.status === 'paid' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`} data-testid={`status-order-${o.id}`}>{o.status === 'paid' ? 'مدفوع' : 'معلّق'}</span></div>)}</div></Panel>}
    <Modal open={open} title="تسجيل التزام" onClose={reset}><FormWrapper onSubmit={submit} testId="form-order"><Field label="الوصف" name="order-title" value={title} onChange={setTitle} placeholder="مثال: فاتورة الإنترنت" /><div className="grid grid-cols-2 gap-3"><Field label="المبلغ (د.ك)" name="order-amount" type="number" min="0.001" step="0.001" value={amount} onChange={setAmount} /><Field label="الفئة" name="order-category" value={category} onChange={setCategory} options={['فواتير', 'سكن', 'مواصلات', 'اشتراكات', 'أخرى']} /></div><div className="grid grid-cols-2 gap-3"><Field label="التاريخ" name="order-date" type="date" value={date} onChange={setDate} /><Field label="الحالة" name="order-status" value={status} onChange={(v) => setStatus(v as 'paid' | 'pending')} options={['pending', 'paid']} /></div><Field label="ملاحظة (اختياري)" name="order-note" type="textarea" required={false} value={note} onChange={setNote} /><FormError message={error} /><FormActions busy={create.isPending} onCancel={reset} /></FormWrapper></Modal>
  </div>;
}

function Profile({ user }: { user: User }) {
  const qc = useQueryClient(); const { data, isLoading, isError, refetch } = useGetProfile({ request });
  const [name, setName] = useState(user.name); const [email, setEmail] = useState(user.email); const [saved, setSaved] = useState(false); const [error, setError] = useState('');
  const update = useMutation(getUpdateProfileMutationOptions({ request, mutation: { onSuccess: (profile) => { qc.setQueryData(getGetProfileQueryKey(), profile); qc.setQueryData(getGetCurrentUserQueryKey(), profile); setSaved(true); setError(''); }, onError: () => setError('تعذّر حفظ التغييرات. حاول مرة أخرى.') } }));
  if (isLoading) return <LoadingState />; if (isError || !data) return <ErrorState onRetry={() => refetch()} />;
  const submit = (e: FormEvent) => { e.preventDefault(); setSaved(false); update.mutate({ data: { name: name.trim(), email: email.trim() } }); };
  return <div className="page-enter" data-testid="page-profile"><PageTitle eyebrow="مساحتك، بياناتك" title="الملف الشخصي" description="راجع معلومات حسابك وتفضيلات عملتك." />
    <div className="grid gap-5 lg:grid-cols-[.7fr_1.3fr]"><Panel className="flex flex-col items-center p-7 text-center"><span className="grid size-20 place-items-center rounded-[26px] bg-secondary text-2xl font-semibold text-amber-100">{data.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('')}</span><h2 className="mt-4 text-lg font-semibold text-secondary" data-testid="profile-name">{data.name}</h2><p className="mt-1 text-sm text-muted-foreground">{data.email}</p><span className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800"><span className="size-1.5 rounded-full bg-emerald-600" /> حساب شخصي</span><div className="mt-7 w-full border-t border-border pt-5 text-right"><p className="text-[11px] text-muted-foreground">العملة</p><p className="mt-1 text-sm font-semibold text-secondary">{data.currency} · الدينار الكويتي</p></div></Panel>
      <Panel className="p-5 sm:p-7"><div className="mb-6"><h2 className="font-semibold text-secondary">معلومات الحساب</h2><p className="mt-1 text-xs text-muted-foreground">حدّث اسمك أو بريدك الإلكتروني.</p></div><form className="max-w-lg space-y-5" onSubmit={submit} data-testid="form-profile"><Field label="الاسم" name="profile-name" value={name} onChange={setName} /><Field label="البريد الإلكتروني" name="profile-email" type="email" value={email} onChange={setEmail} /><div className="rounded-xl border border-border bg-muted/40 p-4"><div className="flex items-start gap-3"><span className="grid size-9 place-items-center rounded-xl bg-white text-emerald-800"><ShieldCheck size={17} /></span><p className="text-xs leading-5 text-muted-foreground">بياناتك المالية تخصّك. ميزان يعرض فقط ما تسجّله في حسابك.</p></div></div>{error && <FormError message={error} />}{saved && <p role="status" className="text-sm font-medium text-emerald-800" data-testid="status-profile-saved">تم حفظ بياناتك بنجاح.</p>}<Button type="submit" disabled={update.isPending} testId="button-save-profile">{update.isPending ? 'جارٍ الحفظ…' : 'حفظ التغييرات'}<Check size={16} /></Button></form></Panel>
    </div>
  </div>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function DashboardRoute() { return <Guarded>{(user) => <Dashboard user={user} />}</Guarded>; }
function TransactionsRoute() { return <Guarded>{(user) => <Transactions user={user} />}</Guarded>; }
function BudgetsRoute() { return <Guarded>{(user) => <Budgets user={user} />}</Guarded>; }
function GoalsRoute() { return <Guarded>{(user) => <Goals user={user} />}</Guarded>; }
function AdvisorRoute() { return <Guarded>{() => <Advisor />}</Guarded>; }
function OrdersRoute() { return <Guarded>{(user) => <Orders user={user} />}</Guarded>; }
function ProfileRoute() { return <Guarded>{(user) => <Profile user={user} />}</Guarded>; }

function RoutedApp() {
  const [path] = useLocation();
  let page: ReactNode;
  switch (path) {
    case '/':
      page = <Landing />;
      break;
    case '/signup':
      page = <AuthPage mode="signup" />;
      break;
    case '/login':
      page = <AuthPage mode="login" />;
      break;
    case '/dashboard':
      page = <DashboardRoute />;
      break;
    case '/transactions':
      page = <TransactionsRoute />;
      break;
    case '/budgets':
      page = <BudgetsRoute />;
      break;
    case '/goals':
      page = <GoalsRoute />;
      break;
    case '/advisor':
      page = <AdvisorRoute />;
      break;
    case '/orders':
      page = <OrdersRoute />;
      break;
    case '/profile':
      page = <ProfileRoute />;
      break;
    default:
      page = <NotFound />;
  }
  return <RoutedErrorBoundary>{page}</RoutedErrorBoundary>;
}

function App() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 20_000 } },
  }));
  return <QueryClientProvider client={queryClient}><TooltipProvider><RoutedApp /><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;
