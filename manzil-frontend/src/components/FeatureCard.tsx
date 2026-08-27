import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  delay?: number;
}

export default function FeatureCard({
  icon: Icon,
  title,
  description,
  delay = 0,
}: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      className="group rounded-[20px] border border-border bg-card p-8 max-md:p-6 transition-shadow duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.25)]"
    >
      <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="size-5 text-primary" strokeWidth={1.75} />
      </div>
      <h3 className="mb-3 text-[26px] font-semibold leading-snug max-md:text-xl">{title}</h3>
      <p className="text-base leading-relaxed text-text-secondary">
        {description}
      </p>
    </motion.div>
  );
}
