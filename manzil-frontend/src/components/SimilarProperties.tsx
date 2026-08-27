import { motion } from "framer-motion";
import { Users, MapPin, BedDouble, Bath, Maximize2, Building2 } from "lucide-react";
import { formatEGP } from "@/lib/api";

interface SimilarProperty {
  price: number;
  area: number;
  beds: number;
  baths: number;
  city: string;
  district: string;
  location: string;
  type: string;
  price_diff: number;
}

interface SimilarPropertiesProps {
  properties: SimilarProperty[];
  loading: boolean;
}

function SkeletonCard({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.1 }}
      className="rounded-[20px] border border-border bg-card p-6"
    >
      <div className="mb-4 h-5 w-32 animate-pulse rounded-lg bg-primary/10" />
      <div className="mb-3 h-7 w-40 animate-pulse rounded-lg bg-white/5" />
      <div className="mb-5 flex gap-3">
        <div className="h-4 w-20 animate-pulse rounded-md bg-white/5" />
        <div className="h-4 w-16 animate-pulse rounded-md bg-white/5" />
        <div className="h-4 w-14 animate-pulse rounded-md bg-white/5" />
      </div>
      <div className="h-4 w-48 animate-pulse rounded-md bg-white/5" />
    </motion.div>
  );
}

function PropertyCard({ property, index }: { property: SimilarProperty; index: number }) {
  const isCheaper = property.price_diff < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px" }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      className="group rounded-[20px] border border-border bg-card p-6 transition-shadow duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.25)]"
    >
      <div className="mb-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {property.beds}B / {property.baths}Bath / {property.area}m²
        </span>
      </div>

      <p className="mb-1 text-2xl font-bold tracking-tight text-text">
        {formatEGP(property.price)}
      </p>

      <div
        className={`mb-4 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
          isCheaper
            ? "bg-green-500/10 text-green-400"
            : "bg-red-500/10 text-red-400"
        }`}
      >
        {isCheaper ? "↓" : "↑"} {formatEGP(Math.abs(property.price_diff))}{" "}
        {isCheaper ? "below" : "above"} predicted
      </div>

      <div className="mb-4 flex flex-wrap gap-4 text-sm text-text-secondary">
        <span className="inline-flex items-center gap-1.5">
          <Maximize2 className="size-3.5 text-text-muted" strokeWidth={1.75} />
          {property.area} m²
        </span>
        <span className="inline-flex items-center gap-1.5">
          <BedDouble className="size-3.5 text-text-muted" strokeWidth={1.75} />
          {property.beds} Bed{property.beds !== 1 ? "s" : ""}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Bath className="size-3.5 text-text-muted" strokeWidth={1.75} />
          {property.baths} Bath{property.baths !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-4">
        <span className="inline-flex items-center gap-1.5 text-sm text-text-secondary">
          <MapPin className="size-3.5 text-text-muted" strokeWidth={1.75} />
          {property.district}, {property.city}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs text-text-muted">
          <Building2 className="size-3 text-text-muted" strokeWidth={1.75} />
          {property.type}
        </span>
      </div>
    </motion.div>
  );
}

export default function SimilarProperties({ properties, loading }: SimilarPropertiesProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="mb-8 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
          <Users className="size-5 text-primary" strokeWidth={1.75} />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-text">Similar Properties</h3>
          <p className="text-sm text-text-muted">Properties with comparable characteristics</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} index={i} />
          ))}
        </div>
      ) : properties.length === 0 ? (
        <div className="rounded-[20px] border border-border bg-card p-12 text-center">
          <Building2 className="mx-auto mb-4 size-10 text-text-muted" strokeWidth={1.25} />
          <p className="text-lg font-medium text-text-secondary">
            No similar properties found
          </p>
          <p className="mt-1 text-sm text-text-muted">
            Try adjusting your search criteria for better matches
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {properties.map((property, index) => (
            <PropertyCard key={index} property={property} index={index} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
