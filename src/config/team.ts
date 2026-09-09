// ทีมงาน Social Listening. SPEC 6.7, photo filenames per docs/BUILD_NOTES.md "Team photos"
// (BUILD_NOTES wins — SPEC's original filenames were the pre-rename source photos).

export interface TeamMember {
  name: string
  nickname: string
  position: string
  phone: string
  photo: string
}

export const TEAM: TeamMember[] = [
  {
    name: 'นางอุษา วิศาลวาณิชย์',
    nickname: 'เก๋',
    position: 'นักจิตวิทยาคลินิกชำนาญการพิเศษ',
    phone: '081-4893148',
    photo: '/team/usa.jpg',
  },
  {
    name: 'นางสาวรมิดา แจ้งกัน',
    nickname: 'ทราย',
    position: 'นักวิชาการสาธารณสุข',
    phone: '095-9687704',
    photo: '/team/ramida.jpg',
  },
  {
    name: 'นางสาวณ.ฤดี วิทพันธ์',
    nickname: 'ไอซ์',
    position: 'นักวิชาการสาธารณสุข',
    phone: '085-0869470',
    photo: '/team/naruedee.jpg',
  },
]
