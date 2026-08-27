import { motion } from "framer-motion";

interface SectionHeadingProps {
  badge?: string;
  title: string;
  subtitle?: string;
  className?: string;
}

export default function SectionHeading({
  badge,
  title,
  subtitle,
  className,
}: SectionHeadingProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`text-center ${className ?? ""}`}
    >
      {badge && (
        <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-white/5 px-4 py-1.5 text-xs font-medium text-text-secondary">
          {badge}
        </span>
      )}
      <h2 className="text-[44px] font-bold leading-[1.08] tracking-tight max-md:text-[32px]">
        {title}
      </h2>
      {subtitle && (
        <p className="mx-auto mt-5 max-w-[600px] text-lg text-text-secondary">
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}
