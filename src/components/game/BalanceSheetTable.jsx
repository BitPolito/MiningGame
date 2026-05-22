import PlayerAvatar from '../PlayerAvatar';
import { useLocale } from '../../i18n/LocaleContext';
import { USERS } from '../../lib/gameConstants.js';

export default function BalanceSheetTable({ columns, balanceHistory }) {
  const { tr } = useLocale();

  return (
    <div className="bp-table-wrap balance-sheet-table">
      <table className="bp-table">
        <thead>
          <tr>
            <th>{tr('colBlock')}</th>
            {columns.map((col) => (
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
              {columns.map((col) => (
                <td key={col}>{balanceHistory[col] ? balanceHistory[col][u] : '-'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
