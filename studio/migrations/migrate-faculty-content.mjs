import {getCliClient} from 'sanity/cli'
import {
  aboutNathanSubpageFallbacks,
  foodPageFallback,
  homePageFallback,
  ncStateSubpageFallbacks,
  recreationFuturesPageFallback,
  recreationFuturesSubpageFallbacks,
  teachingPageFallback,
  teachingSubpageFallbacks,
} from '../../src/data/editorialFallbacks.js'

const client = getCliClient({apiVersion: '2026-10-01'})

const migrations = [
  {type: 'homePage', content: homePageFallback},
  {type: 'teachingPage', content: teachingPageFallback},
  {type: 'recreationFuturesPage', content: recreationFuturesPageFallback},
  {type: 'foodPage', content: foodPageFallback},
  ...Object.values(teachingSubpageFallbacks).map((content) => ({type: 'teachingSubpage', content})),
  ...Object.values(recreationFuturesSubpageFallbacks).map((content) => ({
    type: 'recreationFuturesSubpage',
    content,
  })),
  ...Object.values(ncStateSubpageFallbacks).map((content) => ({
    type: 'ncStateOfRecreationSubpage',
    content,
  })),
  ...Object.values(aboutNathanSubpageFallbacks).map((content) => ({
    type: 'aboutNathanSubpage',
    content,
  })),
]

function documentId(type, slug) {
  return `faculty-migration-${type}${slug ? `-${slug}` : ''}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
}

function fieldsFor(content) {
  return Object.fromEntries(
    Object.entries(content)
      .filter(([key, value]) => key !== 'slug' && value !== undefined)
      .map(([key, value]) => [key, value]),
  )
}

async function migrate({type, content}) {
  const slug = content.slug
  const existing = slug
    ? await client.fetch(`*[_type == $type && slug.current == $slug][0]{_id}`, {type, slug})
    : await client.fetch(`*[_type == $type][0]{_id}`, {type})

  const fields = fieldsFor(content)

  if (existing?._id) {
    await client.patch(existing._id).set(fields).commit()
    console.log(`Updated ${type}${slug ? `/${slug}` : ''}`)
    return
  }

  await client.create({
    _id: documentId(type, slug),
    _type: type,
    ...fields,
    ...(slug ? {slug: {_type: 'slug', current: slug}} : {}),
  })
  console.log(`Created ${type}${slug ? `/${slug}` : ''}`)
}

for (const migration of migrations) {
  await migrate(migration)
}

console.log(`Migrated ${migrations.length} editable documents to Sanity.`)
