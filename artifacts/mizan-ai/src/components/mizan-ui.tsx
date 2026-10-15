import { type ChangeEvent, type FormEvent, type ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowUpLeft, ChevronLeft, CircleHelp, CreditCard, LayoutDashboard, LogOut,
  Menu, Plus, Settings2, Sparkles, Target, Wallet, X,
} from 'lucide-react';
import type { User } from '@workspace/api-client-react';

export const routes = [
  { href: '/dashboard', label: 'الرئيسية', icon: LayoutDashboard },
  { href: '/transactions', label: 'المعاملات', icon: ArrowUpLeft },
  { href: '/budgets', label: 'الميزانيات', icon: Wallet },
  { href: '/goals', label: 'أهداف الادخار', icon: Target },
  { href: '/advisor', label: 'المستشار المالي', icon: Sparkles },
  { href: '/orders', label: 'الالتزامات', icon: CreditCard },
];

export function Button({
  children, variant = 'primary', className = '', type = 'button', disabled, onClick, testId,
}: {
  children: ReactNode; variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  className?: string; type?: 'button' | 'submit'; disabled?: boolean; onClick?: () => void; testId?: string;
}) {
  return <button type={type} disabled={disabled} onClick={onClick} data-testid={testId}
    className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 ${variant === 'primary' ? 'bg-emerald-700 text-white hover:bg-emerald-800' : variant === 'secondary' ? 'border border-border bg-card text-foreground hover:bg-muted' : variant === 'danger' ? 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100' : 'text-muted-foreground hover:bg-muted hover:text-foreground'} ${className}`}>
    {children}
  </button>;
}

export function IconButton({ children, label, onClick, testId }: { children: ReactNode; label: string; onClick?: () => void; testId: string }) {
  return <button aria-label={label} title={label} onClick={onClick} data-testid={testId}
    className="grid size-10 shrink-0 place-items-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">{children}</button>;
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`surface rounded-2xl ${className}`}>{children}</section>;
}

export function PageTitle({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
    <div><div className="mb-1 text-xs font-semibold tracking-wide text-emerald-800">{eyebrow}</div><h1 className="text-2xl font-bold tracking-tight text-secondary sm:text-[30px]" data-testid="text-page-title">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">{description}</p>}</div>
    {action}
  </div>;
}

export function EmptyState({ title, detail, action, icon: Icon = CircleHelp }: { title: string; detail: string; action?: ReactNode; icon?: typeof CircleHelp }) {
  return <div className="flex min-h-52 flex-col items-center justify-center px-5 py-9 text-center" data-testid="state-empty">
    <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-800"><Icon size={23} /></div>
    <h3 className="font-semibold text-secondary">{title}</h3><p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{detail}</p>{action && <div className="mt-5">{action}</div>}
  </div>;
}

export function LoadingState({ label = 'جارٍ تحميل بياناتك' }: { label?: string }) {
  return <div className="space-y-5 page-enter" role="status" aria-label={label} data-testid="state-loading">
    <div className="skeleton h-8 w-52 rounded-lg" /><div className="grid gap-4 sm:grid-cols-3"><div className="skeleton h-32 rounded-2xl" /><div className="skeleton h-32 rounded-2xl" /><div className="skeleton h-32 rounded-2xl" /></div><div className="skeleton h-64 rounded-2xl" />
  </div>;
}

export function ErrorState({ onRetry, message = 'تعذّر تحميل البيانات الآن. حاول مرة أخرى.' }: { onRetry: () => void; message?: string }) {
  return <div className="surface rounded-2xl p-8 text-center" role="alert" data-testid="state-error">
    <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-red-50 text-red-700"><CircleHelp size={22} /></div><h2 className="font-semibold text-secondary">لم نتمكن من الوصول إلى بياناتك</h2><p className="mt-2 text-sm text-muted-foreground">{message}</p><Button className="mt-5" variant="secondary" onClick={onRetry} testId="button-retry">إعادة المحاولة</Button>
  </div>;
}

export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-secondary/45 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-label={title} className="page-enter max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-border bg-background p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl sm:p-7">
      <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold text-secondary">{title}</h2><IconButton label="إغلاق" onClick={onClose} testId="button-close-dialog"><X size={19} /></IconButton></div>{children}
    </div>
  </div>;
}

export function Field({ label, name, value, onChange, type = 'text', required = true, placeholder, min, minLength, step, options, testId, autoComplete }: {
  label: string; name: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean;
  placeholder?: string; min?: string; step?: string; minLength?: number; options?: string[]; testId?: string; autoComplete?: string;
}) {
  const common = { id: name, name, required, value, 'data-testid': testId || `input-${name}`, onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => onChange(e.target.value), className: 'mt-2 min-h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10' };
  const optionLabels: Record<string, string> = { expense: 'مصروف', income: 'دخل', pending: 'معلّق', paid: 'مدفوع' };
  return <label htmlFor={name} className="block text-sm font-medium text-secondary">{label}
    {options ? <select {...common}>{options.map((o) => <option value={o} key={o}>{optionLabels[o] || o}</option>)}</select>
      : type === 'textarea' ? <textarea {...common} rows={3} placeholder={placeholder} />
        : <input {...common} type={type} autoComplete={autoComplete} min={min} step={step} minLength={minLength} placeholder={placeholder} />}
  </label>;
}

export function Currency({ value, currency = 'KWD', compact = false }: { value: number; currency?: string; compact?: boolean }) {
  return <span dir="ltr" className="number-ltr whitespace-nowrap" data-testid="text-money">
    {new Intl.NumberFormat('en-KW', { style: 'currency', currency, minimumFractionDigits: 3, maximumFractionDigits: 3, notation: compact ? 'compact' : 'standard' }).format(value)}
  </span>;
}

export function Shell({ user, onLogout, children }: { user: User; onLogout: () => void; children: ReactNode }) {
  const path = usePathname() || '/';
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const initials = user.name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('');
  const navigation = <div className="flex h-full flex-col">
    <Link href="/dashboard" className="mb-9 flex items-center gap-3 px-2 pt-2" data-testid="link-brand">
      <span className="grid size-11 place-items-center rounded-2xl bg-emerald-600 text-white"><span className="font-serif text-2xl font-bold">م</span></span>
      <span><span className="block text-lg font-bold tracking-wide text-white">MIZAN</span><span className="block text-[10px] tracking-[.23em] text-white/50">YOUR MONEY, IN BALANCE</span></span>
    </Link>
    <div className="px-3 pb-3 text-[10px] font-semibold tracking-[.16em] text-white/35">مساحتك المالية</div>
    <nav className="space-y-1" aria-label="التنقل الرئيسي">
      {routes.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} data-testid={`link-nav-${href.slice(1)}`}
        className={`nav-link flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium ${path === href ? 'bg-emerald-700 text-white shadow-lg shadow-emerald-950/20' : 'text-white/65 hover:bg-white/5 hover:text-white'}`}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{path === href && <ChevronLeft className="ms-auto" size={16} />}</Link>)}
    </nav>
    <div className="mt-auto">
      <div className="mb-5 rounded-2xl border border-white/10 bg-white/[.04] p-4"><div className="mb-2 flex items-center gap-2 text-xs font-semibold text-amber-200"><Sparkles size={14} /> ميزان، معك خطوة بخطوة</div><p className="text-[11px] leading-5 text-white/55">افهم قراراتك المالية من واقع بياناتك المسجّلة.</p><Link href="/advisor" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-300">اسأل مستشارك <ChevronLeft size={14} /></Link></div>
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 p-3">
        <span className="grid size-10 place-items-center rounded-full bg-amber-200/15 text-sm font-bold text-amber-100">{initials || 'م'}</span>
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-white" data-testid="text-username">{user.name}</span><span className="block truncate text-[11px] text-white/50">{user.email}</span></span>
        <button aria-label="تسجيل الخروج" title="تسجيل الخروج" onClick={onLogout} data-testid="button-logout" className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white"><LogOut size={17} /></button>
      </div>
    </div>
  </div>;
  return <div className="app-shell flex bg-background">
    {mobileOpen && <button aria-label="إغلاق القائمة" className="fixed inset-0 z-30 bg-secondary/40 md:hidden" onClick={() => setMobileOpen(false)} />}
    <aside className={`fixed inset-y-0 right-0 z-40 w-[270px] bg-secondary px-4 py-5 transition-transform md:sticky md:top-0 md:flex md:h-dvh md:translate-x-0 md:flex-col ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex-1">{navigation}</div>
    </aside>
    <main className="min-w-0 flex-1 pb-20 md:pb-0">
      <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-border/75 bg-background/90 px-4 backdrop-blur-lg sm:px-7 lg:px-10">
        <div className="flex items-center gap-3"><IconButton label="فتح القائمة" onClick={() => setMobileOpen(true)} testId="button-open-menu"><Menu size={20} /></IconButton><div className="hidden text-xs text-muted-foreground sm:block">مساء الخير، <span className="font-semibold text-secondary">{user.name.split(' ')[0]}</span></div></div>
         <div className="flex items-center gap-2"><span className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs text-muted-foreground sm:flex"><span className="size-1.5 rounded-full bg-emerald-600" /> بياناتك محفوظة بأمان</span><IconButton label="الملف الشخصي" testId="button-profile" onClick={() => router.push('/profile')}><Settings2 size={18} /></IconButton></div>
      </header>
      <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-7 lg:px-10 lg:py-9">{children}</div>
    </main>
    <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-border bg-card/95 px-1 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur-lg md:hidden" aria-label="تنقل الهاتف">
      {routes.slice(0, 5).map(({ href, label, icon: Icon }) => <Link href={href} key={href} data-testid={`mobile-nav-${href.slice(1)}`} className={`flex min-w-[58px] flex-col items-center gap-1 rounded-xl px-2 py-1 text-[10px] ${path === href ? 'text-emerald-800' : 'text-muted-foreground'}`}><Icon size={19} /><span>{label}</span></Link>)}
    </nav>
  </div>;
}

export function FormActions({ busy, onCancel }: { busy?: boolean; onCancel: () => void }) {
  return <div className="mt-6 flex gap-3"><Button type="submit" disabled={busy} className="flex-1" testId="button-submit">{busy ? 'جارٍ الحفظ…' : 'حفظ'}</Button><Button variant="secondary" onClick={onCancel} testId="button-cancel">إلغاء</Button></div>;
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return <p role="alert" data-testid="status-form-error" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{message}</p>;
}

export function FormWrapper({ onSubmit, children, testId }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void; children: ReactNode; testId: string }) {
  return <form onSubmit={onSubmit} data-testid={testId} className="space-y-4">{children}</form>;
}

export function AddAction({ onClick, label = 'إضافة جديد' }: { onClick: () => void; label?: string }) {
  return <Button onClick={onClick} testId="button-add"><Plus size={17} />{label}</Button>;
}
