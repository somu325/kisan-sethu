import { type FC } from 'react';
import { Linking } from 'react-native';
import type { MarketWithDistance } from '../../types/market';
import type { MarketTranslationStrings } from '../../data/i18n/marketsTranslations';
import {
  X,
  PhoneCall,
  Navigation,
  Clock,
  MapPin,
  CheckCircle2,
  Wheat,
  Share2
} from 'lucide-react';

interface MarketBottomSheetProps {
  market: MarketWithDistance | null;
  onClose: () => void;
  i18n: MarketTranslationStrings;
}

export const MarketBottomSheet: FC<MarketBottomSheetProps> = ({ market, onClose, i18n }) => {
  if (!market) return null;

  const isApmc = market.type === 'APMC';

  const handleCall = () => {
    if (market.phone) {
      const cleanNumber = market.phone.replace(/[^+\d]/g, '');
      const url = `tel:${cleanNumber}`;
      Linking.canOpenURL(url)
        .then((supported) => {
          if (supported) {
            Linking.openURL(url);
          } else if (typeof window !== 'undefined') {
            window.location.href = url;
          }
        })
        .catch(() => {
          if (typeof window !== 'undefined') {
            window.location.href = url;
          }
        });
    }
  };

  const handleGetDirections = () => {
    // Standard geo link that triggers Google Maps, Apple Maps, or default mapping provider
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${market.latitude},${market.longitude}&destination_place_id=${encodeURIComponent(
      market.name
    )}`;

    Linking.canOpenURL(mapsUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(mapsUrl);
        } else if (typeof window !== 'undefined') {
          window.open(mapsUrl, '_blank', 'noopener,noreferrer');
        }
      })
      .catch(() => {
        if (typeof window !== 'undefined') {
          window.open(mapsUrl, '_blank', 'noopener,noreferrer');
        }
      });
  };

  const handleShare = () => {
    const text = `🌾 ${market.name} (${market.type})\n📍 ${market.address || ''}, ${market.district || ''}\n📞 ${market.phone || ''}\nhttps://maps.google.com/?q=${market.latitude},${market.longitude}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: market.name,
        text,
        url: `https://maps.google.com/?q=${market.latitude},${market.longitude}`
      }).catch(() => {});
    } else if (typeof window !== 'undefined') {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  return (
    <div className="market-bottom-sheet-overlay" onClick={onClose}>
      <div
        className="market-bottom-sheet-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="market-sheet-title"
      >
        {/* Grab Handle for Touch Devices */}
        <div className="sheet-grab-bar" />

        {/* Top Header Row */}
        <div className="sheet-header-row">
          <div className="sheet-badges-wrap">
            <span className={`sheet-type-badge ${isApmc ? 'apmc' : 'mandi'}`}>
              <span className="badge-icon">{isApmc ? '🏛️' : '🌾'}</span>
              <span>{isApmc ? i18n.apmcBadge : i18n.mandiBadge}</span>
            </span>

            {market.distanceKm !== undefined && (
              <span className="sheet-distance-badge">
                <Navigation size={12} />
                <span>
                  {market.distanceKm} km {i18n.distanceAway}
                </span>
              </span>
            )}
          </div>

          <div className="sheet-top-actions">
            <button
              type="button"
              onClick={handleShare}
              className="sheet-icon-btn"
              title="Share Market Details"
              aria-label="Share"
            >
              <Share2 size={18} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="sheet-icon-btn close"
              aria-label={i18n.closeSheet}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Market Title */}
        <h3 id="market-sheet-title" className="sheet-market-name">
          {market.name}
        </h3>

        {/* Location & Address */}
        <div className="sheet-info-row">
          <MapPin size={16} className="sheet-row-icon" />
          <div className="sheet-row-text">
            <span className="sheet-addr-primary">
              {market.address || `${market.district}, ${market.state}`}
            </span>
            {market.district && market.state && (
              <span className="sheet-addr-secondary">
                {market.district}, {market.state}
              </span>
            )}
          </div>
        </div>

        {/* Opening Hours */}
        {market.openingHours && (
          <div className="sheet-info-row">
            <Clock size={16} className="sheet-row-icon" />
            <div className="sheet-row-text">
              <span className="sheet-label-sub">{i18n.hoursLabel}</span>
              <span className="sheet-val-text">{market.openingHours}</span>
            </div>
          </div>
        )}

        {/* Commodities Chips */}
        {market.commodities && market.commodities.length > 0 && (
          <div className="sheet-commodities-block">
            <div className="commodities-header">
              <Wheat size={15} />
              <span>{i18n.commoditiesLabel}</span>
            </div>
            <div className="commodities-chips-wrap">
              {market.commodities.map((comm) => (
                <span key={comm} className="commodity-pill">
                  <CheckCircle2 size={12} className="comm-check" />
                  {comm}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Bottom CTA Action Buttons (Large Touch Targets) */}
        <div className="sheet-cta-row">
          {market.phone && (
            <button
              type="button"
              onClick={handleCall}
              className="sheet-cta-btn call"
              aria-label={`Call ${market.phone}`}
            >
              <PhoneCall size={18} />
              <span>{i18n.callBtn}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleGetDirections}
            className="sheet-cta-btn directions"
            aria-label="Get Directions in Maps"
          >
            <Navigation size={18} />
            <span>{i18n.getDirectionsBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
