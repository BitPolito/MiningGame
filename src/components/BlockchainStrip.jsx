export default function BlockchainStrip({
  columns,
  minedCount,
  onBlockClick,
  clickable = false,
}) {
  return (
    <div className="bp-chain">
      {columns.map((i, index) => {
        const isMined = i < minedCount;
        const isCurrent = i === minedCount - 1 && minedCount > 0;
        const canClick = clickable && isMined && onBlockClick;

        return (
          <div key={i} className="bp-chain__block">
            <div
              className={[
                'bp-chain__node',
                isMined ? 'bp-chain__node--mined' : 'bp-chain__node--pending',
                isCurrent ? 'bp-chain__node--current' : '',
                canClick ? 'bp-chain__node--clickable' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={canClick ? () => onBlockClick(i) : undefined}
              role={canClick ? 'button' : undefined}
              tabIndex={canClick ? 0 : undefined}
            >
              <div className="bp-chain__cube" />
              <span className="bp-chain__label">#{i}</span>
            </div>
            {index < columns.length - 1 && (
              <div
                className={`bp-chain__link${isMined && index + 1 < minedCount ? ' bp-chain__link--mined' : ''}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
