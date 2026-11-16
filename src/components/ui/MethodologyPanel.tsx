import { useMission } from '../../store/useMission';

/** "Metodología y fuentes": qué se calcula, con qué datos y qué limitaciones tiene. */
export default function MethodologyPanel() {
  const isPro = useMission((s) => s.viewMode) === 'professional';
  const H = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-wider pt-1">{children}</h3>
  );
  return (
    <div className="space-y-2.5 text-[12.5px] leading-relaxed text-slate-200" data-testid="methodology">
      <H>What KillaLand Displays</H>
      <p>
        For each site and date, the celestial positions of the Sun and Earth and whether surrounding terrain features block them.
        This estimates how much power solar panels can generate and when direct line-of-sight communication with Earth is available.
      </p>

      <H>Data Sources</H>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <b>Sun and Earth positions:</b> NASA JPL Horizons (topocentric observer on the lunar surface, without atmospheric refraction),
          1-hour time step from Nov 14 to Dec 14, 2026. For Apollo 11, two validation samples from Jul 20, 1969 are included.
        </li>
        <li>
          <b>Terrain horizon:</b> Traced from the South Pole LOLA Digital Elevation Model at 80 m/pixel
          (LDEM_80S_80MPP_ADJ, NASA PGDA; Barker et al. 2023, PSJ 4, 183), at 2 m observer elevation out to 100 km range.
          Available for six sites: Shackleton Rim and Floor, Malapert, Cabeus, de Gerlache, and Apollo 11 (outside polar DEM: smooth sphere).
        </li>
        <li>
          <b>Globe texture:</b> Global equirectangular Moon mosaic (see <code>src/assets/moon/README.md</code> for provenance and license).
        </li>
        <li>
          <b>Earth and Sun in 3D scene:</b> Earth uses day, night, ocean specular, and cloud maps (see{' '}
          <code>src/assets/earth/README.md</code>).
          Its rotational axis is tilted 23.44° and rotates with UTC time, keeping solar noon aligned toward the Sun. Illumination on the Moon
          originates from the true direction of the Sun (parallel rays). Distances and sizes can be toggled between <b>True scale</b> and <b>Educational scale</b>.
        </li>
      </ul>

      <H>Visibility Criteria</H>
      <ul className="list-disc pl-5 space-y-1">
        <li>The Sun is evaluated based on the visible fraction of its disk above the local horizon (angular radius 0.267°).</li>
        <li>The Earth is considered visible whenever its center rises above the local terrain horizon.</li>
        {isPro && (
          <li>
            Power: P = f · 1361 W/m² · 0.28 · sin(solar elevation), for a horizontal 1 m² solar array.
            Instantaneous η is 0.28 · sin(elevation) when the Sun is above the horizon.
          </li>
        )}
      </ul>

      <H>Known Limitations & Assumptions</H>
      <ul className="list-disc pl-5 space-y-1">
        <li>Ephemerides span a 30-day window. Percentages reflect that month, not an entire lunar year: they do not represent annual eternal light.</li>
        <li>
          Faustini, Haworth, Nobile, and IM-1 lack high-resolution raytraced terrain profiles: they use an ideal smooth spherical horizon as an orientation baseline.
        </li>
        <li>
          The "South Pole (Patch)" view, viable cell counts, and slope filters use a demonstration elevation grid
          and a simplified solar model.
        </li>
        <li>
          Catalog site coordinates and the exact point where horizons/ephemerides were sampled may differ slightly
          in some records{isPro ? ' (both coordinates are shown in "Site Metrics")' : ''}.
        </li>
        <li>"Direct Earth signal" denotes geometric optical line-of-sight; RF link budgets, antenna gains, and ground stations are not simulated.</li>
        <li>Dates outside the precomputed ephemeris span fall back to an analytical approximation, always marked with ⚠️.</li>
      </ul>

      {isPro && (
        <>
          <H>Validation</H>
          <p>
            The ephemerides in <code>public/data</code> were verified against an independent engine (astropy + lunar rotation
            IAU/WGCCRE 2009) on daily samples: maximum differences are under 0.016° in azimuth and 0.004° in elevation.
            The "Physics Benchmark" panel audits five benchmark cases; cases requiring annual criteria are marked "INCOMPARABLE"
            over the 30-day baseline dataset.
          </p>
        </>
      )}
    </div>
  );
}
