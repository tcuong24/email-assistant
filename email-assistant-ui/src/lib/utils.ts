import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export const stripHtml = (html?: string) => {
  if (!html) return "";
  let text = html;
  // 1. Loại bỏ các khối thẻ <style>...</style> cùng nội dung CSS bên trong
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  // 2. Loại bỏ các khối thẻ <script>...</script> cùng nội dung JS bên trong
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  // 3. Loại bỏ tất cả các thẻ HTML khác
  text = text.replace(/<[^>]*>/g, " ");
  // 4. Thay thế nhiều khoảng trắng liên tiếp bằng 1 khoảng trắng
  return text.replace(/\s+/g, " ").trim();
};