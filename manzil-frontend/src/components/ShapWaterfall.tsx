import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { motion } from "framer-motion";
import { Brain } from "lucide-react";

interface FeatureContribution {
  feature: string;
  display: string;
  contribution: number;
  direction: "positive" | "negative";
}

interface ShapWaterfallProps {
  contributions: FeatureContribution[];
  baseValue: number;
  finalPrediction: number;
}

const POSITIVE_COLOR = "#67D58C";
const NEGATIVE_COLOR = "#EF4444";

const formatEgp = (value: number): string => {
  return new Intl.NumberFormat("en-EG", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(value);
};

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: FeatureContribution & { absContribution: number } }>;
}) => {
  if (!active || !payload?.length || !payload[0]?.payload) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-sm font-medium text-text">{data.display}</p>
      <p className="text-xs text-text-secondary">
        {data.direction === "positive" ? "+" : ""}
        {formatEgp(data.contribution)} EGP
      </p>
    </div>
  );
};

export default function ShapWaterfall({
  contributions,
  baseValue,
  finalPrediction,
}: ShapWaterfallProps) {
  const sortedData = useMemo(() => {
    return [...contributions]
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
      .map((c) => ({
        ...c,
        absContribution: Math.abs(c.contribution),
      }));
  }, [contributions]);

  const maxVal = useMemo(() => {
    if (sortedData.length === 0) return 0;
    return Math.max(...sortedData.map((d) => d.absContribution));
  }, [sortedData]);

  const axisWidth = useMemo(() => {
    const maxDisplayLen = sortedData.reduce(
      (max, d) => Math.max(max, d.display.length),
      0
    );
    return Math.max(90, maxDisplayLen * 8 + 16);
  }, [sortedData]);

  const chartHeight = Math.max(200, sortedData.length * 40);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="rounded-2xl border border-border bg-card p-5"
    >
      <div className="mb-4 flex items-center gap-2">
        <Brain className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-text">Why this price?</h3>
      </div>

      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={sortedData}
          layout="vertical"
          margin={{ top: 4, right: 20, bottom: 4, left: 0 }}
        >
          <XAxis
            type="number"
            domain={[0, maxVal * 1.15]}
            tickFormatter={(v: number) => formatEgp(v)}
            tick={{ fill: "#708277", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="display"
            width={axisWidth}
            tick={{ fill: "#9FB4A8", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
          />
          <ReferenceLine x={0} stroke="rgba(255,255,255,0.08)" />
          <Bar dataKey="absContribution" radius={[0, 4, 4, 0]} barSize={22}>
            {sortedData.map((entry, index) => (
              <Cell
                key={index}
                fill={
                  entry.direction === "positive"
                    ? POSITIVE_COLOR
                    : NEGATIVE_COLOR
                }
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 rounded-xl border border-border bg-bg px-4 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="hidden">
            <p className="text-xs text-text-muted">Base value</p>
            <p className="text-sm font-medium text-text-secondary">
              {formatEgp(baseValue)} EGP
            </p>
          </div>
          <div className="hidden h-6 w-px bg-border sm:block" />
          <div className="hidden">
            <span className="text-xs text-text-muted">+</span>
            <span className="text-xs text-text-muted">+</span>
            <span className="text-xs text-text-muted">+</span>
          </div>
          <div className="hidden h-6 w-px bg-border sm:block" />
          <div className="text-right">
            <p className="text-xs text-text-muted">Predicted price</p>
            <p className="text-lg font-bold text-primary">
              {formatEgp(finalPrediction)} EGP
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
