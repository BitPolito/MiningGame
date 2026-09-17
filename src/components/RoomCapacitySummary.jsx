import { getMinerCapacity } from '../lib/roomConfig';
import { useLocale } from '../i18n/LocaleContext';

export default function RoomCapacitySummary({ room, compact = false }) {
  const { tr } = useLocale();
  const playerLimit = room?.numPlayers ?? 0;
  const hostMines = room?.hostParticipates !== false;
  const minerSlots = getMinerCapacity(room);

  return (
    <dl className={`bp-capacity-summary${compact ? ' bp-capacity-summary--compact' : ''}`}>
      <div>
        <dt>{tr('roomPlaces')}</dt>
        <dd>{playerLimit}</dd>
      </div>
      <div>
        <dt>{tr('hostRole')}</dt>
        <dd>{tr(hostMines ? 'hostRoleMiner' : 'hostRoleSpectator')}</dd>
      </div>
      <div>
        <dt>{tr('minerSlots')}</dt>
        <dd>{minerSlots}</dd>
      </div>
    </dl>
  );
}
