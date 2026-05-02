/**
 * MiniLocationView — read-only card showing the saved point with a tiny
 * map preview, status badge, and "open in maps" link. Used inside seller /
 * pickup point / warehouse detail pages.
 *
 * The `aria-label` and the warning copy explain WHY a missing or
 * unconfirmed point is a problem: couriers won't reach the entrance.
 * This is intentional — the platform's correctness depends on operators
 * understanding the activation gate, not just bypassing the warning.
 */
import { ExternalLink, MapPin, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useI18n, type DictKey } from '../../i18n';
import {
  formatLatLng, presetForCity, isLocationUsable,
  type Location, type LocationStatus,
} from '../../data/location';

const STATUS_KEY: Record<LocationStatus, DictKey> = {
  not_set:           'location.status.not_set',
  found_by_address:  'location.status.found_by_address',
  adjusted_manually: 'location.status.adjusted_manually',
  confirmed:         'location.status.confirmed',
};

const STATUS_BADGE: Record<LocationStatus, string> = {
  not_set:           'bg-gray-100 text-gray-600',
  found_by_address:  'bg-blue-100 text-blue-700',
  adjusted_manually: 'bg-amber-100 text-amber-700',
  confirmed:         'bg-green-100 text-green-700',
};

export interface MiniLocationViewProps {
  location:    Location | null | undefined;
  /** Card mode — only shapes the warning copy; behaviour is identical. */
  mode?:       'seller' | 'pickup_point' | 'warehouse';
  className?:  string;
  /** Hide the mini-map area to make a tighter inline summary. */
  compact?:    boolean;
}

export function MiniLocationView({ location, mode = 'pickup_point', className = '', compact }: MiniLocationViewProps) {
  const { t } = useI18n();
  const usable = isLocationUsable(location);
  const status: LocationStatus = location?.locationStatus ?? 'not_set';

  const preset = presetForCity(location?.city);
  // Convert the point to a percentage inside the mini-map.
  const hasPoint = location && Number.isFinite(location.latitude) && Number.isFinite(location.longitude) &&
                   !(location.latitude === 0 && location.longitude === 0);
  const x = hasPoint
    ? ((location!.longitude - preset.bounds.west)  / (preset.bounds.east  - preset.bounds.west))  * 100
    : 50;
  const y = hasPoint
    ? ((preset.bounds.north - location!.latitude) / (preset.bounds.north - preset.bounds.south)) * 100
    : 50;

  const externalHref = hasPoint
    ? `https://www.google.com/maps?q=${location!.latitude},${location!.longitude}`
    : null;

  return (
    <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 flex-wrap">
        <MapPin className="w-4 h-4 text-blue-600" />
        <p className="text-sm font-bold text-gray-900 flex-1 min-w-0 truncate">
          {location?.fullAddress || '—'}
        </p>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${STATUS_BADGE[status]}`}>
          {t(STATUS_KEY[status])}
        </span>
      </div>

      {!compact && (
        <div
          className="relative w-full aspect-[16/7] border-b border-gray-100"
          style={{
            background: 'linear-gradient(135deg, #e7f0ff 0%, #f0e7ff 100%)',
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px),
              linear-gradient(135deg, #e7f0ff 0%, #f0e7ff 100%)`,
            backgroundSize: '30px 30px, 30px 30px, 100% 100%',
          }}
          aria-label={location?.fullAddress || ''}
        >
          {hasPoint && (
            <div
              className="absolute -translate-x-1/2 -translate-y-full pointer-events-none"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <div className="w-5 h-5 rounded-full bg-red-500 ring-2 ring-red-200 shadow flex items-center justify-center text-white">
                <MapPin className="w-3 h-3" />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-gray-400">{t('location.field.postalCode')}</p>
          <p className="font-medium text-gray-800">{location?.postalCode || '—'}</p>
        </div>
        <div>
          <p className="text-gray-400">{t('location.field.city')}</p>
          <p className="font-medium text-gray-800">{location?.city || '—'}</p>
        </div>
        <div>
          <p className="text-gray-400">{t('location.coordsLabel')}</p>
          <p className="font-mono text-gray-700">
            {hasPoint ? formatLatLng(location!.latitude, location!.longitude) : '—'}
          </p>
        </div>
        <div>
          <p className="text-gray-400">{t('location.field.entranceHint')}</p>
          <p className="font-medium text-gray-800">{location?.entranceHint || '—'}</p>
        </div>
      </div>

      <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-2">
        {usable ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-green-700 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />{t('location.confirmed')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            {mode === 'pickup_point' ? t('location.error.pvz_not_confirmed')
             : mode === 'warehouse'  ? t('location.error.warehouse_not_confirmed')
             :                         t('location.error.seller_not_confirmed')}
          </span>
        )}
        {externalHref && (
          <a href={externalHref} target="_blank" rel="noopener noreferrer"
             className="ml-auto inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
            <ExternalLink className="w-3 h-3" />
            {t('location.openExternal')}
          </a>
        )}
      </div>
    </div>
  );
}
