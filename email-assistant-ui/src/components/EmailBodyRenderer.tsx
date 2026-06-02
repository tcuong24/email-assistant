import { useEffect, useRef, useState } from "react";

interface EmailBodyRendererProps {
  body?: string;
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

export default function EmailBodyRenderer({ body = "" }: EmailBodyRendererProps) {
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
      
      // Ghi đè mã HTML vào iframe
      if (iframe.contentDocument) {
        iframe.contentDocument.open();
        iframe.contentDocument.write(body);
        iframe.contentDocument.close();
        handleLoad();
      }

      return () => {
        iframe.removeEventListener("load", handleLoad);
      };
    }
  }, [body]);

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
