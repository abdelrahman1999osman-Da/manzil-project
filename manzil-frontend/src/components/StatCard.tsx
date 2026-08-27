import { motion } from "framer-motion";

interface StatCardProps {
  value: string;
  label: string;
  delay?: number;
}

export default function StatCard({ value, label, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className="flex flex-col items-center text-center"
    >
      <p className="text-4xl font-extrabold tracking-tight leading-none max-md:text-3xl">
        {value}
      </p>
      <p className="mt-2.5 text-sm leading-snug text-text-muted">{label}</p>
    </motion.div>
  );
}
