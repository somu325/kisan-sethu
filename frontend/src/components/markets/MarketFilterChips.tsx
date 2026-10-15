import { type FC } from 'react';
import type { MarketType } from '../../types/market';
import type { MarketTranslationStrings } from '../../data/i18n/marketsTranslations';
import { Layers, Landmark, Store } from 'lucide-react';

interface MarketFilterChipsProps {
  selectedType: MarketType | 'ALL';
  onSelectType: (type: MarketType | 'ALL') => void;
  i18n: MarketTranslationStrings;
  apmcCount?: number;
  mandiCount?: number;
  totalCount?: number;
}

export const MarketFilterChips: FC<MarketFilterChipsProps> = ({
  selectedType,
  onSelectType,
  i18n,
  apmcCount,
  mandiCount,
  totalCount
}) => {
  return (
    <div className="market-filter-chips-container" role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={selectedType === 'ALL'}
        onClick={() => onSelectType('ALL')}
        className={`market-chip all ${selectedType === 'ALL' ? 'active' : ''}`}
      >
        <Layers size={16} />
        <span className="chip-label">{i18n.allChip}</span>
        {totalCount !== undefined && <span className="chip-count">{totalCount}</span>}
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={selectedType === 'APMC'}
        onClick={() => onSelectType('APMC')}
        className={`market-chip apmc ${selectedType === 'APMC' ? 'active' : ''}`}
      >
        <Landmark size={16} />
        <span className="chip-label">{i18n.apmcChip}</span>
        {apmcCount !== undefined && <span className="chip-count">{apmcCount}</span>}
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={selectedType === 'MANDI'}
        onClick={() => onSelectType('MANDI')}
        className={`market-chip mandi ${selectedType === 'MANDI' ? 'active' : ''}`}
      >
        <Store size={16} />
        <span className="chip-label">{i18n.mandiChip}</span>
        {mandiCount !== undefined && <span className="chip-count">{mandiCount}</span>}
      </button>
    </div>
  );
};
