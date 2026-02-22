import { defineCollection, z } from 'astro:content';

const reports = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.date(),
    dateStr: z.string(),
    description: z.string(),
    infographic: z.string().optional(),
    slideCount: z.number().default(0),
    hasSlides: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { reports };
