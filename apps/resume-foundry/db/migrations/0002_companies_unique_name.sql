-- Add a uniqueness guarantee for company names per user so that
-- career-entry inserts can use INSERT OR IGNORE + SELECT to resolve
-- concurrent submissions race-safely (mirrors the users.provider_subject
-- and skills(user_id, category, name) constraints).
CREATE UNIQUE INDEX idx_companies_user_name_unique ON companies(user_id, name);
