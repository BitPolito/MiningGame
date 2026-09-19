import PlayerAvatar from '../PlayerAvatar';
import { useLocale } from '../../i18n/LocaleContext';
import { USERS } from '../../lib/gameConstants.js';

export default function BalanceSheetTable({ columns, balanceHistory = [] }) {
  const { tr } = useLocale();
  const confirmedColumns = columns ?? balanceHistory.map((_, index) => index);

  return (
    <>
      <div className="bp-table-wrap balance-sheet-table">
      <table className="bp-table">
        <thead>
          <tr>
            <th>{tr('colBlock')}</th>
            {confirmedColumns.map((col) => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {USERS.map((u) => (
            <tr key={u}>
              <td>
                <span className="player-cell">
                  <PlayerAvatar name={u} size="sm" inline />
                  {u}
                </span>
              </td>
              {confirmedColumns.map((col) => (
                <td key={col}>{balanceHistory[col] ? balanceHistory[col][u] : '-'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <div className="bp-balance-history-mobile">
        {confirmedColumns.map((col) => (
          <section className="bp-balance-history-card" key={col}>
            <strong className="bp-balance-history-card__title">{tr('blockDetails', { n: col })}</strong>
            <dl>
              {USERS.map((name) => (
                <div key={name}>
                  <dt><PlayerAvatar name={name} size="sm" inline />{name}</dt>
                  <dd>{balanceHistory[col]?.[name] ?? '-'}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </>
  );
}
