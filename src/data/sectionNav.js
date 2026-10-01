import { client } from '@utils/sanity-client';
import { aboutNathanSubpageFallbacks, mergeEditorialSubpages, recreationFuturesSubpageFallbacks, teachingSubpageFallbacks } from './editorialFallbacks';

export const TEACHING_BASE_PATH = '/teaching';
export const FOOD_BASE_PATH = '/food';
export const ABOUT_NATHAN_BASE_PATH = '/about-nathan';
export const RECREATION_FUTURES_BASE_PATH = '/recreation-futures-lab';

const TEACHING_SUBPAGES_QUERY = `*[_type == "teachingSubpage" && defined(slug.current)] | order(order asc, title asc) {
  title,
  shortTitle,
  menuTitle,
  intro,
  order,
  "slug": slug.current
}`;

const FOOD_SUBPAGES_QUERY = `*[_type == "foodSubpage" && defined(slug.current)] | order(order asc, title asc) {
  title,
  shortTitle,
  menuTitle,
  "slug": slug.current
}`;

const ABOUT_NATHAN_SUBPAGES_QUERY = `*[_type == "aboutNathanSubpage" && defined(slug.current)] | order(order asc, title asc) {
  title,
  shortTitle,
  menuTitle,
  intro,
  order,
  "slug": slug.current
}`;

const RECREATION_FUTURES_SUBPAGES_QUERY = `*[_type == "recreationFuturesSubpage" && defined(slug.current)] | order(order asc, title asc) {
  title,
  shortTitle,
  menuTitle,
  intro,
  order,
  "slug": slug.current
}`;

export async function fetchTeachingSubpages() {
    const subpages = await client.fetch(TEACHING_SUBPAGES_QUERY);
    return mergeEditorialSubpages(subpages, teachingSubpageFallbacks);
}

export async function fetchFoodSubpages() {
    return client.fetch(FOOD_SUBPAGES_QUERY);
}

export async function fetchAboutNathanSubpages() {
    const subpages = await client.fetch(ABOUT_NATHAN_SUBPAGES_QUERY);
    return mergeEditorialSubpages(subpages, aboutNathanSubpageFallbacks);
}

export async function fetchRecreationFuturesSubpages() {
    const subpages = await client.fetch(RECREATION_FUTURES_SUBPAGES_QUERY);
    return mergeEditorialSubpages(subpages, recreationFuturesSubpageFallbacks);
}

export function toSectionNavItems(items = [], basePath = '') {
    const safeItems = Array.isArray(items) ? items : [];

    return safeItems
        .map((item) => {
            const title = item?.title || item?.label;
            const shortTitle = item?.shortTitle || item?.menuTitle;
            const label = shortTitle || title;
            const slug = item?.slug;
            const url = item?.url || (slug && basePath ? `${basePath}/${slug}` : undefined);

            if (!title || !url) {
                return null;
            }

            return {
                _type: 'actionLink',
                label,
                title,
                shortTitle,
                url,
                ariaLabel: item?.ariaLabel || title
            };
        })
        .filter(Boolean);
}
