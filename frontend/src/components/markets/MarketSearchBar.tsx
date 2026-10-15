import { type FC, type ChangeEvent } from 'react';
import type { MarketTranslationStrings } from '../../data/i18n/marketsTranslations';
import { Search, X } from 'lucide-react';

interface MarketSearchBarProps {
  value: string;
  onChange: (val: string) => void;
  i18n: MarketTranslationStrings;
}

export const MarketSearchBar: FC<MarketSearchBarProps> = ({ value, onChange, i18n }) => {
  return (
    <div className="market-search-bar-wrap">
      <Search size={18} className="market-search-icon" />
      <input
        type="text"
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={i18n.searchPlaceholder}
        className="market-search-input"
        aria-label={i18n.searchPlaceholder}
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="market-search-clear-btn"
          aria-label="Clear search"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};
