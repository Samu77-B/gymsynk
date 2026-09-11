"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import type {
  PublicPackagesPayload,
  PublicTrainingTier,
} from "@/lib/public-packages";
import { contrastTextColor } from "@/lib/tenant-website";

function formatMoney(value: string) {
  return `£${Number(value).toFixed(0)}`;
}

function TierCard({ tier }: { tier: PublicTrainingTier }) {
  return (
    <article className="gymsynk-packages__tier">
      <p className="gymsynk-packages__tier-label">{tier.name}</p>
      {tier.subtitle ? (
        <p className="gymsynk-packages__tier-subtitle">{tier.subtitle}</p>
      ) : (
        <p className="gymsynk-packages__tier-price">
          {formatMoney(tier.pricePerClass)}{" "}
          <span>per class</span>
        </p>
      )}
      <p className="gymsynk-packages__tier-classes">
        {tier.classes.join(", ")}
      </p>
      <ul className="gymsynk-packages__pack-list">
        {tier.packs.map((pack) => (
          <li key={pack.id} className="gymsynk-packages__pack">
            <div className="gymsynk-packages__pack-row">
              <span className="gymsynk-packages__pack-label">{pack.label}</span>
              <span className="gymsynk-packages__pack-price">
                {formatMoney(pack.price)}
                {pack.isPayAsYouGo ? " per class" : " / month"}
              </span>
            </div>
            {pack.note ? (
              <p className="gymsynk-packages__pack-note">{pack.note}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </article>
  );
}

export function EmbedPackagesView({
  tenant,
  theme = "reset",
  hideBookButton = false,
  bookUrlOverride,
}: {
  tenant: string;
  theme?: "light" | "dark" | "reset";
  hideBookButton?: boolean;
  bookUrlOverride?: string;
}) {
  const [data, setData] = useState<PublicPackagesPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/public/${tenant}/packages`);
      const json = await response.json();

      if (!response.ok) {
        setError(json.error ?? "Could not load packages");
        return;
      }

      setData(json);
    }

    void load();
  }, [tenant]);

  const bookUrl = bookUrlOverride || data?.bookUrl;

  const brandStyle = useMemo(() => {
    if (!data?.tenant.primaryColor) {
      return undefined;
    }

    return {
      "--packages-accent": data.tenant.primaryColor,
      "--packages-accent-text": contrastTextColor(data.tenant.primaryColor),
    } as React.CSSProperties;
  }, [data?.tenant.primaryColor]);

  return (
    <div
      className={`gymsynk-packages gymsynk-packages--${theme}`}
      data-theme={theme}
      style={brandStyle}
    >
      <style>{`
        .gymsynk-packages {
          --packages-bg: #f3efe6;
          --packages-surface: #ffffff;
          --packages-text: #111111;
          --packages-muted: #5c5c5c;
          --packages-border: #ddd6c8;
          --packages-accent: #111111;
          --packages-accent-text: #ffffff;
          font-family: var(--font-montserrat), "Montserrat", ui-sans-serif, system-ui, sans-serif;
          color: var(--packages-text);
          background: var(--packages-bg);
          padding: 1rem;
          box-sizing: border-box;
        }
        .gymsynk-packages *, .gymsynk-packages *::before, .gymsynk-packages *::after {
          box-sizing: border-box;
        }
        .gymsynk-packages__header {
          margin-bottom: 1.25rem;
        }
        .gymsynk-packages__logo {
          height: 2rem;
          width: auto;
          max-width: 8rem;
          object-fit: contain;
          margin-bottom: 0.75rem;
        }
        .gymsynk-packages__title {
          font-size: 1.125rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin: 0 0 0.25rem;
        }
        .gymsynk-packages__subtitle {
          margin: 0;
          color: var(--packages-muted);
          font-size: 0.875rem;
        }
        .gymsynk-packages__grid {
          display: grid;
          gap: 1rem;
        }
        @media (min-width: 900px) {
          .gymsynk-packages__grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
        .gymsynk-packages__tier {
          background: var(--packages-surface);
          border: 1px solid var(--packages-border);
          padding: 1.25rem;
        }
        .gymsynk-packages__tier-label {
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin: 0 0 0.75rem;
        }
        .gymsynk-packages__tier-subtitle {
          font-size: 1.25rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin: 0 0 0.5rem;
        }
        .gymsynk-packages__tier-price {
          font-size: 1.125rem;
          font-weight: 700;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          margin: 0 0 0.75rem;
        }
        .gymsynk-packages__tier-price span {
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.08em;
        }
        .gymsynk-packages__tier-classes {
          margin: 0 0 1rem;
          color: var(--packages-muted);
          font-size: 0.8125rem;
          line-height: 1.5;
        }
        .gymsynk-packages__pack-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .gymsynk-packages__pack {
          padding: 0.75rem 0;
          border-top: 1px solid var(--packages-border);
        }
        .gymsynk-packages__pack-row {
          display: flex;
          justify-content: space-between;
          gap: 0.75rem;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .gymsynk-packages__pack-note {
          margin: 0.35rem 0 0;
          color: var(--packages-muted);
          font-size: 0.75rem;
          line-height: 1.4;
        }
        .gymsynk-packages__book {
          display: inline-block;
          margin-top: 1.25rem;
          background: var(--packages-accent);
          color: var(--packages-accent-text);
          text-decoration: none;
          padding: 0.75rem 1.25rem;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .gymsynk-packages__empty,
        .gymsynk-packages__error {
          color: var(--packages-muted);
          font-size: 0.875rem;
        }
        .gymsynk-packages__powered {
          margin-top: 1.25rem;
          padding-top: 0.75rem;
          border-top: 1px solid var(--packages-border);
          font-size: 0.6875rem;
          color: var(--packages-muted);
          text-align: center;
        }
        .gymsynk-packages__powered a {
          color: var(--packages-muted);
          font-weight: 600;
          text-decoration: none;
        }
      `}</style>

      <div className="gymsynk-packages__header">
        {data?.tenant.logoUrl ? (
          <Image
            className="gymsynk-packages__logo"
            src={data.tenant.logoUrl}
            alt={data.tenant.name}
            width={128}
            height={32}
            unoptimized
          />
        ) : null}
        <p className="gymsynk-packages__title">Group Training Packages</p>
        <p className="gymsynk-packages__subtitle">
          {data
            ? `Monthly class packs by tier for ${data.tenant.name}.`
            : "Live from GymSynk."}
        </p>
      </div>

      {error ? <p className="gymsynk-packages__error">{error}</p> : null}

      {!error && data ? (
        <>
          <div className="gymsynk-packages__grid">
            {data.tiers.map((tier) => (
              <TierCard key={tier.id} tier={tier} />
            ))}
          </div>

          {!hideBookButton && bookUrl ? (
            <a
              className="gymsynk-packages__book"
              href={bookUrl}
              target="_top"
              rel="noopener noreferrer"
            >
              Book a Session
            </a>
          ) : null}
        </>
      ) : null}

      {!error && !data ? (
        <p className="gymsynk-packages__empty">Loading packages…</p>
      ) : null}

      <p className="gymsynk-packages__powered">
        Powered by{" "}
        <a href="https://gymsynk.net" target="_blank" rel="noopener noreferrer">
          GymSynk
        </a>
      </p>
    </div>
  );
}
