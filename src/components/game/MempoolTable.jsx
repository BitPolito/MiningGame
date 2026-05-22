import PlayerAvatar from '../PlayerAvatar';
import { useLocale } from '../../i18n/LocaleContext';
import { getNameValue } from '../../lib/gameConstants.js';

function PlayerCell({ name, showUserIcons, nameValue, nameValueLabel }) {
  return (
    <span className="player-cell">
      {showUserIcons ? <PlayerAvatar name={name} size="sm" inline /> : null}
      <span className="player-cell__name">{name}</span>
      {nameValue != null ? (
        <span className="player-cell__val" title={nameValueLabel}>
          {nameValue}
        </span>
      ) : null}
    </span>
  );
}

export default function MempoolTable({
  transactions,
  selectedIds = [],
  onToggle,
  disabled = false,
  showUserIcons = true,
  inlineNameValues = false,
  emptyMessage,
  maxSelectable = 3,
}) {
  const { tr } = useLocale();
  const selectable = !!onToggle && !disabled;

  if (!transactions.length) {
    return (
      <div className="bp-empty">
        {emptyMessage ?? tr('noTxSelected')}
      </div>
    );
  }

  const selectionFull = selectedIds.length >= maxSelectable;

  return (
    <div className="bp-table-wrap mempool-table-wrap">
      <table className="bp-table mempool-table">
        <thead>
          <tr>
            {selectable && <th className="mempool-col-check" aria-hidden />}
            <th className="mempool-col-id">#</th>
            <th className="mempool-col-player">{tr('colFrom')}</th>
            <th className="mempool-col-player">{tr('colTo')}</th>
            <th className="mempool-col-amount">{tr('colAmount')}</th>
            <th className="mempool-col-fee">{tr('colFee')}</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => {
            const id = tx.id;
            const isSelected = selectedIds.includes(id);
            const canClick = selectable && (isSelected || !selectionFull);

            return (
              <tr
                key={id}
                className={[
                  canClick ? 'bp-row--clickable' : '',
                  isSelected ? 'bp-row--picked' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={canClick ? () => onToggle(id) : undefined}
                onKeyDown={
                  canClick
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onToggle(id);
                        }
                      }
                    : undefined
                }
                tabIndex={canClick ? 0 : undefined}
                role={canClick ? 'button' : undefined}
                aria-pressed={isSelected}
              >
                {selectable && (
                  <td className="mempool-col-check">
                    {isSelected ? (
                      <span className="mempool-check" aria-hidden>
                        ✓
                      </span>
                    ) : null}
                  </td>
                )}
                <td className="mempool-col-id">{tx.displayId ?? tx.id}</td>
                <td className="mempool-col-player">
                  <PlayerCell
                    name={tx.sender}
                    showUserIcons={showUserIcons}
                    nameValue={inlineNameValues ? getNameValue(tx.sender) : null}
                    nameValueLabel={tr('colNameVal')}
                  />
                </td>
                <td className="mempool-col-player">
                  <PlayerCell
                    name={tx.receiver}
                    showUserIcons={showUserIcons}
                    nameValue={inlineNameValues ? getNameValue(tx.receiver) : null}
                    nameValueLabel={tr('colNameVal')}
                  />
                </td>
                <td className="mempool-col-amount">{tx.amount}</td>
                <td className="mempool-col-fee">
                  <span className="bp-fee">{tx.fee}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
