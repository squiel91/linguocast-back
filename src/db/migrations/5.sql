
ALTER TABLE episodes ADD COLUMN transcript TEXT;

CREATE TABLE embeddables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  episodeId INTEGER NOT NULL,
  type VARCHAR(32) NOT NULL, -- image / note / link / episode
  content JSON NOT NULL,
  start INTEGER NOT NULL,
  duration INTEGER NOT NULL DEFAULT 15,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  episodeId INTEGER NOT NULL,
  -- isGraded BOOLEAN DEFAULT TRUE NOT NULL,
  -- isAutomaticallyCreated BOOLEAN FALSE NOT NULL,
  -- model VARCHAR(64), -- only if automatically created
  -- isRevised BOOLEAN DEFAULT TRUE NOT NULL,
  content JSON NOT NULL, -- the exercise itself
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (episodeId) REFERENCES episodes(id)
);

CREATE TRIGGER exercisesUpdatedByTrigger AFTER UPDATE ON exercises
FOR EACH ROW BEGIN
    UPDATE exercises
    SET updatedAt = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

CREATE TABLE transcriptCache (
  audioUrl TEXT PRIMARY KEY NOT NULL,
  language VARCHAR(64),
  result JSON NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

UPDATE podcasts
SET coverImage = '/dynamics/podcasts/covers/' || coverImage;

CREATE TABLE dictionary (
  id INTEGER PRIMARY KEY NOT NULL,
  languageId INTEGER NOT NULL,
  image VARCHAR(512), 
  word VARCHAR(32),
  pronunciation VARCHAR(64),
  definitions JSON,
  FOREIGN KEY (languageId) REFERENCES languages(id)
);

CREATE TABLE measureWords (
  wordId id INTEGER NOT NULL,
  measureWordId INTEGER NOT NULL,
  FOREIGN KEY (wordId) REFERENCES dictionary(id),
  FOREIGN KEY (measureWordId) REFERENCES dictionary(id),
  UNIQUE(wordId, measureWordId)
);


CREATE TABLE userWords (
  userId INTEGER NOT NULL,
  wordId INTEGER NOT NULL,
  reviewScheduledFor INTEGER NOT NULL,
  lastReviewInterval INTEGER NOT NULL DEFAULT 1,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES userId(id)
  FOREIGN KEY (wordId) REFERENCES dictionary(id)
  UNIQUE(userId, wordId)
);

CREATE TABLE dailyActivity (
  userId INTEGER NOT NULL,
  wordsAddedCount INTEGER NOT NULL DEFAULT 0,
  wordsReviewedCount INTEGER NOT NULL DEFAULT 0,
  day INTEGER NOT NULL,
  FOREIGN KEY (userId) REFERENCES userId(id)
  UNIQUE(userId, day)
);

ALTER TABLE users ADD languageVariant VARCHAR(64);
