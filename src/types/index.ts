export interface SpaceWeatherEvent {
  cmeSpeed: number;        // Speed in km/s
  flareClass: string;      // e.g., "X1.2"
  kpIndex: number;         // 0 to 9 geomagnetic scale
  stormIntensity: number;  // 0.0 to 1.0 (for sonification)
  isBlackoutRisk: boolean; // Computed flag
  timestamp: string;
}
