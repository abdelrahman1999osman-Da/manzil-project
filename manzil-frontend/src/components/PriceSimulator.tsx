import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { SlidersHorizontal, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { formatEGP } from "@/lib/api";

interface PriceSimulatorProps {
  currentPrice: number;
  initialBeds: number;
  initialBaths: number;
  initialArea: number;
  initialPropertyType: string;
  propertyTypes: string[];
  onSimulate: (params: {
    Beds: number;
    Baths: number;
    Area: number;
    Property_Type: string;
    City: string;
    Compound_District: string;
    Location: string;
  }) => Promise<number | null>;
  city: string;
  district: string;
  location: string;
}

export default function PriceSimulator({
  currentPrice,
  initialBeds,
  initialBaths,
  initialArea,
  initialPropertyType,
  propertyTypes,
  onSimulate,
  city,
  district,
  location,
}: PriceSimulatorProps) {
  const [area, setArea] = useState(initialArea);
  const [beds, setBeds] = useState(initialBeds);
  const [baths, setBaths] = useState(initialBaths);
  const [propType, setPropType] = useState(initialPropertyType);
  const [simulatedPrice, setSimulatedPrice] = useState<number | null>(null);
  const [simulating, setSimulating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (
      area === initialArea &&
      beds === initialBeds &&
      baths === initialBaths &&
      propType === initialPropertyType
    ) {
      setSimulatedPrice(null);
      return;
    }

    setSimulating(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const price = await onSimulate({
        Beds: beds,
        Baths: baths,
        Area: area,
        Property_Type: propType,
        City: city,
        Compound_District: district,
        Location: location,
      });
      setSimulatedPrice(price);
      setSimulating(false);
    }, 400);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [area, beds, baths, propType]);

  const displayPrice = simulatedPrice ?? currentPrice;
  const priceDiff = simulatedPrice !== null ? simulatedPrice - currentPrice : 0;
  const hasChange = simulatedPrice !== null && priceDiff !== 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="rounded-2xl border border-border bg-card p-6"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <SlidersHorizontal className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-text">Price Simulator</h3>
          <p className="text-sm text-text-muted">
            Adjust features to see how price changes
          </p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <SliderInput
          label="Area"
          value={area}
          onChange={setArea}
          min={10}
          max={500}
          step={5}
          unit="m²"
        />
        <SliderInput
          label="Bedrooms"
          value={beds}
          onChange={setBeds}
          min={1}
          max={20}
          step={1}
        />
        <SliderInput
          label="Bathrooms"
          value={baths}
          onChange={setBaths}
          min={1}
          max={20}
          step={1}
        />
        <div>
          <label className="mb-2 block text-sm font-medium text-text-secondary">
            Property Type
          </label>
          <select
            value={propType}
            onChange={(e) => setPropType(e.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-bg/60 px-3.5 text-sm text-text outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
          >
            {propertyTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-bg/40 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-text-muted">Simulated Price</p>
            <p className="mt-1 text-2xl font-bold text-text">
              {simulating ? (
                <span className="inline-block animate-pulse text-text-muted">
                  Calculating...
                </span>
              ) : (
                formatEGP(displayPrice)
              )}
            </p>
          </div>
          {hasChange && !simulating && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${
                priceDiff > 0
                  ? "bg-primary/10 text-primary"
                  : "bg-red-400/10 text-red-400"
              }`}
            >
              {priceDiff > 0 ? (
                <ArrowUp className="h-4 w-4" />
              ) : priceDiff < 0 ? (
                <ArrowDown className="h-4 w-4" />
              ) : (
                <Minus className="h-4 w-4" />
              )}
              {formatEGP(Math.abs(priceDiff))}
            </motion.div>
          )}
        </div>

        {hasChange && !simulating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 flex items-center gap-2 text-xs text-text-muted"
          >
            <span>
              Original: {formatEGP(currentPrice)}
            </span>
            <span>→</span>
            <span className="font-medium text-text-secondary">
              {formatEGP(displayPrice)}
            </span>
            <span>
              ({priceDiff > 0 ? "+" : ""}
              {((priceDiff / currentPrice) * 100).toFixed(1)}%)
            </span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function SliderInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium text-text-secondary">{label}</label>
        <span className="text-sm font-semibold text-text">
          {value}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border outline-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_2px_8px_rgba(103,213,140,0.4)]"
      />
      <div className="mt-1 flex justify-between text-xs text-text-muted">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
