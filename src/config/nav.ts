// Sidebar navigation. SPEC 5.1. `icon` is a lucide-react component name, resolved by the
// component layer (kept as a string here so config has no React/JSX dependency).

export interface NavTab {
  id: 'dashboard' | 'zone' | 'report' | 'mcatt' | 'contact'
  label: string
  hash: string
  icon: string
}

export const NAV_TABS: NavTab[] = [
  { id: 'dashboard', label: 'Dashboard', hash: '#/dashboard', icon: 'LayoutDashboard' },
  { id: 'zone', label: 'สถานการณ์ปัจจุบันรายเขต', hash: '#/zone', icon: 'MapPinned' },
  { id: 'report', label: 'รายงาน', hash: '#/report', icon: 'FileText' },
  { id: 'mcatt', label: 'MCATT & SMI-V', hash: '#/mcatt', icon: 'Users' },
  { id: 'contact', label: 'ติดต่อเรา', hash: '#/contact', icon: 'Phone' },
]
