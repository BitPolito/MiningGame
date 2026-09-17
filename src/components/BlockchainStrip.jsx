import { useEffect, useRef } from 'react';
import { useLocale } from '../i18n/LocaleContext';

export default function BlockchainStrip({
  columns,
  minedCount,
  onBlockClick,
  clickable = false,
}) {
  const { tr } = useLocale();
  const chainRef = useRef(null);
  const activeRef = useRef(null);

  useEffect(() => {
    const chain = chainRef.current;
    const active = activeRef.current;
    if (!chain || !active || chain.scrollWidth <= chain.clientWidth) return;
    const left = active.offsetLeft - (chain.clientWidth - active.offsetWidth) / 2;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    chain.scrollTo({ left: Math.max(0, left), behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [minedCount, columns.length]);

  return (
    <div className="bp-chain" ref={chainRef}>
      {columns.map((i, index) => {
        const isMined = i < minedCount;
        const isLatestMined = isMined && i === minedCount - 1 && i > 0;
        const isNext = i === minedCount && minedCount < columns.length;
        const isCurrent = isNext || (minedCount >= columns.length && i === columns.length - 1);
        const isGenesis = i === 0;
        const canClick = clickable && isMined && onBlockClick;

        return (
          <div key={i} className="bp-chain__block" ref={isCurrent ? activeRef : undefined}>
            <div
              className={[
                'bp-chain__node',
                isMined ? 'bp-chain__node--mined' : 'bp-chain__node--pending',
                isLatestMined ? 'bp-chain__node--latest' : '',
                isNext ? 'bp-chain__node--next' : '',
                isGenesis ? 'bp-chain__node--genesis' : '',
                isCurrent ? 'bp-chain__node--current' : '',
                canClick ? 'bp-chain__node--clickable' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={canClick ? () => onBlockClick(i) : undefined}
              role={canClick ? 'button' : isNext ? 'status' : undefined}
              tabIndex={canClick ? 0 : undefined}
              onKeyDown={canClick ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onBlockClick(i);
                }
              } : undefined}
              aria-label={isNext ? tr('nextBlockAria', { n: i }) : canClick ? tr('blockDetails', { n: i }) : undefined}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <div className="bp-chain__cube">
                <span className="bp-chain__state" aria-hidden>{isMined ? (isGenesis ? '₿' : '✓') : isNext ? '·' : ''}</span>
              </div>
              <span className="bp-chain__label">{isGenesis ? tr('genesisShort') : `#${i}`}</span>
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
