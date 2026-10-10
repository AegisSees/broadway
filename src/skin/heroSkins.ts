import type { HeroSkin } from './types';

/**
 * One skin per hero. Each is drawn from that hero's key art (palette), their published lore and role (concept, copy,
 * ornament, ambient effect) and the way they fight (hover motion). Heroes whose abilities and lore are not published
 * yet get a quieter skin built from their key art alone.
 */
const SKINS: HeroSkin[] = [
  {
    slug: 'holliday', concept: 'The site’s own look: film grain and ticket stubs, the trick-shot sheriff’s county-fair home ground.',
    mode: 'dark', bg: '#11100d', accent: '#ec8e32', accent2: '#f7b866', hi: '#c9b4f0', inherit: true,
    font: 'pulp', frame: 'ticket', tex: 'grain', label: 'plate', bar: 'solid', rule: 'line', orn: '✦', fx: 'none', hover: 'tilt', tile: 'ticket',
  },
  {
    slug: 'abrams', concept: 'Detective’s case file: manila tabs, venetian-blind light and typewritten stamps, in the blue and orange of his key art.',
    mode: 'dark', bg: '#0c1826', accent: '#f2681f', accent2: '#ffa261', hi: '#4a86b8',
    font: 'anton', frame: 'folder', tex: 'blinds', label: 'rect', bar: 'stripe', rule: 'dash', orn: '◆', fx: 'rain', hover: 'stomp', tile: 'slab',
    copy: { kicker: 'Case file', dossier: 'Case file', trend: 'Case timeline', builds: 'Evidence locker', matchups: 'Suspects & rivals', matches: 'Case log' },
  },
  {
    slug: 'apollo', concept: 'Blackmore’s fencing captain: piste lines, the fine mesh of a mask and a lunge in red.',
    mode: 'dark', bg: '#13151a', accent: '#c8404a', accent2: '#f08c92', hi: '#aab4c4',
    font: 'marcellus', frame: 'blade', tex: 'mesh', label: 'slash', bar: 'solid', rule: 'line', orn: '✶', fx: 'none', hover: 'slash', tile: 'card',
    copy: { kicker: 'Captain’s file', dossier: 'Piste report', trend: 'Bout record', builds: 'Training regimen', matchups: 'Opponents', matches: 'Bout log' },
  },
  {
    slug: 'baba', concept: 'The Soho Coven’s park bench: lace-trimmed cards under a pink moon, with spirit pigeons for company.',
    mode: 'dark', bg: '#131f1f', accent: '#d9779c', accent2: '#f5b3c9', hi: '#6fb7a8',
    font: 'chelsea', frame: 'lace', tex: 'dots', label: 'pill', bar: 'dots', rule: 'dots', orn: '❦', fx: 'petals', hover: 'float', tile: 'pill',
    copy: { kicker: 'From the park bench', dossier: 'Coven roll', trend: 'Seasons on the bench', builds: 'Coven spellbook', matchups: 'Tourists, mostly', matches: 'Bench log' },
  },
  {
    slug: 'bebop', concept: 'A scrap-iron golem’s junkyard: riveted plates, rust and the amber glow of a night job, with jazz on the radio.',
    mode: 'dark', bg: '#1a170e', accent: '#d97c3a', accent2: '#f2b374', hi: '#d1587a',
    font: 'alfa', frame: 'riveted', tex: 'mottle', label: 'chevron', bar: 'seg', rule: 'ticks', orn: '⚙︎', fx: 'sparks', hover: 'swing', tile: 'slab',
    copy: { kicker: 'From the iron yard', dossier: 'Iron yard file', trend: 'Night shifts', builds: 'Parts bin', matchups: 'Hook list', matches: 'After-hours log' },
  },
  {
    slug: 'billy', concept: 'Photocopied gig flyer: a sticker-outline panel, halftone dots and marker pen, in punk yellow.',
    mode: 'dark', bg: '#15140c', accent: '#f2cf1a', accent2: '#fff07a', hi: '#ff4a3a',
    font: 'marker', frame: 'sticker', tex: 'halftone', label: 'rect', bar: 'stripe', rule: 'zig', orn: '✷', fx: 'ash', hover: 'shake', tile: 'stamp',
    copy: { kicker: 'Gig flyer', dossier: 'Zine, issue 1', trend: 'Rage chart', builds: 'Setlist', matchups: 'Today’s grudges', matches: 'Mosh log' },
  },
  {
    slug: 'calico', concept: 'A contract killer’s sigil: neon-tube outlines and scanlines in the magenta of her key art.',
    mode: 'dark', bg: '#110e26', accent: '#d94cc4', accent2: '#f68ae6', hi: '#6b5ce6',
    font: 'orbitron', frame: 'neon', tex: 'scan', label: 'hex', bar: 'glow', rule: 'dash', orn: '◇', fx: 'glitter', hover: 'glitch', tile: 'chip',
    copy: { kicker: 'Contract file', dossier: 'Contract file', trend: 'Contract tally', builds: 'Toolkit', matchups: 'Marks', matches: 'Contracts' },
  },
  {
    slug: 'celeste', concept: 'The Dazzling Celeste on a Coney Island sideshow: marquee bulbs, striped canvas and confetti, in daylight cream.',
    mode: 'light', bg: '#fbf0e6', accent: '#e0407f', accent2: '#a31f58', hi: '#17b3ae',
    font: 'shrikhand', frame: 'marquee', tex: 'stripes', label: 'ribbon', bar: 'stripe', rule: 'dots', orn: '★', fx: 'confetti', hover: 'bounce', tile: 'ticket', art: 0.26,
    copy: { kicker: 'Now appearing', dossier: 'Sideshow bill', trend: 'Applause meter', builds: 'The act', matchups: 'Rival acts', matches: 'Showtimes' },
  },
  {
    slug: 'deadman-danny', concept: 'Fairfax-stamped teal on near-black, from his key art. Quiet until more of his kit is published.',
    mode: 'dark', bg: '#0d191b', accent: '#4fb0a4', accent2: '#9ee0d6', hi: '#c7864a',
    font: 'shoulders', frame: 'plain', tex: 'smooth', label: 'rect', bar: 'solid', rule: 'line', orn: '◆', fx: 'none', hover: 'lift', tile: 'plate',
    copy: { kicker: 'Stamped & filed', dossier: 'Filed record' },
  },
  {
    slug: 'drifter', concept: 'An ancient vampire who ignores the Baronies’ laws: torn paper, blood red on black and a bat’s-wing swoop.',
    mode: 'dark', bg: '#130808', accent: '#c9242e', accent2: '#ff7c76', hi: '#7a2030',
    font: 'fraktur', frame: 'torn', tex: 'smooth', label: 'jag', bar: 'solid', rule: 'zig', orn: '✠', fx: 'ash', hover: 'swoop', tile: 'slab',
    copy: { kicker: 'Wanted by the Baronies', dossier: 'Blood ledger', trend: 'Generations of the hunt', builds: 'Hunting kit', matchups: 'Prey', matches: 'Hunts' },
  },
  {
    slug: 'dynamo', concept: 'A professor’s blackboard: chalk-drawn borders, smudged slate and gold chalk, under a tiny dying star.',
    mode: 'dark', bg: '#11262a', accent: '#e6b04a', accent2: '#f8dc92', hi: '#5ec2b8',
    font: 'patrick', frame: 'chalk', tex: 'chalk', label: 'rect', bar: 'chalk', rule: 'dash', orn: '✺', fx: 'stars', hover: 'spin', tile: 'plate',
    copy: { kicker: 'Lecture notes', dossier: 'Faculty file', trend: 'On the blackboard', builds: 'Syllabus', matchups: 'Pop quiz', matches: 'Gradebook' },
  },
  {
    slug: 'graves', concept: 'A B-movie graveyard: cracked headstone panels, mottled earth and sickly green mist.',
    mode: 'dark', bg: '#12160a', accent: '#b9d41f', accent2: '#e3f65f', hi: '#7ba10c',
    font: 'creepster', frame: 'stone', tex: 'mottle', label: 'jag', bar: 'tally', rule: 'ticks', orn: '✠', fx: 'fog', hover: 'rise', tile: 'slab',
    copy: { kicker: 'Cemetery file', dossier: 'Plot record', trend: 'Séance log', builds: 'Ritual book', matchups: 'The restless', matches: 'Hauntings' },
  },
  {
    slug: 'grey-talon', concept: 'A retired monster hunter’s field journal: stitched leather, canvas weave and drifting leaves in forest teal.',
    mode: 'dark', bg: '#0e1f1e', accent: '#4aa68b', accent2: '#a0dcc4', hi: '#c9a05a',
    font: 'copse', frame: 'stitched', tex: 'weave', label: 'arrow', bar: 'solid', rule: 'dash', orn: '✧', fx: 'leaves', hover: 'peek', tile: 'tag',
    copy: { kicker: 'Hunter’s journal', dossier: 'Field notes', trend: 'Seasons in the field', builds: 'Quiver', matchups: 'Quarry', matches: 'Hunt log' },
  },
  {
    slug: 'haze', concept: 'A black-box agency file: classified brackets, typewriter type and black redaction bars on warm graphite, under a gold moon.',
    mode: 'dark', bg: '#1a1a16', accent: '#f0b02e', accent2: '#ffd980', hi: '#9c9c8c', art: 0.42,
    font: 'courier', frame: 'bracket', tex: 'scan', label: 'rect', bar: 'redact', rule: 'dash', orn: '■', fx: 'dust', hover: 'fade', tile: 'stamp',
    copy: { kicker: 'The unseen threat', dossier: 'Sandman Division file', trend: 'Surveillance log', builds: 'Field kit', matchups: 'Persons of interest', matches: 'Operations' },
  },
  {
    slug: 'infernus', concept: 'The bar where he works: dark wood counters, ember glow and heat that never quite goes out.',
    mode: 'dark', bg: '#14100f', accent: '#ff5a1f', accent2: '#ffa24c', hi: '#ffd34a',
    font: 'ultra', frame: 'wood', tex: 'embers', label: 'notch', bar: 'glow', rule: 'zig', orn: '✹', fx: 'embers', hover: 'burn', tile: 'slab',
    copy: { kicker: 'Last call', dossier: 'Bar tab', trend: 'Burn rate', builds: 'The menu', matchups: 'Troublemakers', matches: 'Tab history' },
  },
  {
    slug: 'ivy', concept: 'A gargoyle who adopted a family: soft stone, leaf-cut corners and ivy green over dusk purple.',
    mode: 'dark', bg: '#17131f', accent: '#9a68dc', accent2: '#cfb5f7', hi: '#6cc07c',
    font: 'fredoka', frame: 'leaf', tex: 'mottle', label: 'pill', bar: 'solid', rule: 'wave', orn: '✿', fx: 'leaves', hover: 'sway', tile: 'pill',
    copy: { kicker: 'Family album', dossier: 'Guardian’s file', trend: 'Growing season', builds: 'Hideout plans', matchups: 'Intruders', matches: 'Patrol log' },
  },
  {
    slug: 'kelvin', concept: 'An arctic expedition’s journal: frosted glass, icicle edges and thermometer ticks, in glacier blue and cream.',
    mode: 'dark', bg: '#0a1621', accent: '#4fb4e8', accent2: '#bfe8ff', hi: '#f1e6c8',
    font: 'gruppo', frame: 'frost', tex: 'frost', label: 'hex', bar: 'glow', rule: 'ticks', orn: '❄︎', fx: 'snow', hover: 'chill', tile: 'plate',
    copy: { kicker: 'Expedition log', dossier: 'Expedition roster', trend: 'Temperature chart', builds: 'Equipment list', matchups: 'Hazards', matches: 'Field readings' },
  },
  {
    slug: 'lady-geist', concept: 'High society from beyond: ghost-lit glass, Gilded Age flourishes and emerald mist.',
    mode: 'dark', bg: '#08150f', accent: '#1fbf78', accent2: '#86f4bc', hi: '#cdb36b',
    font: 'cormorant', frame: 'glass', tex: 'smooth', label: 'ribbon', bar: 'glow', rule: 'double', orn: '⚜︎', fx: 'fog', hover: 'flicker', tile: 'plate',
    copy: { kicker: 'High society', dossier: 'Society page', trend: 'Vital signs', builds: 'Bargains', matchups: 'Guest list', matches: 'Evenings out' },
  },
  {
    slug: 'lash', concept: 'Brash street signage: cut-corner panels, hatching and a stomp from above, in orange over steel blue.',
    mode: 'dark', bg: '#0e1621', accent: '#ff7d47', accent2: '#ffb78f', hi: '#4f8ed8',
    font: 'staatliches', frame: 'cut', tex: 'hatch', label: 'slash', bar: 'stripe', rule: 'zig', orn: '▼', fx: 'none', hover: 'dive', tile: 'chip',
    copy: { kicker: 'Look out below', dossier: 'Dive log', trend: 'Dive log', builds: 'Stomping gear', matchups: 'Landing zones', matches: 'Dive log' },
  },
  {
    slug: 'mcginnis', concept: 'A machine-shop drawing: blueprint grid, riveted steel and stencil lettering in drafting blue.',
    mode: 'dark', bg: '#0d1927', accent: '#4b92d6', accent2: '#a4d3ff', hi: '#e2793e',
    font: 'stardos', frame: 'riveted', tex: 'blueprint', label: 'rect', bar: 'seg', rule: 'ticks', orn: '✚', fx: 'sparks', hover: 'pop', tile: 'slab',
    copy: { kicker: 'Shop drawing', dossier: 'Work order', trend: 'Test results', builds: 'Blueprints', matchups: 'Stress tests', matches: 'Field tests' },
  },
  {
    slug: 'mina', concept: 'A society heiress turned vampire: gilded invitation frames, blood-red drips and a swarm of bats.',
    mode: 'dark', bg: '#14111c', accent: '#d9384c', accent2: '#ff909c', hi: '#d9b468',
    font: 'playfair', frame: 'drip', tex: 'damask', label: 'ribbon', bar: 'solid', rule: 'double', orn: '♥', fx: 'bats', hover: 'swoop', tile: 'card',
    copy: { kicker: 'The Ha family', dossier: 'Society page', trend: 'Courtship record', builds: 'Wedding registry', matchups: 'Seating chart', matches: 'Engagements' },
  },
  {
    slug: 'mirage', concept: 'A Djinn’s bodyguard: arched windows, lattice screens and drifting desert dust in violet and lamp gold.',
    mode: 'dark', bg: '#161029', accent: '#9b62e2', accent2: '#d3b4ff', hi: '#e2aa4a',
    font: 'almendra', frame: 'arch', tex: 'diamonds', label: 'chevron', bar: 'solid', rule: 'wave', orn: '✦', fx: 'dust', hover: 'sway', tile: 'plate',
    copy: { kicker: 'Bodyguard’s file', dossier: 'Attendant’s file', trend: 'Sands of time', builds: 'Wish list', matchups: 'Threats to the ambassador', matches: 'Escorts' },
  },
  {
    slug: 'mo-and-krill', concept: 'The Tunnel Rats’ burrow: plank-and-crate panels, layered earth and a puff of dust.',
    mode: 'dark', bg: '#19130b', accent: '#da8a2b', accent2: '#f6c46c', hi: '#6c9b58',
    font: 'sancreek', frame: 'wood', tex: 'strata', label: 'notch', bar: 'seg', rule: 'dash', orn: '◆', fx: 'dust', hover: 'rise', tile: 'tag',
    copy: { kicker: 'Tunnel Rats', dossier: 'Tunnel pass', trend: 'Dig log', builds: 'Tool shed', matchups: 'Trespassers', matches: 'Delivery log' },
  },
  {
    slug: 'nurse-harrow', concept: 'Clinical typewriter and burnt orange on black, from her key art. Quiet until more is published.',
    mode: 'dark', bg: '#14100c', accent: '#c97f3e', accent2: '#efb97c', hi: '#8a8a80',
    font: 'cutive', frame: 'plain', tex: 'smooth', label: 'rect', bar: 'solid', rule: 'line', orn: '✚', fx: 'none', hover: 'lift', tile: 'plate',
    copy: { kicker: 'Patient chart', dossier: 'Chart notes' },
  },
  {
    slug: 'paige', concept: 'A rare-book dealer’s daughter: parchment pages, ruled lines, a ribbon bookmark and drifting dust motes.',
    mode: 'light', bg: '#f3e9d2', accent: '#2f9e83', accent2: '#1b6b58', hi: '#b8742a',
    font: 'fell', frame: 'tome', tex: 'ruled', label: 'bookmark', bar: 'solid', rule: 'double', orn: '❦', fx: 'dust', hover: 'flip', tile: 'card', art: 0.22,
    copy: { kicker: 'Rare books', dossier: 'Library card', trend: 'Chapter by chapter', builds: 'Reading list', matchups: 'Cast of characters', matches: 'Checkout history' },
  },
  {
    slug: 'paradox', concept: 'A thieves’ guild with a pop-up museum: gallery frames, clock-ring pattern and stars, in magenta and electric blue.',
    mode: 'dark', bg: '#130c1f', accent: '#c955b9', accent2: '#f48ee3', hi: '#3fa3cc',
    font: 'josefin', frame: 'gallery', tex: 'rings', label: 'chevron', bar: 'seg', rule: 'ticks', orn: '◔', fx: 'stars', hover: 'spin', tile: 'card',
    copy: { kicker: 'On display', dossier: 'Exhibit file', trend: 'Timeline', builds: 'Heist plan', matchups: 'Targets', matches: 'Heists' },
  },
  {
    slug: 'pocket', concept: 'An heir in hiding: luggage leather, brass tags and a packed suitcase, in Fairfax gold.',
    mode: 'dark', bg: '#15130d', accent: '#d6a63c', accent2: '#f3d27a', hi: '#8d7bc4',
    font: 'bevan', frame: 'leather', tex: 'mottle', label: 'notch', bar: 'stitch', rule: 'stitch', orn: '◆', fx: 'none', hover: 'pop', tile: 'tag',
    copy: { kicker: 'Incognito', dossier: 'Alias file', trend: 'Paper trail', builds: 'Packing list', matchups: 'Who’s watching', matches: 'Trips' },
  },
  {
    slug: 'rat-king', concept: 'The warrens’ would-be monarch: gnawed paper edges, sewer brick and a dull red moon.',
    mode: 'dark', bg: '#170d0a', accent: '#c25328', accent2: '#f48f5c', hi: '#a4b24a',
    font: 'eater', frame: 'torn', tex: 'brick', label: 'jag', bar: 'seg', rule: 'zig', orn: '✷', fx: 'ash', hover: 'wobble', tile: 'stamp',
    copy: { kicker: 'Ratannia', dossier: 'Citizen of Ratannia', trend: 'Census', builds: 'Royal decree', matchups: 'Enemies of the crown', matches: 'Warren log' },
  },
  {
    slug: 'rem', concept: 'A stowaway from the dream world: soft cloud panels, a starfield and a crescent moon, in dream blue.',
    mode: 'dark', bg: '#0c0f2e', accent: '#7b86ff', accent2: '#bcc3ff', hi: '#f08cc4',
    font: 'sniglet', frame: 'blob', tex: 'stars', label: 'pill', bar: 'glow', rule: 'dots', orn: '☾', fx: 'stars', hover: 'float', tile: 'pill',
    copy: { kicker: 'Stowaway', dossier: 'Dream journal', trend: 'Sleep cycle', builds: 'Dream builds', matchups: 'Nightmares', matches: 'Night log' },
  },
  {
    slug: 'seven', concept: 'Escaped lightning: cut-corner panels, electric flicker and a gold burst.',
    mode: 'dark', bg: '#16110a', accent: '#f2a31f', accent2: '#ffd75c', hi: '#5ad2ff',
    font: 'bungee', frame: 'cut', tex: 'hex', label: 'jag', bar: 'seg', rule: 'zig', orn: '↯', fx: 'sparks', hover: 'zap', tile: 'chip',
    copy: { kicker: 'High voltage', dossier: 'Inmate file', trend: 'Power draw', builds: 'Wiring diagram', matchups: 'Targets', matches: 'Discharges' },
  },
  {
    slug: 'shiv', concept: 'A hunter with a criminal past: claw-slashed panels, blade hatching and dried-blood red.',
    mode: 'dark', bg: '#170d11', accent: '#e24d61', accent2: '#ff94a3', hi: '#a3a3bb',
    font: 'pirata', frame: 'claw', tex: 'hatch', label: 'slash', bar: 'ink', rule: 'zig', orn: '✶', fx: 'ash', hover: 'slash', tile: 'stamp',
    copy: { kicker: 'Baxter Society', dossier: 'Hunter’s roll', trend: 'Blood count', builds: 'Blades', matchups: 'Marked prey', matches: 'Hunts' },
  },
  {
    slug: 'silver', concept: 'A werewolf bounty hunter: wanted-poster paper under a blood-orange moon.',
    mode: 'dark', bg: '#1a0e0b', accent: '#ff6b2b', accent2: '#ffa475', hi: '#dccdb4', art: 0.36,
    font: 'rye', frame: 'torn', tex: 'mottle', label: 'ribbon', bar: 'solid', rule: 'dots', orn: '☾', fx: 'dust', hover: 'tilt', tile: 'stamp',
    copy: { kicker: 'Bounty board', dossier: 'Wanted poster', trend: 'Bounty tally', builds: 'Tools of the trade', matchups: 'Bounties', matches: 'Last night' },
  },
  {
    slug: 'sinclair', concept: 'The Magnificent Sinclair’s stage: velvet valance, diamond-pattern cards and gold, under a pale moon.',
    mode: 'dark', bg: '#0c1325', accent: '#e8c45a', accent2: '#fff0b3', hi: '#c8344a',
    font: 'limelight', frame: 'valance', tex: 'diamonds', label: 'notch', bar: 'dots', rule: 'dots', orn: '♠', fx: 'glitter', hover: 'flip', tile: 'ticket',
    copy: { kicker: 'Tonight only', dossier: 'Playbill', trend: 'The act so far', builds: 'Tricks of the trade', matchups: 'Audience volunteers', matches: 'Performances' },
  },
  {
    slug: 'solomon', concept: 'Chessboard checks and a golden sunburst on green, from his key art. Quiet until more is published.',
    mode: 'dark', bg: '#0d1c16', accent: '#d9b24f', accent2: '#f3dc92', hi: '#4f9a78',
    font: 'italiana', frame: 'plain', tex: 'checker', label: 'rect', bar: 'solid', rule: 'double', orn: '♞', fx: 'none', hover: 'lift', tile: 'plate',
    copy: { kicker: 'Opening move', dossier: 'Game record' },
  },
  {
    slug: 'the-doorman', concept: 'The Baroness Hotel’s lobby: black marble, gold Art Deco fans and double rules, with glitter in the air.',
    mode: 'dark', bg: '#0e0c08', accent: '#dba23a', accent2: '#f7d78c', hi: '#a63232',
    font: 'federo', frame: 'deco', tex: 'fans', label: 'hex', bar: 'solid', rule: 'double', orn: '❖', fx: 'glitter', hover: 'peek', tile: 'plate',
    copy: { kicker: 'The Baroness Hotel', dossier: 'Guest register', trend: 'Occupancy', builds: 'Concierge desk', matchups: 'Guest complaints', matches: 'Check-ins' },
  },
  {
    slug: 'venator', concept: 'The Sword of St. Benedict: chiselled stone, shafts of rose-window light and incense dust, in violet and altar gold.',
    mode: 'dark', bg: '#130f1e', accent: '#a35bcc', accent2: '#dbb4f3', hi: '#d9c27c',
    font: 'cinzel', frame: 'stone', tex: 'rays', label: 'rect', bar: 'seg', rule: 'double', orn: '✠', fx: 'dust', hover: 'lift', tile: 'plate',
    copy: { kicker: 'Sword of St. Benedict', dossier: 'Dispatch', trend: 'Observations', builds: 'Armory', matchups: 'Identified threats', matches: 'Dispatches' },
  },
  {
    slug: 'victor', concept: 'A mortuary-table awakening: stitched patchwork panels, typed toe tags and a galvanic green spark.',
    mode: 'dark', bg: '#1a1511', accent: '#c68b5b', accent2: '#f1c293', hi: '#7ec2a2',
    font: 'elite', frame: 'stitched', tex: 'weave', label: 'notch', bar: 'stitch', rule: 'stitch', orn: '✚', fx: 'none', hover: 'zap', tile: 'tag',
    copy: { kicker: 'Morgue tag', dossier: 'Toe tag', trend: 'Pulse', builds: 'Spare parts', matchups: 'Line-up', matches: 'Case notes' },
  },
  {
    slug: 'vindicta', concept: 'A Salem ghost with a rifle: scope-reticle frames, drifting mist and a pink moon over blue.',
    mode: 'dark', bg: '#0e1523', accent: '#e25a7c', accent2: '#ff9db7', hi: '#5b8bd2',
    font: 'grenze', frame: 'scope', tex: 'smooth', label: 'rect', bar: 'solid', rule: 'dash', orn: '✛', fx: 'fog', hover: 'peek', tile: 'plate',
    copy: { kicker: 'Salem, 1692', dossier: 'Trial record', trend: 'Range card', builds: 'Rifle rack', matchups: 'Targets', matches: 'Hunts' },
  },
  {
    slug: 'violet', concept: 'Crimson dragon scrollwork on purple-black, from her key art. Quiet until more is published.',
    mode: 'dark', bg: '#160e1d', accent: '#d33d5d', accent2: '#ff8fa5', hi: '#8f5bd1',
    font: 'rampart', frame: 'plain', tex: 'smooth', label: 'rect', bar: 'solid', rule: 'line', orn: '✦', fx: 'none', hover: 'sway', tile: 'plate',
    copy: { kicker: 'Dragon scroll', dossier: 'Scroll of record' },
  },
  {
    slug: 'viscous', concept: 'A psychic anemone in a goo body: jelly-round panels, rising bubbles and slime green.',
    mode: 'dark', bg: '#09190f', accent: '#33c46b', accent2: '#90f2ab', hi: '#d7f26c',
    font: 'wetpaint', frame: 'blob', tex: 'bubbles', label: 'pill', bar: 'glow', rule: 'wave', orn: '○', fx: 'bubbles', hover: 'squish', tile: 'pill',
    copy: { kicker: 'From the deep', dossier: 'Tide record', trend: 'Tide chart', builds: 'Reef plans', matchups: 'Predators', matches: 'Dives' },
  },
  {
    slug: 'vyper', concept: 'A career escape artist: cell-bar panels, halftone like her key art, snake-scale bars and prison orange on olive.',
    mode: 'dark', bg: '#13150a', accent: '#ea741b', accent2: '#ffa550', hi: '#8e9f3b',
    font: 'blackops', frame: 'cell', tex: 'halftone', label: 'notch', bar: 'scale', rule: 'stripe', orn: '≋', fx: 'dust', hover: 'slither', tile: 'tag',
    copy: { kicker: 'Booking file', dossier: 'Rap sheet', trend: 'Escape record', builds: 'Escape plans', matchups: 'Wants her dead', matches: 'Time served' },
  },
  {
    slug: 'warden', concept: 'A line of militant alchemists: shield-cut panels, plate hatching and a heavy tread, in steel and alchemist gold.',
    mode: 'dark', bg: '#11131f', accent: '#8499e0', accent2: '#c6d3ff', hi: '#d2a452',
    font: 'metamorphous', frame: 'shield', tex: 'hatch', label: 'chevron', bar: 'seg', rule: 'double', orn: '◆', fx: 'none', hover: 'stomp', tile: 'slab',
    copy: { kicker: 'Militant alchemist', dossier: 'Watch roster', trend: 'The long watch', builds: 'Alchemy kit', matchups: 'Threat assessment', matches: 'Patrols' },
  },
  {
    slug: 'wraith', concept: 'The city’s gambling boss: playing-card panels, pinstripes and drifting smoke, in indigo and house gold.',
    mode: 'dark', bg: '#0d0e25', accent: '#6e66f2', accent2: '#aaa5ff', hi: '#e1c262',
    font: 'abril', frame: 'card', tex: 'pinstripe', label: 'notch', bar: 'dots', rule: 'ticks', orn: '♠', fx: 'fog', hover: 'flip', tile: 'card',
    copy: { kicker: 'High stakes', dossier: 'House ledger', trend: 'Odds over time', builds: 'Stacked deck', matchups: 'The table', matches: 'Hands played' },
  },
  {
    slug: 'yamato', concept: 'The Seventh Moon’s heir: ink-wash panels cut on the diagonal, one red slash and falling petals.',
    mode: 'dark', bg: '#14111b', accent: '#e8463d', accent2: '#ff8b7b', hi: '#beb8d8',
    font: 'shippori', frame: 'kata', tex: 'ink', label: 'slash', bar: 'ink', rule: 'line', orn: '❖', fx: 'petals', hover: 'slash', tile: 'plate',
    copy: { kicker: 'Seventh Moon', dossier: 'Clan register', trend: 'Blade’s edge', builds: 'Arsenal', matchups: 'Rivals', matches: 'Duels' },
  },
];

const BY_SLUG = new Map(SKINS.map((s) => [s.slug, s]));

export const getSkin = (slug: string | undefined): HeroSkin | undefined => (slug ? BY_SLUG.get(slug) : undefined);
export const ALL_SKINS: readonly HeroSkin[] = SKINS;
