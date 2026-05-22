import { PLAYERS, ICON } from '../assets/icons';

const FALLBACK = ICON.coin;

export default function PlayerAvatar({ name, size = 'md', inline = false }) {
  const src = PLAYERS[name] || FALLBACK;
  const cls = `player-avatar player-avatar--${size}${inline ? ' player-avatar--inline' : ''}`;

  return (
    <img
      src={src}
      alt=""
      className={cls}
      width={size === 'sm' ? 20 : 28}
      height={size === 'sm' ? 20 : 28}
      aria-hidden
    />
  );
}
