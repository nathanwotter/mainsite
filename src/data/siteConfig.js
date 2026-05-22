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
  shortTitle,
  menuTitle,
  "slug": slug.current
}`;

const RECREATION_FUTURES_SUBPAGES_QUERY = `*[_type == "recreationFuturesSubpage" && defined(slug.current)] | order(order asc, title asc) {
  title,
  shortTitle,
  menuTitle,
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

function isCoachingNavItem(item) {
    return item?.url === '/coaching' || item?.url === '/coaching/' || item?.label === 'Coaching';
}

function isFoodNavItem(item) {
    return item?.url === '/food' || item?.url === '/food/' || item?.label === 'Food';
}

function isAboutNathanNavItem(item) {
    return item?.url === '/about-nathan' || item?.url === '/about-nathan/' || item?.label === 'About Nathan';
}

function toTeachingChildLink(item) {
    const title = item?.title;
    const shortTitle = item?.shortTitle || item?.menuTitle;
    const label = shortTitle || title;
    const slug = item?.slug;

    if (!title || !slug) {
        return null;
    }

    return {
        _type: 'actionLink',
        label,
        title,
        shortTitle,
        url: `/teaching/${slug}`,
        ariaLabel: title
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
    const title = item?.title;
    const shortTitle = item?.shortTitle || item?.menuTitle;
    const label = shortTitle || title;
    const slug = item?.slug;

    if (!title || !slug) {
        return null;
    }

    return {
        _type: 'actionLink',
        label,
        title,
        shortTitle,
        url: `/recreation-futures-lab/${slug}`,
        ariaLabel: title
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

function toFoodChildLink(item) {
    const title = item?.title;
    const shortTitle = item?.shortTitle || item?.menuTitle;
    const label = shortTitle || title;
    const slug = item?.slug;

    if (!title || !slug) {
        return null;
    }

    return {
        _type: 'actionLink',
        label,
        title,
        shortTitle,
        url: `/food/${slug}`,
        ariaLabel: title
    };
}

function mergeFoodChildren(existingChildren = [], subpages = []) {
    const dynamicChildren = subpages.map(toFoodChildLink).filter(Boolean);
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

function toAboutNathanChildLink(item) {
    const title = item?.title;
    const shortTitle = item?.shortTitle || item?.menuTitle;
    const label = shortTitle || title;
    const slug = item?.slug;

    if (!title || !slug) {
        return null;
    }

    return {
        _type: 'actionLink',
        label,
        title,
        shortTitle,
        url: `/about-nathan/${slug}`,
        ariaLabel: title
    };
}

function mergeAboutNathanChildren(existingChildren = [], subpages = []) {
    const dynamicChildren = subpages.map(toAboutNathanChildLink).filter(Boolean);
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
    const [configData, teachingSubpages, recreationFuturesSubpages, foodSubpages, aboutNathanSubpages] = await Promise.all([
        client.fetch(`*[_type == "siteConfig"][0] ${CONFIG_QUERY_OBJ}`),
        client.fetch(TEACHING_SUBPAGES_QUERY),
        client.fetch(RECREATION_FUTURES_SUBPAGES_QUERY),
        client.fetch(FOOD_SUBPAGES_QUERY),
        client.fetch(ABOUT_NATHAN_SUBPAGES_QUERY)
    ]);

    if (!configData?.header?.navLinks?.length) {
        return configData;
    }

    const navLinks = configData.header.navLinks
        .filter((item) => !isCoachingNavItem(item))
        .map((item) =>
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
                  : isFoodNavItem(item)
                    ? {
                          ...item,
                          _type: item._type || 'navigationItem',
                          children: mergeFoodChildren(item.children, foodSubpages)
                      }
                    : isAboutNathanNavItem(item)
                      ? {
                            ...item,
                            _type: item._type || 'navigationItem',
                            children: mergeAboutNathanChildren(item.children, aboutNathanSubpages)
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
