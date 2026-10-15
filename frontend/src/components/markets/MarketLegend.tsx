import { type FC } from 'react';
import type { MarketTranslationStrings } from '../../data/i18n/marketsTranslations';

interface MarketLegendProps {
  i18n: MarketTranslationStrings;
}

export const MarketLegend: FC<MarketLegendProps> = ({ i18n }) => {
  return (
    <div className="market-map-legend" role="note" aria-label="Map Legend">
      <div className="legend-item">
        <span className="legend-badge apmc">🏛️</span>
        <span className="legend-text">{i18n.legendApmc}</span>
      </div>
      <div className="legend-item">
        <span className="legend-badge mandi">🌾</span>
        <span className="legend-text">{i18n.legendMandi}</span>
      </div>
      <div className="legend-item">
        <span className="legend-badge cluster">3+</span>
        <span className="legend-text">{i18n.legendCluster}</span>
      </div>
    </div>
  );
};
