import { motion } from "framer-motion";
import { TrendingUp, Star } from "lucide-react";
import { formatEGP } from "@/lib/api";

interface InvestmentScore {
  listed_price: number;
  predicted_price: number;
  difference: number;
  difference_pct: number;
  rating: number;
  status: "excellent_deal" | "good_deal" | "fair_price" | "overpriced";
  label: string;
}

interface InvestmentAnalysisProps {
  score: InvestmentScore;
}

function getStatusColor(status: InvestmentScore["status"]): string {
  switch (status) {
    case "excellent_deal":
      return "text-primary";
    case "good_deal":
      return "text-primary";
    case "fair_price":
      return "text-warning";
    case "overpriced":
      return "text-red-400";
  }
}

function getStatusBg(status: InvestmentScore["status"]): string {
  switch (status) {
    case "excellent_deal":
      return "bg-primary/10";
    case "good_deal":
      return "bg-primary/10";
    case "fair_price":
      return "bg-warning/10";
    case "overpriced":
      return "bg-red-400/10";
  }
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-5 w-5 ${
            i < rating
              ? "fill-warning text-warning"
              : "fill-none text-text-muted"
          }`}
        />
      ))}
    </div>
  );
}

export default function InvestmentAnalysis({ score }: InvestmentAnalysisProps) {
  const isUnderpriced = score.difference > 0;
  const barWidth = Math.min(Math.abs(score.difference_pct), 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="rounded-[22px] border border-border bg-card p-6"
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-text">Investment Analysis</h3>
        </div>
        <StarRating rating={score.rating} />
      </div>

      <div
        className={`mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium ${getStatusBg(score.status)} ${getStatusColor(score.status)}`}
      >
        <span
          className={`h-2 w-2 rounded-full ${
            score.status === "excellent_deal" || score.status === "good_deal"
              ? "bg-primary"
              : score.status === "fair_price"
                ? "bg-warning"
                : "bg-red-400"
          }`}
        />
        {score.label}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-bg p-4">
          <p className="mb-1 text-sm text-text-muted">Listed Price</p>
          <p className="text-xl font-bold text-text">
            {formatEGP(score.listed_price)}
          </p>
        </div>
        <div className="rounded-2xl bg-bg p-4">
          <p className="mb-1 text-sm text-text-muted">Predicted Price</p>
          <p className="text-xl font-bold text-text">
            {formatEGP(score.predicted_price)}
          </p>
        </div>
      </div>

      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm text-text-secondary">Price Difference</p>
          <p
            className={`text-sm font-semibold ${
              isUnderpriced ? "text-primary" : score.difference === 0 ? "text-text-secondary" : "text-red-400"
            }`}
          >
            {isUnderpriced ? "+" : ""}
            {formatEGP(score.difference)} ({isUnderpriced ? "+" : ""}
            {score.difference_pct.toFixed(1)}%)
          </p>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-bg">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${barWidth}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
            className={`h-full rounded-full ${
              score.status === "excellent_deal"
                ? "bg-primary"
                : score.status === "good_deal"
                  ? "bg-primary/70"
                  : score.status === "fair_price"
                    ? "bg-warning"
                    : "bg-red-400"
            }`}
          />
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl bg-bg p-4">
        <div
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
            score.status === "overpriced" ? "bg-red-400/20" : "bg-primary/10"
          }`}
        >
          <TrendingUp
            className={`h-3.5 w-3.5 ${
              score.status === "overpriced" ? "text-red-400" : "text-primary"
            }`}
          />
        </div>
        <p className="text-sm leading-relaxed text-text-secondary">{score.label}</p>
      </div>
    </motion.div>
  );
}
