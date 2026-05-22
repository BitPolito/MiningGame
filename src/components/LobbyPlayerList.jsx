import PlayerAvatar from './PlayerAvatar';
import BpIcon from './BpIcon';
import { ICON } from '../assets/icons';
import { useLocale } from '../i18n/LocaleContext';

export default function LobbyPlayerList({ players = [], hostName, currentName }) {
  const { tr } = useLocale();

  return (
    <ul className="bp-player-list">
      {players.map((p) => (
        <li key={p.name} className="bp-player-list__item">
          <PlayerAvatar name={p.name} size="sm" />
          <span className="bp-player-list__name">
            {p.name}
            {p.name === currentName && (
              <span className="bp-player-list__you">{tr('you')}</span>
            )}
          </span>
          {hostName && p.name === hostName && (
            <span className="bp-player-list__badge">
              <BpIcon src={ICON.crown} className="bp-icon--sm" />
              {tr('hostBadge')}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
