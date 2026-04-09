import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number | undefined | null): string {
  if (num == null || isNaN(num)) return '0'
  return new Intl.NumberFormat('en-US').format(num)
}

export function formatISK(isk: number | undefined | null): string {
  if (isk == null || isNaN(isk)) return '0 ISK'
  if (isk >= 1_000_000_000) {
    return `${(isk / 1_000_000_000).toFixed(2)}B ISK`
  }
  if (isk >= 1_000_000) {
    return `${(isk / 1_000_000).toFixed(2)}M ISK`
  }
  if (isk >= 1_000) {
    return `${(isk / 1_000).toFixed(2)}K ISK`
  }
  return `${isk.toFixed(2)} ISK`
}

export function formatSP(sp: number | undefined | null): string {
  if (sp == null || isNaN(sp)) return '0 SP'
  if (sp >= 1_000_000) {
    return `${(sp / 1_000_000).toFixed(2)}M SP`
  }
  if (sp >= 1_000) {
    return `${(sp / 1_000).toFixed(1)}K SP`
  }
  return `${sp} SP`
}

export function timeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
  
  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
  ]
  
  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds)
    if (count >= 1) {
      return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`
    }
  }
  return 'just now'
}
