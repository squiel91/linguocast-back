CREATE TABLE dailyActivity (
  userId INTEGER NOT NULL,
  wordsAddedCount INTEGER NOT NULL DEFAULT 0,
  wordsReviewedCount INTEGER NOT NULL DEFAULT 0,
  day INTEGER NOT NULL,
  FOREIGN KEY (userId) REFERENCES userId(id)
  UNIQUE(userId, day)
);