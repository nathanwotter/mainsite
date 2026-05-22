import { client } from '@utils/sanity-client';
import { PORTABLE_BODY } from './portableText';

export const NC_STATE_PARENT_SLUG = 'nc-state-of-recreation';
export const NC_STATE_BASE_PATH = `/recreation-futures-lab/${NC_STATE_PARENT_SLUG}`;

const NC_STATE_SUBPAGES_QUERY = `*[_type == "ncStateOfRecreationSubpage" && defined(slug.current)] | order(order asc, title asc) {
  title,
  shortTitle,
  menuTitle,
  intro,
  ${PORTABLE_BODY},
  "slug": slug.current
}`;

const NC_STATE_SUBPAGE_QUERY = `*[_type == "ncStateOfRecreationSubpage" && slug.current == $slug][0]{
  title,
  shortTitle,
  menuTitle,
  intro,
  ${PORTABLE_BODY},
  "slug": slug.current
}`;

const NC_STATE_PARENT_QUERY = `*[_type == "recreationFuturesSubpage" && slug.current == $slug][0]{
  title,
  shortTitle,
  intro,
  ${PORTABLE_BODY}
}`;

const FALLBACK_SUBPAGES = [
    {
        title: "This Semester's Showcase",
        shortTitle: 'Showcase',
        menuTitle: "This Semester's Showcase",
        slug: 'showcase'
    },
    {
        title: 'NC:State of Recreation Map',
        shortTitle: 'Map',
        menuTitle: 'NC:State of Recreation Map',
        slug: 'map'
    }
];

export async function fetchNcStateOfRecreationParentPage() {
    return client.fetch(NC_STATE_PARENT_QUERY, { slug: NC_STATE_PARENT_SLUG });
}

export async function fetchNcStateOfRecreationSubpages() {
    const subpages = await client.fetch(NC_STATE_SUBPAGES_QUERY);

    return mergeFallbackSubpages(subpages);
}

export async function fetchNcStateOfRecreationSubpage(slug) {
    return client.fetch(NC_STATE_SUBPAGE_QUERY, { slug });
}

export async function fetchNcStateOfRecreationSubpageSlugs() {
    const subpages = await client.fetch(`*[_type == "ncStateOfRecreationSubpage" && defined(slug.current)]{
      "slug": slug.current
    }`);

    return subpages.map(({ slug }) => slug).filter(Boolean);
}

export function toNcStateSecondaryNavItems(subpages = []) {
    return subpages
        .map((subpage) => {
            const title = subpage?.title;
            const shortTitle = subpage?.shortTitle || subpage?.menuTitle;
            const label = shortTitle || title;
            const slug = subpage?.slug;

            if (!title || !slug) {
                return null;
            }

            return {
                _type: 'actionLink',
                label,
                title,
                shortTitle,
                url: `${NC_STATE_BASE_PATH}/${slug}`,
                ariaLabel: title
            };
        })
        .filter(Boolean);
}

function mergeFallbackSubpages(subpages = []) {
    const merged = [...subpages];
    const seenSlugs = new Set(subpages.map((subpage) => subpage?.slug).filter(Boolean));

    for (const fallbackSubpage of FALLBACK_SUBPAGES) {
        if (!seenSlugs.has(fallbackSubpage.slug)) {
            merged.push(fallbackSubpage);
            seenSlugs.add(fallbackSubpage.slug);
        }
    }

    return merged;
}
