// Exhibition content. Each stop is either a text panel or an artwork with a
// label panel beside it. Stops are listed in the order of the walking route;
// where each one hangs is set by STOP_LAYOUT in js/main.js.
const EXHIBITION = {
  eyebrow: 'Indigenous Religions Project',
  title: 'Native American Religions',
  question: 'What is most misunderstood or overlooked about Native American religions?',
  rooms: ['Gallery I: Spirit and Ceremony', 'Gallery II: Traditional Healing'],
};

const STOPS = [
  {
    type: 'text',
    room: 0,
    eyebrow: 'Indigenous Religions Project',
    title: 'Native American Religions',
    subtitleLabel: 'Research Question:',
    subtitle: 'What is most misunderstood or overlooked about Native American religions?',
    body: [
      'There is heavy diversity in Native American religions and traditions. There have been over 300 Native languages.',
      'Unlike some other religions, there is an emphasis placed on actively participating in religion; arguments around religious truth and theory are less prevalent.',
      'Follow the arrows on the floor. Gallery I looks at spirit and ceremony; Gallery II looks at traditional healing.',
    ],
    source: '“Native American religions.” Britannica Academic, Encyclopædia Britannica, 20 Dec. 2021.',
  },
  {
    type: 'art',
    room: 0,
    title: 'Canteen with a Katsina-like Face',
    artist: 'Hopi (Pueblo)',
    date: '1890',
    medium: 'Ceramic, slip · The Cleveland Museum of Art',
    description:
      'Traditional Hopi artwork style made on canteens. These canteens are popular for their “big-bellied” designs. The face on this canteen is meant to resemble Katsina, a spirit important to the Pueblo religion. This religion is centered around the southwest of America.',
    source: 'Canteen with a Katsina-like Face. 1890, The Cleveland Museum of Art; Gift of Amelia Elizabeth White. JSTOR.',
    image: 'images/katsina-canteen.jpg',
  },
  {
    type: 'art',
    room: 0,
    title: 'Sun Worship in Montana',
    artist: 'Charles M. Russell (American, 1864–1926)',
    date: '1907',
    medium: 'Opaque and transparent watercolor over graphite on paper · Amon Carter Museum of American Art',
    description:
      'This depiction shows a Native American woman holding up a baby. The colorful dresses and clothing represent traditional Native American attire and traditions. The woman is performing worship of the sun.',
    source: 'Charles M. Russell. Sun Worship in Montana. 1907, Amon Carter Museum of American Art, Fort Worth, Texas. JSTOR.',
    image: 'images/sun-worship-montana.jpg',
  },
  {
    type: 'art',
    room: 0,
    title: 'IOWA 1840',
    artist: 'Oscar Howe (1915–1983), et al.',
    date: '1952',
    medium: 'The Szwedzicki Portfolios · Public Library of Cincinnati & Hamilton County',
    description:
      'Drawing of a Native American man wearing a traditional outfit. This artwork is from a repository of various North American Indian costumes. This religion in specific is about the Iowa tribe, which is currently at risk for extinction. This religion is based on the Winnebago’s and the Iowa tribe is closely related to surrounding tribes including the Otos, Missouris, and Poncas. The Iowa Native tribes practice Meskwaki and Ho-Chunk religions focused on spirituality and animism.',
    source: 'Howe, Oscar, et al. IOWA 1840. 1952, Public Library of Cincinnati & Hamilton County. The Szwedzicki Portfolios. JSTOR.',
    image: 'images/iowa-1840.jpg',
  },
  {
    type: 'art',
    room: 1,
    title: 'An American Indian Medicine Man Attending a Sick Child',
    artist: 'Valentine Walter Bromley',
    date: '',
    medium: 'Wellcome Collection',
    description:
      'An American Indian man who is tending to a sick child. He seems to be engaging in a traditional religious practice aiming to cure him. He seems to be praying toward the sun holding a spear and a round object.',
    source: 'Valentine Walter Bromley. An American Indian Medicine Man Attending a Sick Child. Wellcome Collection. JSTOR.',
    image: 'images/medicine-man-sick-child.jpg',
  },
  {
    type: 'art',
    room: 1,
    title: 'Medicine Man and Patient: The Parts Affected Are Rubbed',
    artist: 'Unknown',
    date: '',
    medium: 'Wellcome Collection',
    description:
      'A medicine man kneels beside a patient lying on the ground and rubs the parts of the body that are affected. Healing in many Native American traditions is a religious practice as well as a physical one.',
    source: 'Medicine Man and Patient: The Parts Affected Are Rubbed. Wellcome Collection. JSTOR.',
    image: 'images/medicine-man-patient.jpg',
  },
  {
    type: 'text',
    room: 1,
    eyebrow: 'Our answer',
    title: 'Response to the Research Question',
    subtitleLabel: 'Research Question:',
    subtitle: 'What is most misunderstood or overlooked about Native American religions?',
    body: [
      'The most overlooked fact is that there is no single “Native American religion.” There are hundreds of different traditions, shaped by over 300 Native languages, from the Katsina spirits of the Pueblo religion to the Meskwaki and Ho-Chunk religions of the Iowa tribe.',
      'These religions are often misunderstood as a set of beliefs to argue about. Instead, they focus on actively participating, through ceremonies like sun worship and healing practices like those of the medicine men in Gallery II.',
      'They are also not frozen in the past. “Indigenous” has no single definition, these religions have developed immensely over the centuries, and language, including English, is still key to them today. Some, like the religion of the Iowa tribe, are now at risk of disappearing.',
    ],
    source: '“Native American religions.” Britannica Academic, 20 Dec. 2021; Alles, Gregory D. “The Study of Indigenous Religions.” Oxford Research Encyclopedia of Religion, 24 May 2023.',
  },
];
