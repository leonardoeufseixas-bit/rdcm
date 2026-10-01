import { cx } from './ui'

export function Logo({ big }: { big?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <img src="/icon.svg" alt="" className={big ? 'h-16 w-16' : 'h-10 w-10'} />
      <div className="leading-none">
        <div className={cx('font-display font-bold tracking-wider text-white', big ? 'text-4xl' : 'text-2xl')}>RDCM</div>
        <div className={cx('font-semibold tracking-[.2em] text-brand uppercase', big ? 'text-xs' : 'text-[9px]')}>Transportes e Guincho</div>
      </div>
    </div>
  )
}
