/* === COHERENCY — Park Weather Explorer ===
   Client-side MLB park weather physics engine
   Vanilla JS, no external libraries
   ========================================== */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// PARK DATA — All 30 MLB parks
// dims: { lf, lcf, cf, rcf, rf } in feet
// walls: { lf, lcf, cf, rcf, rf } in feet
// alt: altitude in feet, roof: 'open'|'retractable'|'dome'
// orientation: home plate facing direction in degrees (meteorological)
// sens: weather sensitivity coefficient (1.0 = league average)
// lat/lon: park coordinates for live weather
// ─────────────────────────────────────────────────────────────────────────────
const PARKS = [
  {
    id: 'oriole_park',
    team: 'Baltimore Orioles', abbr: 'BAL', color: '#DF4601',
    city: 'Baltimore', name: 'Oriole Park at Camden Yards',
    dims: { lf: 333, lcf: 364, cf: 400, rcf: 373, rf: 318 },
    walls: { lf: 7, lcf: 7, cf: 7, rcf: 21, rf: 25 },
    alt: 30, roof: 'open', orientation: 207, sens: 1.05,
    lat: 39.2838, lon: -76.6216,
    note: 'Eutaw Street power alley (RF) benefits from Baltimore summers.'
  },
  {
    id: 'fenway_park',
    team: 'Boston Red Sox', abbr: 'BOS', color: '#BD3039',
    city: 'Boston', name: 'Fenway Park',
    dims: { lf: 310, lcf: 379, cf: 390, rcf: 380, rf: 302 },
    walls: { lf: 37, lcf: 5, cf: 5, rcf: 5, rf: 3 },
    alt: 20, roof: 'open', orientation: 202, sens: 1.93,
    lat: 42.3467, lon: -71.0972,
    note: 'The Green Monster suppresses LF home runs but creates doubles. Wind from Kenmore is crucial.'
  },
  {
    id: 'yankee_stadium',
    team: 'New York Yankees', abbr: 'NYY', color: '#003087',
    city: 'New York', name: 'Yankee Stadium',
    dims: { lf: 318, lcf: 399, cf: 408, rcf: 385, rf: 314 },
    walls: { lf: 8, lcf: 8, cf: 8, rcf: 8, rf: 8 },
    alt: 25, roof: 'open', orientation: 209, sens: 1.81,
    lat: 40.8296, lon: -73.9262,
    note: 'Short RF porch (314 ft) is highly wind-susceptible. Jet stream winds from W-NW help pull balls out.'
  },
  {
    id: 'rogers_centre',
    team: 'Toronto Blue Jays', abbr: 'TOR', color: '#134A8E',
    city: 'Toronto', name: 'Rogers Centre',
    dims: { lf: 328, lcf: 375, cf: 400, rcf: 375, rf: 328 },
    walls: { lf: 10, lcf: 10, cf: 10, rcf: 10, rf: 10 },
    alt: 260, roof: 'retractable', orientation: 210, sens: 0.20,
    lat: 43.6414, lon: -79.3894,
    note: 'Retractable roof means near-zero weather impact most games. Turf field slightly increases ball speed.'
  },
  {
    id: 'tropicana_field',
    team: 'Tampa Bay Rays', abbr: 'TB', color: '#092C5C',
    city: 'St. Petersburg', name: 'Tropicana Field',
    dims: { lf: 315, lcf: 370, cf: 404, rcf: 370, rf: 322 },
    walls: { lf: 9, lcf: 9, cf: 9, rcf: 9, rf: 9 },
    alt: 45, roof: 'dome', orientation: 210, sens: 0.10,
    lat: 27.7682, lon: -82.6534,
    note: 'Fully enclosed dome. Weather has essentially no impact on play.'
  },
  {
    id: 'guaranteed_rate',
    team: 'Chicago White Sox', abbr: 'CWS', color: '#27251F',
    city: 'Chicago', name: 'Guaranteed Rate Field',
    dims: { lf: 330, lcf: 375, cf: 400, rcf: 375, rf: 335 },
    walls: { lf: 8, lcf: 8, cf: 8, rcf: 8, rf: 8 },
    alt: 595, roof: 'open', orientation: 200, sens: 1.10,
    lat: 41.8299, lon: -87.6338,
    note: 'South Side lake winds unpredictable. Elevation at 595 ft adds modest carry.'
  },
  {
    id: 'progressive_field',
    team: 'Cleveland Guardians', abbr: 'CLE', color: '#00385D',
    city: 'Cleveland', name: 'Progressive Field',
    dims: { lf: 325, lcf: 370, cf: 405, rcf: 375, rf: 325 },
    walls: { lf: 9, lcf: 9, cf: 9, rcf: 9, rf: 9 },
    alt: 660, roof: 'open', orientation: 194, sens: 0.90,
    lat: 41.4962, lon: -81.6852,
    note: 'Lake Erie creates consistent carry from SW winds in summer.'
  },
  {
    id: 'comerica_park',
    team: 'Detroit Tigers', abbr: 'DET', color: '#0C2340',
    city: 'Detroit', name: 'Comerica Park',
    dims: { lf: 345, lcf: 370, cf: 420, rcf: 365, rf: 330 },
    walls: { lf: 8, lcf: 8, cf: 8, rcf: 8, rf: 8 },
    alt: 600, roof: 'open', orientation: 210, sens: 0.75,
    lat: 42.3390, lon: -83.0485,
    note: 'Deep CF (420 ft) makes it pitcher-friendly regardless of conditions. LCF and RCF are also deep.'
  },
  {
    id: 'kauffman_stadium',
    team: 'Kansas City Royals', abbr: 'KC', color: '#174885',
    city: 'Kansas City', name: 'Kauffman Stadium',
    dims: { lf: 330, lcf: 387, cf: 410, rcf: 387, rf: 330 },
    walls: { lf: 9, lcf: 9, cf: 9, rcf: 9, rf: 9 },
    alt: 750, roof: 'open', orientation: 196, sens: 0.80,
    lat: 39.0517, lon: -94.4803,
    note: 'Symmetrical park. Elevation 750 ft adds some carry. Spring crosswinds significant.'
  },
  {
    id: 'target_field',
    team: 'Minnesota Twins', abbr: 'MIN', color: '#002B5C',
    city: 'Minneapolis', name: 'Target Field',
    dims: { lf: 339, lcf: 377, cf: 404, rcf: 367, rf: 328 },
    walls: { lf: 8, lcf: 8, cf: 8, rcf: 8, rf: 8 },
    alt: 815, roof: 'open', orientation: 209, sens: 0.95,
    lat: 44.9818, lon: -93.2775,
    note: 'Open-air in Minnesota. Cold snaps in April/May and hot humid July+August both influence carry.'
  },
  {
    id: 'sutter_health_park',
    team: 'Oakland Athletics', abbr: 'OAK', color: '#003831',
    city: 'Sacramento', name: 'Sutter Health Park',
    dims: { lf: 330, lcf: 375, cf: 403, rcf: 375, rf: 330 },
    walls: { lf: 8, lcf: 8, cf: 8, rcf: 8, rf: 8 },
    alt: 30, roof: 'open', orientation: 200, sens: 0.85,
    lat: 38.5802, lon: -121.5067,
    note: 'Sacramento\'s summer heat (100°F+) provides some of the best carry conditions in MLB.'
  },
  {
    id: 't_mobile_park',
    team: 'Seattle Mariners', abbr: 'SEA', color: '#0C2C56',
    city: 'Seattle', name: 'T-Mobile Park',
    dims: { lf: 331, lcf: 378, cf: 401, rcf: 381, rf: 326 },
    walls: { lf: 8, lcf: 8, cf: 8, rcf: 8, rf: 8 },
    alt: 20, roof: 'retractable', orientation: 198, sens: 0.45,
    lat: 47.5914, lon: -122.3325,
    note: 'Retractable roof used in wet Seattle weather. When open, Puget Sound winds from W/NW.'
  },
  {
    id: 'globe_life_field',
    team: 'Texas Rangers', abbr: 'TEX', color: '#003278',
    city: 'Arlington', name: 'Globe Life Field',
    dims: { lf: 329, lcf: 372, cf: 407, rcf: 374, rf: 326 },
    walls: { lf: 8, lcf: 8, cf: 8, rcf: 8, rf: 8 },
    alt: 551, roof: 'retractable', orientation: 198, sens: 0.10,
    lat: 32.7473, lon: -97.0845,
    note: 'Kept closed for Texas summer heat. Near-zero weather impact in practice.'
  },
  {
    id: 'angel_stadium',
    team: 'Los Angeles Angels', abbr: 'LAA', color: '#BA0021',
    city: 'Anaheim', name: 'Angel Stadium',
    dims: { lf: 330, lcf: 370, cf: 396, rcf: 370, rf: 330 },
    walls: { lf: 8, lcf: 8, cf: 8, rcf: 8, rf: 8 },
    alt: 160, roof: 'open', orientation: 204, sens: 0.72,
    lat: 33.8003, lon: -117.8827,
    note: 'Inland Anaheim heat increases carry on summer days. Santa Ana winds in fall create crosswinds.'
  },
  {
    id: 'minute_maid_park',
    team: 'Houston Astros', abbr: 'HOU', color: '#002D62',
    city: 'Houston', name: 'Minute Maid Park',
    dims: { lf: 315, lcf: 362, cf: 409, rcf: 373, rf: 326 },
    walls: { lf: 9, lcf: 9, cf: 14, rcf: 10, rf: 6 },
    alt: 40, roof: 'retractable', orientation: 198, sens: 0.25,
    lat: 29.7573, lon: -95.3555,
    note: 'Houston humidity and heat mean roof stays closed frequently. RF Crawford Boxes at 326 ft are very short.'
  },
  {
    id: 'truist_park',
    team: 'Atlanta Braves', abbr: 'ATL', color: '#CE1141',
    city: 'Cumberland', name: 'Truist Park',
    dims: { lf: 335, lcf: 380, cf: 400, rcf: 375, rf: 325 },
    walls: { lf: 6, lcf: 6, cf: 8, rcf: 6, rf: 6 },
    alt: 1050, roof: 'open', orientation: 200, sens: 0.85,
    lat: 33.8908, lon: -84.4678,
    note: 'Elevated suburban Atlanta park. Thin air at 1050 ft adds about 2 ft carry vs sea level.'
  },
  {
    id: 'marlins_park',
    team: 'Miami Marlins', abbr: 'MIA', color: '#00A3E0',
    city: 'Miami', name: 'LoanDepot Park',
    dims: { lf: 344, lcf: 386, cf: 400, rcf: 387, rf: 335 },
    walls: { lf: 7, lcf: 7, cf: 7, rcf: 7, rf: 7 },
    alt: 8, roof: 'retractable', orientation: 190, sens: 0.15,
    lat: 25.7781, lon: -80.2196,
    note: 'Kept closed most of the season due to Miami heat and rain. Weather impact near zero.'
  },
  {
    id: 'citi_field',
    team: 'New York Mets', abbr: 'NYM', color: '#002D72',
    city: 'New York', name: 'Citi Field',
    dims: { lf: 335, lcf: 379, cf: 408, rcf: 383, rf: 330 },
    walls: { lf: 8, lcf: 8, cf: 8, rcf: 8, rf: 8 },
    alt: 15, roof: 'open', orientation: 212, sens: 1.05,
    lat: 40.7571, lon: -73.8458,
    note: 'Flushing Meadows sea-level park. Flushing Bay winds from ESE create natural In-LF crosswinds.'
  },
  {
    id: 'citizens_bank_park',
    team: 'Philadelphia Phillies', abbr: 'PHI', color: '#E81828',
    city: 'Philadelphia', name: 'Citizens Bank Park',
    dims: { lf: 329, lcf: 374, cf: 401, rcf: 369, rf: 330 },
    walls: { lf: 6, lcf: 6, cf: 6, rcf: 6, rf: 8 },
    alt: 20, roof: 'open', orientation: 197, sens: 1.10,
    lat: 39.9061, lon: -75.1665,
    note: 'Philadelphia summer heat and humidity boost carry. Known as a hitter\'s park in warm months.'
  },
  {
    id: 'nationals_park',
    team: 'Washington Nationals', abbr: 'WSH', color: '#AB0003',
    city: 'Washington', name: 'Nationals Park',
    dims: { lf: 336, lcf: 377, cf: 402, rcf: 370, rf: 335 },
    walls: { lf: 8, lcf: 8, cf: 8, rcf: 8, rf: 8 },
    alt: 25, roof: 'open', orientation: 200, sens: 0.95,
    lat: 38.8730, lon: -77.0074,
    note: 'Near the Anacostia River. DC humidity in summer significant. SW winds common.'
  },
  {
    id: 'wrigley_field',
    team: 'Chicago Cubs', abbr: 'CHC', color: '#0E3386',
    city: 'Chicago', name: 'Wrigley Field',
    dims: { lf: 355, lcf: 368, cf: 400, rcf: 368, rf: 353 },
    walls: { lf: 11.5, lcf: 11.5, cf: 11.5, rcf: 11.5, rf: 11.5 },
    alt: 600, roof: 'open', orientation: 216, sens: 3.05,
    lat: 41.9484, lon: -87.6553,
    note: 'Highest wind sensitivity in MLB. Wrigley is completely exposed to Lake Michigan winds. Out-blowing = HR parade, In = pitcher\'s heaven.'
  },
  {
    id: 'great_american',
    team: 'Cincinnati Reds', abbr: 'CIN', color: '#C6011F',
    city: 'Cincinnati', name: 'Great American Ball Park',
    dims: { lf: 328, lcf: 379, cf: 404, rcf: 370, rf: 325 },
    walls: { lf: 8, lcf: 8, cf: 12, rcf: 8, rf: 8 },
    alt: 490, roof: 'open', orientation: 197, sens: 1.25,
    lat: 39.0974, lon: -84.5065,
    note: 'Ohio River bank creates unique thermal currents. Known hitter-friendly park in warm weather.'
  },
  {
    id: 'coors_field',
    team: 'Colorado Rockies', abbr: 'COL', color: '#33006F',
    city: 'Denver', name: 'Coors Field',
    dims: { lf: 347, lcf: 390, cf: 415, rcf: 375, rf: 350 },
    walls: { lf: 8, lcf: 8, cf: 8, rcf: 8, rf: 8 },
    alt: 5280, roof: 'open', orientation: 200, sens: 0.88,
    lat: 39.7561, lon: -104.9942,
    note: 'Mile High altitude is the dominant factor — air density is ~80% of sea level. Ball travels ~10% farther.'
  },
  {
    id: 'american_family_field',
    team: 'Milwaukee Brewers', abbr: 'MIL', color: '#12284B',
    city: 'Milwaukee', name: 'American Family Field',
    dims: { lf: 344, lcf: 371, cf: 400, rcf: 374, rf: 345 },
    walls: { lf: 8, lcf: 8, cf: 8, rcf: 8, rf: 8 },
    alt: 600, roof: 'retractable', orientation: 205, sens: 0.35,
    lat: 43.0280, lon: -87.9712,
    note: 'Retractable roof means frequently closed in Milwaukee spring/fall cold. Low weather impact.'
  },
  {
    id: 'pnc_park',
    team: 'Pittsburgh Pirates', abbr: 'PIT', color: '#FDB827',
    city: 'Pittsburgh', name: 'PNC Park',
    dims: { lf: 325, lcf: 383, cf: 399, rcf: 375, rf: 320 },
    walls: { lf: 6, lcf: 6, cf: 6, rcf: 6, rf: 6 },
    alt: 730, roof: 'open', orientation: 197, sens: 0.85,
    lat: 40.4469, lon: -80.0058,
    note: 'Allegheny River location. Deep corners mask hitter-friendly air at 730 ft.'
  },
  {
    id: 'busch_stadium',
    team: 'St. Louis Cardinals', abbr: 'STL', color: '#C41E3A',
    city: 'St. Louis', name: 'Busch Stadium',
    dims: { lf: 336, lcf: 375, cf: 400, rcf: 375, rf: 335 },
    walls: { lf: 8, lcf: 8, cf: 8, rcf: 8, rf: 8 },
    alt: 465, roof: 'open', orientation: 196, sens: 0.80,
    lat: 38.6226, lon: -90.1928,
    note: 'Gateway City humidity and heat in summer boost offense. NW winds common off the Arch.'
  },
  {
    id: 'chase_field',
    team: 'Arizona Diamondbacks', abbr: 'ARI', color: '#A71930',
    city: 'Phoenix', name: 'Chase Field',
    dims: { lf: 330, lcf: 374, cf: 407, rcf: 374, rf: 334 },
    walls: { lf: 7.5, lcf: 7.5, cf: 25, rcf: 7.5, rf: 7.5 },
    alt: 1059, roof: 'retractable', orientation: 178, sens: 0.30,
    lat: 33.4455, lon: -112.0667,
    note: 'Phoenix extreme heat (115°F+ in summer) means roof is closed for air conditioning. Alt 1059 ft matters when open.'
  },
  {
    id: 'dodger_stadium',
    team: 'Los Angeles Dodgers', abbr: 'LAD', color: '#005A9C',
    city: 'Los Angeles', name: 'Dodger Stadium',
    dims: { lf: 330, lcf: 375, cf: 395, rcf: 375, rf: 330 },
    walls: { lf: 4, lcf: 4, cf: 4, rcf: 4, rf: 4 },
    alt: 515, roof: 'open', orientation: 247, sens: 0.82,
    lat: 34.0739, lon: -118.2400,
    note: 'Marine layer and evening fog suppress carry in night games. Low walls favor outfield play.'
  },
  {
    id: 'petco_park',
    team: 'San Diego Padres', abbr: 'SD', color: '#2F241D',
    city: 'San Diego', name: 'Petco Park',
    dims: { lf: 334, lcf: 382, cf: 396, rcf: 382, rf: 322 },
    walls: { lf: 8, lcf: 8, cf: 8, rcf: 8, rf: 8 },
    alt: 14, roof: 'open', orientation: 195, sens: 0.40,
    lat: 32.7076, lon: -117.1570,
    note: 'San Diego marine layer is the most reliable in MLB — nearly every night game sees carry suppression.'
  },
  {
    id: 'oracle_park',
    team: 'San Francisco Giants', abbr: 'SF', color: '#FD5A1E',
    city: 'San Francisco', name: 'Oracle Park',
    dims: { lf: 339, lcf: 364, cf: 399, rcf: 365, rf: 309 },
    walls: { lf: 8, lcf: 8, cf: 8, rcf: 8, rf: 24 },
    alt: 10, roof: 'open', orientation: 234, sens: 0.50,
    lat: 37.7786, lon: -122.3893,
    note: 'McCovey Cove RF wall (24 ft) and SF Bay winds dramatically affect play. Prevailing winds from W/NW in afternoon.'
  }
];

// Map park id to park object for O(1) lookup
const PARK_BY_ID = {};
PARKS.forEach(p => { PARK_BY_ID[p.id] = p; });

// ─────────────────────────────────────────────────────────────────────────────
// PHYSICS ENGINE
// ─────────────────────────────────────────────────────────────────────────────

const PHYSICS = {
  // Gas constant J/(mol·K)
  R_GAS: 8.314,
  // Molar mass of dry air kg/mol
  M_AIR: 0.02896,
  // Baseline conditions
  BASELINE_TEMP_F: 72,
  BASELINE_PRESSURE_HPA: 1013,
  BASELINE_ALT_FT: 0,
  BASELINE_CARRY: 400,

  fToK(fahrenheit) {
    return (fahrenheit - 32) * 5 / 9 + 273.15;
  },

  // Air density kg/m³ given temp(F), pressure(hPa), altitude(ft)
  airDensity(tempF, pressureHpa, altitudeFt) {
    const T = this.fToK(tempF);
    const P = pressureHpa * 100; // Pa
    const altFactor = Math.exp(-altitudeFt * 0.0000366);
    return (P * this.M_AIR) / (this.R_GAS * T) * altFactor;
  },

  // Baseline density at standard conditions
  baselineDensity() {
    return this.airDensity(this.BASELINE_TEMP_F, this.BASELINE_PRESSURE_HPA, this.BASELINE_ALT_FT);
  },

  // Direction factor: how much this wind angle aids carry toward outfield
  // 0° = blowing out toward CF (helps)
  // 180° = blowing in from CF (hurts)
  windDirectionFactor(angleDeg) {
    // Breakpoints at 45° intervals
    const knots = [
      { a: 0,   f: 1.2  }, // Out CF
      { a: 45,  f: 0.9  }, // Out RF
      { a: 90,  f: 0.3  }, // Cross Right
      { a: 135, f: -0.7 }, // In RF
      { a: 180, f: -1.2 }, // In CF
      { a: 225, f: -0.7 }, // In LF
      { a: 270, f: 0.3  }, // Cross Left
      { a: 315, f: 0.9  }, // Out LF
      { a: 360, f: 1.2  }, // wrap back to Out CF
    ];

    const a = ((angleDeg % 360) + 360) % 360;

    for (let i = 0; i < knots.length - 1; i++) {
      if (a >= knots[i].a && a < knots[i + 1].a) {
        const t = (a - knots[i].a) / (knots[i + 1].a - knots[i].a);
        return knots[i].f + t * (knots[i + 1].f - knots[i].f);
      }
    }
    return knots[0].f;
  },

  // Wind soft-cap at 20 mph
  effectiveWindSpeed(speed) {
    if (speed <= 20) return speed;
    return 20 + (speed - 20) * 0.3;
  },

  // Compress sensitivity for very wind-sensitive parks
  compressSens(rawSens) {
    if (rawSens <= 1.0) return rawSens;
    return 1.0 + (rawSens - 1.0) * 0.5;
  },

  // Wind coefficient
  WIND_COEF: 2.8,

  // Full carry calculation
  carry(tempF, windSpeedMph, windDirDeg, pressureHpa, park) {
    const rho = this.airDensity(tempF, pressureHpa, park.alt);
    const rhoStd = this.baselineDensity();
    const densityRatio = rho / rhoStd;
    const carryDeltaDensity = (1 - densityRatio) * 20;

    const effSpeed = this.effectiveWindSpeed(windSpeedMph);
    const dirFactor = this.windDirectionFactor(windDirDeg);
    const sens = this.compressSens(park.sens);
    const windEffect = this.WIND_COEF * (effSpeed / 5) * dirFactor * sens;

    return this.BASELINE_CARRY + carryDeltaDensity + windEffect;
  },

  // Delta percentages for HR, Runs, XBH
  deltas(tempF, windSpeedMph, windDirDeg, pressureHpa, park) {
    const rho = this.airDensity(tempF, pressureHpa, park.alt);
    const rhoStd = this.baselineDensity();
    const densityRatio = rho / rhoStd;
    const densityFactor = (1 - densityRatio) * 15; // % contribution

    const effSpeed = this.effectiveWindSpeed(windSpeedMph);
    const dirFactor = this.windDirectionFactor(windDirDeg);
    const sens = this.compressSens(park.sens);
    const windFactor = (effSpeed / 5) * dirFactor * sens * 1.2;

    // Altitude bonus for high-altitude parks (Coors effect)
    let altBonus_hr = 0, altBonus_runs = 0, altBonus_xbh = 0;
    if (park.alt > 3000) {
      altBonus_hr = 8;
      altBonus_runs = 4;
      altBonus_xbh = 6;
    } else if (park.alt > 1000) {
      const scale = (park.alt - 1000) / 2000;
      altBonus_hr = scale * 4;
      altBonus_runs = scale * 2;
      altBonus_xbh = scale * 3;
    }

    const totalFactor = densityFactor + windFactor;

    return {
      hr:   totalFactor * 3.2 + altBonus_hr,
      runs: totalFactor * 1.8 + altBonus_runs,
      xbh:  totalFactor * 2.4 + altBonus_xbh,
      densityFactor,
      windFactor,
      altBonus_hr,
      densityRatio,
      rho,
    };
  },

  // EV required to clear CF wall given current carry
  evRequired(carryFt) {
    const base_elo = 95;
    const elo_adj = (carryFt - 400) / 400 * -8;
    return base_elo - elo_adj;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// OPEN-METEO WEATHER API
// ─────────────────────────────────────────────────────────────────────────────
async function fetchLiveWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,wind_direction_10m,pressure_msl&temperature_unit=fahrenheit&wind_speed_unit=mph`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const c = data.current;
  return {
    temp: Math.round(c.temperature_2m),
    windSpeed: Math.round(c.wind_speed_10m),
    windDir: Math.round(c.wind_direction_10m),
    pressure: Math.round(c.pressure_msl),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PRESET SCENARIOS
// ─────────────────────────────────────────────────────────────────────────────
const PRESETS = {
  hot_out:     { temp: 95, windSpeed: 15, windDir: 0,   pressure: 1010 },
  cold_in:     { temp: 45, windSpeed: 12, windDir: 180, pressure: 1020 },
  storm:       { temp: 62, windSpeed: 25, windDir: 90,  pressure: 998  },
  coors_day:   { temp: 85, windSpeed: 8,  windDir: 0,   pressure: 1013 },
  marine_layer:{ temp: 64, windSpeed: 5,  windDir: 180, pressure: 1025 },
  baseline:    { temp: 72, windSpeed: 0,  windDir: 0,   pressure: 1013 },
};

// ─────────────────────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────────────────────
const state = {
  parkId: 'dodger_stadium',
  temp: 72,
  windSpeed: 0,
  windDir: 0,
  pressure: 1013,
};

// ─────────────────────────────────────────────────────────────────────────────
// DOM REFS
// ─────────────────────────────────────────────────────────────────────────────
const dom = {};

function cacheDom() {
  [
    'parkSelect', 'tempSlider', 'windSpeedSlider', 'pressureSlider',
    'tempVal', 'windSpeedVal', 'pressureVal', 'windDirVal',
    'liveWeatherBtn', 'liveWeatherStatus',
    'windDial',
    'parkName', 'parkTeam', 'parkTeamColor', 'parkAlt', 'parkRoof', 'parkSens',
    'domeNotice', 'domeRoofType',
    'hrDelta', 'runsDelta', 'xbhDelta', 'hrBar', 'runsBar', 'xbhBar',
    'carryFt', 'carryDelta', 'evNeeded', 'airDensity', 'densityMarker',
    'trajectorySvg', 'fieldDiagram',
    'verdictPill', 'verdictDesc',
    'coeffGrid',
  ].forEach(id => { dom[id] = document.getElementById(id); });
}

// ─────────────────────────────────────────────────────────────────────────────
// WIND DIAL (SVG draggable)
// ─────────────────────────────────────────────────────────────────────────────
function buildWindDial() {
  const svg = dom.windDial;
  const cx = 100, cy = 100, R = 88, innerR = 60;

  svg.innerHTML = '';

  // Outer ring
  const outerCircle = svgEl('circle', { cx, cy, r: R, fill: '#0e1d3d', stroke: '#1a3562', 'stroke-width': '1.5' });
  svg.appendChild(outerCircle);

  // Inner ring fill
  const innerCircle = svgEl('circle', { cx, cy, r: innerR, fill: '#060e1e', stroke: '#1a3562', 'stroke-width': '1' });
  svg.appendChild(innerCircle);

  // Tick marks at each 45°
  for (let i = 0; i < 8; i++) {
    const angle = (i * 45 - 90) * Math.PI / 180;
    const x1 = cx + (R - 14) * Math.cos(angle);
    const y1 = cy + (R - 14) * Math.sin(angle);
    const x2 = cx + (R - 6) * Math.cos(angle);
    const y2 = cy + (R - 6) * Math.sin(angle);
    const tick = svgEl('line', { x1, y1, x2, y2, stroke: i % 2 === 0 ? '#7a96b8' : '#3d5a7a', 'stroke-width': i % 2 === 0 ? '2' : '1' });
    svg.appendChild(tick);
  }

  // Cardinal labels: CF=top, RF=right, HOME=bottom, LF=left
  const labels = [
    { text: 'CF',   angle: -90 },
    { text: 'RF',   angle: 0   },
    { text: 'HOME', angle: 90  },
    { text: 'LF',   angle: 180 },
  ];
  labels.forEach(({ text, angle }) => {
    const rad = angle * Math.PI / 180;
    const lx = cx + (R - 26) * Math.cos(rad);
    const ly = cy + (R - 26) * Math.sin(rad);
    const t = svgEl('text', {
      x: lx, y: ly,
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
      fill: '#7a96b8',
      'font-size': '9',
      'font-family': 'DM Sans, system-ui, sans-serif',
      'font-weight': '600',
      'letter-spacing': '0.05em',
    });
    t.textContent = text;
    svg.appendChild(t);
  });

  // Pointer (amber arrow) — will be updated on each render
  const pointer = svgEl('g', { id: 'dialPointer' });
  const pointerLine = svgEl('line', {
    id: 'dialPointerLine',
    x1: cx, y1: cy,
    x2: cx, y2: cy - 52,
    stroke: '#e8a832',
    'stroke-width': '3',
    'stroke-linecap': 'round',
  });
  const pointerHead = svgEl('polygon', {
    id: 'dialPointerHead',
    points: `${cx},${cy - 58} ${cx - 5},${cy - 44} ${cx + 5},${cy - 44}`,
    fill: '#e8a832',
  });
  const pointerBase = svgEl('circle', { cx, cy, r: 5, fill: '#e8a832' });
  pointer.appendChild(pointerLine);
  pointer.appendChild(pointerHead);
  pointer.appendChild(pointerBase);
  svg.appendChild(pointer);

  // Center angle text
  const centerText = svgEl('text', {
    id: 'dialCenterText',
    x: cx, y: cy + 2,
    'text-anchor': 'middle',
    'dominant-baseline': 'middle',
    fill: '#e8a832',
    'font-size': '11',
    'font-family': 'DM Mono, monospace',
    'font-weight': '500',
  });
  centerText.textContent = '0°';
  svg.appendChild(centerText);

  updateDialPointer(state.windDir);
  setupDialDrag(svg);
}

function updateDialPointer(angleDeg) {
  const svg = dom.windDial;
  const cx = 100, cy = 100;
  const rad = (angleDeg - 90) * Math.PI / 180;

  const x2 = cx + 52 * Math.cos(rad);
  const y2 = cy + 52 * Math.sin(rad);
  const hx = cx + 58 * Math.cos(rad);
  const hy = cy + 58 * Math.sin(rad);

  // Head polygon offset perpendicular
  const perpRad = rad + Math.PI / 2;
  const p1x = hx + 5 * Math.cos(perpRad);
  const p1y = hy + 5 * Math.sin(perpRad);
  const p2x = hx - 5 * Math.cos(perpRad);
  const p2y = hy - 5 * Math.sin(perpRad);
  const basex = cx + 44 * Math.cos(rad);
  const basey = cy + 44 * Math.sin(rad);

  const line = svg.querySelector('#dialPointerLine');
  const head = svg.querySelector('#dialPointerHead');
  const txt = svg.querySelector('#dialCenterText');

  if (line) {
    line.setAttribute('x1', cx);
    line.setAttribute('y1', cy);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
  }
  if (head) {
    head.setAttribute('points', `${hx},${hy} ${p1x},${p1y} ${p2x},${p2y}`);
  }
  if (txt) {
    txt.textContent = `${Math.round(angleDeg)}°`;
  }
}

function setupDialDrag(svg) {
  let dragging = false;

  function angleFromEvent(e) {
    const rect = svg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const dx = clientX - cx;
    const dy = clientY - cy;
    let angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
    return ((angle % 360) + 360) % 360;
  }

  function handleDrag(e) {
    if (!dragging) return;
    e.preventDefault();
    const angle = angleFromEvent(e);
    setWindDir(Math.round(angle));
  }

  svg.addEventListener('mousedown', e => {
    dragging = true;
    const angle = angleFromEvent(e);
    setWindDir(Math.round(angle));
  });
  window.addEventListener('mouseup', () => { dragging = false; });
  window.addEventListener('mousemove', handleDrag);

  svg.addEventListener('touchstart', e => {
    dragging = true;
    const angle = angleFromEvent(e);
    setWindDir(Math.round(angle));
  }, { passive: false });
  window.addEventListener('touchend', () => { dragging = false; });
  window.addEventListener('touchmove', handleDrag, { passive: false });
}

// ─────────────────────────────────────────────────────────────────────────────
// STATE SETTERS — each triggers recalculate
// ─────────────────────────────────────────────────────────────────────────────
function setWindDir(deg) {
  const normalized = ((deg % 360) + 360) % 360;
  state.windDir = normalized;
  dom.windDirVal.textContent = `${Math.round(normalized)}° (${dirLabel(normalized)})`;
  updateDialPointer(normalized);
  updateDirPresetHighlight(normalized);
  recalculate();
}

function dirLabel(deg) {
  const d = ((deg % 360) + 360) % 360;
  if (d <= 22 || d > 337)  return 'Out CF';
  if (d <= 67)             return 'Out RF';
  if (d <= 112)            return 'Cross R';
  if (d <= 157)            return 'In RF';
  if (d <= 202)            return 'In CF';
  if (d <= 247)            return 'In LF';
  if (d <= 292)            return 'Cross L';
  if (d <= 337)            return 'Out LF';
  return 'Out CF';
}

function updateDirPresetHighlight(deg) {
  document.querySelectorAll('.dir-btn').forEach(btn => {
    const targetDeg = parseInt(btn.dataset.deg, 10);
    const diff = Math.abs(((deg - targetDeg + 180 + 360) % 360) - 180);
    btn.classList.toggle('active', diff < 15);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG FIELD DIAGRAM
// ─────────────────────────────────────────────────────────────────────────────
function svgEl(tag, attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  if (attrs) Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

function buildFieldDiagram(park) {
  const svg = dom.fieldDiagram;
  svg.innerHTML = '';

  const W = 400, H = 320;
  const homeX = W / 2, homeY = H - 30;

  // Scale: CF distance maps to ~H*0.72 pixels up
  const scale = (H * 0.72) / park.dims.cf;

  function dimToXY(distance, angleDeg) {
    const rad = (angleDeg - 90) * Math.PI / 180;
    const px = homeX + distance * scale * Math.cos(rad);
    const py = homeY + distance * scale * Math.sin(rad);
    return [px, py];
  }

  // Field angles: LF=225°, LCF=247.5°, CF=270° (top), RCF=292.5°, RF=315°
  // But we draw relative to home plate at bottom, outfield at top
  // LF is to left (270° true), RF to right (90° true), CF straight up (0°)
  // We use visual angles: CF=270°(up), LF=180°+45°=225°, RF=315°
  const fieldAngles = {
    lf: 225, lcf: 247.5, cf: 270, rcf: 292.5, rf: 315
  };

  // Background
  const bg = svgEl('rect', { x: 0, y: 0, width: W, height: H, fill: '#060e1e' });
  svg.appendChild(bg);

  // Grass base (full outfield area)
  const grassPath = `M ${homeX} ${homeY} L ${dimToXY(park.dims.lf, fieldAngles.lf).join(',')} L ${dimToXY(park.dims.lcf, fieldAngles.lcf).join(',')} L ${dimToXY(park.dims.cf, fieldAngles.cf).join(',')} L ${dimToXY(park.dims.rcf, fieldAngles.rcf).join(',')} L ${dimToXY(park.dims.rf, fieldAngles.rf).join(',')} Z`;
  const grass = svgEl('path', { d: grassPath, fill: '#0a1e0e', stroke: 'none' });
  svg.appendChild(grass);

  // Infield dirt circle
  const infieldR = 95 * scale;
  const dirtCircle = svgEl('circle', { cx: homeX, cy: homeY, r: infieldR, fill: '#1a1208', stroke: 'none' });
  svg.appendChild(dirtCircle);

  // Inner grass diamond-ish
  const innerGrass = svgEl('circle', { cx: homeX, cy: homeY, r: infieldR * 0.75, fill: '#0d2010', stroke: 'none' });
  svg.appendChild(innerGrass);

  // Foul lines
  const lfLine = svgEl('line', {
    x1: homeX, y1: homeY,
    x2: dimToXY(park.dims.lf * 1.1, fieldAngles.lf)[0],
    y2: dimToXY(park.dims.lf * 1.1, fieldAngles.lf)[1],
    stroke: '#ffffff', 'stroke-width': '1', 'stroke-opacity': '0.3'
  });
  const rfLine = svgEl('line', {
    x1: homeX, y1: homeY,
    x2: dimToXY(park.dims.rf * 1.1, fieldAngles.rf)[0],
    y2: dimToXY(park.dims.rf * 1.1, fieldAngles.rf)[1],
    stroke: '#ffffff', 'stroke-width': '1', 'stroke-opacity': '0.3'
  });
  svg.appendChild(lfLine);
  svg.appendChild(rfLine);

  // Outfield wall as a curved path
  const wallPoints = [
    dimToXY(park.dims.lf, fieldAngles.lf),
    dimToXY(park.dims.lcf, fieldAngles.lcf),
    dimToXY(park.dims.cf, fieldAngles.cf),
    dimToXY(park.dims.rcf, fieldAngles.rcf),
    dimToXY(park.dims.rf, fieldAngles.rf),
  ];

  // Draw wall as cubic bezier segments
  let wallPathD = `M ${wallPoints[0].join(',')}`;
  for (let i = 0; i < wallPoints.length - 1; i++) {
    const p0 = wallPoints[i];
    const p1 = wallPoints[i + 1];
    const mx = (p0[0] + p1[0]) / 2;
    const my = (p0[1] + p1[1]) / 2;
    wallPathD += ` Q ${mx},${my - 5} ${p1[0]},${p1[1]}`;
  }

  const wallPath = svgEl('path', {
    d: wallPathD,
    stroke: park.color,
    'stroke-width': '3',
    fill: 'none',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  });
  svg.appendChild(wallPath);

  // Wall glow
  const wallGlow = svgEl('path', {
    d: wallPathD,
    stroke: park.color,
    'stroke-width': '8',
    fill: 'none',
    'stroke-opacity': '0.2',
    'stroke-linecap': 'round',
  });
  svg.insertBefore(wallGlow, wallPath);

  // Distance labels
  const labelConfigs = [
    { dist: park.dims.lf,  angle: fieldAngles.lf,  label: `${park.dims.lf}'` },
    { dist: park.dims.lcf, angle: fieldAngles.lcf, label: `${park.dims.lcf}'` },
    { dist: park.dims.cf,  angle: fieldAngles.cf,  label: `${park.dims.cf}'` },
    { dist: park.dims.rcf, angle: fieldAngles.rcf, label: `${park.dims.rcf}'` },
    { dist: park.dims.rf,  angle: fieldAngles.rf,  label: `${park.dims.rf}'` },
  ];

  labelConfigs.forEach(({ dist, angle, label }) => {
    const [lx, ly] = dimToXY(dist, angle);
    const labelEl = svgEl('text', {
      x: lx, y: ly - 10,
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
      fill: '#d0dae8',
      'font-size': '10',
      'font-family': 'DM Mono, monospace',
      'font-weight': '500',
    });
    labelEl.textContent = label;
    svg.appendChild(labelEl);

    // Distance dot
    const dot = svgEl('circle', { cx: lx, cy: ly, r: '3', fill: park.color, 'fill-opacity': '0.8' });
    svg.appendChild(dot);
  });

  // Wall height labels (at CF only to keep it clean)
  const cfPos = dimToXY(park.dims.cf, fieldAngles.cf);
  const cfHLabel = svgEl('text', {
    x: cfPos[0] + 18, y: cfPos[1],
    'text-anchor': 'start',
    'dominant-baseline': 'middle',
    fill: '#7a96b8',
    'font-size': '8',
    'font-family': 'DM Mono, monospace',
  });
  cfHLabel.textContent = `${park.walls.cf}ft wall`;
  svg.appendChild(cfHLabel);

  // Home plate
  const plate = svgEl('polygon', {
    points: `${homeX},${homeY - 7} ${homeX - 5},${homeY - 3} ${homeX - 5},${homeY + 3} ${homeX + 5},${homeY + 3} ${homeX + 5},${homeY - 3}`,
    fill: '#d0dae8',
  });
  svg.appendChild(plate);

  // Wind arrow
  drawWindArrow(svg, state.windDir, homeX, homeY, scale, park);

  // "WIND" label at top
  const windLabelEl = svgEl('text', {
    x: W - 8, y: 16,
    'text-anchor': 'end',
    fill: '#3d5a7a',
    'font-size': '9',
    'font-family': 'DM Sans, system-ui, sans-serif',
    'font-weight': '700',
    'letter-spacing': '0.1em',
  });
  windLabelEl.textContent = `${Math.round(state.windDir)}° ${dirLabel(state.windDir).toUpperCase()}`;
  svg.appendChild(windLabelEl);
}

function drawWindArrow(svg, angleDeg, cx, cy, scale, park) {
  if (state.windSpeed < 1) return;

  const arrowLen = Math.min(40, 15 + state.windSpeed * 1.2);
  // Wind blows FROM a direction — visually show as arrow pointing in wind direction
  const rad = (angleDeg - 90) * Math.PI / 180;

  // Place arrow in the CF area
  const startDist = park.dims.cf * 0.45;
  const ax = cx + startDist * scale * Math.cos(rad - Math.PI);
  const ay = cy + startDist * scale * Math.sin(rad - Math.PI);

  const endX = ax + arrowLen * Math.cos(rad);
  const endY = ay + arrowLen * Math.sin(rad);

  const arrowLine = svgEl('line', {
    x1: ax, y1: ay, x2: endX, y2: endY,
    stroke: '#e8a832', 'stroke-width': '2.5', 'stroke-linecap': 'round',
    'stroke-opacity': '0.9',
  });
  svg.appendChild(arrowLine);

  // Arrowhead
  const perpRad = rad + Math.PI / 2;
  const tipPoints = [
    `${endX},${endY}`,
    `${endX - 8 * Math.cos(rad) + 5 * Math.cos(perpRad)},${endY - 8 * Math.sin(rad) + 5 * Math.sin(perpRad)}`,
    `${endX - 8 * Math.cos(rad) - 5 * Math.cos(perpRad)},${endY - 8 * Math.sin(rad) - 5 * Math.sin(perpRad)}`,
  ].join(' ');
  const head = svgEl('polygon', { points: tipPoints, fill: '#e8a832', 'fill-opacity': '0.9' });
  svg.appendChild(head);

  // Speed label
  const midX = (ax + endX) / 2;
  const midY = (ay + endY) / 2;
  const speedLabel = svgEl('text', {
    x: midX + 10, y: midY,
    'text-anchor': 'start',
    'dominant-baseline': 'middle',
    fill: '#e8a832',
    'font-size': '9',
    'font-family': 'DM Mono, monospace',
    'font-weight': '500',
  });
  speedLabel.textContent = `${state.windSpeed}mph`;
  svg.appendChild(speedLabel);
}

// ─────────────────────────────────────────────────────────────────────────────
// TRAJECTORY SVG
// ─────────────────────────────────────────────────────────────────────────────
function buildTrajectory(carryFt) {
  const svg = dom.trajectorySvg;
  svg.innerHTML = '';

  const W = 300, H = 160;
  const padding = { l: 20, r: 20, t: 15, b: 30 };
  const plotW = W - padding.l - padding.r;
  const plotH = H - padding.t - padding.b;

  // Physics for trajectory
  const launchAngleDeg = 28;
  const exitVeloMph = 100;
  const launchAngle = launchAngleDeg * Math.PI / 180;

  const rho = PHYSICS.airDensity(state.temp, state.pressure, PARK_BY_ID[state.parkId].alt);
  const rhoStd = PHYSICS.baselineDensity();
  const densityRatio = rho / rhoStd;

  // Gravity effective: higher density = more drag = behaves like higher g_eff
  const g_std = 32.2; // ft/s²
  const g_eff = g_std * (0.85 + 0.3 * densityRatio);
  const g_base = g_std * (0.85 + 0.3 * 1.0);

  const v0 = exitVeloMph * 1.467; // convert mph to ft/s
  const vx = v0 * Math.cos(launchAngle);
  const vy = v0 * Math.sin(launchAngle);

  function trajectory(g) {
    const points = [];
    const totalT = (2 * vy) / g;
    const steps = 80;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * totalT;
      const x = vx * t;
      const y = vy * t - 0.5 * g * t * t;
      if (y < 0 && i > 0) break;
      points.push([x, Math.max(0, y)]);
    }
    return points;
  }

  const basePoints = trajectory(g_base);
  const currPoints = trajectory(g_eff);

  // Find max distance for scaling
  const maxX = Math.max(carryFt + 30, 430);
  const maxY = Math.max(...basePoints.map(p => p[1]), ...currPoints.map(p => p[1]));

  function toSvgX(x) { return padding.l + (x / maxX) * plotW; }
  function toSvgY(y) { return H - padding.b - (y / maxY) * plotH; }

  // Ground line
  const ground = svgEl('line', {
    x1: padding.l, y1: H - padding.b,
    x2: W - padding.r, y2: H - padding.b,
    stroke: '#1a3562', 'stroke-width': '1',
  });
  svg.appendChild(ground);

  // CF wall rectangle
  const wallX = toSvgX(carryFt);
  const cfWall = PARK_BY_ID[state.parkId].walls.cf;
  const wallH = Math.max(5, (cfWall / maxY) * plotH);
  const wall = svgEl('rect', {
    x: wallX - 3, y: H - padding.b - wallH,
    width: 6, height: wallH,
    fill: PARK_BY_ID[state.parkId].color,
    'fill-opacity': '0.8',
    rx: '2',
  });
  svg.appendChild(wall);

  // Carry distance label
  const carryLabel = svgEl('text', {
    x: wallX, y: H - padding.b + 14,
    'text-anchor': 'middle',
    fill: PARK_BY_ID[state.parkId].color,
    'font-size': '8',
    'font-family': 'DM Mono, monospace',
    'font-weight': '500',
  });
  carryLabel.textContent = `${Math.round(carryFt)}ft`;
  svg.appendChild(carryLabel);

  // Baseline trajectory (dashed gray)
  const basePath = pointsToPath(basePoints, toSvgX, toSvgY);
  const baseEl = svgEl('path', {
    d: basePath,
    stroke: '#4a6a8a',
    'stroke-width': '1.5',
    fill: 'none',
    'stroke-dasharray': '4,3',
    'stroke-linecap': 'round',
  });
  svg.appendChild(baseEl);

  // Current trajectory (solid gold)
  const currPath = pointsToPath(currPoints, toSvgX, toSvgY);
  const currEl = svgEl('path', {
    d: currPath,
    stroke: '#e8a832',
    'stroke-width': '2',
    fill: 'none',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  });
  svg.appendChild(currEl);

  // Distance axis ticks
  [100, 200, 300, 400].forEach(dist => {
    const tx = toSvgX(dist);
    if (tx > padding.l && tx < W - padding.r) {
      const tick = svgEl('line', {
        x1: tx, y1: H - padding.b,
        x2: tx, y2: H - padding.b + 4,
        stroke: '#1a3562', 'stroke-width': '1',
      });
      svg.appendChild(tick);
      const tLabel = svgEl('text', {
        x: tx, y: H - padding.b + 13,
        'text-anchor': 'middle',
        fill: '#3d5a7a',
        'font-size': '7',
        'font-family': 'DM Mono, monospace',
      });
      tLabel.textContent = `${dist}`;
      svg.appendChild(tLabel);
    }
  });
}

function pointsToPath(points, toX, toY) {
  if (points.length === 0) return '';
  let d = `M ${toX(points[0][0])},${toY(points[0][1])}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${toX(points[i][0])},${toY(points[i][1])}`;
  }
  return d;
}

// ─────────────────────────────────────────────────────────────────────────────
// STAT BAR UPDATER
// ─────────────────────────────────────────────────────────────────────────────
function updateStatBar(barEl, deltaEl, deltaValue, maxPct) {
  const clampedPct = Math.min(Math.abs(deltaValue), maxPct);
  const barPct = (clampedPct / maxPct) * 50; // max 50% of track width

  const sign = deltaValue >= 0 ? '+' : '';
  deltaEl.textContent = `${sign}${deltaValue.toFixed(1)}%`;
  deltaEl.className = 'stat-card-delta ' + (deltaValue > 0.5 ? 'positive' : deltaValue < -0.5 ? 'negative' : '');

  barEl.style.width = barPct + '%';
  barEl.className = 'stat-bar ' + (deltaValue >= 0 ? 'positive' : 'negative');

  if (deltaValue >= 0) {
    barEl.style.left = '50%';
    barEl.style.right = '';
  } else {
    barEl.style.right = '50%';
    barEl.style.left = '';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VERDICT
// ─────────────────────────────────────────────────────────────────────────────
function updateVerdict(hrDelta) {
  const pill = dom.verdictPill;
  const desc = dom.verdictDesc;
  const park = PARK_BY_ID[state.parkId];

  if (hrDelta > 8) {
    pill.textContent = 'HITTER-FRIENDLY';
    pill.className = 'verdict-pill hitter';
    desc.textContent = `Strong conditions for offense at ${park.name}. Thin air and outblowing winds are pushing the ball.`;
  } else if (hrDelta < -8) {
    pill.textContent = 'PITCHER PARK';
    pill.className = 'verdict-pill pitcher';
    desc.textContent = `Conditions heavily favor pitching today at ${park.name}. Dense air and in-blowing winds suppress carry.`;
  } else if (hrDelta > 3) {
    pill.textContent = 'SLIGHTLY HITTER-FRIENDLY';
    pill.className = 'verdict-pill hitter';
    desc.textContent = `Mild offensive advantage at ${park.name} under current conditions.`;
  } else if (hrDelta < -3) {
    pill.textContent = 'SLIGHTLY PITCHER-FRIENDLY';
    pill.className = 'verdict-pill pitcher';
    desc.textContent = `Mild pitching advantage at ${park.name} under current conditions.`;
  } else {
    pill.textContent = 'NEUTRAL';
    pill.className = 'verdict-pill neutral';
    desc.textContent = `Conditions near league average at ${park.name}. No significant weather impact on ball-in-play outcomes.`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COEFFICIENT BREAKDOWN
// ─────────────────────────────────────────────────────────────────────────────
function updateCoeffBreakdown(d) {
  const grid = dom.coeffGrid;
  grid.innerHTML = '';

  const park = PARK_BY_ID[state.parkId];
  const items = [
    { label: 'Air Density', val: `${d.rho.toFixed(4)} kg/m³` },
    { label: 'Density Ratio', val: `${d.densityRatio.toFixed(4)}` },
    { label: 'Density Factor', val: `${d.densityFactor > 0 ? '+' : ''}${d.densityFactor.toFixed(2)}%` },
    { label: 'Wind Factor', val: `${d.windFactor > 0 ? '+' : ''}${d.windFactor.toFixed(2)}%` },
    { label: 'Alt Bonus (HR)', val: `${d.altBonus_hr > 0 ? '+' : ''}${d.altBonus_hr.toFixed(1)}%` },
    { label: 'Park Sens', val: park.sens.toFixed(2) },
    { label: 'Wind Dir Factor', val: PHYSICS.windDirectionFactor(state.windDir).toFixed(3) },
    { label: 'Eff. Wind Speed', val: `${PHYSICS.effectiveWindSpeed(state.windSpeed).toFixed(1)} mph` },
    { label: 'Altitude', val: `${park.alt.toLocaleString()} ft` },
    { label: 'Orientation', val: `${park.orientation}°` },
  ];

  items.forEach(({ label, val }) => {
    const row = document.createElement('div');
    row.className = 'coeff-row';
    row.innerHTML = `<span class="coeff-key">${label}</span><span class="coeff-val">${val}</span>`;
    grid.appendChild(row);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PARK INFO UPDATE
// ─────────────────────────────────────────────────────────────────────────────
function updateParkInfo(park) {
  dom.parkName.textContent = park.name;
  dom.parkTeam.textContent = park.team;
  dom.parkTeamColor.style.background = park.color;
  dom.parkAlt.textContent = `${park.alt.toLocaleString()} ft`;
  dom.parkRoof.textContent = park.roof.toUpperCase();
  dom.parkSens.textContent = park.sens.toFixed(2);

  // Dome notice
  if (park.roof !== 'open') {
    dom.domeNotice.classList.remove('hidden');
    dom.domeRoofType.textContent = park.roof;
  } else {
    dom.domeNotice.classList.add('hidden');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN RECALCULATE — runs on every input change
// ─────────────────────────────────────────────────────────────────────────────
function recalculate() {
  const park = PARK_BY_ID[state.parkId];
  const { temp, windSpeed, windDir, pressure } = state;

  const carry = PHYSICS.carry(temp, windSpeed, windDir, pressure, park);
  const d = PHYSICS.deltas(temp, windSpeed, windDir, pressure, park);
  const ev = PHYSICS.evRequired(carry);
  const rho = PHYSICS.airDensity(temp, pressure, park.alt);
  const rhoStd = PHYSICS.baselineDensity();

  // Carry display
  dom.carryFt.textContent = `${Math.round(carry)} ft`;
  const carryDelta = Math.round(carry - 400);
  dom.carryDelta.textContent = `${carryDelta >= 0 ? '+' : ''}${carryDelta} ft`;
  dom.carryDelta.className = 'carry-delta-val ' + (carryDelta > 0 ? 'positive' : carryDelta < 0 ? 'negative' : '');

  // EV and air density
  dom.evNeeded.textContent = `${ev.toFixed(1)} mph`;
  dom.airDensity.textContent = `${rho.toFixed(4)} kg/m³`;

  // Density bar marker: 0% = thick air (1.35), 100% = thin (0.85)
  const markerPct = Math.max(0, Math.min(100, ((1.30 - rho) / (1.30 - 0.85)) * 100));
  dom.densityMarker.style.left = `${markerPct}%`;

  // Stat bars (max visual at ±30%)
  updateStatBar(dom.hrBar, dom.hrDelta, d.hr, 30);
  updateStatBar(dom.runsBar, dom.runsDelta, d.runs, 30);
  updateStatBar(dom.xbhBar, dom.xbhDelta, d.xbh, 30);

  // Trajectory
  buildTrajectory(carry);

  // Field diagram (redraw wind arrow)
  buildFieldDiagram(park);

  // Verdict
  updateVerdict(d.hr);

  // Coefficients
  updateCoeffBreakdown(d);
}

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATE SLIDER — smooth transition for live weather
// ─────────────────────────────────────────────────────────────────────────────
function animateSlider(sliderEl, targetVal, onUpdate, duration) {
  const startVal = parseInt(sliderEl.value, 10);
  const delta = targetVal - startVal;
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / duration);
    const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
    const currentVal = Math.round(startVal + delta * eased);
    sliderEl.value = currentVal;
    onUpdate(currentVal);
    if (t < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT LISTENERS
// ─────────────────────────────────────────────────────────────────────────────
function attachEvents() {
  // Park selector
  dom.parkSelect.addEventListener('change', e => {
    state.parkId = e.target.value;
    const park = PARK_BY_ID[state.parkId];
    updateParkInfo(park);
    recalculate();
  });

  // Temperature
  dom.tempSlider.addEventListener('input', e => {
    state.temp = parseInt(e.target.value, 10);
    dom.tempVal.textContent = `${state.temp}°F`;
    recalculate();
  });

  // Wind speed
  dom.windSpeedSlider.addEventListener('input', e => {
    state.windSpeed = parseInt(e.target.value, 10);
    dom.windSpeedVal.textContent = `${state.windSpeed} mph`;
    recalculate();
  });

  // Pressure
  dom.pressureSlider.addEventListener('input', e => {
    state.pressure = parseInt(e.target.value, 10);
    dom.pressureVal.textContent = `${state.pressure} hPa`;
    recalculate();
  });

  // Direction preset buttons
  document.querySelectorAll('.dir-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const deg = parseInt(btn.dataset.deg, 10);
      setWindDir(deg);
    });
  });

  // Preset scenarios
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.preset;
      const p = PRESETS[key];
      if (!p) return;

      const duration = 600;
      animateSlider(dom.tempSlider, p.temp, val => {
        state.temp = val;
        dom.tempVal.textContent = `${val}°F`;
        recalculate();
      }, duration);

      animateSlider(dom.windSpeedSlider, p.windSpeed, val => {
        state.windSpeed = val;
        dom.windSpeedVal.textContent = `${val} mph`;
        recalculate();
      }, duration);

      animateSlider(dom.pressureSlider, p.pressure, val => {
        state.pressure = val;
        dom.pressureVal.textContent = `${val} hPa`;
        recalculate();
      }, duration);

      // Wind direction - animate over duration
      const startDir = state.windDir;
      const targetDir = p.windDir;
      const startTime = performance.now();
      function animateDir(now) {
        const t = Math.min(1, (now - startTime) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        let diff = targetDir - startDir;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        const cur = ((startDir + diff * eased) % 360 + 360) % 360;
        setWindDir(cur);
        if (t < 1) requestAnimationFrame(animateDir);
      }
      requestAnimationFrame(animateDir);
    });
  });

  // Live weather
  dom.liveWeatherBtn.addEventListener('click', async () => {
    const park = PARK_BY_ID[state.parkId];
    dom.liveWeatherBtn.classList.add('loading');
    dom.liveWeatherStatus.textContent = 'Fetching weather...';
    dom.liveWeatherStatus.className = 'live-status';

    try {
      const weather = await fetchLiveWeather(park.lat, park.lon);
      const duration = 800;

      animateSlider(dom.tempSlider, Math.round(weather.temp), val => {
        state.temp = val;
        dom.tempVal.textContent = `${val}°F`;
        recalculate();
      }, duration);

      animateSlider(dom.windSpeedSlider, Math.min(35, Math.round(weather.windSpeed)), val => {
        state.windSpeed = val;
        dom.windSpeedVal.textContent = `${val} mph`;
        recalculate();
      }, duration);

      animateSlider(dom.pressureSlider, Math.round(weather.pressure), val => {
        state.pressure = val;
        dom.pressureVal.textContent = `${val} hPa`;
        recalculate();
      }, duration);

      // Convert met wind direction to park-relative direction
      // Meteorological 0° = from N, park 0° = blowing out toward CF
      // Convert: wind blowing FROM met direction TOWARD outfield
      // Park orientation is home plate facing direction
      const metToOutfield = ((weather.windDir - park.orientation + 180 + 360) % 360);
      const startDir = state.windDir;
      const targetDir = metToOutfield;
      const startTime = performance.now();
      function animateDirLive(now) {
        const t = Math.min(1, (now - startTime) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        let diff = targetDir - startDir;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        const cur = ((startDir + diff * eased) % 360 + 360) % 360;
        setWindDir(cur);
        if (t < 1) requestAnimationFrame(animateDirLive);
      }
      requestAnimationFrame(animateDirLive);

      dom.liveWeatherStatus.textContent = `Live: ${weather.temp}°F, ${weather.windSpeed}mph, ${weather.pressure}hPa`;
      dom.liveWeatherStatus.className = 'live-status success';
    } catch (err) {
      dom.liveWeatherStatus.textContent = `Could not fetch weather. Try again.`;
      dom.liveWeatherStatus.className = 'live-status error';
    } finally {
      dom.liveWeatherBtn.classList.remove('loading');
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────────────────
function init() {
  cacheDom();

  // Set defaults
  const defaultPark = PARK_BY_ID['dodger_stadium'];
  updateParkInfo(defaultPark);

  // Build wind dial SVG
  buildWindDial();

  // Initial field diagram
  buildFieldDiagram(defaultPark);

  // Initial calculation
  recalculate();

  // Attach all events
  attachEvents();
}

document.addEventListener('DOMContentLoaded', init);
