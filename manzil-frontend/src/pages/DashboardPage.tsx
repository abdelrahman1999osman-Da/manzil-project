import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Building2,
  TrendingUp,
  MapPin,
  BarChart3,
  PieChart as PieChartIcon,
  Layers,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Home,
  Filter,
} from "lucide-react";
import { fetchAnalytics, formatEGP, type AnalyticsResponse } from "@/lib/api";
import { useCategories } from "@/hooks/use-categories";

const COLORS = [
  "#67D58C",
  "#D7A441",
  "#3B82F6",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#F97316",
  "#84CC16",
  "#A855F7",
];

const MAIN_CITIES = [
  "Cairo", "Alexandria", "Giza", "6th of October", "Sheikh Zayed",
  "New Cairo", "New Capital City", "Mostakbal City", "Shorouk City",
  "New Zayed", "Obour City", "Madinaty", "Red Sea", "Hurghada",
  "Suez", "North Coast", "Alamein", "Ain Sukhna", "Ras Al Hekma",
  "Sidi Abdel Rahman", "Soma Bay", "Makadi Bay", "Sahl Hasheesh", "Gouna",
  "Mansura", "Tanta", "Zagazig", "Damietta", "Banha", "Asyut",
  "Damanhour", "Shebin al-Koum", "Marsa Matrouh", "Matruh",
  "10th of Ramadan", "Badr City", "New Heliopolis",
];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: "easeOut" as const },
  }),
};

function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 animate-pulse">
      <div className="h-5 w-40 bg-border rounded mb-4" />
      <div className="h-48 w-full bg-border rounded" />
    </div>
  );
}

function SkeletonStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-card border border-border rounded-2xl p-6 animate-pulse"
        >
          <div className="h-4 w-24 bg-border rounded mb-3" />
          <div className="h-8 w-32 bg-border rounded mb-2" />
          <div className="h-3 w-16 bg-border rounded" />
        </div>
      ))}
    </div>
  );
}

interface ChartCardProps {
  title: string;
  icon: React.ReactNode;
  index: number;
  children: React.ReactNode;
}

function ChartCard({ title, icon, index, children }: ChartCardProps) {
  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="bg-card border border-border rounded-2xl p-6"
    >
      <div className="flex items-center gap-2 mb-5">
        <span className="text-primary">{icon}</span>
        <h3 className="text-text text-sm font-semibold tracking-wide">
          {title}
        </h3>
      </div>
      {children}
    </motion.div>
  );
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-xl">
      <p className="text-text-secondary text-xs mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-text text-sm font-medium" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === "number" ? formatEGP(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
}

interface NumberTooltipProps {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}

function NumberTooltip({ active, payload, label }: NumberTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-xl">
      <p className="text-text-secondary text-xs mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-text text-sm font-medium" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { categories } = useCategories();
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");

  const abortRef = useRef<AbortController | null>(null);

  const loadData = useCallback(async (city?: string, type?: string) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const result = await fetchAnalytics(city, type, ctrl.signal);
      if (!ctrl.signal.aborted) setData(result);
    } catch {
      if (!ctrl.signal.aborted) setData(null);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(selectedCity || undefined, selectedType || undefined);
  }, [selectedCity, selectedType, loadData]);

  const mainCitySet = new Set(MAIN_CITIES);
  const cities = Object.keys(categories.City_Map)
    .filter((c) => mainCitySet.has(c))
    .sort();
  const propertyTypes = categories["Property Type"];

  const avgPriceByCity = data
    ? [...data.avg_price_by_city]
        .sort((a, b) => b.avg_price - a.avg_price)
        .slice(0, 15)
    : [];

  const avgPriceByDistrict = data
    ? [...data.avg_price_by_district]
        .sort((a, b) => b.avg_price - a.avg_price)
        .slice(0, 15)
    : [];

  const pricePerSqmByCity = data
    ? [...data.price_per_sqm_by_city]
        .sort((a, b) => b.avg_ppsm - a.avg_ppsm)
        .slice(0, 15)
    : [];

  const priceDistribution = data
    ? data.price_distribution.bins.slice(0, -1).map((bin, i) => ({
        range: `${formatEGP(bin)}`,
        count: data.price_distribution.counts[i] ?? 0,
      }))
    : [];

  const areaDistribution = data
    ? data.area_distribution.bins.slice(0, -1).map((bin, i) => ({
        range: `${Math.round(bin)} m²`,
        count: data.area_distribution.counts[i] ?? 0,
      }))
    : [];

  const propertyTypePie = data
    ? Object.entries(data.property_type_distribution).map(([name, value]) => ({
        name,
        value,
      }))
    : [];

  const scatterData = data
    ? (() => {
        const sampled = [...data.price_vs_area];
        const maxPoints = 500;
        if (sampled.length > maxPoints) {
          const step = Math.floor(sampled.length / maxPoints);
          return sampled.filter((_, i) => i % step === 0).slice(0, maxPoints);
        }
        return sampled;
      })()
    : [];

  const topExpensive = data ? data.top_expensive.slice(0, 10) : [];
  const topAffordable = data ? data.top_affordable.slice(0, 10) : [];

  const scatterTypes = data
    ? Array.from(new Set(scatterData.map((d) => d["Property Type"])))
    : [];

  const scatterColors: Record<string, string> = {};
  scatterTypes.forEach((t, i) => {
    scatterColors[t] = COLORS[i % COLORS.length]!;
  });

  return (
    <div className="min-h-screen bg-bg px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <h1 className="text-text text-2xl sm:text-3xl font-bold tracking-tight mb-2">
            Market Analytics
          </h1>
          <p className="text-text-secondary text-sm">
            Explore real estate market insights across Egypt
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="flex flex-wrap items-center gap-3 mb-8"
        >
          <div className="flex items-center gap-2 text-text-secondary text-sm">
            <Filter className="w-4 h-4" />
            <span>Filters:</span>
          </div>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="bg-card border border-border text-text text-sm rounded-xl px-4 py-2.5 outline-none focus:border-primary transition-colors cursor-pointer"
          >
            <option value="">All Cities</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-card border border-border text-text text-sm rounded-xl px-4 py-2.5 outline-none focus:border-primary transition-colors cursor-pointer"
          >
            <option value="">All Types</option>
            {propertyTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </motion.div>

        {loading ? (
          <>
            <SkeletonStats />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Array.from({ length: 10 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </>
        ) : data ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <motion.div
                custom={0}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="bg-card border border-border rounded-2xl p-6"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Home className="w-4 h-4 text-primary" />
                  <span className="text-text-secondary text-xs font-medium uppercase tracking-wider">
                    Total Properties
                  </span>
                </div>
                <p className="text-text text-2xl font-bold">
                  {data.summary.total.toLocaleString()}
                </p>
              </motion.div>

              <motion.div
                custom={1}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="bg-card border border-border rounded-2xl p-6"
              >
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-text-secondary text-xs font-medium uppercase tracking-wider">
                    Avg Price
                  </span>
                </div>
                <p className="text-text text-2xl font-bold">
                  {formatEGP(data.summary.avg_price)}
                </p>
              </motion.div>

              <motion.div
                custom={2}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="bg-card border border-border rounded-2xl p-6"
              >
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <span className="text-text-secondary text-xs font-medium uppercase tracking-wider">
                    Median Price
                  </span>
                </div>
                <p className="text-text text-2xl font-bold">
                  {formatEGP(data.summary.median_price)}
                </p>
              </motion.div>

              <motion.div
                custom={3}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="bg-card border border-border rounded-2xl p-6"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="w-4 h-4 text-primary" />
                  <span className="text-text-secondary text-xs font-medium uppercase tracking-wider">
                    Avg Area
                  </span>
                </div>
                <p className="text-text text-2xl font-bold">
                  {Math.round(data.summary.avg_area).toLocaleString()} m²
                </p>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard
                title="Average Price by City"
                icon={<MapPin className="w-4 h-4" />}
                index={4}
              >
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={avgPriceByCity}
                      layout="vertical"
                      margin={{ top: 0, right: 20, bottom: 0, left: 0 }}
                    >
                      <XAxis
                        type="number"
                        tick={{ fill: "#708277", fontSize: 11 }}
                        tickFormatter={(v) =>
                          v >= 1000000
                            ? `${(v / 1000000).toFixed(1)}M`
                            : `${(v / 1000).toFixed(0)}K`
                        }
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="city"
                        tick={{ fill: "#9FB4A8", fontSize: 11 }}
                        width={80}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="avg_price"
                        name="Avg Price"
                        fill="#67D58C"
                        radius={[0, 6, 6, 0]}
                        barSize={16}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard
                title="Average Price by District"
                icon={<Building2 className="w-4 h-4" />}
                index={5}
              >
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={avgPriceByDistrict}
                      layout="vertical"
                      margin={{ top: 0, right: 20, bottom: 0, left: 0 }}
                    >
                      <XAxis
                        type="number"
                        tick={{ fill: "#708277", fontSize: 11 }}
                        tickFormatter={(v) =>
                          v >= 1000000
                            ? `${(v / 1000000).toFixed(1)}M`
                            : `${(v / 1000).toFixed(0)}K`
                        }
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="district"
                        tick={{ fill: "#9FB4A8", fontSize: 11 }}
                        width={100}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="avg_price"
                        name="Avg Price"
                        fill="#D7A441"
                        radius={[0, 6, 6, 0]}
                        barSize={16}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard
                title="Avg Price per m² by City"
                icon={<TrendingUp className="w-4 h-4" />}
                index={6}
              >
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={pricePerSqmByCity}
                      margin={{ top: 0, right: 20, bottom: 0, left: 0 }}
                    >
                      <XAxis
                        dataKey="city"
                        tick={{ fill: "#9FB4A8", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        tick={{ fill: "#708277", fontSize: 11 }}
                        tickFormatter={(v) =>
                          v >= 1000000
                            ? `${(v / 1000000).toFixed(1)}M`
                            : `${(v / 1000).toFixed(0)}K`
                        }
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="avg_ppsm"
                        name="Price/m²"
                        fill="#3B82F6"
                        radius={[6, 6, 0, 0]}
                        barSize={24}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard
                title="Price Distribution"
                icon={<BarChart3 className="w-4 h-4" />}
                index={7}
              >
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={priceDistribution}
                      margin={{ top: 0, right: 20, bottom: 0, left: 0 }}
                    >
                      <XAxis
                        dataKey="range"
                        tick={{ fill: "#9FB4A8", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        angle={-45}
                        textAnchor="end"
                        height={70}
                      />
                      <YAxis
                        tick={{ fill: "#708277", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<NumberTooltip />} />
                      <Bar
                        dataKey="count"
                        name="Properties"
                        fill="#67D58C"
                        radius={[6, 6, 0, 0]}
                        barSize={20}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard
                title="Area Distribution"
                icon={<Layers className="w-4 h-4" />}
                index={8}
              >
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={areaDistribution}
                      margin={{ top: 0, right: 20, bottom: 0, left: 0 }}
                    >
                      <XAxis
                        dataKey="range"
                        tick={{ fill: "#9FB4A8", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        angle={-45}
                        textAnchor="end"
                        height={70}
                      />
                      <YAxis
                        tick={{ fill: "#708277", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<NumberTooltip />} />
                      <Bar
                        dataKey="count"
                        name="Properties"
                        fill="#D7A441"
                        radius={[6, 6, 0, 0]}
                        barSize={20}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard
                title="Property Type Distribution"
                icon={<PieChartIcon className="w-4 h-4" />}
                index={9}
              >
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={propertyTypePie}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={110}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {propertyTypePie.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0];
                          if (!d) return null;
                          return (
                            <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-xl">
                              <p className="text-text text-sm font-medium">
                                {d.name ?? ""}
                              </p>
                              <p className="text-text-secondary text-xs">
                                {String(d.value ?? 0)} properties
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        formatter={(value: string) => (
                          <span className="text-text-secondary text-xs">
                            {value}
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard
                title="Price vs Area Scatter"
                icon={<Activity className="w-4 h-4" />}
                index={10}
              >
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 0, right: 20, bottom: 0, left: 0 }}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.06)"
                      />
                      <XAxis
                        type="number"
                        dataKey="Area"
                        name="Area"
                        tick={{ fill: "#708277", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        label={{
                          value: "Area (m²)",
                          position: "insideBottom",
                          offset: -5,
                          fill: "#708277",
                          fontSize: 11,
                        }}
                      />
                      <YAxis
                        type="number"
                        dataKey="Original Price"
                        name="Price"
                        tick={{ fill: "#708277", fontSize: 11 }}
                        tickFormatter={(v) =>
                          v >= 1000000
                            ? `${(v / 1000000).toFixed(1)}M`
                            : `${(v / 1000).toFixed(0)}K`
                        }
                        axisLine={false}
                        tickLine={false}
                        label={{
                          value: "Price (EGP)",
                          angle: -90,
                          position: "insideLeft",
                          offset: 10,
                          fill: "#708277",
                          fontSize: 11,
                        }}
                      />
                      <Tooltip
                        cursor={{ strokeDasharray: "3 3", stroke: "rgba(255,255,255,0.1)" }}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0]?.payload;
                          if (!d) return null;
                          return (
                            <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-xl">
                              <p className="text-text-secondary text-xs mb-1">
                                {d["Property Type"]}
                              </p>
                              <p className="text-text text-sm font-medium">
                                Area: {d.Area} m²
                              </p>
                              <p className="text-text text-sm font-medium">
                                Price: {formatEGP(d["Original Price"])}
                              </p>
                            </div>
                          );
                        }}
                      />
                      {scatterTypes.map((type) => (
                        <Scatter
                          key={type}
                          name={type}
                          data={scatterData.filter(
                            (d) => d["Property Type"] === type
                          )}
                          fill={scatterColors[type]}
                          opacity={0.7}
                        />
                      ))}
                      <Legend
                        verticalAlign="bottom"
                        formatter={(value: string) => (
                          <span className="text-text-secondary text-xs">
                            {value}
                          </span>
                        )}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard
                title="Top 10 Most Expensive"
                icon={<ArrowUpRight className="w-4 h-4" />}
                index={11}
              >
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topExpensive}
                      layout="vertical"
                      margin={{ top: 0, right: 20, bottom: 0, left: 0 }}
                    >
                      <XAxis
                        type="number"
                        tick={{ fill: "#708277", fontSize: 11 }}
                        tickFormatter={(v) =>
                          v >= 1000000
                            ? `${(v / 1000000).toFixed(1)}M`
                            : `${(v / 1000).toFixed(0)}K`
                        }
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="city"
                        tick={{ fill: "#9FB4A8", fontSize: 11 }}
                        width={80}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="avg_price"
                        name="Avg Price"
                        fill="#67D58C"
                        radius={[0, 6, 6, 0]}
                        barSize={16}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard
                title="Top 10 Most Affordable"
                icon={<ArrowDownRight className="w-4 h-4" />}
                index={12}
              >
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topAffordable}
                      layout="vertical"
                      margin={{ top: 0, right: 20, bottom: 0, left: 0 }}
                    >
                      <XAxis
                        type="number"
                        tick={{ fill: "#708277", fontSize: 11 }}
                        tickFormatter={(v) =>
                          v >= 1000000
                            ? `${(v / 1000000).toFixed(1)}M`
                            : `${(v / 1000).toFixed(0)}K`
                        }
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="city"
                        tick={{ fill: "#9FB4A8", fontSize: 11 }}
                        width={80}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="avg_price"
                        name="Avg Price"
                        fill="#06B6D4"
                        radius={[0, 6, 6, 0]}
                        barSize={16}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard
                title="Correlation Summary"
                icon={<Activity className="w-4 h-4" />}
                index={13}
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-bg border border-border rounded-xl p-5 text-center">
                    <p className="text-text-secondary text-xs font-medium uppercase tracking-wider mb-2">
                      Area ↔ Price
                    </p>
                    <p className="text-text text-2xl font-bold">
                      {(data.correlation.area_price * 100).toFixed(1)}%
                    </p>
                    <div className="mt-3 w-full bg-border rounded-full h-1.5">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.abs(data.correlation.area_price) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="bg-bg border border-border rounded-xl p-5 text-center">
                    <p className="text-text-secondary text-xs font-medium uppercase tracking-wider mb-2">
                      Beds ↔ Price
                    </p>
                    <p className="text-text text-2xl font-bold">
                      {(data.correlation.beds_price * 100).toFixed(1)}%
                    </p>
                    <div className="mt-3 w-full bg-border rounded-full h-1.5">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.abs(data.correlation.beds_price) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="bg-bg border border-border rounded-xl p-5 text-center">
                    <p className="text-text-secondary text-xs font-medium uppercase tracking-wider mb-2">
                      Baths ↔ Price
                    </p>
                    <p className="text-text text-2xl font-bold">
                      {(data.correlation.baths_price * 100).toFixed(1)}%
                    </p>
                    <div className="mt-3 w-full bg-border rounded-full h-1.5">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.abs(data.correlation.baths_price) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </ChartCard>
            </div>
          </>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-12 text-center">
            <Building2 className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <p className="text-text-secondary text-sm">
              Failed to load analytics data. Please try again.
            </p>
            <button
              onClick={() => loadData(selectedCity || undefined, selectedType || undefined)}
              className="mt-4 px-5 py-2 bg-primary/10 text-primary text-sm font-medium rounded-xl hover:bg-primary/20 transition-colors"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
