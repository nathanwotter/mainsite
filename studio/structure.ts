import type {StructureBuilder, StructureResolver} from 'sanity/structure'

export const singletonTypes = new Set([
  'homePage',
  'teachingPage',
  'recreationFuturesPage',
  'foodPage',
  'aboutNathanPage',
  'siteConfig',
])

const singletonDocuments = {
  homePage: '40a42760-1728-450c-9a7c-b4871948c5ef',
  teachingPage: '4d38843b-8f08-48e5-863c-c9161ef23d42',
  recreationFuturesPage: '61181ca2-7d76-40d2-9261-0c97b72224ca',
  foodPage: 'faculty-migration-foodpage',
  aboutNathanPage: 'c0fb52c4-c9dc-4cac-8975-08218ca854a3',
  siteConfig: 'b977138b-d19c-42e4-9449-cdbbbf661756',
} as const

function singletonItem(
  S: StructureBuilder,
  schemaType: keyof typeof singletonDocuments,
  title: string,
) {
  return S.listItem()
    .id(schemaType)
    .title(title)
    .schemaType(schemaType)
    .child(
      S.document()
        .id(`${schemaType}-editor`)
        .schemaType(schemaType)
        .documentId(singletonDocuments[schemaType])
        .title(title),
    )
}

export const structure: StructureResolver = (S) =>
  S.list()
    .id('otter-adventures-content')
    .title('Otter Adventures')
    .items([
      singletonItem(S, 'homePage', 'Home'),
      S.divider(),
      S.listItem()
        .id('teaching')
        .title('Teaching')
        .child(
          S.list()
            .id('teaching-content')
            .title('Teaching')
            .items([
              singletonItem(S, 'teachingPage', 'Teaching overview'),
              S.documentTypeListItem('teachingSubpage').title('Courses'),
            ]),
        ),
      S.listItem()
        .id('recreation-futures')
        .title('Recreation Futures Lab')
        .child(
          S.list()
            .id('recreation-futures-content')
            .title('Recreation Futures Lab')
            .items([
              singletonItem(S, 'recreationFuturesPage', 'Lab overview'),
              S.documentTypeListItem('recreationFuturesSubpage').title('Projects'),
              S.documentTypeListItem('ncStateOfRecreationSubpage').title('NC:State of Recreation'),
            ]),
        ),
      S.listItem()
        .id('food')
        .title('Food')
        .child(
          S.list()
            .id('food-content')
            .title('Food')
            .items([
              singletonItem(S, 'foodPage', 'Food overview'),
              S.documentTypeListItem('foodSubpage').title('Food pages'),
            ]),
        ),
      S.listItem()
        .id('about-nathan')
        .title('About Nathan')
        .child(
          S.list()
            .id('about-nathan-content')
            .title('About Nathan')
            .items([
              singletonItem(S, 'aboutNathanPage', 'About overview'),
              S.documentTypeListItem('aboutNathanSubpage').title('Resources and contact'),
            ]),
        ),
      S.documentTypeListItem('recxrSite').title('RecXR sites'),
      S.divider(),
      singletonItem(S, 'siteConfig', 'Site settings'),
    ])
