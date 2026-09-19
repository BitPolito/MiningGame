import { useId, useState } from 'react';
import PlayerAvatar from '../PlayerAvatar';
import BalanceSheetTable from './BalanceSheetTable';
import ChevronDownIcon from './ChevronDownIcon';
import { USERS } from '../../lib/gameConstants.js';
import { getAvailableBalances } from '../../lib/txSelection.js';
import { useLocale } from '../../i18n/LocaleContext';

export default function AvailableBalances({ balances, balanceHistory, mempool, selectedTxIds }) {
  const { tr } = useLocale();
  const [historyOpen, setHistoryOpen] = useState(false);
  const titleId = useId();
  const historyId = useId();
  const available = getAvailableBalances(balances, mempool, selectedTxIds);

  return (
    <section className="bp-available-balances" aria-labelledby={titleId}>
      <div className="bp-available-balances__head">
        <div className="bp-available-balances__copy">
          <strong id={titleId}>{tr('balanceSheet')}</strong>
          <span>{tr('balancesLiveHint')}</span>
        </div>
        <button
          type="button"
          className="bp-available-balances__history-toggle"
          aria-expanded={historyOpen}
          aria-controls={historyId}
          onClick={() => setHistoryOpen((open) => !open)}
        >
          <span className="bp-available-balances__history-label">
            {historyOpen ? tr('hideBalanceHistory') : tr('showBalanceHistory')}
          </span>
          <span className={`bp-available-balances__chevron${historyOpen ? ' bp-available-balances__chevron--open' : ''}`}>
            <ChevronDownIcon />
          </span>
        </button>
      </div>
      <div className="bp-available-balances__grid">
        {USERS.map((name) => {
          const current = balances[name] ?? 0;
          const value = available[name] ?? current;
          const reserved = current - value;
          return (
            <div className={`bp-balance-chip${reserved > 0 ? ' bp-balance-chip--changed' : ''}`} key={name}>
              <PlayerAvatar name={name} size="sm" inline />
              <span className="bp-balance-chip__name">{name}</span>
              <strong className="bp-balance-chip__value">{value}</strong>
              {reserved > 0 && (
                <small className="bp-balance-chip__reserved" aria-label={tr('balanceReserved', { amount: reserved })}>
                  −{reserved}
                </small>
              )}
            </div>
          );
        })}
      </div>
      {historyOpen && (
        <div id={historyId} className="bp-available-balances__history">
          <BalanceSheetTable balanceHistory={balanceHistory} />
        </div>
      )}
    </section>
  );
}
