import { client } from '@utils/sanity-client';
import { PORTABLE_BODY } from './portableText';
import { mergeEditorialSubpages, ncStateSubpageFallbacks, resolveEditorialPage } from './editorialFallbacks';

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

export async function fetchNcStateOfRecreationParentPage() {
    return client.fetch(NC_STATE_PARENT_QUERY, { slug: NC_STATE_PARENT_SLUG });
}

export async function fetchNcStateOfRecreationSubpages() {
    const subpages = await client.fetch(NC_STATE_SUBPAGES_QUERY);

    return mergeFallbackSubpages(subpages);
}

export async function fetchNcStateOfRecreationSubpage(slug) {
    const page = await client.fetch(NC_STATE_SUBPAGE_QUERY, { slug });
    return resolveEditorialPage(page, ncStateSubpageFallbacks[slug]);
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
    return mergeEditorialSubpages(subpages, ncStateSubpageFallbacks);
}
