# Email Client UI – Design Specification

> Dựa trên giao diện ứng dụng **Dappr Email Client**

---

## 1. Tổng quan Layout

Giao diện chia thành **3 cột chính** (Three-Panel Layout):

```
┌──────────┬────────────────────┬──────────────────────────┐
│ Sidebar  │   Email List       │   Email Detail / Preview  │
│ (Nav)    │   (Inbox)          │   (Reading Pane)          │
│ ~200px   │   ~280px           │   flex: 1                 │
└──────────┴────────────────────┴──────────────────────────┘
```

---

## 2. Color Palette

| Token | Hex | Dùng cho |
|---|---|---|
| `--bg-sidebar` | `#1A1A2E` | Nền sidebar trái (dark navy) |
| `--bg-main` | `#F7F8FA` | Nền chính (light gray) |
| `--bg-panel` | `#FFFFFF` | Email list & detail panel |
| `--accent-primary` | `#3B82F6` | Badge, nút active, dot unread |
| `--text-primary` | `#111827` | Tiêu đề, tên người gửi |
| `--text-secondary` | `#6B7280` | Preview text, timestamp |
| `--text-sidebar` | `#D1D5DB` | Nav items trong sidebar |
| `--border` | `#E5E7EB` | Dividers, viền |
| `--unread-dot` | `#10B981` | Chấm xanh = chưa đọc |
| `--btn-dark` | `#1F2937` | Nút compose (+) |

---

## 3. Typography

| Element | Font | Size | Weight |
|---|---|---|---|
| Header (`Email`, `Inbox`) | System / Sans-serif | 20px | 700 |
| Sender name | System / Sans-serif | 14px | 600 |
| Email subject | System / Sans-serif | 14px | 500 |
| Preview snippet | System / Sans-serif | 13px | 400 |
| Timestamp | System / Sans-serif | 12px | 400 |
| Body content | System / Sans-serif | 14px | 400 |
| Nav items | System / Sans-serif | 14px | 500 |

---

## 4. Sidebar (Cột trái)

### Cấu trúc
- **Logo** (`dappr`) – top-left, màu trắng
- **Collapse button** `‹` ở cạnh phải sidebar
- **Navigation Icons** (icon-only hoặc icon + label):
  - Inbox *(active)*
  - Important
  - Sent
  - Drafts
  - Deleted
- **Divider**
- **Folders section**:
  - Add Folder (+)
  - Client
- **Settings icon** – bottom

### Style
```css
.sidebar {
  width: 200px;
  background: #1A1A2E;
  color: #D1D5DB;
  display: flex;
  flex-direction: column;
  padding: 16px 0;
}

.nav-item.active {
  background: rgba(255,255,255,0.1);
  border-radius: 8px;
  color: #FFFFFF;
}

.nav-item .badge {
  background: #3B82F6;
  color: white;
  border-radius: 99px;
  font-size: 11px;
  padding: 2px 7px;
}
```

---

## 5. Email List Panel (Cột giữa)

### Header
- Tiêu đề `Inbox` + nút **Compose** `+` (nền tối, hình tròn)

### Search bar
- Full-width, border-radius lớn (pill shape)
- Icon kính lúp bên trái
- Placeholder: *Search*

### Filter Tabs
- **All** | Read | Unread
- Tab active: nền đen, chữ trắng, border-radius pill

### Email Item
```
┌──────────────────────────────────────────┐
│ 🟢  [Avatar/Initial]  Sender Name  12:34 │
│     Subject line (bold nếu chưa đọc)     │
│     Preview snippet text (2 dòng)...     │
└──────────────────────────────────────────┘
```

**States:**
- `unread`: chấm màu xanh (`#10B981`), tên in đậm
- `read`: không có chấm, tên bình thường
- `selected/active`: nền `#F3F4F6`, border-left highlight

### Context Menu (Right-click)
Hiển thị dropdown với các action:
- Open, Reply, Reply All, Forward
- Forward's attachment
- Mark as unread
- Move to Junk, Mute, Delete
- **Star** (với color picker: 🔴🟠🟡🟢🔵⭐)
- Archive, Move to, Copy to

---

## 6. Email Detail Panel (Cột phải)

### Toolbar (top)
Các action button nằm ngang:
- ↩ Reply | ↩ Reply all | ↩↩ Forward | 🗑 Delete | ☆ Important

### Email Header
```
[Avatar]  Reid Smith                    Yesterday
          My friend Julie loves Dappr!
To: James Hendricks,  Cc: Jared Moore, Michela Nava, Eric Stromberg...
```

### Email Body
- Font đọc sạch, line-height ~1.6
- Padding rộng `24px–32px`
- Support HTML email rendering

---

## 7. Spacing System

| Token | Value |
|---|---|
| `--space-xs` | 4px |
| `--space-sm` | 8px |
| `--space-md` | 16px |
| `--space-lg` | 24px |
| `--space-xl` | 32px |

---

## 8. Border Radius

| Element | Radius |
|---|---|
| Email item | `8px` |
| Search bar | `999px` (pill) |
| Filter tabs | `999px` (pill) |
| Compose button | `50%` (circle) |
| Avatar | `50%` (circle) |
| Context menu | `12px` |
| Dropdown item hover | `6px` |

---

## 9. Shadows & Elevation

```css
/* Card / Panel */
box-shadow: 0 1px 3px rgba(0,0,0,0.08);

/* Context Menu / Dropdown */
box-shadow: 0 8px 24px rgba(0,0,0,0.12);

/* Compose Button */
box-shadow: 0 4px 12px rgba(0,0,0,0.15);
```

---

## 10. Responsive Behavior

| Breakpoint | Layout |
|---|---|
| `>= 1200px` | 3 cột đầy đủ |
| `768px – 1199px` | Sidebar thu gọn (icon only) + 2 cột |
| `< 768px` | Chỉ hiện 1 panel (mobile: list hoặc detail) |

---

## 11. Component List

- `<Sidebar />` — navigation + folders
- `<EmailList />` — search + filter + danh sách email
- `<EmailItem />` — 1 hàng email trong list
- `<ContextMenu />` — right-click menu
- `<EmailDetail />` — reading pane
- `<EmailToolbar />` — reply/forward/delete buttons
- `<ComposeButton />` — nút `+` tạo email mới
- `<SearchBar />` — ô tìm kiếm
- `<FilterTabs />` — All / Read / Unread

---

## 12. Ghi chú cho Developer

- Dùng **CSS Grid** hoặc **Flexbox** cho 3-column layout
- Sidebar nên có transition khi collapse/expand
- Context menu cần xử lý `position: fixed` và đóng khi click ngoài
- Email body render HTML an toàn (sanitize XSS)
- Unread count badge cập nhật realtime qua Nylas Webhook