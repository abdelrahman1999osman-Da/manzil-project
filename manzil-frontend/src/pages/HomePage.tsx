import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  Brain,
  TrendingUp,
  Shield,
  BarChart3,
  ArrowRight,
  Building2,
  Zap,
} from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import FeatureCard from "@/components/FeatureCard";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut" },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } },
};

export default function HomePage() {
  return (
    <>
      {/* ═══════════════════ HERO ═══════════════════ */}
      <section className="relative">
        {/* Glow */}
        <div className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-[120px]" />

        <div className="mx-auto max-w-[1280px] px-8 pt-24 pb-28 max-md:px-5 max-md:pt-16 max-md:pb-16">
          <div className="grid items-center gap-16 max-md:gap-10 md:grid-cols-2">
            {/* Left */}
            <motion.div variants={stagger} initial="initial" animate="animate" className="relative">
              <motion.div variants={fadeUp} className="mb-6 inline-flex items-center gap-2 rounded-full border border-warning/20 bg-warning/5 px-4 py-1.5">
                <Sparkles className="size-3.5 text-warning" strokeWidth={2} />
                <span className="text-xs font-medium text-warning">AI-Powered Valuation</span>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="text-[56px] font-bold leading-[1.08] tracking-tight max-md:text-[34px]"
              >
                Know Your Property's{" "}
                <span className="text-primary">True Value</span>
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="mt-6 max-w-[480px] text-lg leading-relaxed text-text-secondary"
              >
                Get instant, AI-driven property valuations powered by machine
                learning. Accurate pricing for the Egyptian real estate market.
              </motion.p>

              <motion.div variants={fadeUp} className="mt-10 flex items-center gap-4 max-md:flex-col max-md:items-stretch">
                <Link
                  to="/estimate"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-[16px] bg-primary px-7 text-sm font-semibold text-bg transition-all duration-200 hover:scale-[1.02] hover:bg-primary-hover active:scale-[0.98]"
                >
                  Get Free Estimate
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  to="/assistant"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-[16px] border border-border px-7 text-sm font-medium text-text transition-all duration-200 hover:bg-white/5"
                >
                  Ask AI Assistant
                </Link>
              </motion.div>

            </motion.div>

            {/* Right — Hero Visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
              className="relative hidden md:block"
            >
              {/* Main card — pb-10 gives room for the floating card below */}
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[28px] border border-border bg-card">
                {/* Real property photo */}
                <img
                  src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop&q=80"
                  alt="Luxury modern property"
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                {/* Dark overlay for contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-bg/80 via-bg/20 to-transparent" />

                {/* Top badge */}
                <div className="absolute top-5 left-5 z-10 flex items-center gap-2 rounded-full border border-border bg-bg/70 px-3 py-1.5 backdrop-blur-md">
                  <div className="size-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-medium text-text-secondary">AI Valuation</span>
                </div>

                {/* Center label */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center z-10">
                  <p className="rounded-full bg-bg/50 px-4 py-1.5 text-xs font-medium text-text-secondary backdrop-blur-md">
                    New Cairo, Fifth Settlement
                  </p>
                </div>

              </div>

              {/* Floating Estimate Card — contained inside the outer container */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
                className="absolute -bottom-5 left-8 right-8 rounded-2xl border border-border bg-card/90 p-5 backdrop-blur-xl shadow-[0_12px_32px_rgba(0,0,0,0.3)]"
              >
                <p className="text-xs text-text-muted">Estimated Market Value</p>
                <p className="mt-1 text-2xl font-bold text-primary">EGP 4,850,000</p>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-text-secondary">
                  <TrendingUp className="size-3 text-primary" />
                  <span>+8.3% from last year</span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ FEATURES ═══════════════════ */}
      <section className="py-24 max-md:py-16">
        <div className="mx-auto max-w-[1280px] px-8 max-md:px-5">
          <SectionHeading
            badge="Features"
            title="Smart Valuation, Smarter Decisions"
            subtitle="Our AI engine analyzes multiple data points to deliver accurate property valuations in seconds."
          />

          <div className="mt-16 grid gap-6 max-md:grid-cols-1 md:grid-cols-3">
            <FeatureCard
              icon={Brain}
              title="AI-Powered"
              description="Advanced neural network trained on thousands of Egyptian property transactions for precise estimates."
              delay={0}
            />
            <FeatureCard
              icon={Zap}
              title="Instant Results"
              description="Get your property valuation in under 2 seconds. No waiting, no complicated forms."
              delay={0.1}
            />
            <FeatureCard
              icon={Shield}
              title="Market Verified"
              description="Continuously updated with the latest market data to ensure accuracy and reliability."
              delay={0.2}
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════ HOW IT WORKS ═══════════════════ */}
      <section className="border-y border-border-subtle py-24 max-md:py-16">
        <div className="mx-auto max-w-[1280px] px-8 max-md:px-5">
          <SectionHeading
            badge="How It Works"
            title="Three Steps to Your Estimate"
            subtitle="Our streamlined process makes property valuation effortless."
          />

          <div className="mt-16 grid gap-8 max-md:grid-cols-1 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Enter Details",
                desc: "Provide basic property information — type, location, size, and rooms.",
              },
              {
                step: "02",
                title: "AI Analysis",
                desc: "Our model processes your data against market trends and comparable sales.",
              },
              {
                step: "03",
                title: "Get Estimate",
                desc: "Receive an accurate market valuation with confidence insights.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12, ease: "easeOut" }}
                className="relative rounded-[20px] border border-border bg-card p-8 max-md:p-6"
              >
                <span className="mb-4 inline-block text-5xl font-extrabold text-primary/20 max-md:text-4xl">
                  {item.step}
                </span>
                <h3 className="mb-2 text-[26px] font-semibold max-md:text-xl">{item.title}</h3>
                <p className="text-base text-text-secondary">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ CAPABILITIES ═══════════════════ */}
      <section className="py-24 max-md:py-16">
        <div className="mx-auto max-w-[1280px] px-8 max-md:px-5">
          <SectionHeading
            badge="Capabilities"
            title="Built for the Egyptian Market"
            subtitle="Purpose-built for Egypt's unique real estate landscape with localized intelligence."
          />

          <div className="mt-16 grid gap-6 max-md:grid-cols-1 md:grid-cols-4">
            {[
              {
                icon: BarChart3,
                title: "Market Trends",
                desc: "Track price movements across neighborhoods.",
              },
              {
                icon: Building2,
                title: "All Property Types",
                desc: "Apartments, villas, townhouses, and more.",
              },
              {
                icon: TrendingUp,
                title: "Investment ROI",
                desc: "Predict future value appreciation potential.",
              },
              {
                icon: Shield,
                title: "Data Security",
                desc: "Your property data stays private and secure.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                whileHover={{ y: -4 }}
                className="group rounded-[20px] border border-border bg-card p-7 max-md:p-5 transition-shadow duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.25)]"
              >
                <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <item.icon className="size-5 text-primary" strokeWidth={1.75} />
                </div>
                <h4 className="mb-1.5 text-base font-semibold">{item.title}</h4>
                <p className="text-sm leading-relaxed text-text-muted">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ CTA BANNER ═══════════════════ */}
      <section className="py-24 max-md:py-16">
        <div className="mx-auto max-w-[1280px] px-8 max-md:px-5">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="overflow-hidden rounded-[28px] bg-primary px-12 py-16 text-center max-md:px-6 max-md:py-12"
          >
            <h2 className="text-[44px] font-bold leading-[1.08] tracking-tight text-bg max-md:text-[28px]">
              Ready to Know Your Property's Value?
            </h2>
            <p className="mx-auto mt-4 max-w-[480px] text-lg text-bg/70">
              Join thousands of property owners who trust Manzil for accurate
              valuations.
            </p>
            <Link
              to="/estimate"
              className="mt-8 inline-flex h-12 items-center gap-2 rounded-[16px] bg-bg px-7 text-sm font-semibold text-text transition-all duration-200 hover:scale-[1.02] hover:bg-bg/90 active:scale-[0.98]"
            >
              Start Free Estimate
              <ArrowRight className="size-4" />
            </Link>
          </motion.div>
        </div>
      </section>
    </>
  );
}
