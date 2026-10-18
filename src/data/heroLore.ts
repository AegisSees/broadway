/**
 * Hero dossiers: a short title for the orange label over each hero's name, the hero's one-line role, and a few
 * sentences of biography.
 *
 * Sources:
 *  - `role` is quoted from the game's own hero text (citadel_heroes localization, `hero_*_role`). Heroes without a
 *    role line in the files have none here.
 *  - `bio` is our paraphrase of the in-game biography (`hero_*_lore` in the same file). Titles are drawn from it.
 *  - Lash's in-game biography is a single joke line, so his dossier also uses his voice lines (via the Deadlock wiki).
 *  - The City Never Sleeps heroes are not in the uploaded game files yet: Solomon, Deadman Danny and Violet are
 *    paraphrased from their in-game introductions (as quoted by Deadlock Labs); Nurse Harrow has no published
 *    biography, so hers says only what her poster and intro lines say.
 */
export interface HeroLore {
  /** Shown on the orange label above the hero's name. */
  title: string;
  /** The game's own one-line description of how the hero plays. */
  role?: string;
  /** Two or three sentences of biography. */
  bio: string[];
  /** Where the biography comes from, shown under it. */
  from: 'game' | 'intro' | 'voice' | 'pending';
}

export const HERO_LORE: Record<string, HeroLore> = {
  abrams: {
    title: 'The hard-boiled detective',
    role: 'Charges into close combat',
    bio: [
      'Hard hitting, hard headed and hard drinking, Detective Abrams has worked New York cases for years, from stolen art to ritual murders, and he solves them.',
      'Then he found The Tome on his desk with a note in onyx blood: "Don’t let them have it."',
      'His home has been broken into, his office tossed three times and his car firebombed since, so he means to find out what is going on.',
    ],
    from: 'game',
  },
  apollo: {
    title: 'Captain of the Blackmore blades',
    bio: [
      'With political violence tearing through North Ixia, Apollo was sent to New York for his own safety and enrolled at Blackmore Academy.',
      'Unimpressed by what he calls a sea of aggressive mediocrity, he skips the parties and trains as captain of the school’s fencing team.',
      'He is waiting for his father to call him home, where he will prove himself worthy of his family’s ancestral blade.',
    ],
    from: 'game',
  },
  baba: {
    title: 'The Central Park pigeon lady',
    bio: [
      'Feeding spirit pigeons from the same park bench, rain or shine, Baba is less an old woman than a New York institution.',
      'Some say she leads the Soho Coven. Nobody says it to her face.',
      'She is a New Yorker first, and she will not sit back while outsiders tear Manhattan apart in pursuit of power.',
    ],
    from: 'game',
  },
  bebop: {
    title: 'The junkyard’s son',
    role: 'Hooks an enemy for a knockout combo',
    bio: [
      'Bebop was built from scrap by a widowed junkyard attendant, Miss Shelly, who raised him as the son she never had.',
      'They worked the iron yard by day and listened to jazz at night.',
      'Now she is ill, and Bebop pays for her medicine with night work she would never approve of. What she does not know cannot hurt her.',
    ],
    from: 'game',
  },
  billy: {
    title: 'A white-hot ball of rage',
    bio: [
      'Billy is furious at something. Maybe the cops, maybe magic regulations, maybe the service at the gyro place downtown (not the good one, the other one).',
      'Do not ask him how he got the goat head.',
    ],
    from: 'game',
  },
  calico: {
    title: 'Monster hunter turned hired gun',
    role: 'Wreaks havoc from the sidelines',
    bio: [
      'Calico was a decorated member of the Baxter Society until she worked out that killing monsters for free paid worse than killing people for money.',
      'Now a contract killer in high demand, she is living her best life ending someone else’s.',
    ],
    from: 'game',
  },
  celeste: {
    title: 'The Dazzling Celeste',
    bio: [
      'Celeste is a unicorn hiding in plain sight as a star attraction of a Coney Island side show, where everyone assumes the horn is part of the act.',
      'Her found family there means more to her than the applause, so when one of them sold part of their soul to cover a gambling debt, she stepped out of the shadows to win it back.',
      'Showing her power to the Patrons is a risk, but that is tomorrow’s problem.',
    ],
    from: 'game',
  },
  'deadman-danny': {
    title: 'Fairfax’s crash-test man',
    bio: [
      'Danny works for Fairfax Industries and is giving a presentation at a military technology expo.',
      'He jokes that Fairfax knows nothing about safety, and that he has been hurt, and killed, in more ways than he can list.',
      'He puts himself in danger so the company can learn how things fail. Today the demonstration is flight, in the Chimera Mk1.',
    ],
    from: 'intro',
  },
  drifter: {
    title: 'The nameless vampire',
    bio: [
      'An ancient vampire roaming America, the Drifter has preyed on the living for generations.',
      'He has no use for finery or titles and open contempt for vampire law, so Viscounts and Elders across the North American Baronies want him executed.',
      'He does as he pleases anyway.',
    ],
    from: 'game',
  },
  dynamo: {
    title: 'The professor who became a star',
    role: 'Locks down the enemy team',
    bio: [
      'When a rift in space and time opened in Central Park, Professor Dynamo was first on the scene, and his body was atomized into a tiny dying star.',
      'His mind and his curiosity survived. He still teaches at Columbia College while he studies his condition; he has future minds to inspire.',
    ],
    from: 'game',
  },
  graves: {
    title: 'The lich’s apprentice',
    bio: [
      'Darcy Graves grew up between two busy defense attorneys and found the cemetery the only place anyone listened.',
      'One day a voice answered: a lich’s severed hand, buried in a lead-lined box in Van Cortlandt Park, looking for a student.',
      'Now a fledgling necromancer at Blackmore Academy, she balances homework with the unfinished business of the dead.',
    ],
    from: 'game',
  },
  'grey-talon': {
    title: 'Founder of the Baxter Society',
    role: 'Delivers long range skill-shots',
    bio: [
      'Wesley Grey Talon hunted monsters for nearly forty years before he set down his bow to spend his retirement with his family.',
      'Then his son’s house burned with everyone inside. His son’s wife was an Ixian who could snuff out flame with a thought, so he knows it was no accident.',
      'He has picked up the bow again, and there will be a reckoning.',
    ],
    from: 'game',
  },
  haze: {
    title: 'The unseen threat',
    role: 'Sneaks in and sprays bullets',
    bio: [
      'Haze serves the Occult Security and Investigation Commission, a black-box agency that makes the CIA look transparent.',
      'As a member of its Sandman Division, she slips into the dreams of persons of interest to judge how dangerous they are, and when needed, puts them to sleep.',
    ],
    from: 'game',
  },
  holliday: {
    title: 'The small-town sheriff',
    role: 'Bounces about dispensing trick shots',
    bio: [
      'Holliday was happy as a small-town sheriff whose gun only came out for trick shooting at the county fair, until bodies started turning up in central Illinois, torn open as if by birds.',
      'She cornered the killer, a travelling musician the papers called the Troubadour, and he burst into a murder of crows.',
      'She believes he is headed for New York, and when she finds him she will finish it.',
    ],
    from: 'game',
  },
  infernus: {
    title: 'The reformed firestarter',
    role: 'Lights up enemies and watches them burn',
    bio: [
      'A creature from another plane with a mastery of fire, Infernus spent a wild youth on arson, murder and evidence disposal.',
      'He has mellowed out and works at a bar with good live music, but when a customer turns violent, the old skills come back out.',
    ],
    from: 'game',
  },
  ivy: {
    title: 'The gargoyle of Spanish Harlem',
    role: 'Sets up a power duo with a lucky ally',
    bio: [
      'Ivy woke as a gargoyle in the middle of an attack on the Arroyo family, drove the attackers off, and was named by little Sophia (she was covered in ivy at the time).',
      'For eighteen years she fought the Mendoza Syndicate until Spanish Harlem was free of it.',
      'With that done, she is ready to see what the world has to offer beyond vigilante justice.',
    ],
    from: 'game',
  },
  kelvin: {
    title: 'The explorer who came back frozen',
    role: 'Freezes enemies in their tracks',
    bio: [
      'Adventuring scientist Kelvin led an expedition to find an eighth astral gate rumoured to lie in the Arctic. No one came back.',
      'A year and a half later a fishing trawler found his frozen body clutching a rune-etched stone, and he opened his eyes. No pulse, no blood, and yet alive.',
      'He has no memory of the expedition and wants answers.',
    ],
    from: 'game',
  },
  'lady-geist': {
    title: 'Oathkeeper’s keeper',
    role: 'Sacrifices health then drains it back',
    bio: [
      'Once the toast of high society, Lady Jeanne Geist was fading in a nursing home when the spirit Oathkeeper offered her youth in exchange for draining the living.',
      'She took the deal, then bound and warded him so he would feed on her terms, not his.',
      'Decades on, the ward is weakening and Oathkeeper is hungrier than ever.',
    ],
    from: 'game',
  },
  lash: {
    title: 'Champion of the Bear Pit',
    role: 'Dives down to stomp his foes',
    bio: [
      'The game’s own biography for Jacob Lash is one line long, and it calls him a jerk.',
      'He is the vain, loud champion of the Bear Pit, an underground fight club, and his one famous loss is to Bebop, whom he has never forgiven.',
      'He wants the whole world to see how great he is.',
    ],
    from: 'voice',
  },
  mcginnis: {
    title: 'Head of Fairfax R&D',
    role: 'Controls the battle with combat turrets',
    bio: [
      'Maggie McGinnis rebuilt landmarks from Lincoln Logs at four, rewired a light fixture at ten, and at fifteen designed a machine that refined the souls of the dead.',
      'Now head of military R&D at Fairfax Industries, she works in the machine shop, not the lab. To her, science is magic you can touch.',
    ],
    from: 'game',
  },
  mina: {
    title: 'The fledgling vampire heiress',
    bio: [
      'Mina Ha was set to marry into American royalty until her fiancé was assassinated, and she mourned the future, not the man.',
      'Her parents made it up to her by paying a vampire to make her immortal.',
      'Vampire high society does not care who she was, so she is learning its rules in order to bend them. She will be Viscount of New York.',
    ],
    from: 'game',
  },
  mirage: {
    title: 'Bodyguard to the Djinn',
    role: 'Times his shots and catches fleeing targets',
    bio: [
      'Djinn cannot hold a body for more than 48 minutes without resting in a vessel, so most of them employ human bodyguards.',
      'Mirage protects the Djinn ambassador Nashala Dion, in New York to negotiate buying part of Wyoming from the US government as a homeland for her people.',
    ],
    from: 'game',
  },
  'mo-and-krill': {
    title: 'The Tunnel Rats',
    role: 'Burrows underneath his enemies',
    bio: [
      'Mo and Krill belong to the Tunnel Rats, who smuggle goods between the boroughs through a network of underground tunnels.',
      'When a gang tries to use the tunnels for its own vendettas, the two of them remind the city what happens to people who abuse their hospitality.',
    ],
    from: 'game',
  },
  'nurse-harrow': {
    title: 'Be not afraid',
    bio: [
      'Valve has not published Nurse Harrow’s biography yet.',
      'What she has said so far: you will address her as Nurse Harrow, and she tolerates no disobedience. Her ballot poster promises "Be Not Afraid."',
    ],
    from: 'pending',
  },
  paige: {
    title: 'The bibliomancer',
    bio: [
      'Paige grew up in a rare book dealer’s loving home, while her rebellious little brother Bryce chafed at the magic their parents forbade.',
      'One day she came home from the library to find him gone and her parents in tears, and they have never said why.',
      'Now a bibliomancer reading stories in libraries across the boroughs, she is determined to find him, and no one will stand in her way.',
    ],
    from: 'game',
  },
  paradox: {
    title: 'The inevitable thief',
    role: 'Manipulates Space and Time',
    bio: [
      'Paradox is an artifact of time and the name of a notorious thieves’ guild that robs the most untouchable people and institutions.',
      'Its members wear masks and share the name, and they show off the loot in pop-up museums to prove no one is out of reach.',
    ],
    from: 'game',
  },
  pocket: {
    title: 'The hidden Fairfax heir',
    role: 'Infiltrates and disrupts the backline',
    bio: [
      'Arin Fairfax, eldest heir to Fairfax Industries, was shot and left for dead on their eighteenth birthday, and has lived in hiding for five years.',
      'Anyone in that company could be behind it.',
      'As Pocket, Arin keeps their real name secret, for safety and to become someone other than their parents’ child.',
    ],
    from: 'game',
  },
  'rat-king': {
    title: 'Ruler of the Warrens',
    bio: [
      'The cryptid ruler of New York’s Warrens towers over his subjects in size, strength and ambition.',
      'His plan: take Long Island, declare it the sovereign nation of Ratannia, and remove every human who will not leave.',
      'It is an airtight plan, but he is summoning the Patron to hedge his bets.',
    ],
    from: 'game',
  },
  rem: {
    title: 'The stowaway from dreams',
    bio: [
      'Rem slipped out of the world of dreams by accident and is stranded in the city that never sleeps.',
      'He and his helpful friends wander the five boroughs looking for a way home. If you nod off on the Blue line, you may have met them.',
    ],
    from: 'game',
  },
  seven: {
    title: 'The man who would not die',
    role: 'Electrocutes crowds of enemies',
    bio: [
      'Seven believed rules were for lesser men, and his crimes landed him in Lost Whisper, a prison for the most dangerous occultists.',
      'At his execution, wards laid by ritualists from seven nations failed. He laughed as he tore free and killed his captors.',
      'He is still laughing, and he is on his way to New York City.',
    ],
    from: 'game',
  },
  shiv: {
    title: 'The Baxter Society’s rough edge',
    role: 'Bleeds out foes, then goes in for a kill',
    bio: [
      'Shiv is a loyal member of the Baxter Society, an international order of monster hunters, and travels North America putting down creatures that prey on the living.',
      'His criminal past and rough manners make the older members wary, but nobody argues with his results.',
    ],
    from: 'game',
  },
  silver: {
    title: 'The werewolf bounty hunter',
    bio: [
      'Lilah Silver drinks too much, smokes too much, and her personal life is best left alone.',
      'She is still a successful bounty hunter. She credits her intuition; being a werewolf does not hurt.',
    ],
    from: 'game',
  },
  sinclair: {
    title: 'Two magicians, one soul',
    role: 'Misdirect and hex enemies',
    bio: [
      'Stage magicians Henry and Savannah fell in love in high school, married after graduation, and had a blood mystic bind their souls for eternity.',
      'Then an on-stage accident killed them both, and each blames the other.',
      'Bound together, neither can move on, so the bickering ghosts must cooperate to undo their eternal union.',
    ],
    from: 'game',
  },
  solomon: {
    title: 'The chess player',
    bio: [
      'Solomon is a calm, attentive listener who likes to give advice.',
      'His chess opponents run from tourists and criminals to business leaders.',
      'To him the board is a way to meet anyone on equal terms, and the game matters more than who wins it.',
    ],
    from: 'intro',
  },
  'the-doorman': {
    title: 'The Baroness Hotel’s doorman',
    bio: [
      'Proper and polite, the humble Doorman of the Baroness Hotel is more than he seems.',
      'He meant to spend only a few weeks on this plane, then found that New York’s service industry is a fine place to study the strange things humans want.',
    ],
    from: 'game',
  },
  venator: {
    title: 'The Sword of St. Benedict',
    bio: [
      'The Venators of St. Benedict are a Vatican-sanctioned order sent wherever supernatural predators gather: observe, identify, exterminate.',
      'One of them stands apart, a man whose hardened heart lets him pay terrible prices for the greater good, and he has been sent to New York again.',
    ],
    from: 'game',
  },
  victor: {
    title: 'Woken on a mortuary table',
    bio: [
      'Victor woke on a mortuary table with no idea who built him, why, or whose parts he is made of.',
      'He searches the five boroughs for anyone who can identify a piece of him.',
    ],
    from: 'game',
  },
  vindicta: {
    title: 'The ghost of Salem',
    role: 'Snipes the unsuspecting',
    bio: [
      'Vindicta died at the hands of John Hathorne in the Salem witch trials and returned when the first Maelstrom brought the supernatural into public view.',
      'She wages a one-ghost war on the Friends of Humanity, a new inquisition founded by Hathorne’s descendants, and does not mind how many bodies it takes.',
    ],
    from: 'game',
  },
  violet: {
    title: 'The rising artist',
    bio: [
      'Violet moved to The Cursed Apple at twelve and fell for the energy of New York.',
      'She won a full scholarship to art school and, in her junior year, a place in a MoMA student-artist showcase.',
      'She is afraid of failing, and sees The Ritual as her chance to finally be seen.',
    ],
    from: 'intro',
  },
  viscous: {
    title: 'The psychic anemone',
    role: 'Rolls around deflecting bullets',
    bio: [
      'The Bermuda Triangle is a shadowline nexus deep in the Atlantic, and something predatory called the Adversary now hunts the seas.',
      'A psychic sea anemone grew a body of ectoplasmic goo to walk the surface, and as Viscous it is trying to summon the Patrons to keep the Deep safe.',
    ],
    from: 'game',
  },
  vyper: {
    title: 'The escape artist',
    role: 'Slither in and assassinate enemies',
    bio: [
      'Vyper is bad at not getting caught and very good at breaking out.',
      'She has done time in every major prison in the tri-state area and built a network of lowlifes who owe her one, and another who want her dead. She tries to focus on the positive.',
    ],
    from: 'game',
  },
  warden: {
    title: 'Sworn against the Patrons',
    role: 'Weakens his enemies and chases them down',
    bio: [
      'Warden comes from a line of militant alchemists who trained for a mystic apocalypse, until the warnings became grandparents’ stories.',
      'When the portal opened in Central Park, his parents learned it was all true and they were unprepared.',
      'Warden was trained from birth for one purpose: stopping the Patrons from ever entering our world.',
    ],
    from: 'game',
  },
  wraith: {
    title: 'Boss of New York gambling',
    role: 'Melts isolated targets',
    bio: [
      'Wraith runs the heart of the New York gambling scene, and her organization is an open secret.',
      'Thanks to bribes, shakedowns and blackmail, she knows she is above the law.',
    ],
    from: 'game',
  },
  yamato: {
    title: 'Heir of the Seventh Moon',
    role: 'Delivers charged attacks with finesse',
    bio: [
      'Karin and her brother Yamato inherited the Seventh Moon crime family and planned its move to America together, until a violent revolt in Japan.',
      'Yamato died protecting her, and she fled to America with a few loyal followers.',
      'The man who met her there called her "Yamato." She let the name stand, to keep her brother’s memory and his dream alive.',
    ],
    from: 'game',
  },
};

export const getLore = (slug: string | undefined): HeroLore | undefined => (slug ? HERO_LORE[slug] : undefined);

export const LORE_SOURCE: Record<HeroLore['from'], string> = {
  game: 'Paraphrased from the in-game hero biography.',
  intro: 'Paraphrased from the hero’s in-game introduction.',
  voice: 'From the in-game biography and the hero’s voice lines.',
  pending: 'Valve has not published this hero’s biography yet. This card fills in when it does.',
};
