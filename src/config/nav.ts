// Primary navigation. SPEC 5.1. `icon` is a lucide-react component name, resolved by the
// component layer (kept as a string here so config has no React/JSX dependency).
//
// Redesign (deck slide 11, "แถบซ้ายมือ ตัดออกให้หมด"): the left sidebar is gone. These tabs are
// now rendered as a horizontal link row inside PageHeader, and this list is also the source of
// truth for useHashRoute's valid routes.
//
// UX-15: labels are task names that predict the destination ('รายงาน' opened criteria + blank
// forms, not an analytical report builder), and every tab carries a `description` that the nav
// row exposes as a tooltip + screen-reader text, spelling out abbreviations on first use.

export interface NavTab {
  id: 'dashboard' | 'zone' | 'report' | 'mcatt' | 'contact'
  label: string
  hash: string
  icon: string
  /** One-line explanation of the destination (tooltip + visually-hidden text in the nav row). */
  description?: string
}

export const NAV_TABS: NavTab[] = [
  {
    id: 'dashboard',
    // Deck slide 10: the product is named "Social Listening 2569", not "Dashboard". This label is
    // both the nav pill and the header title for this route (App.tsx derives the title from it).
    label: 'Social Listening 2569',
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
