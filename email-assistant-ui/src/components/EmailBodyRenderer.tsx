import { useEffect, useRef, useState } from "react";

interface EmailBodyRendererProps {
  body?: string;
  attachments?: any[];
}

const checkIsHtml = (text: string) => {
  if (!text) return false;
  const trimmed = text.trim();
  return (
    trimmed.startsWith("<") ||
    trimmed.includes("<html>") ||
    trimmed.includes("<body>") ||
    /<\/?[a-z][\s\S]*>/i.test(trimmed)
  );
};

export default function EmailBodyRenderer({ body = "", attachments = [] }: EmailBodyRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState("300px");

  useEffect(() => {
    const isHtml = checkIsHtml(body);
    if (isHtml && iframeRef.current) {
      const handleLoad = () => {
        const iframe = iframeRef.current;
        if (iframe && iframe.contentWindow) {
          // Tự động tính toán chiều cao của iframe phù hợp với nội dung HTML bên trong
          const bodyHeight = iframe.contentWindow.document.body.scrollHeight;
          setIframeHeight(`${bodyHeight + 45}px`);
        }
      };

      const iframe = iframeRef.current;
      iframe.addEventListener("load", handleLoad);
      let processedBody = body;
      if (attachments && attachments.length > 0) {
        const cidRegex = /src="cid:([^"]+)"/gi;
        processedBody = processedBody.replace(cidRegex, (match, cidValue) => {
          // Tìm file đính kèm khớp với tên file nằm trong cid
          const matchedAttachment = attachments.find(att => {
            const filename = att.filename.toLowerCase();
            const cid = cidValue.toLowerCase();
            return cid === filename || cid.includes(filename) || filename.includes(cid);
          });
          if (matchedAttachment && matchedAttachment.id) {
            const token = localStorage.getItem("accessToken") || "";
            const proxyUrl = `/api/v1/emails/attachments/${matchedAttachment.id}/download?token=${token}`;
            return `src="${proxyUrl}"`;
          }
          return match;
        });
      }
      // Ghi đè mã HTML vào iframe
      if (iframe.contentDocument) {
        iframe.contentDocument.open();
        iframe.contentDocument.write(processedBody);
        iframe.contentDocument.close();
        handleLoad();
      }

      return () => {
        iframe.removeEventListener("load", handleLoad);
      };
    }
  }, [body,attachments]);

  if (!body) {
    return <p className="text-gray-400 italic text-sm">Thư không có nội dung.</p>;
  }

  if (checkIsHtml(body)) {
    return (
      <iframe
        ref={iframeRef}
        title="Email Content"
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        style={{
          width: "100%",
          height: iframeHeight,
          border: "none",
          overflow: "hidden",
        }}
      />
    );
  }

  return (
    <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed break-words max-w-full">
      {body}
    </pre>
  );
}
