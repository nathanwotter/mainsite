const FACULTY_SITE_ORIGIN = 'https://faculty.cnr.ncsu.edu';
const FACULTY_SITE_PREFIX = '/nathanwilliams';

const legacyPathRedirects = new Map([
    ['/about/', '/about-nathan/'],
    ['/contact/', '/about-nathan/contact/'],
    ['/resources/', '/about-nathan/resources/'],
    ['/research-and-publications/', '/about-nathan/'],
    ['/future-of-recreation/', '/recreation-futures-lab/'],
    ['/dix-park-in-fortnite/', '/recreation-futures-lab/dix-park-in-fortnite/'],
    ['/ncstate-of-recreation-virtual-reality-project/', '/recreation-futures-lab/nc-state-of-recreation/'],
    ['/ncstate-of-recreation-opening-reception/', '/recreation-futures-lab/nc-state-of-recreation/showcase/'],
    ['/teaching/', '/teaching/'],
    ['/teaching/prt-152-intro-to-parks-recreation-tourism-and-event-mgmt/', '/teaching/intro-to-parks-and-rec/'],
    ['/teaching/prt-250-facilities-mgmt-in-parks-recreation-tourism-and-event-mgmt/', '/teaching/facilities-management/'],
    ['/teaching/prt-358-recreation-program-planning/', '/teaching/recreation-program-planning/'],
    ['/sample-page/', '/'],
    ['/news/', '/'],
    ['/search/', '/'],
    ['/hello-world/', '/']
]);

export function rewriteLegacyFacultyUrl(href) {
    if (typeof href !== 'string' || !href) return href;

    let url;
    try {
        url = new URL(href);
    } catch {
        return href;
    }

    if (url.origin !== FACULTY_SITE_ORIGIN || !url.pathname.startsWith(FACULTY_SITE_PREFIX)) {
        return href;
    }

    const legacyPath = url.pathname.slice(FACULTY_SITE_PREFIX.length) || '/';
    const replacement = legacyPathRedirects.get(legacyPath);

    return replacement ? `${replacement}${url.search}${url.hash}` : href;
}

export function rewriteLegacyFacultyLinks(value = []) {
    if (!Array.isArray(value)) return [];

    return value.map((item) => ({
        ...item,
        markDefs: Array.isArray(item?.markDefs)
            ? item.markDefs.map((markDef) =>
                  markDef?._type === 'link' ? {...markDef, href: rewriteLegacyFacultyUrl(markDef.href)} : markDef
              )
            : item?.markDefs
    }));
}
