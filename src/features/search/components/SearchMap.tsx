'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import L from 'leaflet';
import { useLanguage } from '@/providers/LanguageProvider';
import { logApp } from '@/lib/logger';
import type { OpeningHours } from '@/types/openingHours';
import 'leaflet/dist/leaflet.css';

export interface MapPin {
  providerId: string;
  providerName: string;
  lat: number;
  lng: number;
  opening_hours?: OpeningHours | null;
  provider_images?: string | { urls?: string[] } | null;
  address_city?: string | null;
  category_id?: string | null;
  category?: {
    name_de: string;
    name_en?: string;
    category_images?: Record<string, unknown>;
  };
}

interface SearchMapProps {
  userCoords?: { lat: number; lon: number } | null;
  pins: MapPin[];
}

const DEFAULT_CENTER: [number, number] = [51.1657, 10.4515];
const DEFAULT_ZOOM = 6;

let _pinUid = 0;

function createPinIcon(): L.DivIcon {
  const uid = ++_pinUid;
  const fId = `pf${uid}`;
  const cId = `pc${uid}`;
  const mId = `pm${uid}`;
  const p1 = 'M3.9874 5.97345C3.9874 6.10393 3.95944 6.21286 3.90352 6.30024C3.84877 6.38878 3.77945 6.47091 3.69557 6.54664C3.60703 6.62586 3.49635 6.69517 3.36354 6.75459C3.23073 6.81401 3.08219 6.84371 2.91792 6.84371C2.76298 6.84371 2.63657 6.8175 2.53871 6.76508C2.44202 6.71265 2.37037 6.64158 2.32377 6.55188C2.27833 6.46217 2.25562 6.3614 2.25562 6.24956C2.25562 6.15403 2.27076 6.055 2.30105 5.95248C2.33134 5.84996 2.36687 5.75501 2.40765 5.66764C2.44959 5.5791 2.48687 5.50745 2.51949 5.45269C2.55328 5.39794 2.57308 5.37056 2.57891 5.37056C2.58823 5.37056 2.60221 5.37871 2.62085 5.39502C2.64065 5.41017 2.65055 5.4224 2.65055 5.43172C2.65055 5.43755 2.63657 5.46667 2.60861 5.5191C2.58182 5.57036 2.55502 5.63618 2.52823 5.71657C2.50143 5.79579 2.48803 5.88142 2.48803 5.97345C2.48803 6.10044 2.53405 6.19713 2.62609 6.26354C2.71812 6.33111 2.84511 6.3649 3.00705 6.3649C3.17364 6.3649 3.32509 6.34276 3.4614 6.29849C3.59771 6.25422 3.6944 6.20121 3.75149 6.13947C3.76314 6.12898 3.77246 6.10452 3.77945 6.06607C3.7876 6.02762 3.79168 5.99792 3.79168 5.97695C3.79168 5.92569 3.78527 5.85404 3.77246 5.762C3.75964 5.6688 3.74275 5.56453 3.72178 5.4492C3.70197 5.3327 3.67984 5.21503 3.65537 5.0962C3.63207 4.9762 3.60994 4.86495 3.58897 4.76242C3.56217 4.63194 3.53596 4.50671 3.51033 4.38671C3.48587 4.26671 3.46548 4.16011 3.44917 4.06691C3.43286 3.97255 3.4247 3.90032 3.4247 3.85022C3.4247 3.79547 3.43752 3.74071 3.46315 3.68596C3.48994 3.63004 3.52198 3.58344 3.55926 3.54615C3.59654 3.50887 3.63149 3.49023 3.66411 3.49023C3.66761 3.49023 3.68333 3.50654 3.71129 3.53916C3.73925 3.57062 3.77071 3.60848 3.80566 3.65275C3.84061 3.69586 3.8709 3.73489 3.89653 3.76984C3.92216 3.80362 3.93498 3.82343 3.93498 3.82925C3.93498 3.83391 3.92274 3.84673 3.89828 3.8677C3.87498 3.88867 3.8511 3.91721 3.82663 3.95333C3.80217 3.98944 3.78993 4.03255 3.78993 4.08264C3.78993 4.14439 3.79634 4.23642 3.80916 4.35875C3.82314 4.48107 3.84003 4.61855 3.85983 4.77116C3.87964 4.92378 3.89886 5.07814 3.9175 5.23425C3.93731 5.39036 3.95362 5.53366 3.96643 5.66414C3.98041 5.79462 3.9874 5.89773 3.9874 5.97345Z';
  const p2 = 'M6.00403 5.67463C6.00403 5.68977 6.0017 5.70958 5.99704 5.73404C5.99355 5.75851 5.98656 5.77831 5.97607 5.79346C5.97025 5.80278 5.95743 5.81734 5.93763 5.83715C5.91782 5.85579 5.88345 5.86511 5.83452 5.86511C5.81006 5.86511 5.79317 5.85579 5.78385 5.83715C5.77569 5.81734 5.77161 5.80103 5.77161 5.78822C5.77161 5.7288 5.75239 5.66181 5.71395 5.58725C5.6755 5.51153 5.62657 5.43522 5.56715 5.35833C5.5089 5.28144 5.44774 5.21037 5.38367 5.14513C5.31959 5.07989 5.26076 5.02746 5.20717 4.98785C5.15474 4.94824 5.11571 4.92844 5.09008 4.92844C5.05863 4.92844 5.03941 4.93834 5.03242 4.95815C5.02543 4.97679 5.01902 4.99601 5.01319 5.01581C5.00853 5.03445 4.99281 5.04377 4.96601 5.04377C4.94737 5.04377 4.92174 5.03678 4.88912 5.0228C4.85766 5.00766 4.83203 4.99426 4.81223 4.98261C4.74116 4.94184 4.67301 4.90281 4.60777 4.86553C4.54253 4.82708 4.48894 4.78339 4.447 4.73446C4.40622 4.68437 4.38584 4.62321 4.38584 4.55098C4.38584 4.48923 4.38875 4.4269 4.39457 4.36399C4.40156 4.29992 4.41496 4.24633 4.43477 4.20322C4.45457 4.16011 4.48311 4.13856 4.52039 4.13856C4.5635 4.13856 4.62408 4.15895 4.70214 4.19973C4.78019 4.2405 4.8664 4.29526 4.96077 4.36399C5.05513 4.43156 5.14892 4.50729 5.24212 4.59117C5.33532 4.67388 5.41862 4.75776 5.49201 4.84281C5.59919 4.9663 5.69181 5.09096 5.76987 5.21678C5.84909 5.34143 5.90792 5.43755 5.94637 5.50512C5.95569 5.52376 5.96734 5.55347 5.98132 5.59424C5.99646 5.63385 6.00403 5.66065 6.00403 5.67463ZM7.04905 6.01714C7.04905 6.04044 7.04613 6.07131 7.04031 6.10976C7.03565 6.1482 7.024 6.18257 7.00536 6.21286C6.98788 6.24315 6.95934 6.2583 6.91973 6.2583H6.8341C6.68731 6.2583 6.57722 6.21869 6.50382 6.13947C6.43043 6.06025 6.3815 5.96646 6.35703 5.85812C6.33839 5.77657 6.32208 5.69967 6.3081 5.62744C6.29529 5.55521 6.28305 5.47716 6.2714 5.39328C6.25975 5.3094 6.24694 5.21037 6.23296 5.0962C6.21781 5.26163 6.19102 5.42298 6.15257 5.58026C6.11529 5.73637 6.06986 5.87501 6.01627 5.99617C5.96384 6.11733 5.90617 6.20762 5.84326 6.26703C5.80365 6.30548 5.74365 6.33926 5.66327 6.36839C5.58405 6.39868 5.49609 6.42431 5.39939 6.44528C5.3027 6.46742 5.20775 6.48489 5.11455 6.49771C5.02251 6.51169 4.94213 6.52217 4.87339 6.52916C4.80582 6.53615 4.76155 6.53965 4.74058 6.53965C4.73243 6.53965 4.72252 6.52741 4.71087 6.50295C4.69922 6.47965 4.6934 6.46217 4.6934 6.45052C4.6934 6.44586 4.72136 6.43247 4.77728 6.41033C4.8332 6.38936 4.90485 6.35907 4.99222 6.31946C5.0796 6.28101 5.1693 6.23325 5.26134 6.17616C5.35804 6.11558 5.45357 6.04918 5.54793 5.97695C5.6423 5.90472 5.72501 5.82724 5.79608 5.74453C5.86831 5.66065 5.9184 5.57327 5.94637 5.4824C5.98365 5.35891 6.01219 5.23542 6.03199 5.11193C6.0518 4.98844 6.0652 4.85679 6.07219 4.71699C6.07918 4.57602 6.08267 4.41991 6.08267 4.24866C6.08267 4.21837 6.09316 4.17875 6.11413 4.12982C6.13626 4.08089 6.16247 4.03138 6.19276 3.98129C6.22305 3.93119 6.2516 3.88925 6.27839 3.85546C6.30635 3.82051 6.32616 3.80304 6.33781 3.80304C6.34363 3.80304 6.34829 3.83624 6.35179 3.90265C6.35528 3.96789 6.35994 4.05701 6.36577 4.17002C6.37276 4.28186 6.38324 4.40943 6.39722 4.55272C6.4112 4.69485 6.43101 4.84398 6.45664 5.00009C6.48227 5.15503 6.51664 5.30707 6.55974 5.45619C6.5877 5.54939 6.62498 5.62628 6.67158 5.68686C6.71818 5.74744 6.77236 5.77773 6.8341 5.77773H6.91973C6.95934 5.77773 6.98788 5.79288 7.00536 5.82317C7.024 5.85229 7.03565 5.88608 7.04031 5.92452C7.04613 5.9618 7.04905 5.99267 7.04905 6.01714Z';
  const p3 = 'M9.3348 5.21328C9.3348 5.21794 9.33188 5.236 9.32606 5.26746C9.3214 5.29891 9.31557 5.33503 9.30858 5.3758C9.30159 5.41541 9.2946 5.45269 9.28761 5.48764C9.28179 5.52143 9.27771 5.54298 9.27538 5.5523C9.27422 5.55929 9.2381 5.56512 9.16703 5.56978C9.09597 5.57327 9.00102 5.57618 8.88219 5.57851C8.76452 5.57968 8.63346 5.58026 8.489 5.58026C8.39114 5.58026 8.29968 5.60065 8.21464 5.64142C8.12959 5.6822 8.04629 5.73346 7.96474 5.79521C7.88436 5.85579 7.80106 5.91753 7.71485 5.98044C7.61233 6.055 7.49816 6.12024 7.37234 6.17616C7.24768 6.23092 7.10963 6.2583 6.95818 6.2583H6.86905C6.82944 6.2583 6.80032 6.24315 6.78168 6.21286C6.76304 6.18257 6.75139 6.1482 6.74673 6.10976C6.7409 6.07131 6.73799 6.04044 6.73799 6.01714C6.73799 5.99267 6.7409 5.9618 6.74673 5.92452C6.75139 5.88608 6.76304 5.85229 6.78168 5.82317C6.80032 5.79288 6.82944 5.77773 6.86905 5.77773H6.95293C7.07409 5.77773 7.197 5.77074 7.32166 5.75676C7.44748 5.74278 7.56456 5.71365 7.67291 5.66938C7.73349 5.64492 7.79757 5.61521 7.86514 5.58026C7.93387 5.54415 7.99795 5.5191 8.05736 5.50512C8.01426 5.48881 7.95426 5.46318 7.87737 5.42823C7.80048 5.39328 7.7166 5.36124 7.62573 5.33211C7.53602 5.30182 7.44923 5.28668 7.36535 5.28668C7.32224 5.28668 7.27972 5.29542 7.23778 5.31289C7.19584 5.3292 7.16031 5.34551 7.13118 5.36182C7.10322 5.37813 7.08749 5.38629 7.084 5.38629C7.0805 5.38629 7.06769 5.38163 7.04555 5.37231C7.02458 5.36182 7.0141 5.35425 7.0141 5.34959C7.0141 5.28784 7.03448 5.21445 7.07526 5.1294C7.1172 5.04319 7.17254 4.9762 7.24127 4.92844C7.27972 4.90164 7.32282 4.87893 7.37059 4.86029C7.41952 4.84165 7.4801 4.83233 7.55233 4.83233C7.60126 4.83233 7.65776 4.84398 7.72184 4.86728C7.78592 4.89058 7.8529 4.91854 7.9228 4.95116C7.99387 4.98378 8.06319 5.01465 8.13076 5.04377C8.19949 5.0729 8.26124 5.09387 8.31599 5.10668C8.39871 5.12649 8.49016 5.14455 8.59035 5.16086C8.69171 5.17717 8.80355 5.18824 8.92588 5.19406C8.97597 5.19523 9.03248 5.19697 9.09539 5.1993C9.15946 5.20047 9.21538 5.20222 9.26315 5.20455C9.31091 5.20688 9.3348 5.20979 9.3348 5.21328Z';
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:55px;height:64px"><svg width="45" height="57" viewBox="0 0 23 29" fill="none" xmlns="http://www.w3.org/2000/svg" style="position:absolute;left:3.5px;top:3.5px"><path d="M22.7558 11.3779C22.7558 18.4792 14.8781 25.8748 12.2327 28.1589C11.9862 28.3442 11.6863 28.4444 11.3779 28.4444C11.0696 28.4444 10.7696 28.3442 10.5232 28.1589C7.87779 25.8748 0 18.4792 0 11.3779C0 8.36031 1.19874 5.46629 3.33252 3.33252C5.46629 1.19874 8.36031 0 11.3779 0C14.3955 0 17.2896 1.19874 19.4233 3.33252C21.5571 5.46629 22.7558 8.36031 22.7558 11.3779Z" fill="#589D96"/></svg><svg width="21" height="21" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg" style="position:absolute;left:15.5px;top:15.5px"><g clip-path="url(#${cId})"><circle cx="5.33333" cy="5.33333" r="5.33333" fill="white"/><path fill-rule="evenodd" clip-rule="evenodd" d="M13.9302 10.736L13.5528 5.80216C12.2455 4.96176 11.1507 3.71891 9.57522 3.4855C7.62002 3.12343 5.94048 6.53345 3.44188 6.15217C1.97965 5.92903 0.454624 4.33819 -0.0025582 3.24707V10.736C4.64169 10.736 9.28593 10.736 13.9302 10.736Z" fill="white"/><path d="M-2.42211 4.30944L-2.79175 4.15103V10.7313H11.686V6.15356C10.7626 6.611 9.22455 4.66797 7.50528 4.04542C6.8527 3.80911 6.44918 3.67578 5.76271 3.67578C5.02343 3.67578 4.33696 3.93981 3.59769 4.25664C2.91122 4.57347 2.17195 4.99591 1.48548 5.15433C0.746206 5.31275 0.0597367 5.20713 -0.679537 4.99591C-1.36601 4.78469 -2.10528 4.46786 -2.42211 4.30944Z" fill="white"/><g filter="url(#${fId})"><mask id="${mId}" maskUnits="userSpaceOnUse" x="1.25562" y="2.49023" width="9" height="5" fill="black"><rect fill="white" x="1.25562" y="2.49023" width="9" height="5"/><path d="${p1}"/><path d="${p2}"/><path d="${p3}"/></mask><path d="${p1}" fill="#589D96"/><path d="${p2}" fill="#589D96"/><path d="${p3}" fill="#589D96"/><path d="${p1}" stroke="#589D96" stroke-width="0.113131" mask="url(#${mId})"/><path d="${p2}" stroke="#589D96" stroke-width="0.113131" mask="url(#${mId})"/><path d="${p3}" stroke="#589D96" stroke-width="0.113131" mask="url(#${mId})"/></g><circle cx="5.32799" cy="5.32799" r="5.24024" stroke="#FBFBFB" stroke-width="0.205369"/></g><defs><filter id="${fId}" x="1.97271" y="3.43359" width="7.64491" height="3.91932" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="0.226263"/><feGaussianBlur stdDeviation="0.113131"/><feComposite in2="hardAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape"/></filter><clipPath id="${cId}"><rect width="10.6667" height="10.6667" rx="5.33333" fill="white"/></clipPath></defs></svg></div>`,
    iconSize: [55, 64],
    iconAnchor: [26, 61],
    popupAnchor: [0, -61],
  });
}

export function SearchMap({ userCoords = null, pins }: SearchMapProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userLat = userCoords?.lat ?? null;
  const userLon = userCoords?.lon ?? null;

  // Init map + tile layer once the container is mounted — independent of pins
  useEffect(() => {
    if (!containerRef.current) return;

    const saved = sessionStorage.getItem('uflow_map_view');
    const parsed = saved ? (JSON.parse(saved) as { lat: number; lng: number; zoom: number }) : null;
    const initCenter: [number, number] = parsed ? [parsed.lat, parsed.lng] : DEFAULT_CENTER;
    const initZoom = parsed?.zoom ?? DEFAULT_ZOOM;

    const map = L.map(containerRef.current, { zoomControl: false });
    if (!map) {
      logApp('info', {
        event: 'searchmap_init_failed',
        reason: 'leaflet map returned null',
      });
      return;
    }

    map.setView(initCenter, initZoom);
    mapRef.current = map;

    map.on('moveend', () => {
      const c = map.getCenter();
      sessionStorage.setItem('uflow_map_view', JSON.stringify({ lat: c.lat, lng: c.lng, zoom: map.getZoom() }));
    });

    L.tileLayer('https://tile.openstreetmap.de/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);  

  // Near me viewport changes are controlled by parent-provided user coords.
  useEffect(() => {
    if (userLat === null || userLon === null) return;

    if (mapRef.current) {
      mapRef.current.setView([userLat, userLon], 14);
      logApp('info', {
        event: 'searchmap_setview_executed',
        lat: userLat,
        lon: userLon,
        zoom: 14,
      });
    } else {
      logApp('info', {
        event: 'searchmap_setview_skipped',
        lat: userLat,
        lon: userLon,
        zoom: 14,
        reason: 'mapRef null',
      });
    }
  }, [userLat, userLon]);

  // Add/refresh markers whenever pins change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || pins.length === 0) return;

    const markers: L.Marker[] = [];
    for (const pin of pins) {
      const marker = L.marker([pin.lat, pin.lng], { icon: createPinIcon() }).addTo(map);
      marker.bindPopup(pin.providerName);
      marker.on('click', () => {
        router.push(`/providers/${pin.providerId}`);
      });
      markers.push(marker);
    }

    return () => {
      markers.forEach((m) => m.remove());
    };
  }, [pins, router]);

  return (
    <div className="fixed inset-0 z-[20] overflow-hidden" style={{ isolation: 'isolate' }}>
      <style>{`.uflow-map-tiles .leaflet-tile-pane { filter: grayscale(1) brightness(1.08) contrast(0.88); }`}</style>
      <div ref={containerRef} className="uflow-map-tiles h-full w-full" />
      <div className="absolute left-3 z-[1000] hidden flex-col gap-1 sm:flex" style={{ bottom: 'calc(64px + 1rem + max(12px, env(safe-area-inset-bottom)))' }}>
        <button
          aria-label={t('map.zoomIn')}
          className="flex h-9 w-9 items-center justify-center rounded-sm bg-white text-content-heading shadow-sm hover:bg-neutral-50"
          type="button"
          onClick={() => mapRef.current?.zoomIn()}
        >
          <Icon icon="material-symbols:add-rounded" width={20} />
        </button>
        <button
          aria-label={t('map.zoomOut')}
          className="flex h-9 w-9 items-center justify-center rounded-sm bg-white text-content-heading shadow-sm hover:bg-neutral-50"
          type="button"
          onClick={() => mapRef.current?.zoomOut()}
        >
          <Icon icon="material-symbols:remove-rounded" width={20} />
        </button>
      </div>
    </div>
  );
}
