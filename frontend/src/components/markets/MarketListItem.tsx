import { type FC } from 'react';
import { Linking } from 'react-native';
import type { MarketWithDistance } from '../../types/market';
import type { MarketTranslationStrings } from '../../data/i18n/marketsTranslations';
import {
  MapPin,
  Navigation,
  PhoneCall,
  Clock,
  ChevronRight
} from 'lucide-react';

interface MarketListItemProps {
  market: MarketWithDistance;
  onSelect: (market: MarketWithDistance) => void;
  i18n: MarketTranslationStrings;
}

export const MarketListItem: FC<MarketListItemProps> = ({ market, onSelect, i18n }) => {
  const isApmc = market.type === 'APMC';

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (market.phone) {
      const clean = market.phone.replace(/[^+\d]/g, '');
      const url = `tel:${clean}`;
      Linking.openURL(url).catch(() => {
        if (typeof window !== 'undefined') window.location.href = url;
      });
    }
  };

  const handleDirections = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `https://www.google.com/maps/dir/?api=1&destination=${market.latitude},${market.longitude}`;
    Linking.openURL(url).catch(() => {
      if (typeof window !== 'undefined') window.open(url, '_blank');
    });
  };

  return (
    <div
      className="market-list-item-card"
      onClick={() => onSelect(market)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onSelect(market);
        }
      }}
    >
      <div className="card-top-header">
        <div className="card-badges">
          <span className={`item-type-badge ${isApmc ? 'apmc' : 'mandi'}`}>
            <span>{isApmc ? '🏛️' : '🌾'}</span>
            <span>{isApmc ? i18n.apmcBadge : i18n.mandiBadge}</span>
          </span>

          {market.distanceKm !== undefined && (
            <span className="item-distance-pill">
              <Navigation size={12} />
              <span>
                {market.distanceKm} km {i18n.distanceAway}
              </span>
            </span>
          )}
        </div>

        <ChevronRight size={18} className="card-arrow" />
      </div>

      <h4 className="item-title">{market.name}</h4>

      <p className="item-address">
        <MapPin size={14} className="addr-pin" />
        <span>{market.address || `${market.district}, ${market.state}`}</span>
      </p>

      {market.openingHours && (
        <p className="item-hours">
          <Clock size={13} className="hours-icon" />
          <span>{market.openingHours}</span>
        </p>
      )}

      {market.commodities && market.commodities.length > 0 && (
        <div className="item-commodities-row">
          {market.commodities.slice(0, 3).map((c) => (
            <span key={c} className="mini-commodity-chip">
              {c}
            </span>
          ))}
          {market.commodities.length > 3 && (
            <span className="mini-commodity-more">+{market.commodities.length - 3}</span>
          )}
        </div>
      )}

      <div className="card-action-btns">
        {market.phone && (
          <button type="button" onClick={handleCall} className="item-quick-btn call">
            <PhoneCall size={14} />
            <span>{i18n.callBtn}</span>
          </button>
        )}
        <button type="button" onClick={handleDirections} className="item-quick-btn directions">
          <Navigation size={14} />
          <span>{i18n.getDirectionsBtn}</span>
        </button>
      </div>
    </div>
  );
};
