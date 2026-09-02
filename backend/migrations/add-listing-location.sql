-- Store the physical location supplied for each crop listing.
ALTER TABLE crops
ADD COLUMN IF NOT EXISTS listing_location VARCHAR(160);
