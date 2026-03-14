import {defineArrayMember, defineField, defineType} from 'sanity'

export default defineType({
  name: 'recxrSite',
  title: 'RecXR Site',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'shortTitle',
      title: 'Short Title',
      type: 'string',
    }),
    defineField({
      name: 'locationName',
      title: 'Location Name',
      type: 'string',
    }),
    defineField({
      name: 'activityName',
      title: 'Activity Name',
      type: 'string',
    }),
    defineField({
      name: 'intro',
      title: 'Intro',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [{type: 'block'}],
    }),
    defineField({
      name: 'latitude',
      title: 'Latitude',
      type: 'number',
    }),
    defineField({
      name: 'longitude',
      title: 'Longitude',
      type: 'number',
    }),
    defineField({
      name: 'activationRadiusMeters',
      title: 'Activation Radius (Meters)',
      type: 'number',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          {title: 'Draft', value: 'draft'},
          {title: 'Active', value: 'active'},
          {title: 'Archived', value: 'archived'},
        ],
      },
      initialValue: 'draft',
    }),
    defineField({
      name: 'heroImage',
      title: 'Hero Image',
      type: 'image',
    }),
    defineField({
      name: 'guideVideoUrl',
      title: 'Guide Video URL',
      type: 'url',
    }),
    defineField({
      name: 'fallbackVideoUrl',
      title: 'Fallback Video URL',
      type: 'url',
    }),
    defineField({
      name: 'safetyNotes',
      title: 'Safety Notes',
      type: 'array',
      of: [{type: 'block'}],
    }),
    defineField({
      name: 'experienceStops',
      title: 'Experience Stops',
      description: 'AR guide trigger locations for this RecXR site. Add one item for each geolocated stop visitors can unlock on-site.',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'experienceStop',
          title: 'Experience Stop',
          fields: [
            defineField({
              name: 'title',
              title: 'Stop Title',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'slug',
              title: 'Stop Slug',
              description: 'Used as a stable identifier for this AR guide trigger location.',
              type: 'slug',
              options: {
                source: 'title',
                maxLength: 96,
              },
            }),
            defineField({
              name: 'description',
              title: 'Stop Description',
              type: 'text',
              rows: 3,
            }),
            defineField({
              name: 'latitude',
              title: 'Trigger Latitude',
              description: 'Latitude for the AR guide trigger location.',
              type: 'number',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'longitude',
              title: 'Trigger Longitude',
              description: 'Longitude for the AR guide trigger location.',
              type: 'number',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'activationRadiusMeters',
              title: 'Trigger Radius (Meters)',
              description: 'Optional proximity radius for unlocking this stop.',
              type: 'number',
            }),
            defineField({
              name: 'videoMode',
              title: 'Video Mode',
              description: 'Choose whether this stop uses a normal rectangular video or a packed-alpha AR guide asset.',
              type: 'string',
              initialValue: 'standard',
              options: {
                list: [
                  {title: 'Standard Video', value: 'standard'},
                  {title: 'Packed Alpha Guide', value: 'packedAlpha'},
                ],
                layout: 'radio',
              },
            }),
            defineField({
              name: 'standardVideo',
              title: 'Standard Video',
              description: 'Upload the regular Mux-hosted video used for standard playback and fallback viewing.',
              type: 'mux.video',
            }),
            defineField({
              name: 'arGuideVideo',
              title: 'AR Guide Video',
              description: 'Upload the packed-alpha Mux video used by WebXR AR and iPhone Camera Guide mode.',
              type: 'mux.video',
            }),
            defineField({
              name: 'video',
              title: 'Legacy Stop Video',
              description: 'Optional legacy field kept for backward compatibility while older stops are migrated.',
              type: 'mux.video',
              hidden: true,
            }),
            defineField({
              name: 'order',
              title: 'Stop Order',
              type: 'number',
            }),
            defineField({
              name: 'promptText',
              title: 'AR Prompt Text',
              description: 'Optional short text prompt shown when visitors reach this trigger location.',
              type: 'text',
              rows: 2,
            }),
          ],
          preview: {
            select: {
              title: 'title',
              latitude: 'latitude',
              longitude: 'longitude',
              order: 'order',
              videoMode: 'videoMode',
            },
            prepare({title, latitude, longitude, order, videoMode}) {
              const locationLabel =
                typeof latitude === 'number' && typeof longitude === 'number'
                  ? `${latitude}, ${longitude}`
                  : 'AR guide trigger location'
              const orderLabel = typeof order === 'number' ? `Order ${order}` : null
              const modeLabel = videoMode === 'packedAlpha' ? 'Packed alpha guide' : 'Standard video'

              return {
                title: title || 'Untitled Experience Stop',
                subtitle: [orderLabel, modeLabel, locationLabel].filter(Boolean).join(' | '),
              }
            },
          },
        }),
      ],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      shortTitle: 'shortTitle',
      locationName: 'locationName',
      status: 'status',
      media: 'heroImage',
    },
    prepare({title, shortTitle, locationName, status, media}) {
      const name = shortTitle || title
      const subtitleParts = [locationName, status].filter(Boolean)

      return {
        title: name,
        subtitle: subtitleParts.join(' | '),
        media,
      }
    },
  },
})
