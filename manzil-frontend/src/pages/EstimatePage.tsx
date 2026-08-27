import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calculator,
  Home,
  BedDouble,
  Bath,
  Ruler,
  MapPin,
  TrendingUp,
  Info,
  Loader2,
  CheckCircle2,
  DollarSign,
} from "lucide-react";
import { useCategories } from "@/hooks/use-categories";
import { usePrediction } from "@/hooks/use-prediction";
import { formatEGP, type PredictionRequest } from "@/lib/api";
import { cn } from "@/lib/cn";
import ShapWaterfall from "@/components/ShapWaterfall";
import InvestmentAnalysis from "@/components/InvestmentAnalysis";
import SimilarProperties from "@/components/SimilarProperties";
import PriceSimulator from "@/components/PriceSimulator";

const schema = z.object({
  beds: z.coerce.number().min(1, "Min 1").max(20, "Max 20"),
  baths: z.coerce.number().min(1, "Min 1").max(20, "Max 20"),
  area: z.coerce.number().min(10, "Min 10 sqm").max(10000, "Max 10,000 sqm"),
  property_type: z.string().min(1, "Required"),
  city: z.string().min(1, "Required"),
  compound_district: z.string().min(1, "Required"),
  location: z.string().min(1, "Required"),
  listed_price: z.coerce.number().min(0).optional(),
});

type FormData = z.infer<typeof schema>;

export default function EstimatePage() {
  const { categories } = useCategories();
  const {
    prediction,
    explanation,
    similar,
    loading,
    explaining,
    similarLoading,
    error,
    predict,
    simulate,
  } = usePrediction();
  const [lastPayload, setLastPayload] = useState<PredictionRequest | null>(null);

  const cities = Object.keys(categories.City_Map);
  const cityData = categories.City_Map;

  const {
    register,
    watch,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      beds: 3,
      baths: 2,
      area: 150,
      property_type: categories["Property Type"][0] ?? "",
      city: cities[0] ?? "",
      compound_district: "",
      location: "",
      listed_price: undefined,
    },
  });

  const selectedCity = watch("city");
  const selectedDistrict = watch("compound_district");
  const selectedLocation = watch("location");
  const beds = watch("beds");
  const baths = watch("baths");
  const area = watch("area");
  const listedPrice = watch("listed_price");

  const districts =
    selectedCity && cityData[selectedCity]
      ? cityData[selectedCity].Compound_District
      : [];
  const locations =
    selectedCity && cityData[selectedCity]
      ? cityData[selectedCity].Location
      : [];

  useEffect(() => {
    setValue("compound_district", "");
    setValue("location", "");
  }, [selectedCity, setValue]);

  const totalRooms = Number(beds || 0) + Number(baths || 0);
  const areaPerRoom =
    totalRooms > 0 ? ((area || 0) / totalRooms).toFixed(1) : "0";

  const buildPayload = useCallback(
    (data: FormData): PredictionRequest => ({
      Beds: data.beds,
      Baths: data.baths,
      Area: data.area,
      Property_Type: data.property_type,
      City: data.city,
      Compound_District: data.compound_district,
      Location: data.location,
      Listed_Price: data.listed_price && data.listed_price > 0 ? data.listed_price : undefined,
    }),
    [],
  );

  const onSubmit = useCallback(
    async (data: FormData) => {
      const payload = buildPayload(data);
      setLastPayload(payload);
      await predict(payload);
    },
    [buildPayload, predict],
  );

  const handleSimulate = useCallback(
    async (params: {
      Beds: number;
      Baths: number;
      Area: number;
      Property_Type: string;
      City: string;
      Compound_District: string;
      Location: string;
    }) => {
      return simulate({
        ...params,
        Listed_Price: listedPrice && listedPrice > 0 ? listedPrice : undefined,
      });
    },
    [simulate, listedPrice],
  );

  const result = prediction?.price ?? null;

  return (
    <section className="py-16 max-md:py-10">
      <div className="mx-auto max-w-[1280px] px-8 max-md:px-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <h1 className="text-[44px] font-bold leading-[1.08] tracking-tight max-md:text-[32px]">
            Property Estimate
          </h1>
          <p className="mt-4 text-lg text-text-secondary max-md:text-base">
            Fill in your property details and get an instant AI-powered valuation
            with explanation.
          </p>
        </motion.div>

        <div className="grid gap-8 max-lg:grid-cols-1 lg:grid-cols-5">
          {/* ════════ FORM CARD ════════ */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-3"
          >
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="rounded-[22px] border border-border bg-card p-8"
            >
              <div className="mb-8">
                <h3 className="mb-6 flex items-center gap-2 text-base font-semibold text-text-secondary">
                  <Home className="size-4 text-primary" />
                  Property Details
                </h3>
                <div className="grid grid-cols-2 gap-5 max-md:grid-cols-1">
                  <InputField
                    icon={BedDouble}
                    label="Bedrooms"
                    error={errors.beds?.message}
                    {...register("beds")}
                    type="number"
                  />
                  <InputField
                    icon={Bath}
                    label="Bathrooms"
                    error={errors.baths?.message}
                    {...register("baths")}
                    type="number"
                  />
                  <InputField
                    icon={Ruler}
                    label="Area (sqm)"
                    error={errors.area?.message}
                    {...register("area")}
                    type="number"
                  />
                  <SelectField
                    icon={Home}
                    label="Property Type"
                    error={errors.property_type?.message}
                    options={categories["Property Type"]}
                    {...register("property_type")}
                  />
                </div>
              </div>

              <div className="mb-8 grid grid-cols-2 gap-4 max-md:grid-cols-1">
                <div className="flex items-center gap-3 rounded-xl border border-border bg-bg/40 px-4 py-3">
                  <Info className="size-4 text-text-muted" />
                  <span className="text-sm text-text-secondary">
                    Total Rooms:{" "}
                    <span className="font-semibold text-text">{totalRooms}</span>
                  </span>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-bg/40 px-4 py-3">
                  <Info className="size-4 text-text-muted" />
                  <span className="text-sm text-text-secondary">
                    Area/Room:{" "}
                    <span className="font-semibold text-text">
                      {areaPerRoom} m²
                    </span>
                  </span>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="mb-6 flex items-center gap-2 text-base font-semibold text-text-secondary">
                  <MapPin className="size-4 text-primary" />
                  Location
                </h3>
                <div className="grid grid-cols-2 gap-5 max-md:grid-cols-1">
                  <SearchableSelect
                    icon={MapPin}
                    label="City"
                    error={errors.city?.message}
                    options={cities}
                    value={selectedCity}
                    onChange={(val) =>
                      setValue("city", val, { shouldValidate: true })
                    }
                  />
                  <SearchableSelect
                    icon={MapPin}
                    label="Compound / District"
                    error={errors.compound_district?.message}
                    options={districts}
                    value={selectedDistrict}
                    onChange={(val) =>
                      setValue("compound_district", val, {
                        shouldValidate: true,
                      })
                    }
                  />
                  <SearchableSelect
                    icon={MapPin}
                    label="Detailed Location"
                    error={errors.location?.message}
                    options={locations}
                    value={selectedLocation}
                    onChange={(val) =>
                      setValue("location", val, { shouldValidate: true })
                    }
                  />
                </div>
              </div>

              <div className="mb-8">
                <h3 className="mb-6 flex items-center gap-2 text-base font-semibold text-text-secondary">
                  <DollarSign className="size-4 text-primary" />
                  Investment Check{" "}
                  <span className="text-xs font-normal text-text-muted">
                    (optional)
                  </span>
                </h3>
                <InputField
                  icon={DollarSign}
                  label="Listed Price (EGP)"
                  placeholder="Enter asking price for investment analysis"
                  error={errors.listed_price?.message}
                  {...register("listed_price")}
                  type="number"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "flex h-14 w-full items-center justify-center gap-2.5 rounded-[16px] bg-primary text-base font-semibold text-bg transition-all duration-200",
                  loading
                    ? "cursor-not-allowed opacity-70"
                    : "hover:scale-[1.01] hover:bg-primary-hover active:scale-[0.99]",
                )}
              >
                {loading ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <Calculator className="size-5" />
                )}
                {loading ? "Analyzing..." : "Get Estimate"}
              </button>
            </form>
          </motion.div>

          {/* ════════ RESULT PANEL ════════ */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="max-lg:static lg:sticky lg:top-24">
              <AnimatePresence mode="wait">
                {!result && !loading && !error && (
                  <motion.div
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex min-h-[280px] flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-border bg-card/50 p-8 text-center max-md:min-h-[200px]"
                  >
                    <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-white/5">
                      <TrendingUp
                        className="size-7 text-text-muted"
                        strokeWidth={1.5}
                      />
                    </div>
                    <p className="text-base font-medium text-text-secondary">
                      Your estimate will appear here
                    </p>
                    <p className="mt-2 text-sm text-text-muted">
                      Fill in the form and click "Get Estimate"
                    </p>
                  </motion.div>
                )}

                {loading && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex min-h-[280px] flex-col items-center justify-center rounded-[22px] border border-border bg-card p-8 max-md:min-h-[200px]"
                  >
                    <div className="relative mb-6">
                      <Loader2 className="size-10 text-primary animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="size-3 rounded-full bg-primary" />
                      </div>
                    </div>
                    <p className="text-base font-medium text-text">
                      Analyzing property data...
                    </p>
                    <p className="mt-2 text-sm text-text-muted">
                      AI model + SHAP explanation + similar properties
                    </p>
                  </motion.div>
                )}

                {error && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="rounded-[22px] border border-red-500/20 bg-red-500/5 p-8 text-center"
                  >
                    <p className="text-base font-medium text-red-400">
                      {error}
                    </p>
                    <p className="mt-2 text-sm text-text-muted">
                      Please check your inputs and try again.
                    </p>
                  </motion.div>
                )}

                {result !== null && !loading && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="space-y-6"
                  >
                    {/* Main Price + Confidence */}
                    <div className="rounded-[22px] border border-border bg-card p-8">
                      <div className="mb-6 flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                          <CheckCircle2 className="size-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-secondary">
                            Estimated Market Value
                          </p>
                          <p className="text-xs text-text-muted">
                            AI-powered valuation
                          </p>
                        </div>
                      </div>

                      <div className="mb-6 rounded-xl border border-border bg-bg/40 p-6 text-center">
                        <p className="text-[40px] font-extrabold tracking-tight text-primary max-md:text-[28px]">
                          {formatEGP(result)}
                        </p>
                        <p className="mt-1 text-sm text-text-muted">
                          Egyptian Pounds
                        </p>
                      </div>

                      {prediction?.confidence_interval && (
                        <div className="rounded-xl border border-border bg-bg/30 p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-sm font-medium text-text-secondary">
                              Expected Price Range
                            </p>
                            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                              {prediction.confidence_interval.confidence_pct}%
                              Confidence
                            </span>
                          </div>
                          <div className="relative mb-2">
                            <div className="h-2 w-full rounded-full bg-border">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className="h-full rounded-full bg-gradient-to-r from-primary/40 via-primary to-primary/40"
                              />
                            </div>
                            <div className="absolute -top-1 left-0 size-4 rounded-full border-2 border-primary bg-bg" />
                            <div className="absolute -top-1 right-0 size-4 rounded-full border-2 border-primary bg-bg" />
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-text-secondary">
                              {formatEGP(prediction.confidence_interval.lower)}
                            </span>
                            <span className="text-text-secondary">
                              {formatEGP(prediction.confidence_interval.upper)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SHAP Explanation */}
                    {explanation && (
                      <ShapWaterfall
                        contributions={explanation.feature_contributions}
                        baseValue={explanation.base_value}
                        finalPrediction={explanation.final_prediction}
                      />
                    )}
                    {explaining && (
                      <div className="flex items-center justify-center gap-3 rounded-2xl border border-border bg-card p-6">
                        <Loader2 className="size-4 animate-spin text-primary" />
                        <span className="text-sm text-text-muted">
                          Computing explanation...
                        </span>
                      </div>
                    )}

                    {/* Investment Analysis */}
                    {prediction?.investment_score && (
                      <InvestmentAnalysis score={prediction.investment_score} />
                    )}

                    {/* Price Simulator */}
                    {lastPayload && (
                      <PriceSimulator
                        currentPrice={result}
                        initialBeds={lastPayload.Beds}
                        initialBaths={lastPayload.Baths}
                        initialArea={lastPayload.Area}
                        initialPropertyType={lastPayload.Property_Type}
                        propertyTypes={categories["Property Type"]}
                        onSimulate={handleSimulate}
                        city={lastPayload.City}
                        district={lastPayload.Compound_District}
                        location={lastPayload.Location}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* Similar Properties — full width below the grid */}
        {similar && similar.similar_properties.length > 0 && (
          <div className="mt-12">
            <SimilarProperties
              properties={similar.similar_properties}
              loading={similarLoading}
            />
          </div>
        )}
        {similarLoading && result !== null && !loading && (
          <div className="mt-12">
            <SimilarProperties properties={[]} loading={true} />
          </div>
        )}
      </div>
    </section>
  );
}

/* ═══════════ REUSABLE INPUT COMPONENTS ═══════════ */

import { forwardRef } from "react";
import type { LucideIcon } from "lucide-react";

interface InputFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: LucideIcon;
  label: string;
  error?: string;
}

const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  ({ icon: Icon, label, error, className, ...props }, ref) => (
    <div>
      <label className="mb-2 block text-sm font-medium text-text-secondary">
        {label}
      </label>
      <div className="relative">
        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
          <Icon className="size-4 text-text-muted" strokeWidth={1.75} />
        </div>
        <input
          ref={ref}
          className={cn(
            "h-[52px] w-full rounded-[12px] border bg-bg/60 py-3 pl-11 pr-4 text-sm text-text outline-none transition-all duration-200 placeholder:text-text-muted",
            error
              ? "border-red-500/40 focus:ring-2 focus:ring-red-500/20"
              : "border-border focus:border-primary/40 focus:ring-2 focus:ring-primary/20",
            className,
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  ),
);
InputField.displayName = "InputField";

interface SelectFieldProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  icon: LucideIcon;
  label: string;
  options: string[];
  error?: string;
}

const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ icon: Icon, label, options, error, className, ...props }, ref) => (
    <div>
      <label className="mb-2 block text-sm font-medium text-text-secondary">
        {label}
      </label>
      <div className="relative">
        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
          <Icon className="size-4 text-text-muted" strokeWidth={1.75} />
        </div>
        <select
          ref={ref}
          className={cn(
            "h-[52px] w-full appearance-none rounded-[12px] border bg-bg/60 py-3 pl-11 pr-10 text-sm text-text outline-none transition-all duration-200",
            error
              ? "border-red-500/40 focus:ring-2 focus:ring-red-500/20"
              : "border-border focus:border-primary/40 focus:ring-2 focus:ring-primary/20",
            className,
          )}
          {...props}
        >
          <option value="">Select...</option>
          {options.map((opt) => (
            <option key={opt} value={opt} className="bg-card text-text">
              {opt}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
          <svg
            className="size-4 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  ),
);
SelectField.displayName = "SelectField";

/* ═══════════ SEARCHABLE SELECT COMPONENT ═══════════ */

import { ChevronDown, X } from "lucide-react";

interface SearchableSelectProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "onChange" | "onSelect"
  > {
  icon: LucideIcon;
  label: string;
  options: string[];
  error?: string;
  value?: string;
  onChange?: (value: string) => void;
}

const SearchableSelect = forwardRef<HTMLInputElement, SearchableSelectProps>(
  (
    { icon: Icon, label, options, error, value, onChange, className, ...props },
    ref,
  ) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const filtered = useMemo(() => {
      if (!query) return options;
      const q = query.toLowerCase();
      return options.filter((opt) => opt.toLowerCase().includes(q));
    }, [options, query]);

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target as Node)
        ) {
          setOpen(false);
          setQuery("");
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const displayValue = open ? query : value || "";

    return (
      <div>
        <label className="mb-2 block text-sm font-medium text-text-secondary">
          {label}
        </label>
        <div ref={containerRef} className="relative">
          <div className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2">
            <Icon className="size-4 text-text-muted" strokeWidth={1.75} />
          </div>
          <input
            ref={(node) => {
              (inputRef as React.MutableRefObject<HTMLInputElement | null>).current =
                node;
              if (typeof ref === "function") ref(node);
              else if (ref)
                (
                  ref as React.MutableRefObject<HTMLInputElement | null>
                ).current = node;
            }}
            readOnly={!open}
            value={displayValue}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!open) setOpen(true);
            }}
            onFocus={() => {
              setOpen(true);
              setQuery("");
            }}
            placeholder="Select..."
            className={cn(
              "h-[52px] w-full rounded-[12px] border bg-bg/60 py-3 pl-11 pr-10 text-sm text-text outline-none transition-all duration-200 placeholder:text-text-muted",
              error
                ? "border-red-500/40 focus:ring-2 focus:ring-red-500/20"
                : "border-border focus:border-primary/40 focus:ring-2 focus:ring-primary/20",
              className,
            )}
            {...props}
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange?.("");
                setQuery("");
              }}
              className="absolute right-9 top-1/2 z-10 -translate-y-1/2 text-text-muted hover:text-text-secondary"
            >
              <X className="size-3.5" />
            </button>
          )}
          <div className="pointer-events-none absolute right-4 top-1/2 z-10 -translate-y-1/2">
            <ChevronDown
              className={cn(
                "size-4 text-text-muted transition-transform",
                open && "rotate-180",
              )}
            />
          </div>

          {open && (
            <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-border bg-card py-1 shadow-[0_12px_32px_rgba(0,0,0,0.4)] scrollbar-none">
              {filtered.length === 0 && (
                <li className="px-4 py-3 text-sm text-text-muted">
                  No results found
                </li>
              )}
              {filtered.map((opt) => (
                <li
                  key={opt}
                  onClick={() => {
                    onChange?.(opt);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "cursor-pointer px-4 py-2.5 text-sm transition-colors hover:bg-white/5",
                    value === opt
                      ? "bg-primary/5 text-primary"
                      : "text-text-secondary",
                  )}
                >
                  {opt}
                </li>
              ))}
            </ul>
          )}
        </div>
        {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
      </div>
    );
  },
);
SearchableSelect.displayName = "SearchableSelect";
