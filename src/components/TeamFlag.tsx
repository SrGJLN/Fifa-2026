/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

const TEAM_ISO_MAP: { [key: string]: string } = {
  MEX: 'mx', RSA: 'za', KOR: 'kr', CZE: 'cz',
  USA: 'us', MAR: 'ma', JPN: 'jp', SCO: 'gb-sct',
  CAN: 'ca', SWE: 'se', KSA: 'sa', CMR: 'cm',
  ARG: 'ar', ECU: 'ec', AUS: 'au', POL: 'pl',
  BRA: 'br', COL: 'co', IRN: 'ir', SUI: 'ch',
  FRA: 'fr', URU: 'uy', SEN: 'sn', AUT: 'at',
  ESP: 'es', CHI: 'cl', NGA: 'ng', UKR: 'ua',
  ENG: 'gb-eng', PER: 'pe', ALG: 'dz', SVN: 'si',
  POR: 'pt', PAR: 'py', EGY: 'eg', TUR: 'tr',
  GER: 'de', VEN: 've', GHA: 'gh', CRO: 'hr',
  ITA: 'it', CRC: 'cr', CIV: 'ci', SRB: 'rs',
  NED: 'nl', HON: 'hn', TUN: 'tn', DEN: 'dk',
  BIH: 'ba', QAT: 'qa', HAI: 'ht', CUW: 'cw',
  BEL: 'be', NZL: 'nz', CPV: 'cv', IRQ: 'iq',
  NOR: 'no', JOR: 'jo', COD: 'cd', UZB: 'uz',
  PAN: 'pa'
};

interface TeamFlagProps {
  teamId: string;
  className?: string;
  fallbackSize?: string;
}

export default function TeamFlag({ teamId, className = 'w-7.5 h-5', fallbackSize = 'text-xl' }: TeamFlagProps) {
  const code = TEAM_ISO_MAP[teamId?.toUpperCase() || ''];

  if (!code) {
    return <span className={`${fallbackSize} shrink-0`}>🌐</span>;
  }

  return (
    <span className="inline-flex items-center justify-center shrink-0">
      <img
        src={`https://flagcdn.com/w40/${code}.png`}
        srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
        alt={`Bandera de ${teamId}`}
        referrerPolicy="no-referrer"
        className={`${className} object-cover rounded shadow-[0_1px_2px_rgba(0,0,0,0.15)] border border-slate-200/60 shrink-0`}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
          if (fallback) fallback.classList.remove('hidden');
        }}
      />
      <span className="hidden shrink-0" style={{ fontSize: '1.25rem' }}>🌐</span>
    </span>
  );
}
