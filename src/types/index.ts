export interface SpaceWeatherEvent {
  cmeSpeed: number;        // Speed in km/s
  flareClass: string;      // e.g., "X1.2"
  kpIndex: number;         // 0 to 9 geomagnetic scale
  stormIntensity: number;  // 0.0 to 1.0 (for sonification)
  isBlackoutRisk: boolean; // Computed flag
  timestamp: string;

  // Optional forecast data
  forecast?: SpaceWeatherForecast;

  // --- DONKI-derived fields (currently missing from fetchSpaceVitals) ---
  cmeHalfAngle?: number;         // CME angular width in degrees
  cmeDirection?: string;         // e.g. "Earth-directed"
  flarePeakTime?: string;        // ISO timestamp of flare peak
  activeRegion?: string;         // NOAA active region number, e.g. "12673"

  // --- Live NOAA data ---
  dst?: number;                  // Disturbance Storm Time index (nT), negative = storm
  protonFlux?: number;           // Proton flux (pfu), >10 MeV channel

  // Carried from fetchSpaceVitals when one or more live sources failed.
  // Lets the UI surface "live data unavailable" instead of a silent zeroed storm.
  _sourceErrors?: string[];

  // Historical event metadata (present on events imported from src/data/*.json)
  _meta?: {
    name?: string;
    confidence?: string; // "direct" | "partial" | "historical"
    date?: string;
    notes?: string;
    estimatedArrival?: string;
    [key: string]: unknown;
  };
}

export interface SpaceWeatherForecast {
  cmeForecasts: CMEForecast[];
  flareForecast: FlareForecast | null;
  geomagneticForecast: GeomagneticForecast;
  overallDisasterProbability: number;
  timestamp: string;
}

export interface CMEForecast {
  cme: RawCME;
  arrivalProbability: number;
  estimatedArrivalTime?: string;
  estimatedKpImpact: number;
  confidence: 'high' | 'medium' | 'low';
  model: 'WSA-ENLIL' | 'CORHEL' | 'ensemble';
}

export interface FlareForecast {
  flare: RawFlare | null;
  probabilityMClass: number;
  probabilityXClass: number;
  probabilityProtonEvent: number;
  next24hProbability: number;
  activeRegion: string;
  magneticComplexity: 'beta' | 'beta-gamma' | 'beta-gamma-delta' | 'unknown';
}

export interface GeomagneticForecast {
  day1: { kp: number; probability: number };
  day2: { kp: number; probability: number };
  day3: { kp: number; probability: number };
}

export interface RawCME {
  activityID: string;
  startTime: string;
  speed: number;
  halfAngle: number;
  sourceLocation: string;
  isEarthDirected: boolean;
  link: string;
}

export interface RawFlare {
  flrID: string;
  beginTime: string;
  peakTime: string;
  endTime: string;
  classType: string;
  sourceLocation: string;
  activeRegionNum: number;
  link: string;
}
