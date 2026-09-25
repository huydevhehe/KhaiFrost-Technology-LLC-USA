"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Check, CreditCard, ExternalLink, Headphones, Heart, ShieldCheck, ShoppingCart, Zap } from "lucide-react";
import { PillToggle } from "@/components/ui/PillToggle";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { loginUrl } from "@/lib/auth/redirect";
import { accountApi } from "@/lib/api/account";
import { formatMoney } from "@/lib/format";
import type { PublicProductDetail } from "@/lib/content/productDetail";
import type { BillingPeriod, Currency } from "@/lib/api/types";

const PERIOD_ORDER: BillingPeriod[] = ["monthly", "yearly", "one_time"];

export function ProductSidebar({ product }: { product: PublicProductDetail }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useAuth();

  // vi shows VND, every other locale shows USD; falls back to whatever currency the product actually has priced
  const preferredCurrency: Currency = i18n.language?.startsWith("vi") ? "VND" : "USD";
  const pricesInCurrency = useMemo(() => {
    const matching = product.prices.filter((price) => price.currency === preferredCurrency);
    return matching.length > 0 ? matching : product.prices;
  }, [product.prices, preferredCurrency]);

  const availablePeriods = useMemo(() => {
    const present = new Set(pricesInCurrency.map((price) => price.billingPeriod));
    return PERIOD_ORDER.filter((period) => present.has(period));
  }, [pricesInCurrency]);

  const defaultPrice = pricesInCurrency.find((price) => price.isDefault) ?? pricesInCurrency[0];
  const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriod>(defaultPrice?.billingPeriod ?? "one_time");
  const selectedPrice = pricesInCurrency.find((price) => price.billingPeriod === selectedPeriod) ?? defaultPrice;

  // Re-sync the toggle when the locale switch changes which currency (and periods) are in play
  useEffect(() => {
    if (defaultPrice && !pricesInCurrency.some((price) => price.billingPeriod === selectedPeriod)) {
      setSelectedPeriod(defaultPrice.billingPeriod);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferredCurrency]);

  const [favorited, setFavorited] = useState(false);
  const [favBusy, setFavBusy] = useState(false);
  const [cartBusy, setCartBusy] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (status !== "authenticated") {
        if (!cancelled) setFavorited(false);
        return;
      }
      try {
        const { productIds } = await accountApi.favorites.ids();
        if (!cancelled) setFavorited(productIds.includes(product.id));
      } catch {
        // heart just starts unfilled if this lookup fails
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, product.id]);

  function requireAuth(): boolean {
    if (status === "authenticated") return true;
    router.push(loginUrl(pathname));
    return false;
  }

  async function handleAddToCart() {
    if (!requireAuth() || !selectedPrice) return;
    setCartBusy(true);
    try {
      await accountApi.cart.addItem({
        productId: product.id,
        billingPeriod: selectedPrice.billingPeriod,
        currency: selectedPrice.currency,
      });
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch {
      // best-effort inline action; the cart page is the source of truth for retries
    } finally {
      setCartBusy(false);
    }
  }

  async function toggleFavorite() {
    if (!requireAuth()) return;
    setFavBusy(true);
    try {
      if (favorited) {
        await accountApi.favorites.remove(product.id);
        setFavorited(false);
      } else {
        await accountApi.favorites.add(product.id);
        setFavorited(true);
      }
    } catch {
      // keep prior state on failure
    } finally {
      setFavBusy(false);
    }
  }

  const periodLabels: Record<BillingPeriod, string> = {
    monthly: t("productDetailPage.sidebar.periodMonthly"),
    yearly: t("productDetailPage.sidebar.periodYearly"),
    one_time: t("productDetailPage.sidebar.periodOneTime"),
  };

  const bullets = [
    t("productDetailPage.sidebar.bullet1"),
    t("productDetailPage.sidebar.bullet2"),
    t("productDetailPage.sidebar.bullet3"),
    t("productDetailPage.sidebar.bullet4"),
  ];

  const infoRows = [
    { Icon: Zap, label: t("productDetailPage.sidebar.infoDelivery") },
    { Icon: Headphones, label: t("productDetailPage.sidebar.infoSupport") },
    { Icon: ShieldCheck, label: t("productDetailPage.sidebar.infoWarranty") },
    { Icon: CreditCard, label: t("productDetailPage.sidebar.infoPayment") },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {!product.priceOnRequest && availablePeriods.length > 1 && (
        <div className="mb-4">
          <p className="mb-2 text-sm font-semibold text-slate-900">{t("productDetailPage.sidebar.choosePlan")}</p>
          <PillToggle<BillingPeriod>
            options={availablePeriods.map((period) => ({ value: period, label: periodLabels[period] }))}
            value={selectedPeriod}
            onChange={setSelectedPeriod}
          />
        </div>
      )}

      {product.priceOnRequest ? (
        <p className="text-lg font-semibold text-slate-900">{t("productDetailPage.sidebar.priceOnRequest")}</p>
      ) : (
        selectedPrice && (
          <p className="text-3xl font-extrabold text-accent">
            {formatMoney(selectedPrice.amount, selectedPrice.currency)}
            {selectedPrice.billingPeriod !== "one_time" && (
              <span className="ml-1 text-base font-medium text-slate-400">
                /{" "}
                {selectedPrice.billingPeriod === "monthly"
                  ? t("productDetailPage.sidebar.periodMonthShort")
                  : t("productDetailPage.sidebar.periodYearShort")}
              </span>
            )}
          </p>
        )
      )}

      {!product.priceOnRequest && (
        <ul className="mt-4 space-y-2">
          {bullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-2 text-sm text-slate-600">
              <Check size={16} className="mt-0.5 shrink-0 text-accent" />
              {bullet}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex items-center gap-3">
        {product.priceOnRequest ? (
          <Button href="/lien-he" variant="primary-blue">
            {t("productDetailPage.sidebar.contactCta")}
          </Button>
        ) : (
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={cartBusy || !selectedPrice}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ShoppingCart size={18} />
            {added ? t("productDetailPage.sidebar.addedToCart") : t("productDetailPage.sidebar.addToCart")}
          </button>
        )}
        <button
          type="button"
          onClick={toggleFavorite}
          disabled={favBusy}
          aria-label={t("productDetailPage.sidebar.favoriteToggle")}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            favorited ? "border-accent bg-accent/10 text-accent" : "border-slate-200 text-slate-400 hover:text-accent"
          }`}
        >
          <Heart size={18} fill={favorited ? "currentColor" : "none"} />
        </button>
      </div>

      {product.demo && (
        <a
          href={product.demo.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-accent hover:text-accent"
        >
          <ExternalLink size={16} />
          {t("productDetailPage.sidebar.viewDemo")}
        </a>
      )}

      <div className="mt-6 space-y-2 rounded-xl bg-slate-50 p-4">
        {infoRows.map(({ Icon, label }) => (
          <div key={label} className="flex items-center gap-3 text-sm text-slate-600">
            <Icon size={16} className="text-accent" />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
