import { motion } from "framer-motion";

interface BorderBeamProps {
  size?: number;     // Kích thước của tia sáng (độ rộng quét)
  duration?: number; // Thời gian chạy hết 1 vòng (giây)
  delay?: number;    // Thời gian trễ trước khi bắt đầu chạy
}

export default function BorderBeam({
  size = 50,
  duration = 4,
  delay = 0,
}: BorderBeamProps) {
  return (
    <div
      style={{
        "--size": size,
        "--duration": duration,
        "--delay": delay,
      } as React.CSSProperties}
      className="pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(white,white)]"
    >
      <motion.div
        className="absolute aspect-square w-[calc(var(--size)*1px)] bg-[radial-gradient(circle_at_center,var(--color-from)_0%,var(--color-to)_50%,transparent_100%)] [offset-anchor:50%_50%] [offset-path:rect(0_100%_100%_0_round_100%)]"
        style={{
          "--color-from": "#3b82f6", // Điểm đầu tia sáng: xanh dương
          "--color-to": "#ec4899",   // Điểm cuối tia sáng: hồng ngoại
        } as React.CSSProperties}
        animate={{ offsetDistance: ["0%", "100%"] }}
        transition={{
          duration: duration,
          delay: delay,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  );
}
