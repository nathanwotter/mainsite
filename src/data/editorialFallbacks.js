let blockCounter = 0;

function nextKey(prefix = 'block') {
    blockCounter += 1;
    return `${prefix}-${blockCounter}`;
}

function block(children, style = 'normal') {
    const markDefs = [];
    const spans = children.map((child) => {
        const value = typeof child === 'string' ? { text: child } : child;
        const marks = [...(value.marks || [])];

        if (value.href) {
            const key = nextKey('link');
            markDefs.push({ _key: key, _type: 'link', href: value.href });
            marks.push(key);
        }

        return {
            _key: nextKey('span'),
            _type: 'span',
            marks,
            text: value.text
        };
    });

    return {
        _key: nextKey('block'),
        _type: 'block',
        children: spans,
        markDefs,
        style
    };
}

const paragraph = (text) => block([text]);
const heading = (text, level = 2) => block([text], `h${level}`);
const linkedParagraph = (...children) => block(children);

export const homePageFallback = {
    title: 'Otter Adventures — Projects by Nathan Williams',
    intro: 'Teaching, research, and creative projects exploring recreation, immersive technology, food, and the ways people build healthier communities.'
};

export const teachingPageFallback = {
    title: 'Teaching',
    intro: 'Courses and learning resources for students exploring recreation, leisure, facilities, program planning, virtual experiences, and the future of the profession.',
    body: [
        paragraph(
            'I teach undergraduate and graduate courses in NC State’s Department of Parks, Recreation and Tourism Management. My classes connect foundational ideas with hands-on projects, community partners, and emerging technologies.'
        ),
        paragraph('Choose a course above to learn what it covers and find related projects and resources.')
    ]
};

export const teachingSubpageFallbacks = {
    'intro-to-parks-and-rec': {
        title: 'PRT 152: Intro to Parks, Rec and Tourism',
        shortTitle: 'PRT 152',
        intro: 'Introduction to Parks, Recreation, Tourism, and Event Management',
        body: [
            paragraph(
                'This course builds foundational knowledge about the role of recreation and leisure in society, including what helps or constrains participation and how recreation supports community development, health, and well-being across the lifespan.'
            ),
            linkedParagraph(
                'The course also examines connections among time, work, leisure, wellness, and the delivery of recreation, tourism, and event services. ',
                {
                    text: 'View the official NC State course description.',
                    href: 'https://catalog.ncsu.edu/course-descriptions/prt/'
                }
            )
        ]
    },
    'facilities-management': {
        title: 'PRT 250: Facilities Management',
        shortTitle: 'PRT 250',
        intro: 'Facilities Management in Parks, Recreation, Tourism, and Event Management',
        body: [
            paragraph(
                'PRT 250 applies management principles to parks, recreation and sport areas, and facilities, with an emphasis on operational efficiency, quality service, fiscal responsibility, and maintenance management.'
            ),
            linkedParagraph({
                text: 'View the official NC State course description.',
                href: 'https://catalog.ncsu.edu/course-descriptions/prt/'
            })
        ]
    },
    'virtual-rec-and-esports': {
        title: 'PRT 280: Virtual Recreation and Esports',
        shortTitle: 'PRT 280',
        intro: 'Explorations in Virtual Recreation and Esports',
        body: [
            paragraph(
                'This course explores how virtual reality, gaming, esports, and other immersive technologies are changing recreation. Students consider the experiences themselves as well as careers, business questions, relationships, and health and wellness outcomes.'
            ),
            linkedParagraph('Activities blend gameplay, field experiences, hands-on work with virtual recreation technologies, and research. ', {
                text: 'View the official NC State course description.',
                href: 'https://catalog.ncsu.edu/course-descriptions/prt/'
            })
        ]
    },
    'recreation-program-planning': {
        title: 'PRT 358: Recreation Program Planning',
        shortTitle: 'PRT 358',
        intro: 'Recreation Program Planning',
        body: [
            paragraph(
                'PRT 358 is a full-immersion service-learning course focused on planning programs that improve quality of life for people and communities. Students learn to analyze needs and apply program-planning principles across varied recreation settings.'
            ),
            linkedParagraph({
                text: 'View the official NC State course description.',
                href: 'https://catalog.ncsu.edu/course-descriptions/prt/'
            })
        ]
    },
    'foundations-of-recreation': {
        title: 'PRT 500: Conceptual Foundations of Recreation',
        shortTitle: 'PRT 500',
        intro: 'Conceptual Foundations of Recreation',
        body: [
            paragraph(
                'This graduate course explores the conceptual foundations of leisure, recreation, sport, play, and work; the history of ideas in the field; and the ways those ideas shape contemporary professional and social questions.'
            ),
            linkedParagraph({
                text: 'View the official NC State course description.',
                href: 'https://catalog.ncsu.edu/course-descriptions/prt/'
            })
        ]
    }
};

export const recreationFuturesPageFallback = {
    title: 'Recreation Futures Lab',
    intro: 'Students and professionals building more imaginative, inclusive, and technology-enabled futures for recreation and leisure.'
};

export const recreationFuturesSubpageFallbacks = {
    'nc-state-of-recreation': {
        title: 'NC:State of Recreation',
        shortTitle: 'NC:State of Recreation',
        menuTitle: 'NC:State of Recreation',
        slug: 'nc-state-of-recreation',
        order: 10,
        intro: 'Interactive 360-degree experiences created with NC State students to help people discover recreation and leisure destinations across North Carolina.',
        body: [
            paragraph(
                'NC:State of Recreation is a collaboration among PRT 152 students, NC State DELTA, and the University Libraries. Students create immersive virtual-reality experiences that can be explored in a browser or headset.'
            ),
            paragraph('Explore the current showcase for event details, or open the map to visit student-created experiences from around the state.')
        ]
    },
    'rec-xr': {
        title: 'RecXR',
        shortTitle: 'RecXR',
        menuTitle: 'RecXR',
        slug: 'rec-xr',
        order: 20,
        intro: 'Extended-reality experiments that connect digital interpretation with real recreation places.',
        body: [
            paragraph(
                'RecXR is a home for location-based augmented- and extended-reality prototypes created through the Recreation Futures Lab. These projects test new ways to interpret parks, trails, art, and recreation spaces.'
            )
        ]
    },
    'dix-park-in-fortnite': {
        title: 'Dix Park in Fortnite',
        shortTitle: 'Dix Park in Fortnite',
        menuTitle: 'Dix Park in Fortnite',
        slug: 'dix-park-in-fortnite',
        order: 30,
        intro: 'An interdisciplinary NC State project creating a digital twin of Raleigh’s Dix Park for Fortnite.',
        body: [
            heading('Project details'),
            paragraph(
                'Students and faculty from Parks, Recreation and Tourism Management and the College of Design are working with City of Raleigh Parks, Recreation and Cultural Resources to recreate the Gipson Play Plaza area of Dix Park as an interactive Fortnite experience.'
            ),
            paragraph(
                'The project combines high-definition scanning, cleanup and creation of 3D assets, design work in Unreal Editor for Fortnite, and social and event-driven experiences that can connect the digital island with activities in the physical park.'
            ),
            paragraph(
                'The team also plans in-person activations with park staff and NC State students to introduce families and other visitors to the island and explore how a digital twin can support discovery, interpretation, and recreation programming.'
            ),
            linkedParagraph({
                text: 'Watch the project preview on YouTube.',
                href: 'https://www.youtube.com/watch?v=HgRnyiz3cho'
            })
        ]
    }
};

export const ncStateSubpageFallbacks = {
    showcase: {
        title: 'NC:State of Recreation Virtual Reality Student Showcase',
        shortTitle: 'Showcase',
        menuTitle: "This Semester's Showcase",
        slug: 'showcase',
        order: 10,
        intro: 'Come experience virtual-reality works created by NC State students.',
        body: [
            heading('Spring 2026 showcase'),
            paragraph('Monday, April 27, 2026 · 10 a.m.–noon · Drop in at any time.'),
            linkedParagraph(
                'Join us in the ',
                {
                    text: 'D. H. Hill Jr. Library Innovation Studio',
                    href: 'https://www.lib.ncsu.edu/spaces/innovation-studio'
                },
                ' and ',
                {
                    text: 'Cyma Rubin Visualization Gallery',
                    href: 'https://www.lib.ncsu.edu/spaces/cyma-rubin-visualization-gallery'
                },
                '.'
            ),
            paragraph(
                'Explore 360-degree recreation and leisure experiences from around North Carolina in virtual-reality headsets, meet the students who made them, and learn how 360-degree video can be used in courses and personal projects.'
            )
        ]
    },
    map: {
        title: 'NC:State of Recreation Map',
        shortTitle: 'Map',
        menuTitle: 'NC:State of Recreation Map',
        slug: 'map',
        order: 20,
        intro: 'Explore North Carolina recreation and leisure destinations in a browser or virtual-reality headset.',
        body: [
            paragraph(
                'The interactive map collects 360-degree experiences created by NC State students and project partners. Open it to discover recreation places and activities across the state.'
            ),
            linkedParagraph({
                text: 'Open the NC:State of Recreation map.',
                href: 'https://go.ncsu.edu/ncstateofrecreationmap'
            })
        ]
    }
};

export const foodPageFallback = {
    title: 'Food',
    intro: 'Cooking, seafood, cultural exploration, and the ways food brings people together.',
    body: [
        paragraph(
            'Food is part of how I teach, travel, and build community. I co-own Current Wellness in downtown Raleigh, where the kitchen hosts cooking and mocktail classes, and I also spend time shucking oysters with Locals Seafood.'
        ),
        linkedParagraph(
            {
                text: 'Explore Current Wellness',
                href: 'https://currentwellnessraleigh.com/'
            },
            ' or ',
            {
                text: 'learn more about Locals Seafood',
                href: 'https://localsseafood.com/'
            },
            '.'
        )
    ]
};

export const aboutNathanSubpageFallbacks = {
    resources: {
        title: 'Resources',
        shortTitle: 'Resources',
        menuTitle: 'Resources',
        slug: 'resources',
        order: 10,
        intro: 'Slides, tools, and workshop resources from recent presentations.',
        body: [
            heading('Presentations and workshops'),
            linkedParagraph(
                { text: 'September 2025 — National Recreation and Park Association: ', marks: ['strong'] },
                {
                    text: 'Using Virtual Reality to Build the Future of Real-World Parks',
                    href: 'https://docs.google.com/presentation/d/1tEEv2jF2Vj0QUutVbnsCYwImp3y0RRsL/edit?usp=sharing'
                }
            ),
            linkedParagraph(
                { text: 'January 2024 — NC State PRTM Seminar: ', marks: ['strong'] },
                {
                    text: '“VR” Should Mean Virtual Recreation: Educating with Virtual Reality Experiences',
                    href: 'https://docs.google.com/presentation/d/1ZSW7-P1-NaVDfUdA-yvi2ruHP7888b7Fym9Vgx9oUHs/edit?usp=sharing'
                }
            ),
            linkedParagraph(
                { text: 'November 2023 — Association for Experiential Education: ', marks: ['strong'] },
                {
                    text: 'Immersive Learning Without Limits!',
                    href: 'https://docs.google.com/presentation/d/1wVmrInkDKvv3dQKsu8v0VTR36kbgVE5pwBXzCl3P8M8/edit?usp=sharing'
                }
            ),
            linkedParagraph(
                { text: 'November 2023 — Symposium for Experiential Education Research: ', marks: ['strong'] },
                {
                    text: '“Nature environments without actually being there”: Virtual recreation experiences and real-world intentions',
                    href: 'https://docs.google.com/presentation/d/14SLLIPwlV650cZqO7_5KXBQ7fZP_epojd6z9K2TdQLo/edit?usp=sharing'
                }
            ),
            linkedParagraph(
                { text: 'February 2023 — AAC&U Conference: ', marks: ['strong'] },
                {
                    text: 'When the Headset Comes Off: Facilitating Real-World Learning with Virtual Reality Experiences',
                    href: 'https://docs.google.com/presentation/d/1-SF5Lz1GASvnsjV_Ig5GrHE-H83qr53Shp2IzWNUVF0/edit?usp=sharing'
                }
            ),
            linkedParagraph(
                { text: 'November 2022 — Association of Outdoor Recreation and Education: ', marks: ['strong'] },
                {
                    text: 'Will we learn anything from the pandemic?!? Connecting the dots to a sustainable future for recreation professions',
                    href: 'https://docs.google.com/presentation/d/1C86P-Wd9D3pEkVWa-T1D9Lib9Oz1dQ3tr5Cg6qn4j6Q/edit?usp=sharing'
                }
            ),
            linkedParagraph(
                { text: 'November 2022 — Association for Experiential Education: ', marks: ['strong'] },
                {
                    text: 'Expanding Your Educational Reach: Digital Media Making for “Wannabe” Creatives',
                    href: 'https://docs.google.com/presentation/d/1wPQPtp8GgJXrlTmbTzQhEH_3kSA_CpCBnKmZh3JRCaU/edit?usp=sharing'
                }
            ),
            linkedParagraph(
                { text: 'October 2022 — SHIFT Summit: ', marks: ['strong'] },
                {
                    text: 'Virtual Recreation; Real Impact',
                    href: 'https://docs.google.com/presentation/d/1R_cvMEDoyxjBDKZQ4sru8MRf9HAQBzv5R0c81Qe87NA/edit?usp=sharing'
                }
            ),
            heading('Tools'),
            linkedParagraph({ text: 'Wonda VR', href: 'https://www.wonda.pro/' }, ' — create immersive 360-degree tours and experiences.'),
            linkedParagraph({ text: 'Insta360', href: 'https://www.insta360.com/' }, ' — 360-degree cameras and related tools.')
        ]
    },
    contact: {
        title: 'Get in touch',
        shortTitle: 'Contact',
        menuTitle: 'Contact',
        slug: 'contact',
        order: 20,
        intro: 'Questions about a course, project, collaboration, or career in recreation? I’d be glad to hear from you.',
        body: [
            linkedParagraph(
                'Email ',
                { text: 'cnwilli6@ncsu.edu', href: 'mailto:cnwilli6@ncsu.edu' },
                ' or connect through ',
                {
                    text: 'NC State’s Department of Parks, Recreation and Tourism Management',
                    href: 'https://cnr.ncsu.edu/prtm/'
                },
                '.'
            )
        ]
    }
};

const draftCopyPattern = /homepage!|yay,? it['’]s working|where does this go|this is where i['’]ll put|\bstuff\b|placeholder|can be added/i;

function bodyText(body = []) {
    const safeBody = Array.isArray(body) ? body : [];

    return safeBody
        .flatMap((item) => item?.children || [])
        .map((child) => child?.text || '')
        .join(' ')
        .trim();
}

export function hasDraftCopy(value) {
    if (typeof value === 'string') {
        return draftCopyPattern.test(value);
    }

    return draftCopyPattern.test(bodyText(value));
}

export function resolveEditorialPage(page, fallback) {
    if (!fallback) return page || null;

    const current = page || {};
    const intro = current.intro && !hasDraftCopy(current.intro) ? current.intro : fallback.intro;
    const currentBodyText = bodyText(current.body);
    const body = currentBodyText.length >= 120 && !hasDraftCopy(current.body) ? current.body : fallback.body;

    return {
        ...fallback,
        ...current,
        title: current.title || fallback.title,
        shortTitle: current.shortTitle || fallback.shortTitle,
        menuTitle: current.menuTitle || fallback.menuTitle,
        slug: current.slug || fallback.slug,
        intro: intro || '',
        body: body || []
    };
}

export function mergeEditorialSubpages(subpages = [], fallbacks = {}) {
    const bySlug = new Map(subpages.map((page) => [page?.slug, page]).filter(([slug]) => Boolean(slug)));

    for (const [slug, fallback] of Object.entries(fallbacks)) {
        bySlug.set(slug, resolveEditorialPage(bySlug.get(slug), fallback));
    }

    return [...bySlug.values()].sort((left, right) => (left.order ?? 999) - (right.order ?? 999) || left.title.localeCompare(right.title));
}
