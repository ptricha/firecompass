/**
 * Verified milestones of fire safety in space. Every event cites its source.
 * Dates marked "PSI release" come from the releaseDate field of each investigation's PSI metadata;
 * test dates come from the recorded rows of the PSI-69 and PSI-25 tables.
 */
export type Cat = 'incident' | 'research' | 'hardware' | 'spinoff' | 'data' | 'next'

export interface TimelineEvent {
  id: string
  year: number | null // null = "next" (no date)
  when: { en: string; es: string }
  cat: Cat
  en: { title: string; text: string }
  es: { title: string; text: string }
  src: { label: string; url: string }
  link?: { href: string; en: string; es: string }
}

export const CAT_COLOR: Record<Cat, string> = {
  incident: '#e66767',
  research: '#3987e5',
  hardware: '#199e70',
  spinoff: '#eda100',
  data: '#9085e9',
  next: '#ff8a4c',
}

export const CAT_LABEL: Record<Cat, { en: string; es: string }> = {
  incident: { en: 'Incidents', es: 'Incidentes' },
  research: { en: 'Experiments', es: 'Experimentos' },
  hardware: { en: 'Hardware', es: 'Equipos' },
  spinoff: { en: 'Spinoffs', es: 'Derivados' },
  data: { en: 'Open data', es: 'Datos abiertos' },
  next: { en: 'Now and next', es: 'Ahora y después' },
}

export interface Era {
  id: string
  from: number
  to: number
  en: { title: string; text: string }
  es: { title: string; text: string }
}

export const ERAS: Era[] = [
  {
    id: 'lessons',
    from: 1965,
    to: 1982,
    en: { title: 'From tragedy to safety rules', text: 'Two accidents and the first space-fire experiments reshape how spacecraft are built.' },
    es: { title: 'De la tragedia a las normas de seguridad', text: 'Dos accidentes y los primeros experimentos de fuego espacial cambian cómo se construyen las naves.' },
  },
  {
    id: 'stations',
    from: 1994,
    to: 2007,
    en: { title: 'Fire on stations and shuttles', text: 'A real fire on Mir and a generation of shuttle experiments.' },
    es: { title: 'Fuego en estaciones y transbordadores', text: 'Un incendio real en Mir y una generación de experimentos en el transbordador.' },
  },
  {
    id: 'iss',
    from: 2008,
    to: 2018,
    en: { title: 'The ISS becomes a combustion laboratory', text: 'A dedicated rack, droplets, solids and smoke: the experiments behind today’s data.' },
    es: { title: 'La ISS se convierte en laboratorio de combustión', text: 'Un rack dedicado, gotas, sólidos y humo: los experimentos que hay detrás de los datos actuales.' },
  },
  {
    id: 'open',
    from: 2019,
    to: 2025,
    en: { title: 'The data opens up', text: 'Investigation by investigation, NASA publishes its combustion results for everyone.' },
    es: { title: 'Los datos se abren', text: 'Investigación a investigación, NASA publica sus resultados de combustión para todos.' },
  },
  {
    id: 'now',
    from: 2026,
    to: 9999,
    en: { title: 'Now, and what comes next', text: 'Back to the Moon, and the first fire experiments in partial gravity.' },
    es: { title: 'Ahora, y lo que viene', text: 'De vuelta a la Luna y los primeros experimentos de fuego en gravedad parcial.' },
  },
]

const APOLLO1 = { label: 'NASA Safety Center: Apollo 1', url: 'https://sma.nasa.gov/sma-disciplines/accllp/apollo-1' }
const APOLLO13 = { label: 'NASA Safety Center: Apollo 13', url: 'https://sma.nasa.gov/sma-disciplines/accllp/apollo-13' }
const GUIDE = { label: "NASA Researcher's Guide to Combustion Science (2015)", url: 'https://www.nasa.gov/wp-content/uploads/2016/05/np-2015-10-034-jsc_combustion_in_reduced_gravity-iss-mini-book-011116-508.pdf' }
const PSI = (id: string) => ({ label: `NASA PSI ${id} metadata`, url: `https://psi.nasa.gov/physci/repo/data/investigations/${id}` })
const GLENN = { label: 'NASA Glenn: Combustion Science', url: 'https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/' }

export const TIMELINE: TimelineEvent[] = [
  {
    id: 'heaters-1965', year: 1965, when: { en: '1965', es: '1965' }, cat: 'incident',
    en: { title: 'A heater upgrade goes unchecked', text: 'The Apollo Command Module’s oxygen-tank heaters are upgraded from 28 to 65 V DC, but their thermostatic switches are never modified. Five years later this decision matters.' },
    es: { title: 'Una mejora de calentadores sin revisar', text: 'Los calentadores de los tanques de oxígeno del módulo de mando Apollo pasan de 28 a 65 V CC, pero sus termostatos no se modifican. Cinco años después esa decisión importa.' },
    src: APOLLO13,
  },
  {
    id: 'apollo1', year: 1967, when: { en: '27 Jan 1967', es: '27 ene 1967' }, cat: 'incident',
    en: { title: 'Apollo 1: a flash fire in pure oxygen', text: 'During a launch-pad test, a fire sweeps a 100% oxygen cabin and kills Grissom, White and Chaffee. The three-piece hatch took about 90 seconds to open.' },
    es: { title: 'Apollo 1: un incendio relámpago en oxígeno puro', text: 'En una prueba en la plataforma de lanzamiento, un fuego recorre una cabina de 100% de oxígeno y mata a Grissom, White y Chaffee. La escotilla de tres piezas tardaba unos 90 segundos en abrirse.' },
    src: APOLLO1,
    link: { href: '/explorer/acme-bre', en: 'Oxygen-rich atmospheres are still the question: see BRE', es: 'Las atmósferas ricas en oxígeno siguen siendo la cuestión: mira BRE' },
  },
  {
    id: 'apollo13', year: 1970, when: { en: 'April 1970', es: 'abril 1970' }, cat: 'incident',
    en: { title: 'Apollo 13: an oxygen tank explodes', text: 'On the way to the Moon, oxygen tank no. 2 explodes after its heaters overheated and degraded the Teflon insulation. The crew survives by using the lunar module as a lifeboat.' },
    es: { title: 'Apollo 13: explota un tanque de oxígeno', text: 'Camino de la Luna, el tanque de oxígeno nº 2 explota tras sobrecalentarse sus calentadores y degradar el aislante de teflón. La tripulación sobrevive usando el módulo lunar como bote salvavidas.' },
    src: APOLLO13,
  },
  {
    id: 'cortright', year: 1970, when: { en: '15 Jun 1970', es: '15 jun 1970' }, cat: 'incident',
    en: { title: 'The review board names the cause', text: 'The Apollo 13 report finds a combination of mistakes and a deficient design. Fixes: a third oxygen tank, upgraded thermostats, no stirring fans and stainless-steel-sheathed wiring.' },
    es: { title: 'La comisión de revisión señala la causa', text: 'El informe de Apollo 13 halla una combinación de errores y un diseño deficiente. Soluciones: un tercer tanque de oxígeno, termostatos mejorados, sin ventiladores de agitación y cableado revestido de acero inoxidable.' },
    src: APOLLO13,
  },
  {
    id: 'skylab', year: 1974, when: { en: '1974', es: '1974' }, cat: 'research',
    en: { title: 'Skylab measures zero-gravity flammability', text: 'Skylab experiment M479, Zero Gravity Flammability, is reported. NASA’s BASS team still cites it as foundational work.' },
    es: { title: 'Skylab mide la inflamabilidad en gravedad cero', text: 'Se publica el experimento M479 de Skylab, Zero Gravity Flammability. El equipo de BASS de NASA aún lo cita como trabajo fundacional.' },
    src: { label: 'NASA fact sheet: BASS (references)', url: 'https://www.nasa.gov/wp-content/uploads/2025/07/burning-and-suppression-of-solids-bass.pdf' },
  },
  {
    id: 'airtank', year: 1976, when: { en: '1976', es: '1976' }, cat: 'spinoff',
    en: { title: 'Spacesuit tech lightens firefighters’ air tanks', text: 'A 20 lb backpack with 30 minutes of air at 4,500 psi, 13 lb lighter than conventional tanks, with an aluminum liner wrapped in glass fibers.' },
    es: { title: 'La tecnología de trajes aligera los depósitos de los bomberos', text: 'Una mochila de 20 lb con 30 minutos de aire a 4.500 psi, 13 lb más ligera que los depósitos convencionales, con revestimiento de aluminio envuelto en fibra de vidrio.' },
    src: { label: 'NASA Spinoff: air tank', url: 'https://spinoff.nasa.gov/node/9582' },
  },
  {
    id: 'detector', year: 1978, when: { en: '1978', es: '1978' }, cat: 'spinoff',
    en: { title: 'A shuttle smoke detector learns to ignore dust', text: 'The Brunswick Incipient Fire Detector tells combustion particles from dust, giving fewer false alarms, and senses fire before flame and smoke. Mines adopt the idea.' },
    es: { title: 'Un detector del transbordador aprende a ignorar el polvo', text: 'El Brunswick Incipient Fire Detector distingue las partículas de combustión del polvo, con menos falsas alarmas, y detecta el fuego antes de la llama y el humo. Las minas adoptan la idea.' },
    src: { label: 'NASA Spinoff: Fire Detector (NTRS)', url: 'http://hdl.handle.net/hdl:2060/20070018916' },
    link: { href: '/explorer/daft-daft-2', en: 'Telling smoke from dust is still studied: see DAFT', es: 'Distinguir humo de polvo se sigue estudiando: mira DAFT' },
  },
  {
    id: 'fires', year: 1982, when: { en: '1982', es: '1982' }, cat: 'spinoff',
    en: { title: 'Project FIRES: firefighter gear from spacesuit fabrics', text: 'NASA and the U.S. Fire Administration test protective clothing built from spacesuit-grade, fire-resistant fabrics in 14 municipal fire departments.' },
    es: { title: 'Proyecto FIRES: equipo de bomberos con tejidos de trajes espaciales', text: 'NASA y la Administración de Bomberos de EE. UU. prueban ropa de protección hecha con tejidos ignífugos de calidad de traje espacial en 14 cuerpos de bomberos municipales.' },
    src: { label: 'NASA Spinoff: Project FIRES', url: 'https://spinoff.nasa.gov/node/9918' },
  },
  {
    id: 'mir', year: 1997, when: { en: '24 Feb 1997', es: '24 feb 1997' }, cat: 'incident',
    en: { title: 'Fire aboard Mir', text: 'A solid-fuel oxygen generator canister ignites in the Kvant-1 module. The flame burns for several minutes, shooting about three feet with sparks and molten metal; the crew fights it with foam extinguishers.' },
    es: { title: 'Incendio a bordo de Mir', text: 'Un cartucho de generador de oxígeno de combustible sólido se enciende en el módulo Kvant-1. La llama arde varios minutos, con unos tres pies de largo, chispas y metal fundido; la tripulación la combate con extintores de espuma.' },
    src: { label: 'NASA History: Fire Aboard Mir', url: 'https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/' },
  },
  {
    id: 'lsp', year: 1997, when: { en: '1997', es: '1997' }, cat: 'research',
    en: { title: 'Soot and flames fly on the shuttle', text: 'The Laminar Soot Processes experiment flies on STS-83 and STS-94, while STS-87 carries two more flame experiments, one in the payload bay and one in the middeck glovebox.' },
    es: { title: 'El hollín y las llamas vuelan en el transbordador', text: 'El experimento Laminar Soot Processes vuela en STS-83 y STS-94, mientras que STS-87 lleva otros dos experimentos de llama, uno en la bodega de carga y otro en la guantera de la cabina.' },
    src: GUIDE,
  },
  {
    id: 'iss2000', year: 2000, when: { en: '2000', es: '2000' }, cat: 'hardware',
    en: { title: 'The ISS is first occupied', text: 'A permanent microgravity laboratory opens, making long-duration combustion experiments possible for the first time.' },
    es: { title: 'La ISS se ocupa por primera vez', text: 'Se abre un laboratorio permanente de microgravedad, que hace posibles por primera vez los experimentos de combustión de larga duración.' },
    src: { label: 'NASA Space Apps: challenge statement', url: 'https://www.spaceappschallenge.org' },
  },
  {
    id: 'sts107', year: 2003, when: { en: '2003', es: '2003' }, cat: 'research',
    en: { title: 'Water mist is tested in orbit', text: 'On STS-107, the Mist experiment studies how water droplet size and concentration change the speed, strength and shape of flames, part of the research behind water-mist extinguishers.' },
    es: { title: 'La niebla de agua se prueba en órbita', text: 'En STS-107, el experimento Mist estudia cómo el tamaño y la concentración de las gotas de agua cambian la velocidad, la fuerza y la forma de las llamas, parte de la investigación detrás de los extintores de agua nebulizada.' },
    src: GUIDE,
  },
  {
    id: 'same', year: 2007, when: { en: '2007', es: '2007' }, cat: 'research',
    en: { title: 'SAME measures smoke in microgravity', text: 'During ISS Expedition 15 (SAME also ran in 2010), 30 samples of five materials are burned to learn how big smoke particles are without gravity. Mean diameters fall around 100 to 200 nm.' },
    es: { title: 'SAME mide el humo en microgravedad', text: 'Durante la Expedición 15 de la ISS (SAME también se ejecutó en 2010) se queman 30 muestras de cinco materiales para saber qué tamaño tienen las partículas de humo sin gravedad. Los diámetros medios rondan los 100 a 200 nm.' },
    src: { label: 'NASA fact sheet: SAME', url: 'https://www.nasa.gov/wp-content/uploads/2025/07/smoke-aerosol-measurement-experiment-same.pdf' },
    link: { href: '/explorer/same', en: 'Open SAME', es: 'Abrir SAME' },
  },
  {
    id: 'cir', year: 2008, when: { en: 'Nov 2008', es: 'nov 2008' }, cat: 'hardware',
    en: { title: 'The Combustion Integrated Rack arrives', text: 'Delivered on STS-126, the CIR gives the ISS a 100-liter combustion chamber with eight optical windows. It is the only ISS rack dedicated to combustion.' },
    es: { title: 'Llega el Combustion Integrated Rack', text: 'Entregado en STS-126, el CIR da a la ISS una cámara de combustión de 100 litros con ocho ventanas ópticas. Es el único rack de la ISS dedicado a la combustión.' },
    src: GUIDE,
  },
  {
    id: 'flex-start', year: 2009, when: { en: '5 Mar 2009', es: '5 mar 2009' }, cat: 'research',
    en: { title: 'FLEX records its first droplet test', text: 'Heptane and methanol droplets start burning in oxygen–nitrogen mixtures. The first recorded test (#1) ends in disruption; the campaign will reach 274 tests.' },
    es: { title: 'FLEX registra su primer ensayo con gotas', text: 'Gotas de heptano y metanol empiezan a arder en mezclas de oxígeno y nitrógeno. El primer ensayo registrado (nº 1) termina en disrupción; la campaña llegará a 274 ensayos.' },
    src: PSI('PSI-69'),
    link: { href: '/lab', en: 'Explore all 274 tests', es: 'Explora los 274 ensayos' },
  },
  {
    id: 'spice', year: 2009, when: { en: '2009', es: '2009' }, cat: 'research',
    en: { title: 'SPICE studies smoke points in the glovebox', text: 'The Smoke Point In Coflow Experiment runs in the ISS Microgravity Science Glovebox, building the flow duct that BASS, BASS-II and SLICE will reuse.' },
    es: { title: 'SPICE estudia los puntos de humo en la guantera', text: 'El Smoke Point In Coflow Experiment se ejecuta en el Microgravity Science Glovebox de la ISS y construye el conducto de flujo que reutilizarán BASS, BASS-II y SLICE.' },
    src: GUIDE,
    link: { href: '/explorer/spice', en: 'Open SPICE', es: 'Abrir SPICE' },
  },
  {
    id: 'flex-end', year: 2011, when: { en: '8 Dec 2011', es: '8 dic 2011' }, cat: 'research',
    en: { title: 'The 274-test FLEX campaign ends', text: 'The last recorded test closes a campaign that mapped when burning droplets go out: 186 extinctions, 61 disruptions and 27 completions.' },
    es: { title: 'Termina la campaña de 274 ensayos de FLEX', text: 'El último ensayo registrado cierra una campaña que cartografió cuándo se apagan las gotas que arden: 186 extinciones, 61 disrupciones y 27 combustiones completas.' },
    src: PSI('PSI-69'),
  },
  {
    id: 'bass-start', year: 2012, when: { en: 'March 2012', es: 'marzo 2012' }, cat: 'research',
    en: { title: 'BASS starts burning solids', text: 'A rapid-turnaround experiment begins burning 41 samples of fabrics, plastics and candles in a controlled flow. SLICE completes its operations the same year.' },
    es: { title: 'BASS empieza a quemar sólidos', text: 'Un experimento de rápida rotación empieza a quemar 41 muestras de telas, plásticos y velas en un flujo controlado. SLICE termina sus operaciones ese mismo año.' },
    src: GUIDE,
    link: { href: '/explorer/bass', en: 'Open BASS', es: 'Abrir BASS' },
  },
  {
    id: 'bass-data', year: 2013, when: { en: '30 Jun 2013', es: '30 jun 2013' }, cat: 'data',
    en: { title: 'BASS data goes public in PSI', text: 'One of the first combustion data sets opens to everyone in NASA’s Physical Sciences Informatics repository.' },
    es: { title: 'Los datos de BASS se hacen públicos en PSI', text: 'Uno de los primeros conjuntos de datos de combustión se abre a todos en el repositorio Physical Sciences Informatics de NASA.' },
    src: PSI('PSI-26'),
  },
  {
    id: 'bass2-start', year: 2014, when: { en: 'Feb 2014', es: 'feb 2014' }, cat: 'research',
    en: { title: 'BASS-II begins with thicker, realistic fuels', text: 'Six principal investigators run 129 tests on PMMA, SIBAL fabric and other samples, asking whether NASA’s 1-g material test protects crews in microgravity.' },
    es: { title: 'BASS-II arranca con combustibles más gruesos y realistas', text: 'Seis investigadores principales realizan 129 ensayos con PMMA, tela SIBAL y otras muestras, preguntándose si el test de materiales de 1 g de NASA protege a las tripulaciones en microgravedad.' },
    src: PSI('PSI-25'),
    link: { href: '/explorer/bass-ii', en: 'Open BASS-II', es: 'Abrir BASS-II' },
  },
  {
    id: 'guide', year: 2015, when: { en: 'Oct 2015', es: 'oct 2015' }, cat: 'research',
    en: { title: 'NASA publishes the Researcher’s Guide', text: 'A 56-page review of ISS combustion science states that NASA-STD-6001 Test 1 is not conservative: materials can burn at lower oxygen in microgravity than on Earth.' },
    es: { title: 'NASA publica la Guía del Investigador', text: 'Una revisión de 56 páginas de la ciencia de la combustión en la ISS afirma que NASA-STD-6001 Test 1 no es conservadora: los materiales pueden arder con menos oxígeno en microgravedad que en la Tierra.' },
    src: GUIDE,
    link: { href: '/simulator', en: 'See why ventilation speed matters', es: 'Mira por qué importa la velocidad de ventilación' },
  },
  {
    id: 'mist', year: 2015, when: { en: 'Dec 2015', es: 'dic 2015' }, cat: 'hardware',
    en: { title: 'Water-mist extinguishers reach the ISS', text: 'After years of research and flight experiments, the first two of nine planned non-toxic water-mist extinguishers are sent to replace CO₂ units on board.' },
    es: { title: 'Los extintores de agua nebulizada llegan a la ISS', text: 'Tras años de investigación y experimentos en vuelo, los dos primeros de nueve extintores de agua nebulizada no tóxicos previstos se envían para sustituir a las unidades de CO₂ de a bordo.' },
    src: GUIDE,
  },
  {
    id: 'flex-data', year: 2016, when: { en: '31 Jul 2016', es: '31 jul 2016' }, cat: 'data',
    en: { title: 'FLEX tests are published', text: 'The experimental table of all 274 droplet tests becomes public, letting anyone check how flames go out.' },
    es: { title: 'Se publican los ensayos de FLEX', text: 'La tabla experimental de los 274 ensayos con gotas se hace pública, para que cualquiera pueda comprobar cómo se apagan las llamas.' },
    src: PSI('PSI-69'),
  },
  {
    id: 'bass2-end', year: 2018, when: { en: '24 Jun 2018', es: '24 jun 2018' }, cat: 'research',
    en: { title: 'The last BASS-II test is recorded', text: 'Four years of solid-fuel burning end with none of the 129 tests started at the 26.5% oxygen planned for lunar habitats (initial O₂ ranged from 13.6% to 22.2%).' },
    es: { title: 'Se registra el último ensayo de BASS-II', text: 'Cuatro años quemando combustibles sólidos terminan sin que ninguno de los 129 ensayos empezara con el 26.5% de oxígeno previsto para hábitats lunares (el O₂ inicial fue de 13.6% a 22.2%).' },
    src: PSI('PSI-25'),
    link: { href: '/lab', en: 'See the oxygen gap in the Data Lab', es: 'Mira la laguna de oxígeno en el Laboratorio' },
  },
  {
    id: 'efield', year: 2019, when: { en: '2019', es: '2019' }, cat: 'data',
    en: { title: 'E-FIELD and FLEX-2 open up', text: 'ACME E-FIELD Flames (April) and FLEX-2 (September) are released. E-FIELD uses an electric field on flame ions to mimic partial gravity.' },
    es: { title: 'Se abren E-FIELD y FLEX-2', text: 'ACME E-FIELD Flames (abril) y FLEX-2 (septiembre) se publican. E-FIELD usa un campo eléctrico sobre los iones de la llama para imitar la gravedad parcial.' },
    src: PSI('PSI-22'),
  },
  {
    id: 'bre', year: 2022, when: { en: '15 Sep 2022', es: '15 sep 2022' }, cat: 'data',
    en: { title: 'BRE reveals a problem with turning off ventilation', text: 'The Burning Rate Emulator data shows flames burning without air flow in oxygen-enriched atmospheres, where at 21% oxygen they self-extinguished. BASS-II follows on 31 December.' },
    es: { title: 'BRE revela un problema al apagar la ventilación', text: 'Los datos del Burning Rate Emulator muestran llamas que arden sin flujo de aire en atmósferas enriquecidas en oxígeno, donde a 21% de oxígeno se autoextinguían. BASS-II llega el 31 de diciembre.' },
    src: PSI('PSI-20'),
    link: { href: '/explorer/acme-bre', en: 'Open BRE', es: 'Abrir BRE' },
  },
  {
    id: 'big-release', year: 2024, when: { en: '18 Sep 2024', es: '18 sep 2024' }, cat: 'data',
    en: { title: 'A wave of combustion data is released', text: 'Saffire I–III, SAME, SAME-R, SPICE, SLICE and the Cool Flames Investigation become public in one go, completing the picture of fire prevention, detection and suppression.' },
    es: { title: 'Se publica una oleada de datos de combustión', text: 'Saffire I–III, SAME, SAME-R, SPICE, SLICE y la Cool Flames Investigation se hacen públicos de golpe, completando el panorama de prevención, detección y supresión.' },
    src: PSI('PSI-39'),
    link: { href: '/explorer', en: 'Browse all 19 investigations', es: 'Explora las 19 investigaciones' },
  },
  {
    id: 'cfig', year: 2025, when: { en: '20 Nov 2025', es: '20 nov 2025' }, cat: 'data',
    en: { title: 'The highest-oxygen flames are published', text: 'ACME CFI-G, with flames in up to 85% oxygen, and ACME Flame Design are released, the most extreme oxygen conditions studied in microgravity.' },
    es: { title: 'Se publican las llamas con más oxígeno', text: 'ACME CFI-G, con llamas en hasta 85% de oxígeno, y ACME Flame Design se publican: las condiciones de oxígeno más extremas estudiadas en microgravedad.' },
    src: PSI('PSI-159'),
    link: { href: '/explorer/acme-cfi-g', en: 'Open CFI-G', es: 'Abrir CFI-G' },
  },
  {
    id: 'artemis', year: 2026, when: { en: 'Recently', es: 'Recientemente' }, cat: 'incident',
    en: { title: 'Artemis II: a smoke alarm 80,000 miles from home', text: 'The commander recalls that nothing gets attention like a fire alarm in your spacecraft when you are still about 80,000 miles from Earth.' },
    es: { title: 'Artemis II: una alarma de humo a 80.000 millas de casa', text: 'El comandante recuerda que nada llama tanto la atención como una alarma de incendio en tu nave cuando aún estás a unas 80.000 millas de la Tierra.' },
    src: { label: 'NASA Space Apps: challenge statement', url: 'https://www.spaceappschallenge.org' },
  },
  {
    id: 'spaceapps', year: 2026, when: { en: '14–15 Nov 2026', es: '14–15 nov 2026' }, cat: 'next',
    en: { title: 'Flame in Freefall', text: 'NASA Space Apps asks the world to turn decades of microgravity combustion data into fire-safety insights for the Moon and Mars. This project is one answer.' },
    es: { title: 'Flame in Freefall', text: 'NASA Space Apps pide al mundo convertir décadas de datos de combustión en microgravedad en conocimiento de seguridad contra incendios para la Luna y Marte. Este proyecto es una respuesta.' },
    src: { label: 'NASA Space Apps: challenge statement', url: 'https://www.spaceappschallenge.org' },
    link: { href: '/', en: 'Start from the beginning', es: 'Empieza por el principio' },
  },
  {
    id: 'next-moon', year: null, when: { en: 'Next', es: 'Próximamente' }, cat: 'next',
    en: { title: 'The first fire experiments in lunar gravity', text: 'FM2 will burn materials such as SIBAL on the Moon at 1/6 g, LUCI will measure partial-gravity combustion, SoFIE will test whether the 1-g flame test is conservative, and FLARE will relate ground limits to microgravity. Today, PSI holds zero partial-gravity data.' },
    es: { title: 'Los primeros experimentos de fuego en gravedad lunar', text: 'FM2 quemará materiales como SIBAL en la Luna a 1/6 g, LUCI medirá la combustión en gravedad parcial, SoFIE comprobará si el test de llama de 1 g es conservador y FLARE relacionará los límites de tierra con la microgravedad. Hoy, PSI no tiene ningún dato de gravedad parcial.' },
    src: GLENN,
    link: { href: '/simulator', en: 'See what the Moon would change', es: 'Mira qué cambiaría en la Luna' },
  },
]
