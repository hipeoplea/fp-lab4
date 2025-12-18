import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function iconClassName(className?: string) {
  return ['prefix-icon', className].filter(Boolean).join(' ');
}

export function UserIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={iconClassName(props.className)} {...props}>
      <circle cx="12" cy="8.5" r="3.5" strokeWidth="1.6" />
      <path d="M5.5 19c0-2.8 2.9-4.5 6.5-4.5s6.5 1.7 6.5 4.5" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={iconClassName(props.className)} {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2.2" strokeWidth="1.6" />
      <path d="M4.5 7l7 5c0.9 0.6 1.1 0.6 2 0l7-5" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={iconClassName(props.className)} {...props}>
      <rect x="5" y="11" width="14" height="10" rx="2" strokeWidth="1.6" />
      <path d="M8 11V8a4 4 0 118 0v3" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="15.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}
