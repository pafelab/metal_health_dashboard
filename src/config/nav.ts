// Sidebar navigation. SPEC 5.1. `icon` is a lucide-react component name, resolved by the
// component layer (kept as a string here so config has no React/JSX dependency).
//
// UX-15: labels are task names that predict the destination ('รายงาน' opened criteria + blank
// forms, not an analytical report builder), and every tab carries a `description` that the
// sidebar exposes as a tooltip + screen-reader text, spelling out abbreviations on first use.

export interface NavTab {
  id: 'dashboard' | 'zone' | 'report' | 'mcatt' | 'contact'
  label: string
  hash: string
  icon: string
  /** One-line explanation of the destination (tooltip + visually-hidden text in the sidebar). */
  description?: string
}

export const NAV_TABS: NavTab[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    hash: '#/dashboard',
    icon: 'LayoutDashboard',
    description: 'ภาพรวมทั้งประเทศ: ตัวเลขสรุป แนวโน้ม แผนที่ และตารางเหตุการณ์',
  },
  {
    id: 'zone',
    label: 'สถานการณ์รายเขต',
    hash: '#/zone',
    icon: 'MapPinned',
    description: 'เจาะดูสถานการณ์รายเขตสุขภาพและรายจังหวัด',
  },
  {
    id: 'report',
    label: 'เกณฑ์และแบบฟอร์ม',
    hash: '#/report',
    icon: 'FileText',
    description: 'เกณฑ์การแจ้งเตือนและแบบฟอร์มรายงานสำหรับดาวน์โหลด (ไม่ใช่รายงานเชิงวิเคราะห์)',
  },
  {
    id: 'mcatt',
    label: 'ผู้ประสานงาน MCATT / SMI-V',
    hash: '#/mcatt',
    icon: 'Users',
    description:
      'ทำเนียบผู้ประสานงานรายจังหวัด · MCATT = ทีมช่วยเหลือเยียวยาจิตใจผู้ประสบภาวะวิกฤต · SMI-V = ผู้ป่วยจิตเวชที่มีความเสี่ยงสูงต่อการก่อความรุนแรง',
  },
  {
    id: 'contact',
    label: 'ติดต่อเรา',
    hash: '#/contact',
    icon: 'Phone',
    description: 'ข้อมูลติดต่อกองบริหารระบบบริการสุขภาพจิต กรมสุขภาพจิต',
  },
]
