-- Seed public collections (girls, vibes, health, party, finances, books, self-improvement)

-- Insert public collections
insert into collections (name, slug, description, category, is_public, organization_id)
values
  ('Girls', 'girls', 'Lifestyle and fashion content for female audiences', 'girls', true, null),
  ('Vibes', 'vibes', 'Aesthetic and mood-based imagery', 'vibes', true, null),
  ('Health', 'health', 'Fitness, wellness, and healthy living content', 'health', true, null),
  ('Party', 'party', 'Nightlife, events, and celebration imagery', 'party', true, null),
  ('Finances', 'finances', 'Money, investing, and financial education content', 'finances', true, null),
  ('Books', 'books', 'Reading, literature, and book-related imagery', 'books', true, null),
  ('Self Improvement', 'self-improvement', 'Personal growth, motivation, and development content', 'self-improvement', true, null)
on conflict do nothing;
