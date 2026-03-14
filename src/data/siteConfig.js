import { client } from '@utils/sanity-client';
import { IMAGE } from './blocks';

const CONFIG_QUERY_OBJ = `{
  _id,
  "favicon": {
    "src": favicon.asset->url
  },
  header {
    ...,
    logo ${IMAGE}
  },
  footer,
  titleSuffix
}`;

const TEACHING_SUBPAGES_QUERY = `*[_type == "teachingSubpage" && defined(slug.current)] | order(order asc, title asc) {
  title,
  menuTitle,
  "slug": slug.current
}`;

const RECREATION_FUTURES_SUBPAGES_QUERY = `*[_type == "recreationFuturesSubpage" && defined(slug.current)] | order(order asc, title asc) {
  title,
  menuTitle,
  "slug": slug.current
}`;

function isTeachingNavItem(item) {
    return item?.url === '/teaching' || item?.url === '/teaching/' || item?.label === 'Teaching';
}

function isRecreationFuturesNavItem(item) {
    return (
        item?.url === '/recreation-futures-lab' ||
        item?.url === '/recreation-futures-lab/' ||
        item?.label === 'Recreation Futures Lab'
    );
}

function toTeachingChildLink(item) {
    const label = item?.menuTitle || item?.title;
    const slug = item?.slug;

    if (!label || !slug) {
        return null;
    }

    return {
        _type: 'actionLink',
        label,
        url: `/teaching/${slug}`,
        ariaLabel: label
    };
}

function mergeTeachingChildren(existingChildren = [], teachingSubpages = []) {
    const dynamicChildren = teachingSubpages.map(toTeachingChildLink).filter(Boolean);
    const seenUrls = new Set(existingChildren.map((child) => child?.url).filter(Boolean));

    const mergedChildren = [...existingChildren];
    for (const child of dynamicChildren) {
        if (!seenUrls.has(child.url)) {
            mergedChildren.push(child);
            seenUrls.add(child.url);
        }
    }

    return mergedChildren;
}

function toRecreationFuturesChildLink(item) {
    const label = item?.menuTitle || item?.title;
    const slug = item?.slug;

    if (!label || !slug) {
        return null;
    }

    return {
        _type: 'actionLink',
        label,
        url: `/recreation-futures-lab/${slug}`,
        ariaLabel: label
    };
}

function mergeRecreationFuturesChildren(existingChildren = [], subpages = []) {
    const dynamicChildren = subpages.map(toRecreationFuturesChildLink).filter(Boolean);
    const seenUrls = new Set(existingChildren.map((child) => child?.url).filter(Boolean));

    const mergedChildren = [...existingChildren];
    for (const child of dynamicChildren) {
        if (!seenUrls.has(child.url)) {
            mergedChildren.push(child);
            seenUrls.add(child.url);
        }
    }

    return mergedChildren;
}

export async function fetchData() {
    const [configData, teachingSubpages, recreationFuturesSubpages] = await Promise.all([
        client.fetch(`*[_type == "siteConfig"][0] ${CONFIG_QUERY_OBJ}`),
        client.fetch(TEACHING_SUBPAGES_QUERY),
        client.fetch(RECREATION_FUTURES_SUBPAGES_QUERY)
    ]);

    if (!configData?.header?.navLinks?.length) {
        return configData;
    }

    const navLinks = configData.header.navLinks.map((item) =>
        isTeachingNavItem(item)
            ? {
                  ...item,
                  _type: item._type || 'navigationItem',
                  children: mergeTeachingChildren(item.children, teachingSubpages)
              }
            : isRecreationFuturesNavItem(item)
              ? {
                    ...item,
                    _type: item._type || 'navigationItem',
                    children: mergeRecreationFuturesChildren(item.children, recreationFuturesSubpages)
                }
              : item
    );

    return {
        ...configData,
        header: {
            ...configData.header,
            navLinks
        }
    };
}
